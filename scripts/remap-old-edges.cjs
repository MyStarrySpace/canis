#!/usr/bin/env node
/**
 * Remap old (pre-CANIS) edges to current node IDs and recover citation data.
 *
 * Strategy:
 * 1. Exact ID match
 * 2. Case-insensitive ID match
 * 3. Label match (old label → new node with same label)
 * 4. Normalized ID match (strip underscores, lowercase)
 * 5. Manual mappings for known renames
 * 6. Prefix/stem matching (e.g., mtorc1_hyperactive → mTORC1_hyperactive)
 *
 * Outputs:
 * - node-id-map-full.json — complete old→new ID mapping
 * - recovered-edges.json — old edges translated to new IDs with citation data
 * - unmatched-report.txt — nodes that couldn't be mapped
 */
const fs = require('fs');
const path = require('path');

const cur = require('../demo/src/data/ad-framework-data.json');
const curNodes = cur.nodes;
const curEdges = cur.edges;

// Build lookup indexes
const curById = new Map(curNodes.map(n => [n.id, n]));
const curByIdLower = new Map(curNodes.map(n => [n.id.toLowerCase(), n.id]));
const curByLabel = new Map(curNodes.map(n => [n.label.toLowerCase(), n.id]));
const curByNorm = new Map(curNodes.map(n => [n.id.replace(/_/g, '').toLowerCase(), n.id]));

