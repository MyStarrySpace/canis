#!/usr/bin/env node
/**
 * Strip renderer files from CANIS for headless-only builds.
 * Called by CI to produce the headless branch.
 *
 * Usage: node scripts/strip-renderer.mjs
 * Operates on the current working directory (should be a temp copy).
 */

import { readFileSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const root = process.cwd();

// 1. Remove react entry point
const reactEntry = join(root, 'src/react.ts');
if (existsSync(reactEntry)) {
  rmSync(reactEntry);
  console.log('Removed src/react.ts');
}

// 2. Remove components directory
const componentsDir = join(root, 'src/components');
if (existsSync(componentsDir)) {
  rmSync(componentsDir, { recursive: true });
  console.log('Removed src/components/');
}

// 3. Update package.json: remove ./react export, make react/xyflow non-peer
const pkgPath = join(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

// Remove ./react export
delete pkg.exports['./react'];

// Remove React and xyflow from peerDependencies
delete pkg.peerDependencies['@xyflow/react'];
delete pkg.peerDependencies['react'];
delete pkg.peerDependencies['react-dom'];

// Remove peerDependenciesMeta entries
delete pkg.peerDependenciesMeta['@xyflow/react'];
delete pkg.peerDependenciesMeta['react'];
delete pkg.peerDependenciesMeta['react-dom'];

// Clean up empty objects
if (Object.keys(pkg.peerDependencies).length === 0) {
  delete pkg.peerDependencies;
}
if (Object.keys(pkg.peerDependenciesMeta).length === 0) {
  delete pkg.peerDependenciesMeta;
}

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('Updated package.json (removed react exports and peer deps)');

// 4. Update tsup.config.ts: remove react entry
const tsupPath = join(root, 'tsup.config.ts');
let tsupContent = readFileSync(tsupPath, 'utf-8');
tsupContent = tsupContent.replace(/\s*react:\s*'src\/react\.ts',?\n?/, '\n');
writeFileSync(tsupPath, tsupContent);
console.log('Updated tsup.config.ts (removed react entry)');

console.log('\nHeadless strip complete.');
