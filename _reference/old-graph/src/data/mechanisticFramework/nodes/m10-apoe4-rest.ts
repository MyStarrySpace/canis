/**
 * Module 10: APOE4 Pathways & REST/Epigenetic Dysregulation
 */

import type { MechanisticNode } from '../types';

export const module10Nodes: MechanisticNode[] = [
  {
    id: 'apoe4_domain_interaction',
    label: 'APOE4 Domain Interaction',
    category: 'STATE',
    subtype: 'Bound',
    moduleId: 'M10',
    description: 'Arg112 → domain interaction (Arg61-Glu255)',
    mechanism: '↓ Protein stability → aggregation; ↓ lipid-binding capacity',
  },
  {
    id: 'apoe_lipidation_reduced',
    label: 'APOE Lipidation Reduced',
    category: 'STATE',
    subtype: 'CompartmentIntegrity',
    moduleId: 'M10',
    description: 'APOE4 poorly lipidated',
    mechanism: 'ABCA1 aggregation → reduced APOE lipidation → impaired Aβ clearance',
  },
  {
    id: 'lysosomal_cholesterol_sequestration',
    label: 'Lysosomal Cholesterol Sequestration',
    category: 'STATE',
    subtype: 'CompartmentIntegrity',
    moduleId: 'M10',
    description: 'Cholesterol trapped in lysosomes',
    mechanism: 'ER "blind" to cholesterol → inappropriate SREBP2 activation',
  },
  {
    id: 'astrocyte_lipid_droplets',
    label: 'Astrocyte Lipid Droplets',
    category: 'STOCK',
    subtype: 'Aggregate',
    moduleId: 'M10',
    description: 'APOE4 astrocytes form larger LDs',
    mechanism: 'Enriched in unsaturated TAG → ferroptosis vulnerability',
  },
  {
    id: 'rest_nuclear',
    label: 'REST Nuclear (Protective)',
    category: 'STOCK', // SBSF v2.0: Was REGULATOR, now STOCK with REGULATOR role
    subtype: 'Repressor',
    moduleId: 'M10',
    references: { protein: 'UniProt:Q13127' },
    description: 'REST increases in healthy aging but DECREASES in AD',
    mechanism: 'Upregulates Nrf2 → antioxidant/anti-ferroptotic genes',
    roles: ['REGULATOR', 'LEVERAGE_POINT'],
  },
  {
    id: 'rest_depleted',
    label: 'REST Depleted (AD)',
    category: 'STATE',
    subtype: 'NuclearLocalized',
    moduleId: 'M10',
    description: 'Nuclear REST lost in AD neurons',
    mechanism: 'Loss of stress resistance and Nrf2-mediated protection',
  },
  {
    id: 'nrf2_pathway',
    label: 'Nrf2 Antioxidant Pathway',
    category: 'STOCK', // SBSF v2.0: Was REGULATOR, now STOCK with REGULATOR role
    subtype: 'Activator',
    moduleId: 'M10',
    references: { protein: 'UniProt:Q16236' },
    description: 'Master regulator of antioxidant genes',
    mechanism: 'REST → Nrf2 → HO-1, NQO1, xCT, GPX4',
    roles: ['REGULATOR', 'THERAPEUTIC_TARGET'],
  },

  // -------------------------------------------------------------------------
  // SULFATIDE / MYELIN PATHWAY (Han/Holtzman labs)
  // -------------------------------------------------------------------------
  {
    id: 'sulfatide_level',
    label: 'Myelin Sulfatides',
    category: 'STOCK',
    subtype: 'MetabolitePool',
    moduleId: 'M10',
    references: {
      process: 'GO:0006687', // Glycosphingolipid metabolic process
    },
    description: 'Sulfated galactosylceramides in myelin (~5% of myelin lipids)',
    mechanism: 'Synthesized by cerebroside sulfotransferase (CST) in oligodendrocytes. Required for myelin integrity, axo-glial junction formation, and ion channel clustering. Transported in ApoE-HDL particles.',
    units: '% of myelin lipids',
  },
  {
    id: 'apoe4_sulfatide_transport',
    label: 'ApoE4 Sulfatide Transport (Enhanced)',
    category: 'STATE',
    subtype: 'BiologicalProcess',
    moduleId: 'M10',
    description: 'ApoE4 > E3 > E2 sulfatide transport efficiency',
    mechanism: 'Sulfatide content in ApoE-HDL particles follows rank order: ApoE4 > E3 > E2 (Han 2010). ApoE4 "over-clears" sulfatides from brain tissue, removing them more efficiently than other isoforms.',
    roles: ['RATE_LIMITER'],
  },
  {
    id: 'sulfatide_depleted',
    label: 'Sulfatide Depletion',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M10',
    description: 'Pathological sulfatide loss (occurs at MCI stage)',
    mechanism: 'ApoE4 carriers have depleted brain sulfatides due to enhanced transport efficiency. Depletion detectable at MCI stage (Han 2003), before frank AD diagnosis. ApoE-KO mice have 61-114% higher brain sulfatides.',
    roles: ['BIOMARKER'],
  },
  {
    id: 'myelin_integrity',
    label: 'Myelin Integrity',
    category: 'STATE',
    subtype: 'Homeostatic',
    moduleId: 'M10',
    description: 'Normal myelin sheath structure and function',
    mechanism: 'Sulfatides maintain myelin sheath stability, paranodal junction formation, and voltage-gated Na+ channel distribution. Intact myelin supports fast saltatory conduction.',
  },
  {
    id: 'myelin_dysfunction',
    label: 'Myelin Dysfunction',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M10',
    description: 'Myelin sheath instability from sulfatide depletion',
    mechanism: 'Sulfatide depletion → axo-glial junction disruption → demyelination → axonal dysfunction. Palavicini 2022 showed sulfatide deficiency causes ventricular enlargement in mice.',
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'oligodendrocyte_dysfunction',
    label: 'Oligodendrocyte Dysfunction',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M10',
    description: 'Primary oligodendrocyte pathology in AD',
    mechanism: 'Oligodendrocytes produce sulfatides and OMG. Both decline early in AD. Convergent evidence from sulfatide lipidomics and OMG proteomics suggests oligodendrocyte dysfunction as primary mechanism.',
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'omg_level',
    label: 'OMG (Oligodendrocyte Myelin Glycoprotein)',
    category: 'STOCK',
    subtype: 'ProteinPool',
    moduleId: 'M10',
    references: {
      protein: 'UniProt:P23515', // OMG
    },
    description: 'Oligodendrocyte-derived myelin protein',
    mechanism: 'OMG is expressed by oligodendrocytes and involved in axonal structural integrity, cell adhesion, and synaptic proteostasis. Duggan 2026 showed OMG is a proteomic determinant of neurodegenerative resilience.',
    roles: ['BIOMARKER'],
    units: 'ng/mL',
  },

  // -------------------------------------------------------------------------
  // BIOMARKERS
  // -------------------------------------------------------------------------
  {
    id: 'plasma_omg',
    label: 'Plasma OMG',
    category: 'BOUNDARY',
    subtype: 'Biomarker',
    moduleId: 'M10',
    boundaryDirection: 'output',
    description: 'Blood OMG level - oligodendrocyte function marker',
    mechanism: 'Lower plasma OMG associates with cortical amyloid, compromised brain structure, and dementia. Predicts dementia 7-20 years before diagnosis. Mendelian randomization confirms causal protection.',
    roles: ['BIOMARKER'],
    units: 'ng/mL',
    detectionTimeline: {
      yearsBeforeSymptoms: 15, // 7-20 year range, using midpoint
      detectionMethod: 'Plasma',
      atnCategory: 'N', // Neurodegeneration marker
      performance: {
        citation: '10.1186/s13024-025-00921-1', // Duggan 2026
      },
    },
  },
  {
    id: 'csf_sulfatide',
    label: 'CSF Sulfatide',
    category: 'BOUNDARY',
    subtype: 'Biomarker',
    moduleId: 'M10',
    boundaryDirection: 'output',
    description: 'CSF sulfatide/PI ratio - early AD biomarker',
    mechanism: 'CSF sulfatide/phosphatidylinositol ratio decreases at MCI stage. Han 2003: "may be a very useful biomarker for the earliest clinical stage of Alzheimer\'s disease."',
    roles: ['BIOMARKER'],
    detectionTimeline: {
      yearsBeforeSymptoms: 5, // Detects MCI
      detectionMethod: 'CSF',
      atnCategory: 'N', // Neurodegeneration marker
      performance: {
        citation: '10.1002/ana.10618', // Han 2003 Ann Neurol
      },
    },
  },
];

// ============================================================================
// MODULE 11: TREM2 & DAM
