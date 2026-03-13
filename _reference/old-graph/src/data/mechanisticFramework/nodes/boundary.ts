/**
 * System Boundary Nodes (Input/Output)
 */

import type { MechanisticNode } from '../types';

export const boundaryNodes: MechanisticNode[] = [
  // Input Boundaries (Unexplained Causes)
  {
    id: 'aging',
    label: 'Aging',
    category: 'BOUNDARY',
    subtype: 'Lifestyle',
    moduleId: 'BOUNDARY',
    boundaryDirection: 'input',
    description: 'Chronological age; drives multiple pathways',
    mechanism: 'Drives C1q↑, iron accumulation, DIM infiltration, meningeal lymphatic decline',
    defaultVariant: 'age_65_74',
    variants: [
      {
        id: 'age_under_65',
        label: '<65 years',
        effectDirection: 'protective',
        effectMagnitude: 0.3,
        effectDescription: 'Early-onset rare; usually genetic causes (APP, PSEN1/2)',
        color: '#34d399',
        evidence: [{ pmid: '23571587', oddsRatio: 0.02, population: 'Global' }],
      },
      {
        id: 'age_65_74',
        label: '65-74 years',
        effectDirection: 'neutral',
        effectMagnitude: 1.0,
        effectDescription: 'Reference age group; ~5% prevalence',
        color: '#787473',
        evidence: [{ pmid: '23571587', oddsRatio: 1.0, population: 'Global' }],
      },
      {
        id: 'age_75_84',
        label: '75-84 years',
        effectDirection: 'risk',
        effectMagnitude: 3.0,
        effectDescription: 'Prevalence ~15%; iron↑, C1q↑, glymphatic↓',
        color: '#E5AF19',
        evidence: [{ pmid: '23571587', oddsRatio: 3.0, population: 'Global' }],
      },
      {
        id: 'age_85_plus',
        label: '85+ years',
        effectDirection: 'risk',
        effectMagnitude: 8.0,
        effectDescription: 'Prevalence ~30-50%; widespread neuropathology common',
        color: '#c75146',
        evidence: [{ pmid: '23571587', oddsRatio: 8.0, population: 'Global' }],
      },
    ],
  },
  {
    id: 'apoe_genotype',
    label: 'APOE Genotype',
    category: 'BOUNDARY',
    subtype: 'GeneticVariant',
    moduleId: 'BOUNDARY',
    boundaryDirection: 'input',
    references: { gene: 'HGNC:613' },
    description: 'Apolipoprotein E genetic variants',
    mechanism: 'Major genetic risk factor for late-onset AD',
    defaultVariant: 'apoe3',
    variants: [
      {
        id: 'apoe2',
        label: 'APOE ε2',
        frequency: 0.08,
        effectDirection: 'protective',
        effectMagnitude: 0.6,
        effectDescription: 'Protective against AD; better Aβ clearance, reduced tau pathology',
        color: '#34d399',
        evidence: [
          {
            pmid: '23571587',
            oddsRatio: 0.6,
            confidenceInterval: [0.5, 0.7],
            population: 'European',
          },
        ],
      },
      {
        id: 'apoe3',
        label: 'APOE ε3',
        frequency: 0.78,
        effectDirection: 'neutral',
        effectMagnitude: 1.0,
        effectDescription: 'Reference allele; most common in population',
        color: '#787473',
        evidence: [
          {
            pmid: '23571587',
            oddsRatio: 1.0,
            population: 'European',
          },
        ],
      },
      {
        id: 'apoe4_het',
        label: 'APOE ε4 (1 copy)',
        frequency: 0.14,
        effectDirection: 'risk',
        effectMagnitude: 3.2,
        effectDescription: 'Single ε4 allele: ~3x AD risk; impaired lipidation, Aβ clearance',
        color: '#E5AF19',
        evidence: [
          {
            pmid: '23571587',
            oddsRatio: 3.2,
            confidenceInterval: [2.8, 3.8],
            population: 'European',
          },
        ],
      },
      {
        id: 'apoe4_hom',
        label: 'APOE ε4/ε4',
        frequency: 0.02,
        effectDirection: 'risk',
        effectMagnitude: 12.0,
        effectDescription: 'Homozygous ε4: ~12x AD risk; severe lipid dysfunction, early onset',
        color: '#c75146',
        evidence: [
          {
            pmid: '23571587',
            oddsRatio: 12.0,
            confidenceInterval: [8.0, 18.0],
            population: 'European',
          },
        ],
      },
    ],
  },
  {
    id: 'trem2_variants',
    label: 'TREM2 Variants',
    category: 'BOUNDARY',
    subtype: 'GeneticVariant',
    moduleId: 'BOUNDARY',
    boundaryDirection: 'input',
    references: { gene: 'HGNC:17760' },
    description: 'R47H, R62H, other risk variants',
    mechanism: '~3x AD risk; hypomorphic function',
    defaultVariant: 'trem2_common',
    variants: [
      {
        id: 'trem2_common',
        label: 'Common (WT)',
        frequency: 0.98,
        effectDirection: 'neutral',
        effectMagnitude: 1.0,
        effectDescription: 'Wild-type TREM2; normal microglial function',
        color: '#787473',
        evidence: [{ pmid: '23150908', oddsRatio: 1.0, population: 'European' }],
      },
      {
        id: 'trem2_r47h',
        label: 'R47H',
        frequency: 0.003,
        effectDirection: 'risk',
        effectMagnitude: 2.9,
        effectDescription: 'Impaired ligand binding; reduced phagocytosis, DAM transition blocked',
        color: '#c75146',
        evidence: [
          { pmid: '23150908', oddsRatio: 2.9, confidenceInterval: [2.2, 3.8], population: 'European' },
        ],
      },
      {
        id: 'trem2_r62h',
        label: 'R62H',
        frequency: 0.01,
        effectDirection: 'risk',
        effectMagnitude: 1.7,
        effectDescription: 'Partial loss of function; less severe than R47H',
        color: '#E5AF19',
        evidence: [
          { pmid: '25533203', oddsRatio: 1.7, confidenceInterval: [1.4, 2.0], population: 'European' },
        ],
      },
      {
        id: 'trem2_h157y',
        label: 'H157Y',
        frequency: 0.002,
        effectDirection: 'risk',
        effectMagnitude: 1.5,
        effectDescription: 'Increased TREM2 shedding; reduced surface expression',
        color: '#E5AF19',
        evidence: [
          { pmid: '27570872', oddsRatio: 1.5, confidenceInterval: [1.2, 1.9], population: 'European' },
        ],
      },
    ],
  },
  {
    id: 'familial_ad_mutations',
    label: 'Familial AD Mutations',
    category: 'BOUNDARY',
    subtype: 'GeneticVariant',
    moduleId: 'BOUNDARY',
    boundaryDirection: 'input',
    description: 'APP, PSEN1, PSEN2 mutations',
    mechanism: 'Autosomal dominant mutations; deterministic early-onset AD',
  },
  {
    id: 'sex',
    label: 'Biological Sex',
    category: 'BOUNDARY',
    subtype: 'GeneticVariant',
    moduleId: 'BOUNDARY',
    boundaryDirection: 'input',
    description: 'XX vs XY chromosomes',
    mechanism: 'Affects iron metabolism, immune responses, hormone levels',
  },
  {
    id: 'sleep_disruption',
    label: 'Sleep Disruption',
    category: 'BOUNDARY',
    subtype: 'Lifestyle',
    moduleId: 'BOUNDARY',
    boundaryDirection: 'input',
    description: 'Chronic sleep disturbance',
    mechanism: 'Reduces glymphatic clearance 50%+',
  },

  // Output Boundaries (Terminal Outcomes)
  {
    id: 'mortality',
    label: 'Mortality',
    category: 'BOUNDARY',
    subtype: 'Diagnosis',
    moduleId: 'BOUNDARY',
    boundaryDirection: 'output',
    description: 'Death; ultimate endpoint',
  },

  // Output Boundary Biomarkers - Clinical endpoints at system boundary
  {
    id: 'cognitive_score',
    label: 'Cognitive Score',
    category: 'BOUNDARY',
    subtype: 'CognitiveScore',
    moduleId: 'BOUNDARY',
    boundaryDirection: 'output',
    sharedWith: ['M06', 'M07', 'M08', 'M13', 'M17'], // Amyloid, Tau, Complement, Cholinergic, Trained Immunity
    description: 'Psychometric assessment of cognition - primary clinical endpoint',
    units: 'MMSE (0-30), ADAS-Cog (0-70), CDR-SB (0-18), MoCA (0-30)',
    roles: ['BIOMARKER'],
  },
  {
    id: 'synapses',
    label: 'Synapse Density',
    category: 'BOUNDARY',
    subtype: 'Biomarker',
    moduleId: 'BOUNDARY',
    boundaryDirection: 'output',
    sharedWith: ['M06', 'M08'], // Amyloid (LTP), Complement (pruning)
    references: { process: 'GO:0045202' },
    description: 'Synapse density in cortex/hippocampus - strongest correlate of cognition',
    units: 'Stereology count, synaptophysin IHC',
    roles: ['BIOMARKER'],
  },
  {
    id: 'neuronal_count',
    label: 'Neuron Count',
    category: 'BOUNDARY',
    subtype: 'Biomarker',
    moduleId: 'BOUNDARY',
    boundaryDirection: 'output',
    references: { cellType: 'CL:0000540' },
    description: 'Neuron number in affected regions',
    units: 'Stereology, NeuN+ counts',
    roles: ['BIOMARKER'],
  },
  {
    id: 'brain_volume',
    label: 'Brain Volume',
    category: 'BOUNDARY',
    subtype: 'Biomarker',
    moduleId: 'BOUNDARY',
    boundaryDirection: 'output',
    references: { anatomy: 'UBERON:0000955' },
    description: 'Regional brain volumes',
    units: 'MRI volumetrics (hippocampus, entorhinal cortex)',
    roles: ['BIOMARKER'],
  },
  {
    id: 'csf_biomarkers',
    label: 'CSF Biomarkers',
    category: 'BOUNDARY',
    subtype: 'Biomarker',
    moduleId: 'BOUNDARY',
    boundaryDirection: 'output',
    description: 'Fluid biomarkers',
    units: 'Aβ42 pg/mL, pTau181 pg/mL, NfL pg/mL, sTREM2 pg/mL',
    roles: ['BIOMARKER'],
  },

  // ============================================================================
  // BIOMARKER NODES WITH DETECTION TIMELINES
  // These capture the temporal cascade of biomarker abnormalities
  // ============================================================================

  {
    id: 'plasma_spdgfrbeta',
    label: 'sPDGFRβ (Pericyte Injury)',
    category: 'BOUNDARY',
    subtype: 'Biomarker',
    moduleId: 'BOUNDARY',
    boundaryDirection: 'output',
    sharedWith: ['M12'],
    description: 'Soluble PDGFRβ released from injured pericytes - earliest known AD biomarker',
    mechanism: 'Pericyte injury releases sPDGFRβ into CSF. Detectable at age ~20 in APOE4 carriers, 45 years before symptom onset. Predicts cognitive decline independent of Aβ/tau (Montagne 2020).',
    roles: ['BIOMARKER'],
    units: 'pg/mL',
    detectionTimeline: {
      yearsBeforeSymptoms: 45,
      detectionMethod: 'CSF',
      atnCategory: 'V',
      performance: {
        auc: 0.85,
        citation: '32860352', // Montagne 2020 Nature Medicine
      },
    },
  },
  {
    id: 'plasma_ptau217',
    label: 'p-tau217',
    category: 'BOUNDARY',
    subtype: 'Biomarker',
    moduleId: 'BOUNDARY',
    boundaryDirection: 'output',
    sharedWith: ['M07'],
    description: 'Plasma phospho-tau at threonine 217 - most accurate blood tau marker for population screening',
    mechanism: `pTau217 increases with amyloid positivity, outperforms pTau181 for early detection.
      HUNT Study (Aarsland 2025, n=11,486): First large population-based prevalence data.
      Diagnostic cut-offs (Global CEO Initiative): <0.40 pg/mL = negative (95% sensitivity for ruling out ADNC),
      0.40-0.62 = intermediate (requires further workup), >=0.63 = positive (95% specificity for ADNC).
      CRITICAL: 40% of people with clinical dementia do NOT have AD pathology by pTau217.
      Age-dependent prevalence: 70-74y ~18%, 80-84y ~40%, 90+ ~65% ADNC+.
      23.5% of cognitively unimpaired 70+ are ADNC+ (preclinical AD).
      P7C3-A20 (NAD restorer) shown to normalize pTau217 levels (Chaubey 2025).`,
    roles: ['BIOMARKER'],
    units: 'pg/mL',
    detectionTimeline: {
      yearsBeforeSymptoms: 15,
      detectionMethod: 'Plasma',
      atnCategory: 'T',
      commercialTest: {
        name: 'ALZpath pTau217 Advantage PLUS',
        manufacturer: 'Quanterix (Simoa HD-X)',
        fdaStatus: 'pending',
      },
      performance: {
        sensitivity: 0.95,
        specificity: 0.95,
        auc: 0.96,
        ppv: 0.774, // Overall from HUNT study
        npv: 0.954, // Overall from HUNT study
        citation: '10.1038/s41586-025-09841-y', // Aarsland 2025 Nature
      },
      // Diagnostic cut-offs from HUNT study
      cutoffs: {
        negative: 0.40,      // <0.40 pg/mL = 95% sensitivity for ruling out ADNC
        intermediate: 0.62,  // 0.40-0.62 requires further workup
        positive: 0.63,      // >=0.63 pg/mL = 95% specificity for ADNC
      },
    },
  },
  {
    id: 'plasma_ptau181',
    label: 'p-tau181',
    category: 'BOUNDARY',
    subtype: 'Biomarker',
    moduleId: 'BOUNDARY',
    boundaryDirection: 'output',
    sharedWith: ['M07'],
    description: 'Plasma phospho-tau at threonine 181 - FDA-cleared blood tau marker',
    mechanism: 'pTau181 elevates ~10 years before symptoms, tracks with amyloid pathology. First FDA-cleared plasma AD biomarker (Lumipulse, Fujirebio 2022).',
    roles: ['BIOMARKER'],
    units: 'pg/mL',
    detectionTimeline: {
      yearsBeforeSymptoms: 10,
      detectionMethod: 'Plasma',
      atnCategory: 'T',
      commercialTest: {
        name: 'Lumipulse G pTau181',
        manufacturer: 'Fujirebio',
        fdaStatus: 'cleared',
      },
      performance: {
        sensitivity: 0.88,
        specificity: 0.85,
        auc: 0.91,
        citation: '32589318', // Karikari 2020 Lancet Neurol
      },
    },
  },
  {
    id: 'plasma_abeta42_40_ratio',
    label: 'Aβ42/40 Ratio',
    category: 'BOUNDARY',
    subtype: 'Biomarker',
    moduleId: 'BOUNDARY',
    boundaryDirection: 'output',
    sharedWith: ['M06'],
    description: 'Plasma Aβ42/40 ratio - correlates with amyloid PET status',
    mechanism: 'Decreased Aβ42/40 ratio indicates brain amyloid deposition (sequestration hypothesis). More reliable than absolute Aβ42 levels. FDA-cleared (PrecivityAD, C2N).',
    roles: ['BIOMARKER'],
    units: 'ratio',
    detectionTimeline: {
      yearsBeforeSymptoms: 18,
      detectionMethod: 'Plasma',
      atnCategory: 'A',
      commercialTest: {
        name: 'PrecivityAD',
        manufacturer: 'C2N Diagnostics',
        fdaStatus: 'cleared',
      },
      performance: {
        sensitivity: 0.81,
        specificity: 0.84,
        auc: 0.88,
        citation: '31738165', // Schindler 2019 Neurology
      },
    },
  },
  {
    id: 'plasma_nfl',
    label: 'Neurofilament Light (NfL)',
    category: 'BOUNDARY',
    subtype: 'Biomarker',
    moduleId: 'BOUNDARY',
    boundaryDirection: 'output',
    sharedWith: ['M07'],
    description: 'Plasma neurofilament light chain - marker of axonal injury',
    mechanism: 'NfL released from damaged neurons. Non-specific but sensitive neurodegeneration marker. Elevates ~5 years before symptoms, tracks disease progression.',
    roles: ['BIOMARKER'],
    units: 'pg/mL',
    detectionTimeline: {
      yearsBeforeSymptoms: 5,
      detectionMethod: 'Plasma',
      atnCategory: 'N',
      commercialTest: {
        name: 'Simoa NfL',
        manufacturer: 'Quanterix',
        fdaStatus: 'cleared',
      },
      performance: {
        sensitivity: 0.82,
        specificity: 0.78,
        auc: 0.85,
        citation: '30282774', // Preische 2019 Nature Medicine
      },
    },
  },
  {
    id: 'retinal_rnfl',
    label: 'Retinal Nerve Fiber Layer',
    category: 'BOUNDARY',
    subtype: 'Biomarker',
    moduleId: 'BOUNDARY',
    boundaryDirection: 'output',
    description: 'RNFL thickness measured by OCT - non-invasive neurodegeneration marker',
    mechanism: 'RNFL thinning reflects retinal ganglion cell loss, correlates with hippocampal atrophy. Detectable ~7 years before symptoms via standard OCT.',
    roles: ['BIOMARKER'],
    units: 'μm',
    detectionTimeline: {
      yearsBeforeSymptoms: 7,
      detectionMethod: 'Retinal',
      atnCategory: 'N',
      performance: {
        sensitivity: 0.73,
        specificity: 0.70,
        auc: 0.76,
        citation: '31174836', // den Haan 2019 Alz Dementia
      },
    },
  },
  {
    id: 'retinal_amyloid',
    label: 'Retinal Aβ Deposits',
    category: 'BOUNDARY',
    subtype: 'Biomarker',
    moduleId: 'BOUNDARY',
    boundaryDirection: 'output',
    sharedWith: ['M06'],
    description: 'Curcumin-labeled amyloid deposits in retina - experimental screening tool',
    mechanism: 'Retina contains Aβ deposits detectable with curcumin fluorescence imaging (NeuroVision). Correlates with brain amyloid burden. Research stage, not FDA-cleared.',
    roles: ['BIOMARKER'],
    detectionTimeline: {
      yearsBeforeSymptoms: 15,
      detectionMethod: 'Retinal',
      atnCategory: 'A',
      performance: {
        sensitivity: 0.85,
        specificity: 0.79,
        auc: 0.82,
        citation: '32320011', // Koronyo 2017 JCI Insight
      },
    },
  },

  // ============================================================================
  // AUTOANTIBODY BIOMARKERS
  // May detect AD earlier than pTau217 (4+ years pre-symptom)
  // ============================================================================
  {
    id: 'ad_autoantibody_panel',
    label: 'AD Autoantibody Panel',
    category: 'BOUNDARY',
    subtype: 'Biomarker',
    moduleId: 'BOUNDARY',
    boundaryDirection: 'output',
    sharedWith: ['M07', 'M17'], // Tau and immunomodulatory modules
    description: '7-autoantibody panel for AD detection; may precede pTau217 elevations',
    mechanism: `Fang 2023 (n=1,686) identified 7 AD-specific autoantibodies achieving AUC=0.94:
      1. Anti-MAPT (tau protein) - direct marker of tau autoimmunity
      2. Anti-DNAJC8 - chaperone protein
      3. Anti-KDM4D - histone demethylase
      4. Anti-SERF1A - small EDRK-rich factor
      5. Anti-CDKN1A (p21) - cell cycle regulator
      6. Anti-AGER (RAGE) - receptor for advanced glycation endproducts
      7. Anti-ASXL1 - chromatin regulator
      CRITICAL: Outperforms CSF Aβ and tau for predicting cognitive decline (p<0.001).
      DeMarshall 2023: 8-autoantibody panel detects AD ~4 years BEFORE MCI onset (AUC=0.96 with age).
      Proposed mechanism: Autoantibodies may trigger neuronal hyperactivity (cf. IgLON5 model) OR
      represent immune response to early neuronal damage. Causality vs reactivity TBD.`,
    roles: ['BIOMARKER'],
    units: 'multiplex signal',
    detectionTimeline: {
      yearsBeforeSymptoms: 19, // ~4 years before MCI onset, add ~15 years MCI→dementia
      detectionMethod: 'Plasma',
      atnCategory: 'I', // Inflammation category
      performance: {
        sensitivity: 0.89,
        specificity: 0.91,
        auc: 0.94,
        citation: '37989443', // Fang 2023 Brain Behav Immun
      },
    },
  },
];
