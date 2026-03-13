#!/usr/bin/env node
/**
 * Build an Excel adjacency matrix from the framework data.
 *
 * Creates a sheet where:
 * - Row 1 = header row with node labels
 * - Column A = node labels
 * - Cell (i,j) = relation type if edge exists from node_i → node_j, else empty
 *
 * Also creates a "Nodes" reference sheet with full node metadata.
 *
 * Usage: node scripts/build-adjacency-matrix.cjs
 * Output: output/adjacency-matrix.xlsx
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const DATA_PATH = path.join(__dirname, '..', 'demo', 'src', 'data', 'ad-framework-data.json');
const OUT_DIR = path.join(__dirname, '..', 'output');
const OUT_PATH = path.join(OUT_DIR, 'adjacency-matrix.xlsx');

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  const { nodes, edges, modules } = data;

  // Sort nodes by module then by label for readability
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

  // Build edge lookup: (sourceIdx, targetIdx) → relation
  const edgeLookup = {};
  const edgeConfidence = {};
  for (const e of edges) {
    const si = idToIdx[e.source];
    const ti = idToIdx[e.target];
    if (si == null || ti == null) continue;
    const key = `${si},${ti}`;
    edgeLookup[key] = e.relation || 'unknown';
    edgeConfidence[key] = e.causalConfidence || '';
  }

  console.log(`Nodes: ${n}, Edges: ${edges.length}`);
  console.log(`Matrix size: ${n}×${n} = ${n * n} cells`);

  const wb = new ExcelJS.Workbook();

  // ── Sheet 1: Adjacency Matrix ──────────────────────────────────────────
  const ws = wb.addWorksheet('Adjacency Matrix');

  // Colors for relation types
  const relationColors = {
    increases: 'FF007385',       // teal
    directlyIncreases: 'FF486393', // blue
    decreases: 'FFC75146',       // red
    directlyDecreases: 'FF8B0000', // dark red
    regulates: 'FFE5AF19',       // yellow
    modulates: 'FFE5AF19',
    produces: 'FF5A8A6E',       // green
    degrades: 'FFFF6347',
    binds: 'FF9370DB',          // purple
    catalyzes: 'FF20B2AA',
    inhibits: 'FFDC143C',
    disrupts: 'FFFF4500',
    protects: 'FF32CD32',
    traps: 'FF8B4513',
    transports: 'FF4682B4',
    requires: 'FFFFA500',
    amplifies: 'FF00CED1',
    association: 'FFB0C4DE',
    causesNoChange: 'FFA9A9A9',
    substrateof: 'FFD8BFD8',
  };

  // Module color lookup
  const moduleColorMap = {};
  modules.forEach(m => { moduleColorMap[m.id] = m.color.replace('#', 'FF'); });

  // Row 1: corner cell + node labels
  const headerRow = ['↓ Source \\ Target →'];
  for (const node of sorted) {
    headerRow.push(node.label || node.id);
  }
  const hr = ws.addRow(headerRow);

  // Style header row
  hr.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 7 };
    cell.alignment = { textRotation: 90, vertical: 'bottom', horizontal: 'center' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E2DD' } } };
    if (colNumber > 1) {
      const node = sorted[colNumber - 2];
      const mc = moduleColorMap[node.moduleId];
      if (mc) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: mc } };
      cell.font = { bold: true, size: 7, color: { argb: 'FFFFFFFF' } };
    }
  });

  // Data rows
  for (let i = 0; i < n; i++) {
    const rowData = [sorted[i].label || sorted[i].id];
    for (let j = 0; j < n; j++) {
      const key = `${i},${j}`;
      if (i === j) {
        rowData.push('—');
      } else if (edgeLookup[key]) {
        // Short codes for relation types
        const rel = edgeLookup[key];
        const conf = edgeConfidence[key];
        const short = rel === 'increases' ? '↑' :
          rel === 'directlyIncreases' ? '↑↑' :
          rel === 'decreases' ? '↓' :
          rel === 'directlyDecreases' ? '↓↓' :
          rel === 'regulates' ? '~' :
          rel === 'produces' ? '→' :
          rel === 'inhibits' ? '⊣' :
          rel === 'disrupts' ? '✕' :
          rel === 'protects' ? '🛡' :
          rel === 'binds' ? '⊕' :
          rel === 'catalyzes' ? '⚡' :
          rel;
        rowData.push(`${short} ${conf}`);
      } else {
        rowData.push('');
      }
    }

    const row = ws.addRow(rowData);

    // Style the row label
    const labelCell = row.getCell(1);
    labelCell.font = { bold: true, size: 7 };
    const mc = moduleColorMap[sorted[i].moduleId];
    if (mc) {
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: mc } };
      labelCell.font = { bold: true, size: 7, color: { argb: 'FFFFFFFF' } };
    }

    // Style data cells
    for (let j = 0; j < n; j++) {
      const cell = row.getCell(j + 2);
      cell.font = { size: 6 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };

      if (i === j) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      } else {
        const key = `${i},${j}`;
        const rel = edgeLookup[key];
        if (rel && relationColors[rel]) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: relationColors[rel] + '33' }, // 20% opacity approximation
          };
        }
      }
    }
  }

  // Set column widths
  ws.getColumn(1).width = 20;
  for (let j = 2; j <= n + 1; j++) {
    ws.getColumn(j).width = 4;
  }

  // Freeze first row and column
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];

  // ── Sheet 2: Nodes Reference ───────────────────────────────────────────
  const ns = wb.addWorksheet('Nodes');
  ns.addRow(['Index', 'ID', 'Label', 'Category', 'Subtype', 'Module', 'Description']);
  sorted.forEach((node, i) => {
    ns.addRow([i, node.id, node.label || node.id, node.category, node.subtype, node.moduleId, node.description || '']);
  });
  ns.getRow(1).font = { bold: true };
  ns.getColumn(1).width = 6;
  ns.getColumn(2).width = 25;
  ns.getColumn(3).width = 25;
  ns.getColumn(4).width = 10;
  ns.getColumn(5).width = 15;
  ns.getColumn(6).width = 8;
  ns.getColumn(7).width = 50;

  // ── Sheet 3: Existing Edges ────────────────────────────────────────────
  const es = wb.addWorksheet('Existing Edges');
  es.addRow(['ID', 'Source', 'Target', 'Relation', 'Confidence', 'Module', 'PMID', 'Key Insight']);
  for (const e of edges) {
    const srcNode = nodes.find(n => n.id === e.source);
    const tgtNode = nodes.find(n => n.id === e.target);
    es.addRow([
      e.id,
      srcNode?.label || e.source,
      tgtNode?.label || e.target,
      e.relation,
      e.causalConfidence || '',
      e.moduleId,
      e.pmid || e.evidence?.pmid || '',
      e.keyInsight || '',
    ]);
  }
  es.getRow(1).font = { bold: true };
  es.columns.forEach((col, i) => {
    col.width = [10, 25, 25, 15, 10, 8, 12, 40][i] || 15;
  });

  // ── Sheet 4: Legend ────────────────────────────────────────────────────
  const ls = wb.addWorksheet('Legend');
  ls.addRow(['Symbol', 'Relation', 'Description']);
  const legend = [
    ['↑', 'increases', 'Source increases target activity/level'],
    ['↑↑', 'directlyIncreases', 'Source directly increases target (no intermediaries)'],
    ['↓', 'decreases', 'Source decreases target activity/level'],
    ['↓↓', 'directlyDecreases', 'Source directly decreases target'],
    ['~', 'regulates', 'Source regulates target (direction context-dependent)'],
    ['→', 'produces', 'Source produces target'],
    ['⊣', 'inhibits', 'Source inhibits target'],
    ['✕', 'disrupts', 'Source disrupts target'],
    ['🛡', 'protects', 'Source protects target'],
    ['⊕', 'binds', 'Source binds to target'],
    ['⚡', 'catalyzes', 'Source catalyzes target'],
    ['', '', ''],
    ['Confidence', '', ''],
    ['L1', '', 'RCT with clinical endpoints'],
    ['L2', '', 'Mendelian randomization / natural experiments'],
    ['L3', '', 'GWAS + functional validation / knockout'],
    ['L4', '', 'Animal intervention studies'],
    ['L5', '', 'In vitro / cell culture'],
    ['L6', '', 'Observational / correlational'],
    ['L7', '', 'Expert opinion / review'],
  ];
  legend.forEach(row => ls.addRow(row));
  ls.getRow(1).font = { bold: true };
  ls.getColumn(1).width = 8;
  ls.getColumn(2).width = 20;
  ls.getColumn(3).width = 50;

  // Save
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  await wb.xlsx.writeFile(OUT_PATH);
  console.log(`\nWritten: ${OUT_PATH}`);
  console.log(`Matrix: ${n}×${n} with ${Object.keys(edgeLookup).length} existing edges filled`);
}

main().catch(console.error);
