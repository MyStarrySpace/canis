const d = require('../demo/src/data/ad-framework-data.json');
const connected = new Set();
for (const e of d.edges) { connected.add(e.source); connected.add(e.target); }
const orphans = d.nodes.filter(n => !connected.has(n.id));

// Group orphans by module
const byModule = {};
for (const n of orphans) {
  byModule[n.moduleId] = byModule[n.moduleId] || [];
  byModule[n.moduleId].push(n.id);
}
console.log('=== ORPHAN NODES BY MODULE ===');
for (const [mod, ids] of Object.entries(byModule).sort((a,b) => b[1].length - a[1].length)) {
  console.log(`${mod} (${ids.length}): ${ids.join(', ')}`);
}
console.log('\nTotal orphans:', orphans.length, '/', d.nodes.length);

// Citation stats
let edgesWithPmid = 0, edgesWithAuthor = 0, edgesWithYear = 0, edgesWithMech = 0;
for (const e of d.edges) {
  if (e.pmid) edgesWithPmid++;
  if (e.firstAuthor) edgesWithAuthor++;
  if (e.year) edgesWithYear++;
  if (e.mechanismDescription) edgesWithMech++;
}
console.log('\n=== EDGE CITATION STATS ===');
console.log('Total edges:', d.edges.length);
console.log('With PMID:', edgesWithPmid);
console.log('With author:', edgesWithAuthor);
console.log('With year:', edgesWithYear);
console.log('With mechanism:', edgesWithMech);
console.log('Missing PMID:', d.edges.length - edgesWithPmid);

// Show edges missing citations
const missing = d.edges.filter(e => !e.pmid);
if (missing.length > 0) {
  console.log('\n=== EDGES MISSING PMID ===');
  for (const e of missing) {
    console.log(`  ${e.id}: ${e.source} -[${e.relation}]-> ${e.target} (${e.causalConfidence})`);
  }
}
