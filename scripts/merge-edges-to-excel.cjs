/**
 * Merge restored edges into the mechanistic framework Excel file.
 *
 * Usage:
 *   node scripts/merge-edges-to-excel.cjs
 *
 * This script:
 * 1. Reads restored-edges.json (71 edges recovered from pre-Excel edges.ts)
 * 2. Opens framework.xlsx in alz-market-viz
 * 3. Skips edges whose IDs already exist in the Edges sheet
 * 4. Appends the remaining new edges
 * 5. Saves the updated Excel file
 *
 * After running, regenerate data.ts:
 *   cd ../alz-market-viz && npx tsx scripts/generate-framework-data.ts
 */

const fs = require('fs');
const path = require('path');

// Resolve xlsx from alz-market-viz where it's installed
const ALZ_ROOT = path.resolve(__dirname, '..', '..', 'alz-market-viz');
const XLSX = require(path.join(ALZ_ROOT, 'node_modules', 'xlsx'));

// Paths
const RESTORED_EDGES_PATH = path.join(__dirname, 'restored-edges.json');
const EXCEL_PATH = path.resolve(__dirname, '..', '..', 'alz-market-viz', 'src', 'data', 'mechanisticFramework', 'framework.xlsx');

// Edge columns in the order they appear in the Excel sheet
const EDGE_COLUMNS = [
  'id', 'source', 'target', 'relation', 'moduleId',
  'causalConfidence', 'mechanismDescription', 'keyInsight',
  'pmid', 'firstAuthor', 'year', 'methodType', 'notes'
];

function main() {
  // 1. Read restored edges
  if (!fs.existsSync(RESTORED_EDGES_PATH)) {
    console.error(`Restored edges file not found: ${RESTORED_EDGES_PATH}`);
    process.exit(1);
  }
  const restoredEdges = JSON.parse(fs.readFileSync(RESTORED_EDGES_PATH, 'utf8'));
  console.log(`Read ${restoredEdges.length} restored edges from JSON`);

  // 2. Open Excel workbook
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`Excel file not found: ${EXCEL_PATH}`);
    process.exit(1);
  }
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets['Edges'];
  if (!ws) {
    console.error('No "Edges" sheet found in Excel file');
    process.exit(1);
  }

  // 3. Read existing edges and build ID set
  const existingRows = XLSX.utils.sheet_to_json(ws);
  const existingIds = new Set(existingRows.map(row => row.id));
  console.log(`Existing edges in Excel: ${existingRows.length}`);

  // 4. Filter out edges that already exist
  const newEdges = restoredEdges.filter(edge => !existingIds.has(edge.id));
  const skippedCount = restoredEdges.length - newEdges.length;
  console.log(`Skipping ${skippedCount} edges (already exist)`);
  console.log(`Appending ${newEdges.length} new edges`);

  if (newEdges.length === 0) {
    console.log('No new edges to add. Done.');
    return;
  }

  // 5. Prepare rows for appending - map fields to match Excel columns
  const newRows = newEdges.map(edge => {
    const row = {};
    for (const col of EDGE_COLUMNS) {
      if (col === 'keyInsight') {
        // Leave keyInsight empty for restored edges
        row[col] = '';
      } else if (col === 'notes') {
        row[col] = edge.notes || 'Restored from pre-Excel edges.ts';
      } else if (col === 'year' && edge[col] !== undefined) {
        // Ensure year is a number
        row[col] = typeof edge[col] === 'number' ? edge[col] : parseInt(edge[col], 10);
      } else if (edge[col] !== undefined && edge[col] !== null) {
        row[col] = String(edge[col]);
      } else {
        row[col] = '';
      }
    }
    return row;
  });

  // 6. Append new rows to the existing sheet
  // Convert all rows (existing + new) back to a sheet
  const allRows = [...existingRows, ...newRows];

  // Ensure all rows have all columns (fill missing columns with empty strings)
  const normalizedRows = allRows.map(row => {
    const normalized = {};
    for (const col of EDGE_COLUMNS) {
      normalized[col] = row[col] !== undefined && row[col] !== null ? row[col] : '';
    }
    return normalized;
  });

  // Replace the Edges sheet
  const newWs = XLSX.utils.json_to_sheet(normalizedRows, { header: EDGE_COLUMNS });

  // Set column widths for readability
  newWs['!cols'] = [
    { wch: 10 },  // id
    { wch: 30 },  // source
    { wch: 30 },  // target
    { wch: 20 },  // relation
    { wch: 8 },   // moduleId
    { wch: 16 },  // causalConfidence
    { wch: 60 },  // mechanismDescription
    { wch: 40 },  // keyInsight
    { wch: 12 },  // pmid
    { wch: 15 },  // firstAuthor
    { wch: 8 },   // year
    { wch: 20 },  // methodType
    { wch: 40 },  // notes
  ];

  wb.Sheets['Edges'] = newWs;

  // 7. Save the workbook
  XLSX.writeFile(wb, EXCEL_PATH);
  console.log(`\nSaved updated Excel file: ${EXCEL_PATH}`);
  console.log(`Total edges now: ${normalizedRows.length}`);

  // 8. Summary
  console.log('\n--- Summary ---');
  console.log(`  Before: ${existingRows.length} edges`);
  console.log(`  Added:  ${newEdges.length} edges`);
  console.log(`  Skipped: ${skippedCount} edges (duplicates)`);
  console.log(`  After:  ${normalizedRows.length} edges`);

  // Show which modules got new edges
  const moduleBreakdown = {};
  for (const edge of newEdges) {
    const mod = edge.moduleId || 'unknown';
    moduleBreakdown[mod] = (moduleBreakdown[mod] || 0) + 1;
  }
  console.log('\n  New edges by module:');
  for (const [mod, count] of Object.entries(moduleBreakdown).sort()) {
    console.log(`    ${mod}: ${count}`);
  }
}

main();
