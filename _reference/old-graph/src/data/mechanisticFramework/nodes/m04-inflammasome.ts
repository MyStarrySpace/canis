/**
 * Module 4: Inflammasome & Cytokines
 */

import type { MechanisticNode } from '../types';

export const module4Nodes: MechanisticNode[] = [
  // Inflammasome components
  {
    id: 'nlrp3_active',
    label: 'NLRP3 Inflammasome Active',
    category: 'STOCK',
    subtype: 'ComplexPool',
    moduleId: 'M04',
    references: {
      protein: 'UniProt:Q96P20',
      process: 'GO:0072559',
    },
    compartment: { cellType: 'Microglia', subcellular: 'Cytosol' },
    description: 'Assembled inflammasome complex',
    mechanism: 'ox-mtDNA or cathepsin B → ASC speck → caspase-1 activation',
    units: 'ASC specks/cell; or cleaved caspase-1',
    timescale: 'hours',
    roles: ['THERAPEUTIC_TARGET', 'BIOMARKER', 'FEEDBACK_HUB'],
  },
  {
    id: 'caspase1_active',
    label: 'Active Caspase-1',
    category: 'STOCK',
    subtype: 'ActiveProteinPool',
    moduleId: 'M04',
    references: { protein: 'UniProt:P29466' },
    description: 'Cleaved active caspase-1',
    mechanism: 'Cleaves pro-IL-1β and pro-IL-18 to mature forms',
    units: 'U/mg protein',
    timescale: 'hours',
  },
  {
    id: 'il1b',
    label: 'IL-1β',
    category: 'STOCK',
    subtype: 'CytokineLevel',
    moduleId: 'M04',
    references: { protein: 'UniProt:P01584' },
    description: 'Mature IL-1β (17 kDa cleaved form)',
    mechanism: 'Major pro-inflammatory cytokine',
    units: 'pg/mL (CSF/serum)',
    timescale: 'hours',
    roles: ['BIOMARKER'],
  },
  {
    id: 'il18',
    label: 'IL-18',
    category: 'STOCK',
    subtype: 'CytokineLevel',
    moduleId: 'M04',
    references: { protein: 'UniProt:Q14116' },
    description: 'Mature IL-18 (also caspase-1 substrate)',
    units: 'pg/mL',
    roles: ['BIOMARKER'],
  },

  // cGAS-STING components
  {
    id: 'cgas_active',
    label: 'cGAS Active',
    category: 'STOCK',
    subtype: 'ActiveProteinPool',
    moduleId: 'M04',
    references: { protein: 'UniProt:Q8N884' },
    description: 'Activated cGAS bound to cytosolic DNA',
    mechanism: 'Catalyzes 2\'3\'-cGAMP synthesis',
    units: 'cGAMP production rate',
    timescale: 'minutes',
  },
  {
    id: 'sting_active',
    label: 'STING Active',
    category: 'STOCK',
    subtype: 'ActiveProteinPool',
    moduleId: 'M04',
    references: { protein: 'UniProt:Q86WV6' },
    compartment: { subcellular: 'Golgi' },
    description: 'Phosphorylated STING at Golgi',
    mechanism: 'cGAMP binding → STING translocation → TBK1/IRF3 activation',
    units: 'p-STING/total STING',
    timescale: 'hours',
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'type_i_ifn',
    label: 'Type I Interferon',
    category: 'STOCK',
    subtype: 'CytokineLevel',
    moduleId: 'M04',
    description: 'IFN-α/β secreted',
    units: 'IU/mL; or ISG score',
    timescale: 'hours',
    roles: ['BIOMARKER'],
  },
  {
    id: 'isg_expression',
    label: 'ISG Expression',
    category: 'STOCK',
    subtype: 'RNAPool',
    moduleId: 'M04',
    description: 'Interferon-stimulated gene signature',
    units: 'fold change',
    timescale: 'days',
    roles: ['BIOMARKER'],
  },

  // Tau kinase/phosphatase effectors
  {
    id: 'gsk3b_active',
    label: 'GSK-3β Active',
    category: 'STOCK',
    subtype: 'ActiveProteinPool',
    moduleId: 'M04',
    references: { protein: 'UniProt:P49841' },
    description: 'Active GSK-3β (tau kinase)',
    mechanism: 'Activated by NLRP3; inhibited by H₂S sulfhydration',
    units: 'kinase activity; p-Tyr216/total',
    timescale: 'hours',
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'pp2a_activity',
    label: 'PP2A Activity',
    category: 'STOCK',
    subtype: 'ActiveProteinPool',
    moduleId: 'M04',
    references: { protein: 'UniProt:P63151' },
    description: 'PP2A tau phosphatase (inhibited by NLRP3)',
    mechanism: 'Major tau phosphatase; activity reduced by NLRP3 signaling',
    units: 'phosphatase activity',
  },

  // State nodes (SHARED across modules)
  {
    id: 'neuroinflammation',
    label: 'Neuroinflammation',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M04', // Primary: Inflammasome & Cytokines
    sharedWith: ['M05', 'M12'], // Also Microglial Phenotypes, BBB
    references: { disease: 'MESH:D000071618' },
    description: 'Chronic CNS inflammatory state',
    mechanism: 'Driven by IL-1β, Type I IFN, BBB breakdown; activates microglia',
    roles: ['FEEDBACK_HUB'],
  },
  {
    id: 'tau_hyperphosphorylated',
    label: 'Tau Hyperphosphorylated',
    category: 'STATE',
    subtype: 'Phosphorylated',
    moduleId: 'M04', // Primary: Inflammasome (GSK3β/PP2A output)
    sharedWith: ['M07'], // Output to Tau Pathology
    description: 'Cross-module output to Module 7',
    mechanism: 'GSK3β↑ + PP2A↓ → pSer199, pSer202/Thr205 (AT8), pThr231, pSer396/Ser404 (PHF-1)',
    modifications: [
      { type: 'phosphorylation', sites: ['Ser199', 'Ser202', 'Thr205', 'Thr231', 'Ser396', 'Ser404'] },
    ],
  },

  // SHARED nodes (used by multiple modules)
  {
    id: 'abeta_oligomers',
    label: 'Aβ Oligomers',
    category: 'STOCK',
    subtype: 'Aggregate',
    moduleId: 'M06', // Primary: Amyloid Processing
    sharedWith: ['M04', 'M08', 'M12', 'M17'], // Also used by Inflammasome, Complement, Glymphatic, Immunomodulation
    description: 'Soluble Aβ oligomers - most synaptotoxic species',
    mechanism: 'Activates NLRP3, inhibits LTP, induces C1q deposition, cleared by glymphatic system',
    roles: ['BIOMARKER', 'THERAPEUTIC_TARGET'],
  },
  {
    id: 'tau_aggregated',
    label: 'Aggregated Tau',
    category: 'STOCK',
    subtype: 'Aggregate',
    moduleId: 'M07', // Primary: Tau Pathology
    sharedWith: ['M04', 'M13'], // Also used by Inflammasome, Cholinergic
    description: 'Aggregated tau (PHF/NFT) - prion-like spreading',
    mechanism: 'Activates NLRP3 inflammasome, impairs axonal transport, causes cholinergic degeneration',
    roles: ['BIOMARKER'],
  },
];

// ============================================================================
// MODULE 5: Microglial Phenotypes
