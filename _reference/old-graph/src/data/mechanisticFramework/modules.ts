/**
 * Module definitions for the AD Mechanistic Framework
 *
 * 16 core modules + 2 supplementary modules covering the complete
 * pathophysiology of Alzheimer's disease from upstream causes to
 * clinical outcomes.
 */

import type { MechanisticModule } from './types';

export const modules: MechanisticModule[] = [
  // ============================================================================
  // UPSTREAM MODULES (1-3): Initial Dysfunction
  // ============================================================================
  {
    id: 'M01',
    name: 'Insulin/mTOR/Autophagy Axis',
    shortName: 'mTOR/Autophagy',
    description: 'Metabolic dysfunction driving lysosomal and mitochondrial failure',
    overview: `
      Module 1 describes how insulin resistance leads to chronic mTORC1 hyperactivation,
      which phosphorylates and inactivates TFEB (lysosomal gene transcription) and
      ULK1/AMPK (autophagy initiation). This creates the upstream conditions for
      lysosomal and mitochondrial dysfunction in Modules 2-3.
    `.trim(),
    keyFindings: [
      'Brain insulin resistance precedes clinical AD by decades ("Type 3 Diabetes")',
      'mTORC1 hyperactivation is central to autophagy/lysosomal failure',
      'S6K1-IRS1 feedback loop creates self-amplifying insulin resistance',
    ],
    paradigmShifts: [
      { year: 2005, discovery: '"Type 3 Diabetes" concept - brain-specific insulin resistance in AD', pmid: '15750215' },
      { year: 2012, discovery: 'mTORC1-TFEB axis controls lysosomal biogenesis', pmid: '22343943' },
    ],
    upstreamModules: [],
    downstreamModules: ['M02', 'M03'],
    landmarkPapers: [
      { pmid: '15750215', discovery: 'Steen 2005 - Brain insulin resistance in AD' },
      { pmid: '22343943', discovery: 'Settembre 2012 - mTORC1-TFEB lysosome signaling' },
      { pmid: '35654956', discovery: 'Lee 2022 - Autolysosome acidification failure (PANTHOS)' },
    ],
    therapeuticTargets: ['mtorc1_hyperactive', 'tfeb_phosphorylated', 's6k1_active'],
    interventionWindow: 'prevention',
    color: '#486393',
    icon: 'Zap',
  },

  {
    id: 'M02',
    name: 'Lysosomal Pathology',
    shortName: 'Lysosomal',
    description: 'Lysosomal dysfunction leading to LMP and inflammatory activation',
    overview: `
      Module 2 describes two routes from lysosomal dysfunction to inflammation:
      Route 1A: Cargo accumulation → lipofuscin → LMP → cathepsin B → NLRP3
      Route 1B: Incomplete mitophagy → mtDNA undegraded → escape → cGAS-STING

      Both routes converge on inflammatory signaling in Module 4.
    `.trim(),
    keyFindings: [
      'Lipofuscin directly causes lysosomal membrane permeabilization',
      'DNase II requires acidic pH - fails in dysfunctional lysosomes',
      'Cathepsin B release is a universal NLRP3 trigger',
    ],
    paradigmShifts: [
      { year: 2012, discovery: 'Undegraded mtDNA in autolysosomes triggers inflammation', pmid: '22535248' },
      { year: 2021, discovery: 'Lipofuscin-induced LMP and necroptosis', pmid: '34782457' },
    ],
    upstreamModules: ['M01'],
    downstreamModules: ['M04'],
    landmarkPapers: [
      { pmid: '22535248', discovery: 'Oka 2012 - mtDNA escape from autolysosomes' },
      { pmid: '34782457', discovery: 'Pan 2021 - Lipofuscin causes LMP' },
      { pmid: '18604214', discovery: 'Hornung 2008 - Cathepsin B activates NLRP3' },
    ],
    therapeuticTargets: ['lipofuscin', 'cathepsin_b_cytosolic'],
    interventionWindow: 'prevention',
    color: '#007385',
    icon: 'Box',
  },

  {
    id: 'M03',
    name: 'Mitochondrial Dysfunction',
    shortName: 'Mitochondrial',
    description: 'Direct mtDNA release via mPTP/VDAC (pre-lysosomal pathway)',
    overview: `
      Module 3 describes Route 2: mtDNA release directly from damaged mitochondria
      via mPTP and VDAC pores, BEFORE lysosomal involvement. Key discovery:
      oxidation state determines pathway - ox-mtDNA → NLRP3, non-ox-mtDNA → cGAS-STING.

      PINK1/Parkin mitophagy is the protective gatekeeper.
    `.trim(),
    keyFindings: [
      'FEN1 cleaves ox-mtDNA into 500-650 bp fragments that exit via mPTP/VDAC',
      'Oxidation state determines sensor: ox-mtDNA→NLRP3, non-ox-mtDNA→cGAS',
      'PINK1/Parkin mitophagy prevents mtDNA release (removes damaged mito first)',
    ],
    paradigmShifts: [
      { year: 2022, discovery: 'Complete mechanism of mtDNA release and sensor selectivity', pmid: '35835107' },
    ],
    upstreamModules: ['M01'],
    downstreamModules: ['M04'],
    landmarkPapers: [
      { pmid: '35835107', discovery: 'Xian 2022 - mPTP/VDAC mtDNA release mechanism' },
      { pmid: '33029617', discovery: 'Borsche 2020 - PINK1/Parkin deficiency increases inflammation (human)' },
    ],
    therapeuticTargets: ['FEN1', 'mptp_open', 'pink1_parkin'],
    interventionWindow: 'prevention',
    color: '#60a5fa',
    icon: 'Battery',
  },

  // ============================================================================
  // INFLAMMATORY HUB (Module 4): Central Convergence
  // ============================================================================
  {
    id: 'M04',
    name: 'Inflammasome & Cytokines',
    shortName: 'Inflammasome',
    description: 'NLRP3 and cGAS-STING convergence point',
    overview: `
      Module 4 is the CONVERGENCE POINT where upstream damage signals are transduced
      into inflammatory outputs. Two parallel pathways:
      1. NLRP3 inflammasome: ox-mtDNA, cathepsin B → caspase-1 → IL-1β
      2. cGAS-STING: cytosolic mtDNA → Type I IFN

      Critical 2019-2023 paradigm shifts: NLRP3 drives tau pathology, cGAS-STING
      drives aging inflammation.
    `.trim(),
    keyFindings: [
      'NLRP3-/- mice are protected from AD pathology and cognitive decline',
      'NLRP3 drives tau hyperphosphorylation via GSK3β↑ and PP2A↓',
      'cGAS-STING drives aging-related inflammation and neurodegeneration',
      'Tau aggregates activate NLRP3 (creates feedforward loop)',
    ],
    paradigmShifts: [
      { year: 2013, discovery: 'NLRP3-/- protects APP/PS1 mice from AD', pmid: '23254930' },
      { year: 2019, discovery: 'NLRP3 drives tau pathology via GSK3β/PP2A', pmid: '31748742' },
      { year: 2023, discovery: 'cGAS-STING drives aging inflammation and neurodegeneration', pmid: '37532932' },
    ],
    upstreamModules: ['M02', 'M03'],
    downstreamModules: ['M05', 'M06', 'M07'],
    landmarkPapers: [
      { pmid: '23254930', discovery: 'Heneka 2013 - NLRP3 in AD' },
      { pmid: '31748742', discovery: 'Ising 2019 - NLRP3 drives tau' },
      { pmid: '37532932', discovery: 'Gulen 2023 - cGAS-STING in aging' },
    ],
    therapeuticTargets: ['nlrp3_active', 'sting_active', 'gsk3b_active'],
    interventionWindow: 'early_treatment',
    color: '#C9461D',
    icon: 'Flame',
  },

  // ============================================================================
  // CELLULAR RESPONSE MODULES (5-7)
  // ============================================================================
  {
    id: 'M05',
    name: 'Microglial Phenotypes',
    shortName: 'Microglia',
    description: 'PARADIGM SHIFT: Microglia SEED plaques, not clear them. LDAM, DAM, A1 astrocyte induction.',
    overview: `
      PARADIGM SHIFT: Microglia don't just fail to clear Aβ—they actively SEED plaques.

      The LDAM (Lipid-Droplet Accumulating Microglia) phenotype represents metabolically
      dysfunctional cells where:
      1. mTOR-HIF1α axis drives glycolytic shift (validated in human AD tissue)
      2. IRG1/itaconate shunt disrupts TCA cycle
      3. Compensatory glutaminolysis produces toxic ammonia
      4. Iron accumulation + lysosomal dysfunction = "super-seeder" state
      5. These microglia AGGREGATE Aβ, not clear it (Baligács 2024)

      This explains why anti-amyloid therapies have limited success: they target the
      OUTPUT of microglial dysfunction, not the upstream metabolic collapse.

      40Hz gamma therapy works by enhancing glymphatic clearance—removing Aβ BEFORE
      microglia can process it.
    `.trim(),
    keyFindings: [
      'PARADIGM SHIFT: Microglia SEED plaques—when depleted, insoluble Aβ DECREASES (Baligács 2024)',
      'mTOR-HIF1α axis drives glycolytic shift in AD microglia (validated in human tissue)',
      'LDAM microglia are defective in phagocytosis and produce high ROS',
      'DAM is a two-step TREM2-dependent protective response',
      'IL-1α + TNF + C1q from microglia induce neurotoxic A1 astrocytes',
      '~40-50% of Aβ accumulation comes from microglial ASC specks (Venegas 2017)',
    ],
    upstreamModules: ['M04'],
    downstreamModules: ['M06', 'M08'],
    landmarkPapers: [
      { pmid: '31959936', discovery: 'Marschallinger 2020 - LDAM discovery' },
      { pmid: '28099414', discovery: 'Liddelow 2017 - A1 astrocyte induction' },
      { pmid: '28602351', discovery: 'Keren-Shaul 2017 - DAM discovery' },
      { pmid: 'PENDING', discovery: 'Baligács 2024 - Microglia SEED plaques paradigm reversal' },
    ],
    color: '#f472b6',
    icon: 'Brain',
  },

  {
    id: 'M06',
    name: 'Amyloid Pathology',
    shortName: 'Amyloid',
    description: 'Aβ production, oligomerization, and clearance failure',
    overview: `
      Module 6 describes the amyloid cascade: NF-κB → BACE1 upregulation → Aβ
      production → oligomer formation → synapse toxicity and microglial activation.
      LDAM impairs Aβ clearance. Plaque compaction by TREM2+ microglia may be protective.
    `.trim(),
    keyFindings: [
      'Aβ oligomers (NOT monomers or fibrils) are the synaptotoxic species',
      'Inflammation (NF-κB) upregulates BACE1 → increased Aβ production',
      'Microglia form protective barriers around plaques (plaque compaction)',
      'LDAM impairs phagocytic Aβ clearance',
    ],
    upstreamModules: ['M04', 'M05'],
    downstreamModules: ['M04'], // Feedforward loop
    landmarkPapers: [
      { pmid: '12130773', discovery: 'Hardy & Selkoe 2002 - Amyloid hypothesis' },
      { pmid: '11932745', discovery: 'Walsh 2002 - Oligomers are synaptotoxic' },
      { pmid: '25630253', discovery: 'Condello 2015 - Microglia barrier function' },
    ],
    color: '#8ecae6',
    icon: 'CircleDot',
  },

  {
    id: 'M07',
    name: 'Tau Pathology',
    shortName: 'Tau',
    description: 'Tau hyperphosphorylation, aggregation, and spreading',
    overview: `
      Module 7 describes tau pathology: NLRP3 → GSK3β↑/PP2A↓ → tau hyperphosphorylation
      → PHF/NFT → Braak staging propagation. Includes the protective CSE/H₂S pathway
      that inhibits GSK3β via sulfhydration.
    `.trim(),
    keyFindings: [
      'NLRP3 activates GSK3β and inhibits PP2A → tau hyperphosphorylation',
      'Microglia spread tau via exosomes (tau propagation vectors)',
      'CSE/H₂S pathway protects tau via GSK3β sulfhydration',
      'Wild-type tau binds and enhances CSE; mutant tau cannot',
    ],
    upstreamModules: ['M04'],
    downstreamModules: ['M04'], // Tau → NLRP3 feedback
    landmarkPapers: [
      { pmid: '31748742', discovery: 'Ising 2019 - NLRP3 drives tau' },
      { pmid: '26436904', discovery: 'Asai 2015 - Microglia spread tau via exosomes' },
      { pmid: '33431651', discovery: 'Giovinazzo 2021 - H₂S sulfhydrates GSK3β' },
    ],
    color: '#a78bfa',
    icon: 'GitBranch',
  },

  // ============================================================================
  // DOWNSTREAM PATHOLOGY MODULES (8-9)
  // ============================================================================
  {
    id: 'M08',
    name: 'Complement & Synaptic Pruning',
    shortName: 'Complement',
    description: 'C1q-C3-CR3 synaptic elimination cascade',
    overview: `
      Module 8 describes reactivation of developmental synapse pruning:
      C1q increases 300-fold with aging, tags synapses for elimination,
      C3 opsonization, CR3 on microglia engulfs tagged synapses.

      EARLY therapeutic window: complement inhibition before plaque deposition.
    `.trim(),
    keyFindings: [
      'C1q increases 300-fold with aging in mouse/human brain',
      'C1q-C3-CR3 pathway mediates synapse elimination in AD',
      'C1q-/- mice have better cognition and preserved synapses',
      'Complement inhibition has EARLY therapeutic window',
    ],
    upstreamModules: ['M05'],
    downstreamModules: [],
    landmarkPapers: [
      { pmid: '18083105', discovery: 'Stevens 2007 - Complement in synapse elimination' },
      { pmid: '27033548', discovery: 'Hong 2016 - C1q-C3-CR3 in AD synapse loss' },
      { pmid: '23946404', discovery: 'Stephan 2013 - C1q increases 300-fold with aging' },
    ],
    therapeuticTargets: ['c1q', 'C3', 'CR3'],
    interventionWindow: 'prevention',
    color: '#34d399',
    icon: 'Scissors',
  },

  {
    id: 'M09',
    name: 'Iron Dysregulation & Ferroptosis',
    shortName: 'Iron/Ferroptosis',
    description: 'Iron accumulation, functional deficiency, and ferroptotic death',
    overview: `
      Module 9 describes the iron paradox: brain iron ACCUMULATES but is SEQUESTERED
      (ferritin/lysosomes), creating FUNCTIONAL iron deficiency. Global chelation
      worsens outcomes; targeted ferroptosis in senescent cells improves them.

      Sex difference: women's microglia fail to properly store iron in ferritin.
    `.trim(),
    keyFindings: [
      'Iron accumulates but is sequestered → functional deficiency',
      'Global chelation (deferiprone) WORSENS PD patients',
      'Targeted ferroptosis in senescent cells IMPROVES aged mice',
      'CSE depletion creates double-hit: more iron + less GPX4',
    ],
    upstreamModules: ['M04'],
    downstreamModules: [],
    landmarkPapers: [
      { pmid: '22632970', discovery: 'Dixon 2012 - Ferroptosis discovery' },
      { pmid: '38036770', discovery: 'Maus 2023 - Iron drives senescence/SASP' },
    ],
    therapeuticTargets: ['ferroportin', 'hepcidin', 'GPX4'],
    interventionWindow: 'treatment',
    color: '#fbbf24',
    icon: 'Magnet',
  },

  // ============================================================================
  // GENETIC/RISK MODIFIER MODULES (10-11)
  // ============================================================================
  {
    id: 'M10',
    name: 'APOE4 Pathways & REST/Epigenetic Dysregulation',
    shortName: 'APOE4/REST',
    description: 'APOE4 lipid dysfunction and REST nuclear depletion',
    overview: `
      Module 10 describes two major genetic/epigenetic pathways:
      1. APOE4: domain interaction → reduced lipidation → impaired Aβ clearance,
         lysosomal cholesterol sequestration, ferroptosis vulnerability
      2. REST: increases with normal aging (protective) but depleted in AD →
         loss of stress resistance and Nrf2-mediated antioxidant response
    `.trim(),
    keyFindings: [
      'APOE4 drives lysosomal cholesterol sequestration → false low signal',
      'APOE4 astrocytes form larger LDs enriched in unsaturated TAG → ferroptosis',
      'REST increases in healthy aging but DECREASES in AD',
      'REST upregulates Nrf2 → antioxidant/anti-ferroptotic genes',
    ],
    upstreamModules: [],
    downstreamModules: ['M02', 'M09', 'M12'],
    landmarkPapers: [
      { pmid: '35802023', discovery: 'Tcw 2022 - APOE4 lysosomal cholesterol sequestration' },
      { pmid: '24670762', discovery: 'Lu 2014 - REST in aging and AD' },
    ],
    color: '#C3577F',
    icon: 'Dna',
  },

  {
    id: 'M11',
    name: 'TREM2 & DAM',
    shortName: 'TREM2/DAM',
    description: 'TREM2 variants and disease-associated microglia',
    overview: `
      Module 11 describes TREM2 biology: R47H/R62H variants confer ~3x AD risk,
      TREM2 required for Stage 2 DAM transition, plaque compaction, lysosomal function.

      Key paradox: TREM2 is required for both protective DAM AND senescent microglia.
      Timing-dependent: beneficial EARLY, potentially harmful MID-stage.
    `.trim(),
    keyFindings: [
      'TREM2 R47H variant confers ~3-fold AD risk',
      'TREM2 required for DAM Stage 2 transition (protective)',
      'TREM2 also promotes senescent TREM2+ microglia (harmful)',
      'Timing-dependent: TREM2 agonism beneficial EARLY only',
    ],
    upstreamModules: [],
    downstreamModules: ['M05', 'M06'],
    landmarkPapers: [
      { pmid: '23150908', discovery: 'Jonsson 2013 - TREM2 R47H variant' },
      { pmid: '28602351', discovery: 'Keren-Shaul 2017 - DAM discovery' },
      { pmid: '38637622', discovery: 'Rachmian 2024 - Senescent TREM2+ microglia' },
    ],
    color: '#7ED3FF',
    icon: 'Radar',
  },

  // ============================================================================
  // CLEARANCE/BARRIER MODULES (12-13)
  // ============================================================================
  {
    id: 'M12',
    name: 'BBB & Glymphatic',
    shortName: 'BBB/Glymphatic',
    description: 'Blood-brain barrier and glymphatic clearance dysfunction',
    overview: `
      Module 12 describes clearance failures: BBB breakdown via APOE4-CypA-MMP9
      pathway, meningeal lymphatic decline with aging, glymphatic sleep-dependent
      clearance. APOE4 BBB dysfunction predicts cognitive decline INDEPENDENTLY
      of Aβ/tau.
    `.trim(),
    keyFindings: [
      'APOE4 → CypA↑ → MMP9↑ → tight junction degradation → BBB breakdown',
      'BBB breakdown predicts decline INDEPENDENT of Aβ/tau',
      'Sleep → 60% ISF expansion → 2x Aβ clearance rate',
      'Meningeal lymphatics decline with aging; VEGF-C restores function',
    ],
    upstreamModules: ['M10'],
    downstreamModules: [],
    landmarkPapers: [
      { pmid: '32376954', discovery: 'Montagne 2020 - APOE4-BBB-cognition axis' },
      { pmid: '22896675', discovery: 'Iliff 2012 - Glymphatic discovery' },
      { pmid: '24136970', discovery: 'Xie 2013 - Sleep drives clearance' },
    ],
    color: '#FFA380',
    icon: 'Shield',
  },

  {
    id: 'M13',
    name: 'Cholinergic & White Matter',
    shortName: 'Cholinergic',
    description: 'Cholinergic degeneration and white matter pathology',
    overview: `
      Module 13 describes cholinergic neurodegeneration (basis of current symptomatic
      treatments) and white matter/myelin pathology. These are often considered
      downstream consequences but have important therapeutic implications.
    `.trim(),
    upstreamModules: ['M04', 'M07'],
    downstreamModules: [],
    color: '#787473',
    icon: 'Cable',
  },

  // ============================================================================
  // ER-MITOCHONDRIA MODULE (14)
  // ============================================================================
  {
    id: 'M14',
    name: 'MAM & Calcium',
    shortName: 'MAM/Calcium',
    description: 'Mitochondria-associated ER membranes and calcium dysregulation',
    overview: `
      Module 14 describes the MAM hypothesis: FAD mutations (PS1, PS2, APP) cause
      MAM hyperconnectivity → increased ER-mito Ca²⁺ transfer, enhanced γ-secretase
      activity at MAM, and lipid dysmetabolism.
    `.trim(),
    keyFindings: [
      'PS2 enhances Mfn2 binding → increased ER-mito tethering',
      'APP C99 accumulates at MAM → cholesterol enrichment',
      'MAM hyperconnectivity → γ-secretase activity, Ca²⁺ overload',
    ],
    upstreamModules: [],
    downstreamModules: ['M03', 'M06'],
    color: '#E5AF19',
    icon: 'Link',
  },

  // ============================================================================
  // CLINICAL/INTERVENTION MODULE (15)
  // ============================================================================
  {
    id: 'M15',
    name: 'Interventions & Clinical Boundaries',
    shortName: 'Interventions',
    description: 'Therapeutic targets and clinical outcome boundaries',
    overview: `
      Module 15 defines intervention nodes (drugs, lifestyle) and clinical outcome
      boundaries (cognitive scores, biomarkers, diagnosis). Includes the clinical
      trial failure framework: MECHANISM → CSF → target engagement → biomarker → clinical.
    `.trim(),
    keyFindings: [
      'Four failure points: PK, biomarker, clinical, implementation',
      'Most failures are timing failures (too late in disease)',
      'Biomarker changes without clinical benefit = wrong target or timing',
    ],
    upstreamModules: [],
    downstreamModules: [],
    color: '#c75146',
    icon: 'Pill',
  },

  // ============================================================================
  // MODIFIER MODULE (16)
  // ============================================================================
  {
    id: 'M16',
    name: 'Sex & Ancestry Modifiers',
    shortName: 'Sex/Ancestry',
    description: 'Biological sex and genetic ancestry effects on AD pathways',
    overview: `
      Module 16 describes effect modifiers: sex (hormones, X-linked genes, iron
      metabolism) and ancestry (APOE4 penetrance, fat distribution, immune signatures).
      These modify the strength of edges throughout the network rather than adding
      new nodes.
    `.trim(),
    keyFindings: [
      'X-linked lysosomal genes (ATP6AP2, SLC9A7) affect lysosomal pH',
      'Women have opposite iron-ferritin correlations in AD (storage failure)',
      'APOE4 effect attenuated in African ancestry',
      'Menopause + FSH↑ creates perfect storm for AD acceleration',
    ],
    upstreamModules: [],
    downstreamModules: ['M02', 'M09', 'M10'],
    color: '#5a8a6e',
    icon: 'Users',
  },

  // ============================================================================
  // TRAINED IMMUNITY / VACCINE-MEDIATED NEUROPROTECTION MODULE (17)
  // ============================================================================
  {
    id: 'M17',
    name: 'Trained Immunity / Vaccine-Mediated Neuroprotection',
    shortName: 'Trained Immunity',
    description: 'Vaccine-induced epigenetic reprogramming of innate immune cells including microglia',
    overview: `
      Module 17 describes trained immunity as the mechanism by which vaccines protect against dementia.

      CRITICAL FINDING: Both adjuvanted (Shingrix, Arexvy) AND non-adjuvanted (Zostavax, BCG) vaccines
      show 17-45% dementia reduction. This rules out adjuvant-specific mechanisms and points to
      trained immunity as the unifying mechanism.

      Trained immunity is long-term functional reprogramming of innate immune cells via:
      - Epigenetic modifications (H3K4me3, H3K27ac)
      - Metabolic reprogramming (glycolysis, TCA cycle)
      - Duration: months to years (possibly lifelong)

      Microglia are ideal substrates: long-lived, self-renewing, and can be trained by peripheral
      immune challenges. This may explain why vaccination protects the aging brain.
    `.trim(),
    upstreamModules: [],
    downstreamModules: ['M06', 'M08'],
    color: '#9B59B6',
    icon: 'Shield',
  },

  // ============================================================================
  // ASTROCYTE ENDFOOT INTEGRITY MODULE (18)
  // ============================================================================
  {
    id: 'M18',
    name: 'Astrocyte Endfoot Integrity / Clasmatodendrosis',
    shortName: 'Endfoot Integrity',
    description: 'Astrocytic endfoot dysfunction from AEP-mediated vimentin cleavage through clasmatodendrosis to biomarker release',
    overview: `
Module 18 captures the earliest detectable pathological cascade in Alzheimer's disease—astrocyte endfoot damage. Alois Alzheimer described this pathology in 1910, but it was largely ignored for over a century.

The molecular mechanism was recently elucidated: δ-secretase (AEP) cleaves vimentin at N283, disrupting the vimentin-GFAP network that maintains endfoot structural integrity. This triggers clasmatodendrosis—fragmentation and retraction of astrocyte endfeet from blood vessels.

Endfoot retraction has critical downstream consequences:
• Loss of AQP4 polarization (water channels redistributed from endfeet)
• Glymphatic failure (impaired Aβ and tau clearance)
• BBB dysfunction (loss of glia limitans)
• GFAP release (measurable biomarker)
• Perivascular space enlargement (MRI-visible)

Crucially, these changes occur 10-20 YEARS before cognitive symptoms, making this the earliest intervention window in AD.
    `.trim(),
    keyFindings: [
      'Alzheimer described clasmatodendrosis in 1910; ignored until ~2016',
      'AEP cleaves vimentin at N283, disrupting GFAP network (Zhang 2025)',
      'Clasmatodendrosis increases 11-fold with aging (Chen 2016)',
      'PVS enlargement detectable 18 years before dementia (Leone 2025)',
      'GFAP elevation precedes symptoms by 10 years (Varma 2024)',
      'Environmental enrichment can reverse clasmatodendrosis (Hase 2017)',
    ],
    paradigmShifts: [
      { year: 1910, discovery: 'Alzheimer describes astrocyte process loss after ischemia', pmid: 'historical' },
      { year: 2016, discovery: 'Chen links clasmatodendrosis to AQP4 depolarization in dementia', pmid: '26667280' },
      { year: 2020, discovery: 'Marschallinger rediscovers LDAM (Alzheimer 1907 observation)', pmid: '31959936' },
      { year: 2025, discovery: 'Zhang identifies AEP-vimentin cleavage as molecular mechanism', pmid: '40243407' },
    ],
    upstreamModules: ['M03', 'M04', 'M05'],
    downstreamModules: ['M06', 'M07', 'M08', 'M12'],
    landmarkPapers: [
      { pmid: '26667280', discovery: 'Chen 2016 - Clasmatodendrosis in aging/dementia' },
      { pmid: '40243407', discovery: 'Zhang 2025 - AEP cleaves vimentin, disrupts GFAP' },
      { pmid: '11180514', discovery: 'Hulse 2001 - Rediscovery of Alzheimer 1910' },
      { pmid: '28399892', discovery: 'Hase 2017 - Environmental enrichment reverses' },
    ],
    therapeuticTargets: ['aep_active', 'vimentin_intact', 'clasmatodendrosis'],
    interventionWindow: 'prevention',
    color: '#DDA0DD',
    icon: 'GitBranch',
  },

  // ============================================================================
  // POST-INFECTIOUS / AUTOIMMUNE MODULE (19)
  // ============================================================================
  {
    id: 'M19',
    name: 'Post-Infectious / Autoimmune Pathways',
    shortName: 'Post-Infectious',
    description: 'ME/CFS-AD connection, GPCR autoantibodies, trained immunity, and Long COVID neurodegeneration',
    overview: `
Module 19 captures the emerging understanding that post-infectious autoimmunity is a major
driver of neurodegeneration. Key discoveries:

ME/CFS-ALZHEIMER'S CONNECTION:
- Same GPCR autoantibody signature in ME/CFS, Long COVID, and AD
- 91% of AD patients have GPCR-AABs vs 33% in Lewy body dementia (Wallukat 2018)
- Suggests AD may be fundamentally an autoimmune vascular disease

COVID-19 PUBLIC HEALTH WARNING:
- 69% increased AD risk within 1 year of infection (Wang 2022)
- 59% increase in pTau-181 in Long COVID with CNS symptoms (Yang 2026)
- We may see a massive wave of early-onset AD in 10-20 years

GPCR AUTOANTIBODY PATHWAY:
- Infection → chronic immune activation → GPCR-AAB production
- GPCR-AABs → vasoregulatory dysfunction → microcirculatory impairment
- Hypoperfusion → LDAM formation → neurodegeneration

TRAINED IMMUNITY (BIDIRECTIONAL):
- PROTECTIVE: Vaccines (Zostavax 17%, BCG ~45%, RSV 29% dementia reduction)
- MALADAPTIVE: Infections program sustained inflammation

KEY INSIGHT: AD vs LBD may be fundamentally different diseases.
AD = autoimmune/vascular. LBD = true proteinopathy.
    `.trim(),
    keyFindings: [
      '91% of AD patients have GPCR autoantibodies vs 33% in LBD (Wallukat 2018)',
      'COVID-19 increases AD risk by 69% within 1 year (Wang 2022)',
      'IgG transfer from Long COVID patients causes disease in mice (Chen 2024)',
      'Vaccines reduce dementia risk via trained immunity, not just infection prevention',
      'Same AAB signature across ME/CFS, Long COVID, and AD suggests common mechanism',
    ],
    paradigmShifts: [
      { year: 2018, discovery: 'GPCR autoantibodies distinguish AD from LBD', pmid: '29576863' },
      { year: 2022, discovery: 'COVID-19 increases AD risk 69%', pmid: '36101931' },
      { year: 2024, discovery: 'Long COVID IgG transfer proves autoimmune mechanism', pmid: '38452134' },
    ],
    upstreamModules: [],
    downstreamModules: ['M05', 'M12', 'M18'],
    landmarkPapers: [
      { pmid: '29576863', discovery: 'Wallukat 2018 - GPCR-AABs in AD vs LBD' },
      { pmid: '36101931', discovery: 'Wang 2022 - COVID increases AD risk 69%' },
      { pmid: '38452134', discovery: 'Chen 2024 - Long COVID IgG transfer' },
    ],
    therapeuticTargets: ['gpcr_autoantibodies', 'chronic_immune_activation', 'trained_immunity_protective'],
    interventionWindow: 'prevention',
    color: '#FF6B6B',
    icon: 'ShieldAlert',
  },

  // ============================================================================
  // HORMONAL INFLUENCES MODULE (20)
  // ============================================================================
  {
    id: 'M20',
    name: 'Hormonal Influences',
    shortName: 'Hormones',
    description: 'Sex hormones, stress hormones (HPA axis), and metabolic hormones in AD pathogenesis',
    overview: `
Module 20 captures the bidirectional relationships between hormones and AD pathology:

SEX HORMONES (Estrogen, Testosterone):
• Estrogen is neuroprotective: enhances synaptic plasticity, reduces Aβ, modulates microglia
• Menopause triggers 60% E2 decline; APOE4 women most affected
• HRT shows genotype-specific effects: APOE4 women benefit MORE (Saleh 2023)
• Critical window hypothesis: HRT started early may protect; started late may harm
• Testosterone decline correlates with dementia risk, but therapy benefits unclear

STRESS HORMONES (Cortisol, HPA Axis):
• Chronic stress is a MODIFIABLE risk factor for AD
• Cortisol elevated in AD patients; predicts faster decline
• VICIOUS CIRCLE: cortisol → hippocampal damage → HPA disinhibition → more cortisol
• GR antagonists reduce Aβ and tau in animal models

METABOLIC HORMONES (Thyroid, Insulin):
• Hypothyroidism: 2-fold increased AD risk (Framingham)
• Brain insulin resistance ("Type 3 diabetes") is core AD feature
• Intranasal insulin helps APOE4-negative patients only

Key insight: Hormone effects are GENOTYPE-DEPENDENT and TIME-DEPENDENT.
Precision medicine must consider hormone status in treatment decisions.
    `.trim(),
    keyFindings: [
      'APOE4 women show LARGER benefit from HRT (Saleh 2023 EPAD cohort)',
      'Cortisol creates vicious circle with hippocampal damage (Ouanes 2019)',
      'Hypothyroidism doubles AD risk (Tan 2008 Framingham)',
      'Intranasal insulin benefits APOE4-negative only (SNIFF trials)',
      'Chronic stress is modifiable risk factor for AD',
    ],
    upstreamModules: [],
    downstreamModules: ['M05', 'M06', 'M07', 'M12'],
    landmarkPapers: [
      { pmid: '36631903', discovery: 'Saleh 2023 - HRT benefits APOE4 women most' },
      { pmid: '30881301', discovery: 'Ouanes 2019 - Cortisol-hippocampus vicious circle' },
      { pmid: '18663163', discovery: 'Tan 2008 - Hypothyroidism doubles AD risk' },
    ],
    therapeuticTargets: ['estrogen_level', 'cortisol_level', 'hpa_axis_activation', 'insulin_signaling'],
    interventionWindow: 'prevention',
    color: '#E91E63',
    icon: 'Activity',
  },
];

export default modules;
