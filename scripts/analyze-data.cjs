const d = require('../demo/src/data/ad-framework-data.json');

const connected = new Set();
d.edges.forEach(e => { connected.add(e.source); connected.add(e.target); });

const orphans = d.nodes.filter(n => !connected.has(n.id));
const noIncoming = d.nodes.filter(n => !d.edges.some(e => e.target === n.id));

console.log('Connected nodes:', connected.size);
console.log('Orphan nodes (no edges at all):', orphans.length);
console.log('Nodes with no incoming edges (layer 0 candidates):', noIncoming.length);
console.log();
console.log('Orphans by module:');
const byMod = {};
orphans.forEach(n => { byMod[n.moduleId] = (byMod[n.moduleId] || 0) + 1; });
Object.entries(byMod).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(' ', k, v));
