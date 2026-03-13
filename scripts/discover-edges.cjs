#!/usr/bin/env node
/**
 * Edge Discovery Pipeline — Step 2
 *
 * For each node, queries Claude Haiku to find:
 *   a) Potential new edges (returned as list of node indices)
 *   b) Redundant nodes (returned as list of node indices)
 *
 * Processes nodes in batches to stay within rate limits.
 * Saves results incrementally to output/edge-discovery-results.json.
 *
 * Usage:
 *   node scripts/discover-edges.cjs                  # Run all nodes
 *   node scripts/discover-edges.cjs --start=50       # Resume from index 50
 *   node scripts/discover-edges.cjs --module=M02     # Only nodes in module M02
 *   node scripts/discover-edges.cjs --dry-run        # Print prompt for first node only
 *   node scripts/discover-edges.cjs --reset          # Clear previous results and restart
 *
 * Requires: ANTHROPIC_API_KEY environment variable (loaded from ../alz-market-viz/.env)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', 'alz-market-viz', '.env') });
const Anthropic = require('@anthropic-ai/sdk').default;
const path = require('path');
const fs = require('fs');

const DATA_PATH = path.join(__dirname, '..', 'demo', 'src', 'data', 'ad-framework-data.json');
const OUT_DIR = path.join(__dirname, '..', 'output');
const RESULTS_PATH = path.join(OUT_DIR, 'edge-discovery-results.json');
const PROGRESS_PATH = path.join(OUT_DIR, 'edge-discovery-progress.json');

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 3000;
const MAX_RETRIES = 3;

function parseArgs() {
  const args = { start: 0, module: null, dryRun: false, reset: false };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--start=')) args.start = parseInt(arg.split('=')[1]);
    if (arg.startsWith('--module=')) args.module = arg.split('=')[1];
    if (arg === '--dry-run') args.dryRun = true;
    if (arg === '--reset') args.reset = true;
  }
  return args;
}

function buildPrompt(sourceNode, allNodes, existingEdges) {
  const nodeList = allNodes.map((n, i) =>
    `${i}: ${n.label} [${n.category}/${n.subtype}, ${n.moduleId}]`
  ).join('\n');

  // Existing edges from/to this node
  const fromEdges = existingEdges
    .filter(e => e.source === sourceNode.id)
    .map(e => {
      const tgt = allNodes.find(n => n.id === e.target);
      return `  → ${tgt?.label || e.target} (${e.relation}, ${e.causalConfidence || '?'})`;
    });
  const toEdges = existingEdges
    .filter(e => e.target === sourceNode.id)
    .map(e => {
      const src = allNodes.find(n => n.id === e.source);
      return `  ← ${src?.label || e.source} (${e.relation}, ${e.causalConfidence || '?'})`;
    });
  const existingSection = fromEdges.length + toEdges.length > 0
    ? `\nExisting edges for "${sourceNode.label}":\n${[...fromEdges, ...toEdges].join('\n')}\n`
    : `\nNo existing edges for "${sourceNode.label}".`;

  return `You are an expert in Alzheimer's disease biology, neurodegeneration, and systems biology.

I have a mechanistic causal network of AD with ${allNodes.length} biological entities. Analyze this node and identify potential missing edges and redundancies.

## Source Node
- **Label**: ${sourceNode.label}
- **ID**: ${sourceNode.id}
- **Category**: ${sourceNode.category} / ${sourceNode.subtype}
- **Module**: ${sourceNode.moduleId}
- **Description**: ${sourceNode.description || 'N/A'}
- **Mechanism**: ${sourceNode.mechanism || 'N/A'}
${existingSection}

## All Nodes (index: label [category/subtype, module])
${nodeList}

## Instructions

Return a JSON object with two fields:

1. **"potential_edges"**: An array of **index numbers** of nodes that "${sourceNode.label}" could plausibly have a DIRECT causal relationship with (either direction), that is NOT already in the existing edges above. Only include relationships supported by known biology. Do NOT include speculative or very indirect relationships. Do NOT include the source node itself or nodes already connected.

2. **"redundancies"**: An array of **index numbers** of nodes that are essentially the SAME biological concept as "${sourceNode.label}" (true duplicates that should be merged). Be very strict — only flag genuine duplicates, not merely related concepts.

Return ONLY valid JSON, no explanation. Example:
{"potential_edges":[5,12,45,200],"redundancies":[]}`;
}

async function queryHaiku(client, prompt, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = response.content[0]?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      if (attempt < retries - 1) {
        const delay = (attempt + 1) * 2000;
        console.warn(`  Retry ${attempt + 1}/${retries} after ${delay}ms: ${err.message}`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
}

async function main() {
  const args = parseArgs();
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  const { nodes, edges, modules } = data;

  // Sort nodes consistently (same order as adjacency matrix)
  const moduleOrder = {};
  modules.forEach((m, i) => { moduleOrder[m.id] = i; });
  const sorted = [...nodes].sort((a, b) => {
    const ma = moduleOrder[a.moduleId] ?? 99;
    const mb = moduleOrder[b.moduleId] ?? 99;
    if (ma !== mb) return ma - mb;
    return (a.label || a.id).localeCompare(b.label || b.id);
  });

  const n = sorted.length;
  const idToIdx = {};
  sorted.forEach((node, i) => { idToIdx[node.id] = i; });

  // Filter by module
  let targetNodes = sorted;
  if (args.module) {
    targetNodes = sorted.filter(n => n.moduleId === args.module);
    console.log(`Filtering to module ${args.module}: ${targetNodes.length} nodes`);
  }

  // Dry run
  if (args.dryRun) {
    const prompt = buildPrompt(targetNodes[0], sorted, edges);
    console.log('=== DRY RUN ===\n');
    console.log(prompt);
    console.log(`\n=== Prompt: ${prompt.length} chars ===`);
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY environment variable required');
    process.exit(1);
  }

  const client = new Anthropic();
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // Load or reset results
  let results = {};
  if (args.reset) {
    console.log('Resetting previous results...');
  } else if (fs.existsSync(RESULTS_PATH)) {
    results = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf-8'));
    console.log(`Loaded ${Object.keys(results).length} existing results`);
  }

  // Existing edge set
  const existingEdgeSet = new Set();
  for (const e of edges) {
    existingEdgeSet.add(`${e.source}→${e.target}`);
  }

  const startIdx = args.start;
  const total = targetNodes.length;
  let processed = 0;
  let newEdgesFound = 0;
  let redundanciesFound = 0;

  console.log(`\nProcessing ${total - startIdx} nodes (starting at index ${startIdx})...`);
  console.log(`Batch size: ${BATCH_SIZE}, delay: ${BATCH_DELAY_MS}ms\n`);

  for (let batchStart = startIdx; batchStart < total; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, total);
    const batch = targetNodes.slice(batchStart, batchEnd);

    const promises = batch.map(async (node) => {
      if (results[node.id] && !results[node.id].error) {
        console.log(`  [skip] ${node.label} (already processed)`);
        return;
      }

      const prompt = buildPrompt(node, sorted, edges);
      try {
        const result = await queryHaiku(client, prompt);

        if (!Array.isArray(result.potential_edges) || !Array.isArray(result.redundancies)) {
          throw new Error('Invalid response shape — missing potential_edges or redundancies arrays');
        }

        // Validate indices are in range
        const validEdges = result.potential_edges.filter(
          i => Number.isInteger(i) && i >= 0 && i < n && sorted[i].id !== node.id
        );
        const validRedundancies = result.redundancies.filter(
          i => Number.isInteger(i) && i >= 0 && i < n && sorted[i].id !== node.id
        );

        // Convert indices to node IDs for stable storage
        const edgeNodeIds = validEdges.map(i => sorted[i].id);
        const redundancyNodeIds = validRedundancies.map(i => sorted[i].id);

        // Filter out edges that already exist
        const newEdgeIds = edgeNodeIds.filter(tid =>
          !existingEdgeSet.has(`${node.id}→${tid}`) &&
          !existingEdgeSet.has(`${tid}→${node.id}`)
        );

        results[node.id] = {
          nodeId: node.id,
          label: node.label,
          moduleId: node.moduleId,
          potentialEdgeNodeIds: newEdgeIds,
          redundancyNodeIds,
          newEdgeCount: newEdgeIds.length,
          redundancyCount: redundancyNodeIds.length,
          timestamp: new Date().toISOString(),
        };

        newEdgesFound += newEdgeIds.length;
        redundanciesFound += redundancyNodeIds.length;
        processed++;
        console.log(`  [${batchStart + batch.indexOf(node) + 1}/${total}] ${node.label}: ${newEdgeIds.length} potential edges, ${redundancyNodeIds.length} redundancies`);
      } catch (err) {
        console.error(`  [ERROR] ${node.label}: ${err.message}`);
        results[node.id] = { nodeId: node.id, label: node.label, error: err.message, timestamp: new Date().toISOString() };
      }
    });

    await Promise.all(promises);

    // Save after each batch
    fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2));
    fs.writeFileSync(PROGRESS_PATH, JSON.stringify({
      lastBatch: batchEnd,
      totalNodes: total,
      processed,
      newEdgesFound,
      redundanciesFound,
      timestamp: new Date().toISOString(),
    }, null, 2));

    if (batchEnd < total) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  // ── Summary & candidate extraction ──────────────────────────────────
  console.log('\n=== Discovery Complete ===');
  console.log(`Processed: ${processed} nodes`);
  console.log(`Potential new edges: ${newEdgesFound}`);
  console.log(`Redundancies: ${redundanciesFound}`);

  // Build unique candidate edge pairs
  const seen = new Set();
  const candidates = [];
  for (const [nodeId, res] of Object.entries(results)) {
    if (res.error || !res.potentialEdgeNodeIds) continue;
    for (const targetId of res.potentialEdgeNodeIds) {
      const key = [nodeId, targetId].sort().join('↔');
      if (seen.has(key)) continue;
      seen.add(key);
      const srcNode = sorted.find(n => n.id === nodeId);
      const tgtNode = sorted.find(n => n.id === targetId);
      candidates.push({
        source: nodeId,
        sourceLabel: srcNode?.label || nodeId,
        target: targetId,
        targetLabel: tgtNode?.label || targetId,
      });
    }
  }

  const CANDIDATES_PATH = path.join(OUT_DIR, 'candidate-edges.json');
  fs.writeFileSync(CANDIDATES_PATH, JSON.stringify(candidates, null, 2));
  console.log(`\nUnique candidate edges: ${candidates.length}`);
  console.log(`Saved to: ${CANDIDATES_PATH}`);

  // Redundancy pairs
  const seenR = new Set();
  const redundancyPairs = [];
  for (const [nodeId, res] of Object.entries(results)) {
    if (res.error || !res.redundancyNodeIds) continue;
    for (const otherId of res.redundancyNodeIds) {
      const key = [nodeId, otherId].sort().join('↔');
      if (seenR.has(key)) continue;
      seenR.add(key);
      const srcNode = sorted.find(n => n.id === nodeId);
      const otherNode = sorted.find(n => n.id === otherId);
      redundancyPairs.push({
        nodeA: nodeId,
        labelA: srcNode?.label || nodeId,
        nodeB: otherId,
        labelB: otherNode?.label || otherId,
      });
    }
  }

  const REDUNDANCY_PATH = path.join(OUT_DIR, 'redundancies.json');
  fs.writeFileSync(REDUNDANCY_PATH, JSON.stringify(redundancyPairs, null, 2));
  console.log(`Unique redundancy pairs: ${redundancyPairs.length}`);
  console.log(`Saved to: ${REDUNDANCY_PATH}`);
}

main().catch(console.error);