// Manual mappings for known renames
const manualMap = {
  // Lysosomal
  lysosome_pool: 'lysosome',
  bmp_lysosomal: 'BMP_levels',
  // Inflammasome/NF-kB
  nf_kb_active: 'NLRP3',  // closest functional equivalent
  nlrp3_active: 'NLRP3',
  cgas_active: 'cGAS_STING',
  sting_active: 'cGAS_STING',
  // Glia
  srebp1_active: 'SREBP1_activated',
  il1a: 'IL1B',  // closest cytokine in current model
  tnf: 'NLRP3',  // TNF-α signals via inflammasome
  a1_toxic_lipid_secretion: 'A1_astrocytes',
  ldam_super_seeders: 'microglia_ldam',
  // Amyloid
  app_betactf: 'APP_processing_amyloidogenic',
  abeta_monomers: 'abeta_production',
  dense_core_plaque: 'Abeta_plaques',
  diffuse_filamentous_plaque: 'Abeta_plaques',
  plaque_associated_microglia: 'microglia_dam',
  ltp_inhibition: 'synapses',
  neuronal_hyperactivity: 'synaptic_Abeta_binding',
  // Tau
  tau_missorting: 'tau_hyperphosphorylated',
  tau_misfolded: 'tau_aggregated_PHF',
  neuronal_dysfunction: 'cell_death',
  // Complement
  c1q_elevated: 'c1q',
  c3_opsonization: 'complement_activation',
  cr3_mediated_pruning: 'complement_mediated_pruning',
  synapse_elimination: 'synapses',
  synaptic_plasticity: 'synapses',
  dendritic_spine_density: 'dendritic_retraction',
  bdnf: 'synapses',
  // Iron
  hepcidin_elevated: 'hepcidin',
  ferroportin_reduced: 'ferroportin',
  ferritin_trap: 'ferritin_iron',
  lysosomal_iron_trap: 'lysosomal_iron',
  lipid_peroxidation: 'lipid_peroxides',
  senescent_cells: 'senescent_cell_iron',
  // APOE/REST
  apoe4_domain_interaction: 'apoe4',
  apoe_lipidation_reduced: 'APOE_lipidated',
  lysosomal_cholesterol_sequestration: 'lysosomal_cholesterol',
  rest_depleted: 'REST_cytoplasmic',
  nrf2_pathway: 'Nrf2_activity',
  // TREM2/DAM
  dam_transition_blocked: 'trem2_variant',
  plaque_barrier_function: 'plaque_compaction',
  senescent_trem2_microglia: 'senescent_microglia_TREM2',
  // BBB/Glymphatic
  bbb_breakdown: 'BBB_integrity',
  cypa_elevated: 'CypA',
  mmp9_elevated: 'MMP9',
  pericyte_injury: 'pericyte_count',
  lrp1_apoe4_impaired: 'lrp1',
  glymphatic_clearance: 'glymphatic_flow_rate',
  meningeal_lymphatics: 'meningeal_lymphatic_drainage',
  isf_abeta_clearance: 'abeta_clearance',
  pericyte_function: 'pericyte_count',
  aqp4_polarization: 'endfoot_AQP4_polarization',
  aqp4_depolarization: 'endfoot_AQP4_polarization',
  astrocyte_endfeet: 'astrocyte_endfoot_integrity',
  csf_isf_exchange: 'glymphatic_flow_rate',
  // Cholinergic
  cholinergic_degeneration: 'BFCNs',
  ach_reduced: 'acetylcholine',
  // Myelin/Insulation
  white_matter_pathology: 'WM_compromised',
  myelin_breakdown: 'myelin_integrity',
  myelin_dysfunction: 'myelin_integrity',
  sulfatide_level: 'myelin_integrity',
  oligodendrocyte_dysfunction: 'oligodendrocyte_count',
  remyelination_capacity: 'OPC_differentiation_rate',
  ol_ferroptosis: 'oligodendrocyte_count',
  // MAM/Calcium
  mam_hyperconnectivity: 'MAM_hyperconnected',
  er_mito_ca_flux: 'mitochondrial_Ca_overload',
  mito_ca_overload_mam: 'mitochondrial_Ca_overload',
  er_ca_stores: 'ER_Ca_overload',
  // Mitochondrial
  sirt1_activity: 'mTORC1_hyperactive',  // SIRT1 opposes mTORC1
  // Senescence
  microglial_senescence: 'senescent_microglia_TREM2',
  excitatory_neuron_senescence: 'cell_death',
  senescence_volume_loss: 'cell_death',
  // Sex/Ancestry
  fsh_elevated: 'menopause',
  x_linked_lysosomal_genes: 'lysosomal_dysfunction',
  female_iron_storage_failure: 'labile_iron_pool',
  // Hormones
  hrt_intervention: 'estrogen',
  estrogen_neuroprotection: 'estrogen',
  cortisol_level: 'neuroinflammation',
  chronic_stress: 'neuroinflammation',
  insulin_signaling: 'insulin_resistance',
  intranasal_insulin: 'insulin_resistance',
  melatonin_level: 'sleep_state',
  // Post-Infectious
  pathogenic_exposure: 'sars_cov2',
  sleep_fragmentation: 'sleep_disruption',
  cerebral_hypoperfusion: 'BBB_integrity',
  // Endfoot
  app_er_translocation: 'APP_processing_amyloidogenic',
  // Immunomodulatory
  vaccination: 'microglia_activated',
  trained_immunity_induction: 'microglia_activated',
  ifn_gamma: 'ISG_expression',
  // Astrocyte endfoot detailed
  clasmatodendrosis: 'astrocyte_reactive',
  gfap_network_disrupted: 'astrocyte_reactive',
  pvs_enlarged: 'perivascular_space',
  pvs_normal: 'perivascular_space',
  extracellular_glutamate: 'neuroinflammation',
  glutamate_excitotoxicity: 'cell_death',
  ammonia_accumulation: 'astrocyte_reactive',
  astrocyte_swelling: 'astrocyte_reactive',
  // Metabolic microglia
  mtor_hif1a_axis: 'HIF1a_stabilized',
  irg1_itaconate_shunt: 'glycolytic_switch',
  sdh_inhibited: 'glycolytic_switch',
  tca_disrupted: 'glycolytic_switch',
  // Aggregation
  aggregation_cofactors: 'abeta_aggregation',
  permissive_environment: 'abeta_aggregation',
  secondary_nucleation: 'abeta_aggregation',
};

// ── Build the full mapping ───────────────────────────────────────────

