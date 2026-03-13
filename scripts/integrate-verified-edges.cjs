#!/usr/bin/env node
/**
 * Integrate verified edges into the framework data.
 *
 * 1. Normalizes all method types to canonical snake_case forms
 * 2. Adds verified edges from the discovery pipeline
 * 3. Removes hardcoded causalConfidence — the scheme handles classification
 * 4. Outputs updated ad-framework-data.json
 *
 * Usage:
 *   node scripts/integrate-verified-edges.cjs              # Dry run (stats only)
 *   node scripts/integrate-verified-edges.cjs --apply       # Write updated data
 */

const path = require('path');
const fs = require('fs');

const DATA_PATH = path.join(__dirname, '..', 'demo', 'src', 'data', 'ad-framework-data.json');
const VERIFIED_PATH = path.join(__dirname, '..', 'output', 'verified-edges.json');

const apply = process.argv.includes('--apply');

// ── Method type normalization map ────────────────────────────────────────

const METHOD_NORMALIZE = {
  'rct': 'rct',
  'RCT': 'rct',
  'clinical_trial': 'rct',
  'clinical_trial_failure': 'rct',
  'intervention_human': 'rct',
  'mendelian_randomization': 'mendelian_randomization',
  'MR': 'mendelian_randomization',
  'mr': 'mendelian_randomization',
  'knockout': 'knockout',
  'GWAS': 'gwas',
  'gwas': 'gwas',
  'transgenic': 'transgenic',
  'intervention_animal': 'intervention_animal',
  'animal': 'intervention_animal',
  'epidemiological': 'observational',
  'imaging': 'imaging',
  'in_vitro': 'in_vitro',
  'intervention_cells': 'in_vitro',
  'biochemistry': 'in_vitro',
  'cryo_em': 'in_vitro',
  'transcriptomics': 'transcriptomics',
  'cohort': 'cohort',
  'observational': 'observational',
  'meta_analysis': 'meta_analysis',
  'review': 'review',
  'expert_opinion': 'review',
};

/** For compound types like "animal, in_vitro", pick the strongest one */
const METHOD_RANK = {
  'rct': 0,
  'mendelian_randomization': 1,
  'knockout': 2,
  'gwas': 3,
  'transgenic': 4,
  'intervention_animal': 5,
  'imaging': 6,
  'in_vitro': 7,
  'transcriptomics': 8,
  'cohort': 9,
  'observational': 10,
  'meta_analysis': 11,
  'review': 12,
};

function normalizeMethodType(raw) {
  if (!raw) return null;
  // Handle compound types: "animal, in_vitro" → pick strongest
  const parts = raw.split(/[,;]\s*/);
  let best = null;
  let bestRank = Infinity;
  for (const part of parts) {
    const trimmed = part.trim();
    const normalized = METHOD_NORMALIZE[trimmed] || METHOD_NORMALIZE[trimmed.toLowerCase()];
    if (normalized) {
      const rank = METHOD_RANK[normalized] ?? 99;
      if (rank < bestRank) {
        bestRank = rank;
        best = normalized;
      }
    }
  }
  return best;
}

// ── Relation type normalization ──────────────────────────────────────────

const VALID_RELATIONS = new Set([
  'increases', 'decreases', 'directlyIncreases', 'directlyDecreases',
  'regulates', 'modulates', 'produces', 'degrades', 'binds', 'transports',
  'causesNoChange', 'association', 'catalyzes', 'traps', 'protects',
  'disrupts', 'requires', 'amplifies', 'substrateof', 'inhibits',
]);

function normalizeRelation(rel) {
  if (VALID_RELATIONS.has(rel)) return rel;
  // Common mappings
  const map = {
    'directly_increases': 'directlyIncreases',
    'directly_decreases': 'directlyDecreases',
    'causes_no_change': 'causesNoChange',
    'substrate_of': 'substrateof',
  };
  return map[rel] || 'regulates'; // fallback
}

// ── Main ─────────────────────────────────────────────────────────────────

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
console.log(`Existing: ${data.nodes.length} nodes, ${data.edges.length} edges`);

// Step 1: Normalize existing edge method types
let normalizedCount = 0;
for (const edge of data.edges) {
  const raw = edge.methodType || (edge.evidence && edge.evidence.methodType);
  const norm = normalizeMethodType(raw);
  if (norm && norm !== edge.methodType) {
    normalizedCount++;
  }
  edge.methodType = norm;
  // Also normalize nested evidence.methodType if present
  if (edge.evidence && edge.evidence.methodType) {
    edge.evidence.methodType = norm;
  }
}
console.log(`Normalized ${normalizedCount} existing method types`);

