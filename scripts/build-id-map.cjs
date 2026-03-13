const fs = require('fs');
const path = require('path');

// Load data
const oldNodes = require('./old-nodes.json');
const currentData = require('../demo/src/data/ad-framework-data.json');
const currentNodes = currentData.nodes;

// Deduplicate old nodes (keep first occurrence)
const seenOldIds = new Set();
const uniqueOldNodes = [];
for (const node of oldNodes) {
  if (!seenOldIds.has(node.id)) {
    seenOldIds.add(node.id);
    uniqueOldNodes.push(node);
  }
}

console.log(`Old nodes: ${uniqueOldNodes.length} unique (${oldNodes.length} total)`);
console.log(`Current nodes: ${currentNodes.length}`);
console.log('');

// Build lookup maps
const currentById = new Map();
const currentByLabelLower = new Map(); // label_lower -> [nodes]
for (const node of currentNodes) {
  currentById.set(node.id, node);
  const key = node.label.toLowerCase();
  if (!currentByLabelLower.has(key)) {
    currentByLabelLower.set(key, []);
  }
  currentByLabelLower.get(key).push(node);
}

const mapped = {};        // old_id -> new_id
const mappingDetails = []; // for printing examples
const unmatchedOld = [];

// ── Pass 1: Exact ID match ──
let pass1Count = 0;
for (const oldNode of uniqueOldNodes) {
  if (currentById.has(oldNode.id)) {
    mapped[oldNode.id] = oldNode.id;
    pass1Count++;
    if (pass1Count <= 3) {
      mappingDetails.push({
        pass: 1,
        oldId: oldNode.id,
        newId: oldNode.id,
        reason: 'exact ID match',
        oldLabel: oldNode.label,
        newLabel: currentById.get(oldNode.id).label,
      });
    }
  }
}
console.log(`Pass 1 (exact ID): ${pass1Count} mapped`);

// ── Pass 2: Exact label match (case-insensitive) ──
let pass2Count = 0;
for (const oldNode of uniqueOldNodes) {
  if (mapped[oldNode.id]) continue;

  const labelLower = oldNode.label.toLowerCase();
  const candidates = currentByLabelLower.get(labelLower);
  if (candidates && candidates.length > 0) {
    // Filter out already-mapped current IDs
    const mappedNewIds = new Set(Object.values(mapped));
    const available = candidates.filter(c => !mappedNewIds.has(c.id));
    if (available.length > 0) {
      // Prefer same module
      const sameModule = available.find(c => c.moduleId === oldNode.moduleId);
      const chosen = sameModule || available[0];
      mapped[oldNode.id] = chosen.id;
      pass2Count++;
      if (pass2Count <= 5) {
        mappingDetails.push({
          pass: 2,
          oldId: oldNode.id,
          newId: chosen.id,
          reason: `exact label match: "${oldNode.label}"`,
          oldLabel: oldNode.label,
          newLabel: chosen.label,
        });
      }
    }
  }
}
console.log(`Pass 2 (exact label): ${pass2Count} mapped`);

// ── Pass 3: Fuzzy label match ──
function tokenize(str) {
  return str.toLowerCase().replace(/[^a-z0-9\s_-]/g, '').split(/[\s_-]+/).filter(Boolean);
}

function wordOverlap(tokens1, tokens2) {
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  let shared = 0;
  for (const t of set1) {
    if (set2.has(t)) shared++;
  }
  const maxLen = Math.max(set1.size, set2.size);
  return maxLen === 0 ? 0 : shared / maxLen;
}

function normalizeId(id) {
  return id.replace(/_/g, ' ').toLowerCase();
}

let pass3Count = 0;
const mappedNewIds = new Set(Object.values(mapped));