const nodesDir = path.join(__dirname, '..', '_reference', 'old-graph', 'src', 'data', 'mechanisticFramework', 'nodes');
const nodeFiles = fs.readdirSync(nodesDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');

const oldNodes = [];
for (const f of nodeFiles) {
  const src = fs.readFileSync(path.join(nodesDir, f), 'utf8');
  const ids = [...src.matchAll(/id:\s*'([^']+)'/g)].map(m => m[1]);
  const labels = [...src.matchAll(/label:\s*'([^']+)'/g)].map(m => m[1]);
  for (let i = 0; i < ids.length; i++) {
    oldNodes.push({ id: ids[i], label: labels[i] || ids[i] });
  }
}

const mapping = {};
const matchType = {};
let exact = 0, caseless = 0, label = 0, normalized = 0, manual = 0, unmatched = 0;
const unmatchedNodes = [];

for (const n of oldNodes) {
  if (curById.has(n.id)) {
    mapping[n.id] = n.id;
    matchType[n.id] = 'exact';
    exact++;
  } else if (curByIdLower.has(n.id.toLowerCase())) {
    mapping[n.id] = curByIdLower.get(n.id.toLowerCase());
    matchType[n.id] = 'case-insensitive';
    caseless++;
  } else if (curByLabel.has(n.label.toLowerCase())) {
    mapping[n.id] = curByLabel.get(n.label.toLowerCase());
    matchType[n.id] = 'label';
    label++;
  } else if (curByNorm.has(n.id.replace(/_/g, '').toLowerCase())) {
    mapping[n.id] = curByNorm.get(n.id.replace(/_/g, '').toLowerCase());
    matchType[n.id] = 'normalized';
    normalized++;
  } else if (manualMap[n.id]) {
    mapping[n.id] = manualMap[n.id];
    matchType[n.id] = 'manual';
    manual++;
  } else {
    unmatched++;
    unmatchedNodes.push(n);
  }
}

console.log('=== NODE ID MAPPING ===\n');
console.log(`Total old nodes: ${oldNodes.length}`);
console.log(`Exact match:       ${exact}`);
console.log(`Case-insensitive:  ${caseless}`);
console.log(`Label match:       ${label}`);
console.log(`Normalized:        ${normalized}`);
console.log(`Manual mapping:    ${manual}`);
console.log(`Unmatched:         ${unmatched}`);
console.log(`Match rate:        ${((oldNodes.length - unmatched) / oldNodes.length * 100).toFixed(1)}%`);

// Save mapping
fs.writeFileSync(
  path.join(__dirname, 'node-id-map-full.json'),
  JSON.stringify(mapping, null, 2)
);

// ── Extract old edges with citations ─────────────────────────────────

const edgesFile = path.join(__dirname, '..', '_reference', 'old-graph', 'src', 'data', 'mechanisticFramework', 'edges.ts');
const edgesSrc = fs.readFileSync(edgesFile, 'utf8');

// Split into edge blocks more reliably
// Each edge starts with { and contains id:, source:, target:, relation:
// Flexible: id, source, target, relation can be separated by other fields
const edgeRegex = /\{\s*\n\s*id:\s*'([^']+)'[\s\S]*?source:\s*'([^']+)'[\s\S]*?target:\s*'([^']+)'[\s\S]*?relation:\s*'([^']+)'/g;

const oldEdgesRaw = [];
let match;
while ((match = edgeRegex.exec(edgesSrc)) !== null) {
  const startIdx = match.index;
  // Find matching closing brace
  let depth = 0;
  let endIdx = startIdx;
  for (let i = startIdx; i < edgesSrc.length; i++) {
    if (edgesSrc[i] === '{') depth++;
    else if (edgesSrc[i] === '}') {
      depth--;
      if (depth === 0) { endIdx = i; break; }
    }
  }
  const block = edgesSrc.slice(startIdx, endIdx + 1);

  // Extract citation data
  const pmids = [...block.matchAll(/pmid:\s*'(\d+)'/g)].map(m => m[1]);
  const authors = [...block.matchAll(/firstAuthor:\s*'([^']+)'/g)].map(m => m[1]);
  const years = [...block.matchAll(/year:\s*(\d{4})/g)].map(m => parseInt(m[1]));
  const methods = [...block.matchAll(/methodType:\s*'([^']+)'/g)].map(m => m[1]);
  const confidence = block.match(/causalConfidence:\s*'([^']+)'/)?.[1] || 'L5';
  const moduleId = block.match(/moduleId:\s*'([^']+)'/)?.[1] || '';
  const mechDesc = block.match(/mechanismDescription:\s*'([^']+)'/)?.[1] ||
                   block.match(/mechanismDescription:\s*`([^`]+)`/)?.[1] || '';
  const keyInsight = block.match(/keyInsight:\s*'([^']+)'/)?.[1] ||
                     block.match(/keyInsight:\s*`([^`]+)`/)?.[1] || '';
  const crossModule = block.match(/crossModule:\s*'([^']+)'/)?.[1] || '';

  oldEdgesRaw.push({
    id: match[1],
    source: match[2],
    target: match[3],
    relation: match[4],
    moduleId,
    causalConfidence: confidence,
    mechanismDescription: mechDesc,
    keyInsight,
    crossModule,
    pmids,
    authors,
    years,
    methods,
  });
}

