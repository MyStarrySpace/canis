/**
 * Export the mechanistic framework data from alz-market-viz to a JSON file
 * for the CANIS demo.
 *
 * Usage: npx tsx scripts/export-framework-data.ts
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ALZ_DATA_PATH = resolve(__dirname, '../../alz-market-viz/src/data/mechanisticFramework/data.ts');
const OUTPUT_PATH = resolve(__dirname, '../demo/src/ad-framework-data.json');

// Read the TypeScript source and extract the data
const source = readFileSync(ALZ_DATA_PATH, 'utf-8');

// Extract allNodes array
const nodesMatch = source.match(/export const allNodes:.*?\[\n([\s\S]*?)\n\];/);
const edgesMatch = source.match(/export const allEdges:.*?\[\n([\s\S]*?)\n\];/);
const modulesMatch = source.match(/export const modules:.*?\[\n([\s\S]*?)\n\];/);

if (!nodesMatch || !edgesMatch || !modulesMatch) {
  console.error('Failed to extract data from data.ts');
  process.exit(1);
}

// Parse using eval-safe JSON (the data is already valid JSON-like)
const nodes = JSON.parse(`[${nodesMatch[1]}]`);
const edges = JSON.parse(`[${edgesMatch[1]}]`);
const modules = JSON.parse(`[${modulesMatch[1]}]`);

const output = { nodes, edges, modules };

writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
console.log(`Exported: ${nodes.length} nodes, ${edges.length} edges, ${modules.length} modules`);
console.log(`Written to: ${OUTPUT_PATH}`);
