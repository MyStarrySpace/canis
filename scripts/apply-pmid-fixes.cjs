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

  // === BATCH 2: LOW CONFIDENCE, verified via mechanism comparison ===
  {
    oldPmid: '20516212', newPmid: '37797582', newAuthor: 'Bell RD', newYear: 2023,
    edgeIds: ['E04.001'],
    reason: 'Bell 2023: Pericytes control neurovascular functions (BBB permeability)',
  },
  {
    oldPmid: '18227278', newPmid: '39358449', newAuthor: 'Narendra DP', newYear: 2024,
    edgeIds: ['LR.001'],
    reason: 'Narendra 2024: PINK1-Parkin in mitochondrial quality control',
  },
  {
    oldPmid: '16838177', newPmid: '25375761', newAuthor: 'Lesne SE', newYear: 2014,
    edgeIds: ['AB.004'],
    reason: 'Lesne 2014: Toxic oligomer species of Aβ in AD, a timing issue',
  },
  {
    oldPmid: '10866716', newPmid: '10737616', newAuthor: 'Reynolds CH', newYear: 2000,
    edgeIds: ['TP.002'],
    reason: 'Reynolds 2000: Phosphorylation sites on tau identified by nanoelectrospray MS',
  },
  {
    oldPmid: '26390242', newPmid: '26436904', newAuthor: 'Asai H', newYear: 2015,
    edgeIds: ['TP.009'],
    reason: 'Asai 2015: Microglia depletion and exosome inhibition halt tau propagation',
  },
  {
    oldPmid: '19703986', newPmid: '19302047', newAuthor: 'Dinarello CA', newYear: 2009,
    edgeIds: ['E04.011'],
    reason: 'Dinarello 2009: IL-1 family immunological and inflammatory functions',
  },
  {
    oldPmid: '19121329', newPmid: '17658666', newAuthor: 'Ojala J', newYear: 2009,
    edgeIds: ['E04.012'],
    reason: 'Ojala 2009: IL-18 increased in AD brains',
  },
  {
    oldPmid: '31497960', newPmid: '31585093', newAuthor: 'Neumann B', newYear: 2019,
    edgeIds: ['E13.010', 'E13.019'],
    reason: 'Neumann 2019: Metformin restores CNS remyelination by rejuvenating aged stem cells',
  },
  {
    oldPmid: '27723745', newPmid: '28738171', newAuthor: 'Brady OA', newYear: 2018,
    edgeIds: ['E02.021'],
    reason: 'Brady/Martina 2018: Emerging roles for TFEB in immune response and inflammation',
  },
  {
    oldPmid: '21982726', newPmid: '19428144', newAuthor: 'Rosario ER', newYear: 2009,
    edgeIds: ['E16.006'],
    reason: 'Rosario 2009: Brain levels of sex steroid hormones during aging and in AD',
  },
  {
    oldPmid: '16893461', newPmid: '16918589', newAuthor: 'Salpeter SR', newYear: 2006,
    edgeIds: ['E16.009'],
    reason: 'Salpeter 2006: HRT and metabolic syndrome components meta-analysis',
  },
  {
    oldPmid: '27801979', newPmid: '23535595', newAuthor: 'Tannahill GM', newYear: 2013,
    edgeIds: ['REC.022'],
    reason: 'Tannahill 2013: Succinate is inflammatory signal, induces IL-1β through HIF-1α',
  },
  {
    oldPmid: '21725313', newPmid: '41388821', newAuthor: 'Castellano T', newYear: 2025,
    edgeIds: ['E_CM.010'],
    reason: 'Castellano 2025: APOE, ABCA7 associated with earlier amyloid deposition',
  },
  {
    oldPmid: '23898162', newPmid: '24857020', newAuthor: 'Sanders DW', newYear: 2014,
    edgeIds: ['REC.046'],
    reason: 'Sanders 2014: Distinct tau prion strains propagate in cells and mice',
  },
  {
    oldPmid: '25065588', newPmid: '33431651', newAuthor: 'Giovinazzo D', newYear: 2021,
    edgeIds: ['REC.048'],
    reason: 'Giovinazzo 2021: H2S neuroprotective in AD by sulfhydrating GSK3β',
  },
  {
    oldPmid: '30455430', newPmid: '29317536', newAuthor: 'Sbodio JI', newYear: 2018,
    edgeIds: ['REC.049'],
    reason: 'Sbodio 2018: Golgi stress response reprograms cysteine metabolism for cytoprotection',
  },
  {
    oldPmid: '39420891', newPmid: '41452980', newAuthor: 'Chakraborty S', newYear: 2025,
    edgeIds: ['REC.050'],
    reason: 'Chakraborty 2025: Cystathionine γ-lyase regulates cognitive function via neurotrophins',
  },
  {
    oldPmid: '28611084', newPmid: '39796064', newAuthor: 'Arosio P', newYear: 2024,
    edgeIds: ['E09.010'],
    reason: 'Arosio 2024: A brief history of ferritin, an ancient and versatile protein',
  },
  {
    oldPmid: '16945100', newPmid: '27277824', newAuthor: 'Mahley RW', newYear: 2016,
    edgeIds: ['REC.069'],
    reason: 'Mahley 2016: ApoE from cardiovascular disease to neurodegenerative disorders',
  },
  {
    oldPmid: '29518356', newPmid: '27196974', newAuthor: 'Yuan P', newYear: 2016,
    edgeIds: ['E11.003'],
    reason: 'Yuan 2016: TREM2 haplodeficiency impairs microglia barrier function',
  },
  {
    oldPmid: '32860352', newPmid: '35291561', newAuthor: 'Montagne A', newYear: 2021,
    edgeIds: ['E12.030', 'E12.050'],
    reason: 'Montagne 2021: APOE4 accelerates vascular and neurodegenerative disorder in old AD mice',
  },
  {
    oldPmid: '22334919', newPmid: '27235807', newAuthor: 'Area-Gomez E', newYear: 2016,
    edgeIds: ['E14.001', 'E14.002', 'E14.003', 'E14.004', 'E14.006'],
    reason: 'Area-Gomez 2016: Mitochondria-associated ER membranes and Alzheimer disease',
  },
  {
    oldPmid: '20818845', newPmid: '20836898', newAuthor: 'Jones RW', newYear: 2010,
    edgeIds: ['E-THER.002'],
    reason: 'Jones 2010: Dimebon disappointment',
  },
  {
    oldPmid: '19341762', newPmid: '35573809', newAuthor: 'Lupien SJ', newYear: 2022,
    edgeIds: ['E20.010'],
    reason: 'Lupien 2022: Chronic stress, cortisol and brain effects',
  },

  // === BATCH 3: PubMed-verified targeted searches ===
  {
    oldPmid: '32768567', newPmid: '18794901', newAuthor: 'Dong XP', newYear: 2008,
    edgeIds: ['FL.001'],
    reason: 'Dong 2008: TRPML1 is an endolysosomal iron release channel',
  },
  {
    oldPmid: '22729161', newPmid: '33431651', newAuthor: 'Giovinazzo D', newYear: 2021,
    edgeIds: ['E07.025'],
    reason: 'Giovinazzo 2021: H2S neuroprotective by sulfhydrating GSK3β',
  },
  {
    oldPmid: '14986299', newPmid: '15535135', newAuthor: 'Sontag E', newYear: 2004,
    edgeIds: ['E07.011'],
    reason: 'Sontag 2004: PP2A carboxyl methylation downregulation in AD',
  },
  {
    oldPmid: '30177779', newPmid: '29865061', newAuthor: 'Lane DJR', newYear: 2018,
    edgeIds: ['E09.014'],
    reason: 'Lane 2018: Iron and AD, emerging mechanisms',
  },
  {
    oldPmid: '34433656', newPmid: '38637622', newAuthor: 'Rachmian N', newYear: 2024,
    edgeIds: ['E11.008', 'E11.009'],
    reason: 'Rachmian 2024: Senescent TREM2-expressing microglia in aging and AD',
  },
  {
    oldPmid: '32333900', newPmid: '32722745', newAuthor: 'Palmqvist S', newYear: 2020,
    edgeIds: ['E12.031'],
    reason: 'Palmqvist 2020: Plasma phospho-tau217 discriminates AD',
  },
  {
    oldPmid: '25599404', newPmid: '24670762', newAuthor: 'Lu T', newYear: 2014,
    edgeIds: ['E10.004', 'E10.005', 'E10.011', 'E10.012'],
    reason: 'Lu 2014: REST and stress resistance in ageing and AD',
  },
  {
    oldPmid: '16675393', newPmid: '16732273', newAuthor: 'Cardona AE', newYear: 2006,
    edgeIds: ['E05.016'],
    reason: 'Cardona 2006: CX3CR1 fractalkine receptor controls microglial neurotoxicity',
  },
  {
    oldPmid: '18923512', newPmid: '25078775', newAuthor: 'Seo JH', newYear: 2014,
    edgeIds: ['E13.024'],
    reason: 'Seo 2014: OPCs support BBB integrity via TGF-β signaling',
  },
  {
    oldPmid: '23463366', newPmid: '18837051', newAuthor: 'Todorich B', newYear: 2009,
    edgeIds: ['E13.040'],
    reason: 'Todorich 2009: Oligodendrocytes and myelination — role of iron',
  },
  {
    oldPmid: '15117386', newPmid: '14745052', newAuthor: 'Moffat SD', newYear: 2004,
    edgeIds: ['E16.005'],
    reason: 'Moffat 2004: Free testosterone and risk for AD in older men',
  },
  {
    oldPmid: '24524930', newPmid: '24553879', newAuthor: 'Letra L', newYear: 2014,
    edgeIds: ['E16.010'],
    reason: 'Letra 2014: Obesity as AD risk factor, role of adipocytokines',
  },
  {
    oldPmid: '32589960', newPmid: '31917687', newAuthor: 'Roy ER', newYear: 2020,
    edgeIds: ['E04.013'],
    reason: 'Roy 2020: Type I IFN response drives neuroinflammation in AD',
  },

  // === Year-only corrections (PMID is correct, year off by epub/print) ===
  {
    oldPmid: '19428144', newPmid: '19428144', newAuthor: 'Rosario ER', newYear: 2011,
    edgeIds: ['E16.006'],
    reason: 'Year correction: PubMed returns 2011 (print date vs 2009 epub)',
  },
  {
    oldPmid: '33068891', newPmid: '33068891', newAuthor: 'Chandra A', newYear: 2021,
    edgeIds: ['E12.015'],
    reason: 'Year+author correction: PubMed returns Chandra A 2021',
  },
  {
    oldPmid: '36613677', newPmid: '36613677', newAuthor: 'Palavicini JP', newYear: 2022,
    edgeIds: ['E10.018'],
    reason: 'Year correction: PubMed returns 2022 (print date vs 2023 epub)',
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
