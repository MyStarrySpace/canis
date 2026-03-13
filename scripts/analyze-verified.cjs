const v = JSON.parse(require('fs').readFileSync('output/verified-edges.json','utf-8'));

// Confidence breakdown
const conf = {};
v.forEach(e => { const c = e.verification.confidence; conf[c] = (conf[c]||0)+1; });
console.log('=== By Confidence Level ===');
Object.entries(conf).sort().forEach(([k,n]) => console.log('  ' + k + ': ' + n));

// Relation breakdown
const rel = {};
v.forEach(e => { const r = e.verification.relation; rel[r] = (rel[r]||0)+1; });
console.log('\n=== By Relation Type ===');
Object.entries(rel).sort((a,b) => b[1]-a[1]).forEach(([k,n]) => console.log('  ' + k + ': ' + n));

// PMID coverage
const withPmid = v.filter(e => {
  const p = e.verification.pmid;
  return p && p !== 'null' && p !== 'none' && p !== null;
}).length;
console.log('\n=== PMID Coverage ===');
console.log('  With PMID: ' + withPmid + '/' + v.length + ' (' + Math.round(withPmid/v.length*100) + '%)');
console.log('  PubMed hits (search found articles): ' + v.filter(e => e.pubmedHits > 0).length);

// Sample high-confidence edges
console.log('\n=== Sample L1-L3 Edges (first 15) ===');
v.filter(e => ['L1','L2','L3'].includes(e.verification.confidence))
  .slice(0,15)
  .forEach(e => {
    const d = e.verification;
    console.log('  ' + e.sourceLabel + ' -> ' + e.targetLabel + ' [' + d.relation + ', ' + d.confidence + '] PMID:' + (d.pmid||'none'));
  });

// Existing vs new
console.log('\n=== Summary ===');
console.log('  Total verified new edges: ' + v.length);
console.log('  Original edges in framework: 437');
console.log('  Would bring total to: ' + (437 + v.length));