console.log(`\n=== EDGE RECOVERY ===\n`);
console.log(`Old edges parsed: ${oldEdgesRaw.length}`);

// Translate edges
const curEdgeSet = new Set(curEdges.map(e => `${e.source}→${e.target}`));
const recovered = [];
const skippedNoMap = [];
const skippedDupe = [];
const skippedSelf = [];

for (const e of oldEdgesRaw) {
  const newSource = mapping[e.source];
  const newTarget = mapping[e.target];

  if (!newSource || !newTarget) {
    skippedNoMap.push(e);
    continue;
  }

  if (newSource === newTarget) {
    skippedSelf.push(e);
    continue;
  }

  const key = `${newSource}→${newTarget}`;
  if (curEdgeSet.has(key)) {
    // Edge already exists — but we can still recover the citation
    const existing = curEdges.find(ce => ce.source === newSource && ce.target === newTarget);
    if (existing && !existing.pmid && e.pmids.length > 0) {
      recovered.push({
        ...e,
        newSource,
        newTarget,
        type: 'citation_only',  // Just adding citation to existing edge
        existingEdgeId: existing.id,
      });
    } else {
      skippedDupe.push(e);
    }
    continue;
  }

  recovered.push({
    ...e,
    newSource,
    newTarget,
    type: 'new_edge',
  });
  curEdgeSet.add(key);  // Prevent duplicates within recovered set
}

console.log(`Recovered edges:       ${recovered.length}`);
console.log(`  New edges:           ${recovered.filter(e => e.type === 'new_edge').length}`);
console.log(`  Citation updates:    ${recovered.filter(e => e.type === 'citation_only').length}`);
console.log(`Skipped (no mapping):  ${skippedNoMap.length}`);
console.log(`Skipped (duplicate):   ${skippedDupe.length}`);
console.log(`Skipped (self-loop):   ${skippedSelf.length}`);

// Citation stats on recovered
const recoveredWithPmid = recovered.filter(e => e.pmids.length > 0);
console.log(`\nRecovered with PMID:   ${recoveredWithPmid.length}/${recovered.length}`);

// Save outputs
fs.writeFileSync(
  path.join(__dirname, 'recovered-edges-full.json'),
  JSON.stringify(recovered, null, 2)
);
fs.writeFileSync(
  path.join(__dirname, 'skipped-no-map.json'),
  JSON.stringify(skippedNoMap.map(e => ({
    id: e.id, source: e.source, target: e.target,
    pmids: e.pmids, hasCitation: e.pmids.length > 0,
  })), null, 2)
);

// Unmatched report
const report = [
  `=== UNMATCHED OLD NODES (${unmatchedNodes.length}) ===`,
  '',
  ...unmatchedNodes.map(n => `${n.id.padEnd(40)} ${n.label}`),
  '',
  `=== SKIPPED EDGES (no node mapping, ${skippedNoMap.length}) ===`,
  '',
  ...skippedNoMap.slice(0, 50).map(e =>
    `${e.id.padEnd(15)} ${e.source} → ${e.target} [${e.pmids.length} PMIDs]`
  ),
  skippedNoMap.length > 50 ? `... and ${skippedNoMap.length - 50} more` : '',
].join('\n');

fs.writeFileSync(path.join(__dirname, 'unmatched-report.txt'), report);

console.log(`\nFiles written:`);
console.log(`  scripts/node-id-map-full.json`);
console.log(`  scripts/recovered-edges-full.json`);
console.log(`  scripts/skipped-no-map.json`);
console.log(`  scripts/unmatched-report.txt`);