for (const oldNode of uniqueOldNodes) {
  if (mapped[oldNode.id]) continue;

  const oldLabelTokens = tokenize(oldNode.label);
  const oldIdNormalized = normalizeId(oldNode.id);
  const oldIdTokens = tokenize(oldNode.id);

  let bestMatch = null;
  let bestScore = 0;
  let bestReason = '';

  for (const curNode of currentNodes) {
    if (mappedNewIds.has(curNode.id)) continue;

    const curLabelTokens = tokenize(curNode.label);
    const curLabelLower = curNode.label.toLowerCase();

    // Check label word overlap
    const labelOverlap = wordOverlap(oldLabelTokens, curLabelTokens);

    // Check old ID normalized vs current label
    const idToLabelOverlap = wordOverlap(oldIdTokens, curLabelTokens);

    // Check old label vs current ID normalized
    const labelToIdOverlap = wordOverlap(oldLabelTokens, tokenize(curNode.id));

    let score = Math.max(labelOverlap, idToLabelOverlap, labelToIdOverlap);
    let reason = '';

    if (score === labelOverlap) {
      reason = `label overlap ${(labelOverlap * 100).toFixed(0)}%: "${oldNode.label}" ↔ "${curNode.label}"`;
    } else if (score === idToLabelOverlap) {
      reason = `id→label overlap ${(idToLabelOverlap * 100).toFixed(0)}%: "${oldNode.id}" ↔ "${curNode.label}"`;
    } else {
      reason = `label→id overlap ${(labelToIdOverlap * 100).toFixed(0)}%: "${oldNode.label}" ↔ "${curNode.id}"`;
    }

    // Module bonus: boost same-module matches slightly
    if (score >= 0.7 && oldNode.moduleId === curNode.moduleId) {
      score += 0.05;
    }

    if (score > bestScore && score >= 0.8) {
      bestScore = score;
      bestMatch = curNode;
      bestReason = reason;
    }
  }

  if (bestMatch) {
    mapped[oldNode.id] = bestMatch.id;
    mappedNewIds.add(bestMatch.id);
    pass3Count++;
    if (pass3Count <= 10) {
      mappingDetails.push({
        pass: 3,
        oldId: oldNode.id,
        newId: bestMatch.id,
        reason: bestReason,
        score: bestScore,
        oldLabel: oldNode.label,
        newLabel: bestMatch.label,
      });
    }
  }
}
console.log(`Pass 3 (fuzzy): ${pass3Count} mapped`);

// ── Collect unmapped ──
const unmappedOld = [];
for (const oldNode of uniqueOldNodes) {
  if (!mapped[oldNode.id]) {
    unmappedOld.push(oldNode.id);
  }
}

const allMappedNewIds = new Set(Object.values(mapped));
const unmappedNew = [];
for (const curNode of currentNodes) {
  if (!allMappedNewIds.has(curNode.id)) {
    unmappedNew.push(curNode.id);
  }
}

// ── Summary ──
console.log('');
console.log('=== SUMMARY ===');
console.log(`Total mapped: ${Object.keys(mapped).length} / ${uniqueOldNodes.length} old nodes`);
console.log(`Unmapped old: ${unmappedOld.length}`);
console.log(`Unmapped new: ${unmappedNew.length}`);

// ── Print examples ──
console.log('');
console.log('=== MAPPING EXAMPLES ===');
for (const detail of mappingDetails) {
  console.log(`  [Pass ${detail.pass}] ${detail.oldId} → ${detail.newId}`);
  console.log(`    ${detail.reason}`);
  if (detail.oldLabel !== detail.newLabel) {
    console.log(`    Labels: "${detail.oldLabel}" → "${detail.newLabel}"`);
  }
  console.log('');
}

// ── Print unmapped old nodes ──
if (unmappedOld.length > 0) {
  console.log('=== UNMAPPED OLD NODES ===');
  for (const id of unmappedOld) {
    const node = uniqueOldNodes.find(n => n.id === id);
    console.log(`  ${id} (${node.label}) [${node.moduleId}]`);
  }
  console.log('');
}

// ── Print identity vs changed mappings ──
const identityMaps = Object.entries(mapped).filter(([k, v]) => k === v);
const changedMaps = Object.entries(mapped).filter(([k, v]) => k !== v);
console.log(`Identity mappings (same ID): ${identityMaps.length}`);
console.log(`Changed mappings (different ID): ${changedMaps.length}`);
if (changedMaps.length > 0) {
  console.log('');
  console.log('=== ALL CHANGED MAPPINGS ===');
  for (const [oldId, newId] of changedMaps) {
    const oldNode = uniqueOldNodes.find(n => n.id === oldId);
    const newNode = currentNodes.find(n => n.id === newId);
    console.log(`  ${oldId} → ${newId}`);
    console.log(`    "${oldNode.label}" → "${newNode.label}"`);
  }
}

// ── Write output ──
const output = {
  mapped,
  unmapped_old: unmappedOld,
  unmapped_new: unmappedNew,
};

const outPath = path.join(__dirname, 'node-id-map.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log('');
console.log(`Output written to ${outPath}`);
