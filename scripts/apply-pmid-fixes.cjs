#!/usr/bin/env node
/**
 * Apply vetted PMID fixes from verify-sources --fix-pmids output.
 *
 * This script contains manually reviewed fixes from the automated search.
 * Only HIGH and vetted MEDIUM confidence fixes are included.
 *
 * Usage:
 *   node scripts/apply-pmid-fixes.cjs --dry-run    # preview changes
 *   node scripts/apply-pmid-fixes.cjs --apply       # write to data file
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'demo', 'src', 'data', 'ad-framework-data.json');

// ── Vetted fixes ───────────────────────────────────────────────────
// Each entry: { oldPmid, newPmid, newAuthor, newYear, edgeIds, reason }
// Only include fixes where the suggested paper clearly matches the edge's claim.

const FIXES = [
  // === HIGH CONFIDENCE (auto-confirmed) ===
  {
    oldPmid: '30256824', newPmid: '29499767', newAuthor: 'Nasrabady SE', newYear: 2018,
    edgeIds: ['E13.004', 'E13.005'],
    reason: 'Nasrabady 2018: White matter changes in AD, myelin and oligodendrocytes',
  },

  // === MEDIUM CONFIDENCE (manually vetted as correct) ===
  {
    oldPmid: '25190365', newPmid: '25204284', newAuthor: 'Kress BT', newYear: 2014,
    edgeIds: ['E01.012', 'E12.027'],
    reason: 'Kress 2014: Impairment of paravascular clearance pathways in aging brain (glymphatic)',
  },
  {
    oldPmid: '19029886', newPmid: '19242475', newAuthor: 'Laurén J', newYear: 2009,
    edgeIds: ['AB.005', 'E06.016', 'E08.006'],
    reason: 'Laurén 2009: PrPC mediates Aβ oligomer impairment of synaptic plasticity',
  },
  {
    oldPmid: '22622579', newPmid: '22820466', newAuthor: 'Um JW', newYear: 2012,
    edgeIds: ['AB.006'],
    reason: 'Um 2012: Aβ oligomer bound to PrP activates Fyn to impair neurons',
  },
  {
    oldPmid: '16219789', newPmid: '16262633', newAuthor: 'Liu F', newYear: 2005,
    edgeIds: ['TP.003'],
    reason: 'Liu 2005: PP1, PP2A, PP2B, PP5 regulate tau phosphorylation',
  },
  {
    oldPmid: '19864462', newPmid: '19903941', newAuthor: 'Mustafa AK', newYear: 2009,
    edgeIds: ['TSF.005'],
    reason: 'Mustafa 2009: H2S signals through protein S-sulfhydration',
  },
  {
    oldPmid: '28800352', newPmid: '28086931', newAuthor: 'Wang Y', newYear: 2017,
    edgeIds: ['E07.016'],
    reason: 'Wang 2017: Release and trans-synaptic transmission of Tau via exosomes',
  },
  {
    oldPmid: '35236985', newPmid: '35750033', newAuthor: 'Tcw J', newYear: 2022,
    edgeIds: ['E10.010', 'E10.009'],
    reason: 'Tcw 2022: Cholesterol and matrisome pathways dysregulated in astrocytes/microglia',
  },
  {
    oldPmid: '28885578', newPmid: '28855300', newAuthor: 'Schlepckow K', newYear: 2017,
    edgeIds: ['E11.005'],
    reason: 'Schlepckow 2017: AD-associated TREM2 variant at ADAM cleavage site affects shedding',
  },
  {
    oldPmid: '29576945', newPmid: '29590092', newAuthor: 'Mills EL', newYear: 2018,
    edgeIds: ['E05.017'],
    reason: 'Mills 2018: Itaconate is anti-inflammatory, activates Nrf2 via KEAP1 alkylation',
  },
  {
    oldPmid: '29190671', newPmid: '39639016', newAuthor: 'Baligács N', newYear: 2024,
    edgeIds: ['E05.024'],
    reason: 'Baligács 2024: Homeostatic microglia seed and activated microglia reshape plaques',
  },
  {
    oldPmid: '28678778', newPmid: '28678775', newAuthor: 'Fitzpatrick AWP', newYear: 2017,
    edgeIds: ['E07.013'],
    reason: 'Fitzpatrick 2017: Cryo-EM structures of tau filaments (PMID off by 3)',
  },
  {
    oldPmid: '19571805', newPmid: '18309046', newAuthor: 'Tanaka J', newYear: 2008,
    edgeIds: ['E08.012'],
    reason: 'Tanaka 2008: Protein synthesis and neurotrophin-dependent dendritic spine plasticity',
  },
  {
    oldPmid: '24371304', newPmid: '30855105', newAuthor: 'Ward RJ', newYear: 2019,
    edgeIds: ['E09.009'],
    reason: 'Ward 2019: "Ironing out the Brain" — iron metabolism in neurodegeneration',
  },
  {
    oldPmid: '23615282', newPmid: '23820773', newAuthor: 'Rouault TA', newYear: 2013,
    edgeIds: ['E09.012'],
    reason: 'Rouault 2013: Iron metabolism in the CNS, implications for neurodegeneration',
  },
  {
    oldPmid: '29566793', newPmid: '29953873', newAuthor: 'Lin YT', newYear: 2018,
    edgeIds: ['E10.007'],
    reason: 'Lin 2018: APOE4 causes widespread molecular/cellular AD-associated alterations',
  },
  {
    oldPmid: '33402403', newPmid: '37777962', newAuthor: 'Lee H', newYear: 2023,
    edgeIds: ['E10.008'],
    reason: 'Lee 2023: ApoE4-dependent lysosomal cholesterol accumulation impairs mitochondria',
  },
  {
    oldPmid: '23150934', newPmid: '23150908', newAuthor: 'Jonsson T', newYear: 2013,
    edgeIds: ['REC.079'],
    reason: 'Jonsson 2013: TREM2 variant associated with AD risk (PMID off by 26)',
  },
  {
    oldPmid: '32078042', newPmid: '32376954', newAuthor: 'Montagne A', newYear: 2020,
    edgeIds: ['E12.007'],
    reason: 'Montagne 2020: APOE4 leads to BBB dysfunction predicting cognitive decline',
  },
  {
    oldPmid: '14993904', newPmid: '14675724', newAuthor: 'Bartzokis G', newYear: 2004,
    edgeIds: ['E13.006'],
    reason: 'Bartzokis 2004: Age-related myelin breakdown model of cognitive decline and AD',
  },
  {
    oldPmid: '15322546', newPmid: '16399703', newAuthor: 'Kotter MR', newYear: 2006,
    edgeIds: ['E13.023'],
    reason: 'Kotter 2006: Myelin impairs CNS remyelination by inhibiting OPC differentiation',
  },
  {
    oldPmid: '35995993', newPmid: '35236988', newAuthor: 'Xiong J', newYear: 2022,
    edgeIds: ['E16.003'],
    reason: 'Xiong 2022: FSH blockade improves cognition in AD mice',
  },
  {
    oldPmid: '35367412', newPmid: '35427648', newAuthor: 'Komatsu A', newYear: 2022,
    edgeIds: ['E18.026', 'E18.027'],
    reason: 'Komatsu 2022: Ammonia induces amyloidogenesis in astrocytes via APP translocation',
  },
  {
    oldPmid: '36613108', newPmid: '36613677', newAuthor: 'Palavicini JP', newYear: 2023,
    edgeIds: ['E10.018'],
    reason: 'Palavicini 2023: Sulfatide deficiency (early AD lipidomic signature) causes brain ventricular enlargement',
  },

  // === LOW CONFIDENCE but manually verified ===
  {
    oldPmid: '16141271', newPmid: '17360908', newAuthor: 'Shankar GM', newYear: 2007,
    edgeIds: ['E08.013'],
    reason: 'Shankar 2007: Natural Aβ oligomers induce reversible synapse loss',
  },
  {
    oldPmid: '22696567', newPmid: '22622580', newAuthor: 'Bell RD', newYear: 2012,
    edgeIds: ['E_CM.009', 'E12.002', 'E12.003'],
    reason: 'Bell 2012: ApoE controls cerebrovascular integrity via cyclophilin A',
  },
  {
    oldPmid: '9461215', newPmid: '9450754', newAuthor: 'De Strooper B', newYear: 1998,
    edgeIds: ['AB.003'],
    reason: 'De Strooper 1998: PS1 deficiency inhibits normal APP cleavage',
  },
  {
    oldPmid: '27613435', newPmid: '27710785', newAuthor: 'Yuan P', newYear: 2016,
    edgeIds: ['E06.012'],
    reason: 'Yuan 2016: TREM2 haplodeficiency impairs microglia barrier function',
  },
  {
    oldPmid: '21576468', newPmid: '21454812', newAuthor: 'Castellano JM', newYear: 2011,
    edgeIds: ['E12.029'],
    reason: 'Castellano 2011: Hypoxia stimulates LRP1 expression through HIF-1α',
  },
];

// ── Main ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const doApply = args.includes('--apply');

if (!dryRun && !doApply) {
  console.log('Usage:');
  console.log('  node scripts/apply-pmid-fixes.cjs --dry-run    # preview changes');
  console.log('  node scripts/apply-pmid-fixes.cjs --apply       # write to data file');
  process.exit(0);
}

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const edgeMap = new Map(data.edges.map((e) => [e.id, e]));

let applied = 0;
let skipped = 0;
const notFound = [];

for (const fix of FIXES) {
  for (const edgeId of fix.edgeIds) {
    const edge = edgeMap.get(edgeId);
    if (!edge) {
      notFound.push(edgeId);
      continue;
    }
    const currentPmid = String(edge.pmid || '');
    if (currentPmid !== fix.oldPmid) {
      console.log(`  SKIP ${edgeId}: PMID already changed (${currentPmid} != ${fix.oldPmid})`);
      skipped++;
      continue;
    }
    if (dryRun) {
      console.log(`  ${edgeId}: ${fix.oldPmid} → ${fix.newPmid}  (${fix.newAuthor}, ${fix.newYear})`);
      console.log(`    ${fix.reason}`);
    }
    edge.pmid = fix.newPmid;
    edge.firstAuthor = fix.newAuthor;
    edge.year = fix.newYear;
    applied++;
  }
}

console.log(`\n${dryRun ? 'DRY RUN' : 'APPLIED'}:`);
console.log(`  Fixes:   ${FIXES.length} (${FIXES.reduce((s, f) => s + f.edgeIds.length, 0)} edges)`);
console.log(`  Applied: ${applied}`);
console.log(`  Skipped: ${skipped}`);
if (notFound.length > 0) {
  console.log(`  Not found: ${notFound.join(', ')}`);
}

if (doApply) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
  console.log(`\nWrote → ${DATA_PATH}`);
}
