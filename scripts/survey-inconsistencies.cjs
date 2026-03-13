const d = JSON.parse(require('fs').readFileSync('demo/src/data/ad-framework-data.json','utf-8'));

// All method types (case variants)
const methodCases = {};
d.edges.forEach(e => {
  const m = e.methodType || (e.evidence && e.evidence.methodType) || null;
  if (!m) return;
  const lower = m.toLowerCase();
  if (!methodCases[lower]) methodCases[lower] = new Set();
  methodCases[lower].add(m);
});

console.log('=== Method type case variants ===');
Object.entries(methodCases).forEach(([lower, variants]) => {
  if (variants.size > 1) {
    console.log('  CONFLICT: ' + [...variants].join(' / '));
  }
});

// All unique method types
const allMethods = new Set();
d.edges.forEach(e => {
  const m = e.methodType || (e.evidence && e.evidence.methodType);
  if (m) allMethods.add(m);
});
console.log('\n=== All unique method types ===');
[...allMethods].sort().forEach(m => console.log('  ' + m));

// Check verified edges method types
const v = JSON.parse(require('fs').readFileSync('output/verified-edges.json','utf-8'));
const vMethods = {};
v.forEach(e => {
  const m = e.verification.methodType || 'none';
  vMethods[m] = (vMethods[m]||0)+1;
});
console.log('\n=== Verified edge method types ===');
Object.entries(vMethods).sort((a,b)=>b[1]-a[1]).forEach(([m,n]) => {
  console.log('  ' + m.padEnd(25) + n);
});

// Check verified edges relation types
const vRelations = {};
v.forEach(e => {
  const r = e.verification.relation || 'none';
  vRelations[r] = (vRelations[r]||0)+1;
});
console.log('\n=== Verified edge relation types ===');
Object.entries(vRelations).sort((a,b)=>b[1]-a[1]).forEach(([r,n]) => {
  console.log('  ' + r.padEnd(25) + n);
});

// Edges with no methodType
const noMethod = d.edges.filter(e => !e.methodType && !(e.evidence && e.evidence.methodType)).length;
console.log('\n=== Edges missing methodType: ' + noMethod + '/' + d.edges.length + ' ===');

// Check confidence vs method type mismatches (using default scheme logic)
const schemeMap = {
  rct: 'L1', clinical_trial: 'L1', clinical_trial_failure: 'L1',
  mendelian_randomization: 'L2', mr: 'L2',
  knockout: 'L3', gwas: 'L3', transgenic: 'L3',
  intervention_animal: 'L4', animal: 'L4', epidemiological: 'L4', imaging: 'L4', intervention_human: 'L4',
  in_vitro: 'L5', intervention_cells: 'L5', biochemistry: 'L5', cryo_em: 'L5', transcriptomics: 'L5',
  cohort: 'L6', observational: 'L6', meta_analysis: 'L6',
  review: 'L7', expert_opinion: 'L7',
};

let mismatches = 0;
d.edges.forEach(e => {
  const m = (e.methodType || '').toLowerCase();
  if (!m) return;
  const expected = schemeMap[m];
  if (expected && e.causalConfidence !== expected) {
    mismatches++;
  }
});
console.log('=== Confidence vs scheme mismatches: ' + mismatches + ' ===');
