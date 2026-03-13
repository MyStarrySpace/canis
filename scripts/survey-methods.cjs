const d = JSON.parse(require('fs').readFileSync('demo/src/data/ad-framework-data.json','utf-8'));
const methods = {};
const confs = {};
d.edges.forEach(e => {
  const m = e.methodType || (e.evidence && e.evidence.methodType) || 'none';
  const c = e.causalConfidence || '?';
  methods[m] = (methods[m]||0)+1;
  if (!confs[m]) confs[m] = {};
  confs[m][c] = (confs[m][c]||0)+1;
});
console.log('=== Method types → current confidence assignments ===');
Object.entries(methods).sort((a,b)=>b[1]-a[1]).forEach(([m,n]) => {
  const breakdown = Object.entries(confs[m]).map(([c,n])=>c+':'+n).join(', ');
  console.log('  ' + m.padEnd(20) + ' (' + String(n).padStart(3) + ') → ' + breakdown);
});
