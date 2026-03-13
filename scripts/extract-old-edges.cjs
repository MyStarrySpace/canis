/**
 * Extract old edge data from commit 0449462 in alz-market-viz.
 *
 * Reads src/data/mechanisticFramework/edges.ts via `git show`,
 * parses the TypeScript to extract edge objects, and writes
 * old-edges.json alongside this script.
 *
 * Also loads current edges from demo/src/data/ad-framework-data.json
 * and prints a comparison summary.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ALZ_DIR = 'C:\\Users\\quest\\Programming\\alz-market-viz';
const COMMIT = '0449462';
const FILE_PATH = 'src/data/mechanisticFramework/edges.ts';

// 1. Read old edges.ts from git
console.log(`Reading ${FILE_PATH} from commit ${COMMIT}...`);
const rawTS = execSync(`git show ${COMMIT}:${FILE_PATH}`, {
  cwd: ALZ_DIR,
  encoding: 'utf-8',
  maxBuffer: 10 * 1024 * 1024,
});

console.log(`Got ${rawTS.length} characters, ${rawTS.split('\n').length} lines`);

// 2. Parse edges using a state-machine approach
//    We find each top-level object in the arrays by tracking brace depth.

const edges = [];

// Strategy: find every occurrence of `id: 'E...'` and then extract the
// surrounding object by walking braces. We'll find the opening `{` before
// the id line and the matching closing `}`.

// First, find all edge object boundaries.
// We look for lines like `    id: 'E01.001',` and walk backwards to find the `{`
// and forwards to find the matching `}`.

const lines = rawTS.split('\n');

for (let i = 0; i < lines.length; i++) {
  const idMatch = lines[i].match(/^\s*id:\s*'(E[\d.]+)'/);
  if (!idMatch) continue;

  // Walk backwards to find the opening `{`
  let openLine = i - 1;
  while (openLine >= 0 && !lines[openLine].match(/^\s*\{/)) {
    openLine--;
  }
  if (openLine < 0) continue;

  // Walk forwards from openLine tracking brace depth
  let depth = 0;
  let closeLine = openLine;
  for (let j = openLine; j < lines.length; j++) {
    for (const ch of lines[j]) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    }
    if (depth === 0) {
      closeLine = j;
      break;
    }
  }

  const block = lines.slice(openLine, closeLine + 1).join('\n');

  // Extract fields from the block
  const edge = extractEdge(block, idMatch[1]);
  if (edge) {
    edges.push(edge);
  }
}

function extractEdge(block, edgeId) {
  const get = (key) => {
    // Match key: 'value' or key: "value"
    const m = block.match(new RegExp(`^\\s*${key}:\\s*['"]([^'"]*?)['"]`, 'm'));
    return m ? m[1] : undefined;
  };

  const edge = {
    id: edgeId,
    source: get('source'),
    target: get('target'),
    relation: get('relation'),
    moduleId: get('moduleId'),
    causalConfidence: get('causalConfidence'),
    mechanismDescription: undefined,
    pmid: undefined,
    firstAuthor: undefined,
    year: undefined,
    methodType: undefined,
  };

  // mechanismDescription can be multi-line (using template strings or continuation)
  // Try single-line first
  let mechMatch = block.match(/^\s*mechanismDescription:\s*'([^']*?)'/m);
  if (!mechMatch) {
    mechMatch = block.match(/^\s*mechanismDescription:\s*"([^"]*?)"/m);
  }
  if (!mechMatch) {
    // Multi-line: mechanismDescription: '...\n...'  or with +
    // Try to get the line and concatenate
    mechMatch = block.match(/^\s*mechanismDescription:\s*\n?\s*'([\s\S]*?)'/m);
  }
  if (!mechMatch) {
    // Try multi-line with backticks or string concatenation
    const mechLineIdx = block.split('\n').findIndex(l => l.match(/mechanismDescription:/));
    if (mechLineIdx >= 0) {
      const mechLines = block.split('\n');
      let mechStr = '';
      // Grab the line and following continuation lines
      const firstLine = mechLines[mechLineIdx];
      const startQuote = firstLine.match(/mechanismDescription:\s*['"`]/);
      if (startQuote) {
        // Find the closing quote across lines
        const quoteChar = firstLine[startQuote.index + startQuote[0].length - 1];
        let combined = '';
        for (let k = mechLineIdx; k < mechLines.length; k++) {
          combined += mechLines[k] + '\n';
          // Check if this line has the closing quote (not escaped)
          const afterKey = k === mechLineIdx
            ? mechLines[k].substring(mechLines[k].indexOf(quoteChar, startQuote.index + startQuote[0].length - 1) + 1)
            : mechLines[k];
          if (afterKey.includes(quoteChar)) {
            break;
          }
        }
        const fullMatch = combined.match(/mechanismDescription:\s*['"`]([\s\S]*?)['"`]/);
        if (fullMatch) mechStr = fullMatch[1];
      }
      if (mechStr) edge.mechanismDescription = mechStr.replace(/\s+/g, ' ').trim();
    }
  } else {
    edge.mechanismDescription = mechMatch[1].replace(/\s+/g, ' ').trim();
  }

  // Extract first evidence entry
  // Find the evidence array
  const evidenceStart = block.indexOf('evidence:');
  if (evidenceStart >= 0) {
    // Find first { after evidence: [
    const afterEvidence = block.substring(evidenceStart);
    const bracketPos = afterEvidence.indexOf('[');
    if (bracketPos >= 0) {
      const afterBracket = afterEvidence.substring(bracketPos);
      // Find the first object in the array
      const firstObjStart = afterBracket.indexOf('{');
      if (firstObjStart >= 0) {
        // Find matching }
        let depth = 0;
        let firstObjEnd = firstObjStart;
        for (let c = firstObjStart; c < afterBracket.length; c++) {
          if (afterBracket[c] === '{') depth++;
          if (afterBracket[c] === '}') {
            depth--;
            if (depth === 0) {
              firstObjEnd = c;
              break;
            }
          }
        }
        const evidenceBlock = afterBracket.substring(firstObjStart, firstObjEnd + 1);

        // Extract evidence fields
        const evGet = (key) => {
          const m = evidenceBlock.match(new RegExp(`${key}:\\s*['"]([^'"]*?)['"]`));
          return m ? m[1] : undefined;
        };
        const evGetNum = (key) => {
          const m = evidenceBlock.match(new RegExp(`${key}:\\s*(\\d+)`));
          return m ? parseInt(m[1]) : undefined;
        };

        edge.pmid = evGet('pmid');
        edge.firstAuthor = evGet('firstAuthor');
        edge.year = evGetNum('year');
        edge.methodType = evGet('methodType');
      }
    }
  }

  return edge;
}

// Also try to extract mechanismDescription for multi-line strings that use
// concatenation or template literals
for (const edge of edges) {
  if (!edge.mechanismDescription) {
    // Try a second pass: find the block again and use a more aggressive regex
    // This handles cases where the description spans multiple lines with string concat
  }
}

console.log(`\nExtracted ${edges.length} edges from old edges.ts`);

// Verify a few
if (edges.length > 0) {
  console.log('\nFirst edge:', JSON.stringify(edges[0], null, 2));
  console.log('\nLast edge:', JSON.stringify(edges[edges.length - 1], null, 2));
}

// Check for any edges missing critical fields
const missingSource = edges.filter(e => !e.source).length;
const missingTarget = edges.filter(e => !e.target).length;
const missingRelation = edges.filter(e => !e.relation).length;
const missingPmid = edges.filter(e => !e.pmid).length;
console.log(`\nField coverage:`);
console.log(`  source: ${edges.length - missingSource}/${edges.length}`);
console.log(`  target: ${edges.length - missingTarget}/${edges.length}`);
console.log(`  relation: ${edges.length - missingRelation}/${edges.length}`);
console.log(`  causalConfidence: ${edges.filter(e => e.causalConfidence).length}/${edges.length}`);
console.log(`  mechanismDescription: ${edges.filter(e => e.mechanismDescription).length}/${edges.length}`);
console.log(`  pmid: ${edges.length - missingPmid}/${edges.length}`);
console.log(`  firstAuthor: ${edges.filter(e => e.firstAuthor).length}/${edges.length}`);
console.log(`  year: ${edges.filter(e => e.year).length}/${edges.length}`);
console.log(`  methodType: ${edges.filter(e => e.methodType).length}/${edges.length}`);

// 3. Write output JSON
const outputPath = path.join(__dirname, 'old-edges.json');
fs.writeFileSync(outputPath, JSON.stringify(edges, null, 2), 'utf-8');
console.log(`\nWrote ${edges.length} edges to ${outputPath}`);

// 4. Load current edges for comparison
const currentDataPath = path.join(__dirname, '..', 'demo', 'src', 'data', 'ad-framework-data.json');
let currentEdges = [];
try {
  const currentData = JSON.parse(fs.readFileSync(currentDataPath, 'utf-8'));
  currentEdges = currentData.edges || [];
} catch (err) {
  console.error(`\nCould not load current edges: ${err.message}`);
}

// 5. Comparison summary
const oldIds = new Set(edges.map(e => e.id));
const currentIds = new Set(currentEdges.map(e => e.id));

const overlap = [...oldIds].filter(id => currentIds.has(id));
const onlyInOld = [...oldIds].filter(id => !currentIds.has(id));
const onlyInCurrent = [...currentIds].filter(id => !oldIds.has(id));

console.log('\n========================================');
console.log('COMPARISON SUMMARY');
console.log('========================================');
console.log(`Total old edges:     ${edges.length}`);
console.log(`Total current edges: ${currentEdges.length}`);
console.log(`Overlap (by ID):     ${overlap.length}`);
console.log(`Only in old:         ${onlyInOld.length}`);
console.log(`Only in current:     ${onlyInCurrent.length}`);

// Also check source-target pair overlap (IDs may have changed)
const oldPairs = new Set(edges.map(e => `${e.source}→${e.target}`));
const currentPairs = new Set(currentEdges.map(e => `${e.source}→${e.target}`));
const pairOverlap = [...oldPairs].filter(p => currentPairs.has(p));

console.log(`\nSource→Target pair overlap: ${pairOverlap.length}`);
console.log(`Old unique pairs:     ${oldPairs.size}`);
console.log(`Current unique pairs: ${currentPairs.size}`);

if (onlyInOld.length > 0) {
  console.log(`\nSample edges only in old (first 10):`);
  onlyInOld.slice(0, 10).forEach(id => {
    const e = edges.find(x => x.id === id);
    console.log(`  ${id}: ${e.source} → ${e.target} (${e.relation})`);
  });
}

if (onlyInCurrent.length > 0) {
  console.log(`\nSample edges only in current (first 10):`);
  onlyInCurrent.slice(0, 10).forEach(id => {
    const e = currentEdges.find(x => x.id === id);
    console.log(`  ${id}: ${e.source} → ${e.target} (${e.relation})`);
  });
}