// Step 2: Load and integrate verified edges
if (!fs.existsSync(VERIFIED_PATH)) {
  console.log('No verified edges found — skipping integration');
} else {
  const verified = JSON.parse(fs.readFileSync(VERIFIED_PATH, 'utf-8'));
  console.log(`Verified edges to integrate: ${verified.length}`);

  // Build existing edge set to avoid duplicates
  const existingEdges = new Set();
  for (const e of data.edges) {
    existingEdges.add(`${e.source}→${e.target}`);
  }

  // Also build node ID set for validation
  const nodeIds = new Set(data.nodes.map(n => n.id));

  let added = 0;
  let skippedDup = 0;
  let skippedMissing = 0;
  let nextEdgeNum = data.edges.length + 1;

  for (const v of verified) {
    const ver = v.verification;
    if (!ver || !ver.supported) continue;

    // Determine source/target based on direction
    let source, target;
    if (ver.direction === 'target_to_source') {
      source = v.target;
      target = v.source;
    } else {
      source = v.source;
      target = v.target;
    }

    // Validate nodes exist
    if (!nodeIds.has(source) || !nodeIds.has(target)) {
      skippedMissing++;
      continue;
    }

    // Skip if edge already exists (either direction for bidirectional)
    if (existingEdges.has(`${source}→${target}`)) {
      skippedDup++;
      continue;
    }
    if (ver.direction === 'bidirectional' && existingEdges.has(`${target}→${source}`)) {
      skippedDup++;
      continue;
    }

    const relation = normalizeRelation(ver.relation);
    const methodType = normalizeMethodType(ver.methodType);

    // Determine moduleId from source node
    const srcNode = data.nodes.find(n => n.id === source);
    const tgtNode = data.nodes.find(n => n.id === target);
    const moduleId = srcNode ? srcNode.moduleId : (tgtNode ? tgtNode.moduleId : 'M01');

    // Build the edge — NO hardcoded causalConfidence, scheme will classify
    const edgeId = `V${String(nextEdgeNum++).padStart(4, '0')}`;
    const newEdge = {
      id: edgeId,
      source,
      target,
      relation,
      moduleId,
      methodType: methodType || null,
      mechanismDescription: ver.mechanism || null,
      pmid: (ver.pmid && ver.pmid !== 'null' && ver.pmid !== 'none') ? ver.pmid : null,
    };

    data.edges.push(newEdge);
    existingEdges.add(`${source}→${target}`);
    added++;

    // Add reverse edge for bidirectional
    if (ver.direction === 'bidirectional' && !existingEdges.has(`${target}→${source}`)) {
      const revId = `V${String(nextEdgeNum++).padStart(4, '0')}`;
      data.edges.push({
        ...newEdge,
        id: revId,
        source: target,
        target: source,
      });
      existingEdges.add(`${target}→${source}`);
      added++;
    }
  }

  console.log(`Added: ${added}, Skipped (duplicate): ${skippedDup}, Skipped (missing node): ${skippedMissing}`);
}

// Step 3: Remove hardcoded causalConfidence from edges that have a methodType
// (the scheme will reclassify them). Keep it for edges without methodType as fallback.
let removedConfidence = 0;
for (const edge of data.edges) {
  if (edge.methodType && edge.causalConfidence) {
    delete edge.causalConfidence;
    removedConfidence++;
  }
}
console.log(`Removed hardcoded causalConfidence from ${removedConfidence} edges with methodType`);

// Step 4: Add the default confidence scheme to the data
data.confidenceScheme = {
  name: 'Default Biomedical Evidence Hierarchy',
  description: 'Standard evidence classification: RCT > MR > GWAS/knockout > animal > in vitro > observational > review',
  rules: [
    { methodTypes: ['rct'], confidence: 'L1' },
    { methodTypes: ['mendelian_randomization'], confidence: 'L2' },
    { methodTypes: ['knockout', 'gwas', 'transgenic'], confidence: 'L3' },
    { methodTypes: ['intervention_animal', 'imaging'], confidence: 'L4' },
    { methodTypes: ['in_vitro', 'transcriptomics'], confidence: 'L5' },
    { methodTypes: ['cohort', 'observational', 'meta_analysis'], confidence: 'L6' },
    { methodTypes: ['review'], confidence: 'L7' },
  ],
  defaultConfidence: 'L7',
};

console.log(`\nFinal: ${data.nodes.length} nodes, ${data.edges.length} edges`);

// Stats
const withMethod = data.edges.filter(e => e.methodType).length;
const withConf = data.edges.filter(e => e.causalConfidence).length;
console.log(`Edges with methodType: ${withMethod}/${data.edges.length}`);
console.log(`Edges with hardcoded causalConfidence (no methodType): ${withConf}`);

if (apply) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  console.log(`\nWritten to ${DATA_PATH}`);
} else {
  console.log('\n[DRY RUN] Pass --apply to write changes');
}
