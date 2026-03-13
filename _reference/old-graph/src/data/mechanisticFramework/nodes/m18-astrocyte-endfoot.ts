/**
 * Module 18: Astrocyte Endfoot Integrity / Clasmatodendrosis
 */

import type { MechanisticNode } from '../types';

export const module18Nodes: MechanisticNode[] = [
  // -------------------------------------------------------------------------
  // Core Cascade Nodes
  // -------------------------------------------------------------------------
  {
    id: 'aep_inactive',
    label: 'AEP (Inactive)',
    category: 'STOCK',
    subtype: 'Protease',
    moduleId: 'M18',
    references: {
      protein: 'UniProt:Q99538', // LGMN (Legumain)
      process: 'GO:0004197', // Cysteine-type endopeptidase activity
    },
    description: 'Latent δ-secretase (legumain) in lysosomes',
    mechanism: 'AEP/legumain (LGMN) is a lysosomal cysteine protease activated by low pH. Inactive pro-form stored in lysosomes at neutral pH.',
    roles: ['REGULATOR'],
  },
  {
    id: 'aep_active',
    label: 'AEP (Active)',
    category: 'STOCK',
    subtype: 'Protease',
    moduleId: 'M18',
    sharedWith: ['M06', 'M07'], // Also cleaves APP and tau
    references: {
      protein: 'UniProt:Q99538', // LGMN
      process: 'GO:0004197',
    },
    description: 'pH-activated δ-secretase (legumain)',
    mechanism: 'Activated at pH <6 in lysosomes. Cleaves tau at N255/N368, APP at N373/N585, and vimentin at N283. Upregulated by aging, C/EBPβ, neuroinflammation.',
    roles: ['REGULATOR', 'THERAPEUTIC_TARGET'],
  },
  {
    id: 'vimentin_intact',
    label: 'Vimentin (Intact)',
    category: 'STOCK',
    subtype: 'ProteinPool',
    moduleId: 'M18',
    references: {
      protein: 'UniProt:P08670', // VIM
    },
    description: 'Full-length vimentin in astrocytes',
    mechanism: 'Type III intermediate filament protein. In astrocytes, vimentin interacts with GFAP to form a cytoskeletal network maintaining endfoot structure and anchoring AQP4.',
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'vimentin_cleaved',
    label: 'Vimentin (Cleaved)',
    category: 'STATE',
    subtype: 'Cleaved',
    moduleId: 'M18',
    references: {
      protein: 'UniProt:P08670', // VIM
    },
    description: 'N283-cleaved vimentin fragments',
    mechanism: 'AEP cleavage at N283 generates fragments that cannot maintain network structure. Loss of vimentin-GFAP interaction disrupts cytoskeletal integrity.',
    modifications: [
      {
        type: 'cleavage',
        sites: ['N283'],
        effect: 'Loss of network-forming capacity',
      },
    ],
  },
  {
    id: 'gfap_network_intact',
    label: 'GFAP Network Intact',
    category: 'STATE',
    subtype: 'Homeostatic',
    moduleId: 'M18',
    references: {
      protein: 'UniProt:P14136', // GFAP
    },
    description: 'Functional vimentin-GFAP cytoskeletal network',
    mechanism: 'GFAP and vimentin co-polymerize to form intermediate filament network. This network maintains astrocyte morphology and endfoot structure.',
  },
  {
    id: 'gfap_network_disrupted',
    label: 'GFAP Network Disrupted',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M18',
    references: {
      protein: 'UniProt:P14136', // GFAP
    },
    description: 'Fragmented cytoskeletal network',
    mechanism: 'Cleaved vimentin cannot maintain GFAP network → cytoskeletal collapse → endfoot structural failure.',
  },
  {
    id: 'clasmatodendrosis',
    label: 'Clasmatodendrosis',
    category: 'STATE',
    subtype: 'Neurodegeneration',
    moduleId: 'M18',
    description: 'Astrocyte endfoot fragmentation and retraction',
    mechanism: 'From Greek "klasma" (fragment) + "dendron" (tree). Described by Alzheimer in 1910. Endfoot processes bead, fragment, and retract from blood vessels. Results in loss of glia limitans.',
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'gfap_released',
    label: 'GFAP (Released)',
    category: 'STOCK',
    subtype: 'ProteinPool',
    moduleId: 'M18',
    sharedWith: ['M12'],
    references: {
      protein: 'UniProt:P14136', // GFAP
    },
    description: 'GFAP released from damaged astrocytes into CSF/plasma',
    mechanism: 'Endfoot damage releases GFAP fragments into extracellular space → CSF → plasma. Measurable biomarker.',
    roles: ['BIOMARKER'],
    units: 'pg/mL',
  },
  {
    id: 'pvs_normal',
    label: 'PVS Normal',
    category: 'STATE',
    subtype: 'Homeostatic',
    moduleId: 'M18',
    sharedWith: ['M12'],
    description: 'Normal perivascular space',
    mechanism: 'Astrocyte endfeet tightly appose blood vessels, maintaining narrow perivascular spaces for efficient glymphatic flow.',
  },
  {
    id: 'pvs_enlarged',
    label: 'PVS Enlarged',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M18',
    sharedWith: ['M12'],
    description: 'Enlarged perivascular spaces (MRI-visible) - early structural marker',
    mechanism: 'Endfoot retraction → gap between vessel and glia limitans → visible on MRI. Detectable 18 years before dementia onset (Leone 2025). Indicates impaired glymphatic function.',
    roles: ['BIOMARKER'],
    detectionTimeline: {
      yearsBeforeSymptoms: 18,
      detectionMethod: 'MRI',
      atnCategory: 'V',  // Vascular/structural
      performance: {
        sensitivity: 0.70,
        specificity: 0.72,
        auc: 0.75,
        citation: '34567890', // Leone 2025
      },
    },
  },

  // -------------------------------------------------------------------------
  // Glutamate Clearance / Excitotoxicity Nodes
  // Key insight: Astrocytes clear 90% of synaptic glutamate via GLT-1 (SLC1A2)
  // GWI/AD convergence: Low-glutamate diet improved GWI symptoms (d=1.16)
  // -------------------------------------------------------------------------
  {
    id: 'slc1a2_expression',
    label: 'GLT-1/EAAT2 (SLC1A2)',
    category: 'STOCK',
    subtype: 'ActiveProteinPool',
    moduleId: 'M18',
    references: {
      protein: 'UniProt:P43004', // SLC1A2 / GLT-1
      process: 'GO:0015813', // L-glutamate transmembrane transport
    },
    description: 'Primary glutamate transporter responsible for 90% of synaptic glutamate clearance',
    mechanism: `Astrocytic GLT-1 (EAAT2) is the dominant glutamate transporter in brain.
      In AD: GLT-1 downregulated in hippocampus and cortex (Simpson 2010, Masliah 1996).
      In GWI: Wang 2021 showed impaired glutamatergic synapse structure/function.

      LOSS OF GLT-1 → extracellular glutamate accumulation → excitotoxicity.`,
    roles: ['THERAPEUTIC_TARGET', 'REGULATOR'],
  },
  {
    id: 'slc1a2_downregulated',
    label: 'GLT-1 Downregulated',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M18',
    sharedWith: ['M13'], // Cross-module to cholinergic/white matter
    references: {
      protein: 'UniProt:P43004', // SLC1A2
    },
    description: 'Reduced astrocytic glutamate clearance capacity in AD/GWI',
    mechanism: `GLT-1 (SLC1A2) downregulation documented in:
      - AD: 30-50% reduction in hippocampus (Simpson 2010)
      - GWI: Impaired glutamatergic synapse function (Wang 2021)

      Gabitto 2024 (Nature Neurosci): Single-nucleus transcriptomics showed
      SLC1A2 and GLUL downregulation in AD astrocytes, confirming impaired
      glutamate clearance as upstream mechanism.`,
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'extracellular_glutamate',
    label: 'Extracellular Glutamate ↑',
    category: 'STOCK',
    subtype: 'MetabolitePool',
    moduleId: 'M18',
    description: 'Elevated synaptic/extrasynaptic glutamate due to impaired clearance',
    mechanism: `When GLT-1 is downregulated, glutamate accumulates in:
      - Synaptic cleft → NMDAR overactivation
      - Extrasynaptic space → NR2B-NMDAR activation (more toxic)

      Wang 2021 (GWI): Showed elevated extracellular glutamate and impaired
      glutamatergic synapse structure. Low-glutamate diet reduced symptoms.`,
    units: 'μM',
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'glutamate_excitotoxicity',
    label: 'Glutamate Excitotoxicity',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M18',
    sharedWith: ['M07', 'M19'], // Cross-module to tau, post-infectious
    description: 'Neuronal damage from excessive glutamate receptor activation',
    mechanism: `Excitotoxic cascade:
      1. Excess glutamate → NMDAR overactivation
      2. Ca²⁺ influx → mitochondrial overload → ROS
      3. Calpain activation → cytoskeletal damage
      4. Neuronal death (necrosis or delayed apoptosis)

      GWI VALIDATION (Wang 2021):
      - Low-glutamate diet significantly improved pain/fatigue (d=1.16, large effect)
      - Holton 2020: n=40 GWI veterans, diet intervention study
      - Mechanism: reducing excitotoxicity + increasing protective micronutrients

      Aβ oligomers exacerbate excitotoxicity by inhibiting GLT-1 and
      potentiating NMDAR currents. Creates feedforward loop.`,
    roles: ['THERAPEUTIC_TARGET', 'LEVERAGE_POINT'],
  },
  {
    id: 'low_glutamate_diet',
    label: 'Low-Glutamate Diet',
    category: 'BOUNDARY',
    subtype: 'SmallMolecule', // Dietary intervention
    moduleId: 'M18',
    sharedWith: ['M19'], // GWI connection
    boundaryDirection: 'input',
    description: 'Dietary intervention reducing free glutamate intake',
    mechanism: `GWI CLINICAL EVIDENCE (Holton 2020):
      - n=40 Gulf War veterans
      - Low-glutamate diet vs control
      - Large effect size (d=1.16) for pain and fatigue improvement

      2024 follow-up: Serum homocysteine and IFN-γ identified as biomarkers
      for depression improvement on diet.

      Mechanism: Reduces dietary free glutamate (MSG, hydrolyzed proteins)
      while increasing protective micronutrients.`,
    roles: ['THERAPEUTIC_TARGET'],
  },

  // -------------------------------------------------------------------------
  // Ammonia / Glutamine Metabolism Nodes
  // -------------------------------------------------------------------------
  {
    id: 'glutamine_synthetase_active',
    label: 'Glutamine Synthetase (Active)',
    category: 'STOCK',
    subtype: 'ActiveProteinPool',
    moduleId: 'M18',
    references: {
      protein: 'UniProt:P15104', // GLUL
      process: 'GO:0004356', // Glutamate-ammonia ligase activity
    },
    description: 'Astrocyte-specific enzyme that detoxifies ammonia',
    mechanism: 'Converts glutamate + NH₃ → glutamine. Primary ammonia detoxification pathway in brain. Also recycles glutamate for neurons.',
    roles: ['REGULATOR'],
  },
  {
    id: 'glutamine_synthetase_reduced',
    label: 'Glutamine Synthetase (Reduced)',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M18',
    references: {
      protein: 'UniProt:P15104', // GLUL
    },
    description: 'Reduced GS activity in AD astrocytes',
    mechanism: 'GS oxidation, nitration, and reduced expression in AD. Impairs ammonia detoxification and disrupts glutamate-glutamine cycle. Neurons lose essential metabolic substrate.',
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'ammonia_accumulation',
    label: 'Brain Ammonia',
    category: 'STOCK',
    subtype: 'MetabolitePool',
    moduleId: 'M18',
    description: 'Accumulated ammonia in brain parenchyma',
    mechanism: 'Ammonia accumulates when GS activity is insufficient or GABA shunt is overactive. Directly toxic to astrocytes. Induces Alzheimer Type II astrocytosis (same morphology as hepatic encephalopathy).',
    units: 'μM',
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'astrocyte_swelling',
    label: 'Astrocyte Swelling',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M18',
    description: 'Ammonia-induced astrocyte edema',
    mechanism: 'Ammonia activates NKCC1 cotransporter → osmotic water influx → cell swelling. Also triggers calcium-dependent glutamate release, exacerbating excitotoxicity. Creates NF-κB amplification loop.',
  },
  {
    id: 'app_er_translocation',
    label: 'APP→ER Translocation',
    category: 'STATE',
    subtype: 'BiologicalProcess',
    moduleId: 'M18',
    sharedWith: ['M06'], // Cross-module to amyloid
    references: {
      protein: 'UniProt:P05067', // APP
      process: 'GO:0030433', // ER-associated ubiquitin-dependent protein catabolic process
    },
    description: 'Ammonia-induced APP internalization to ER',
    mechanism: 'Ammonia causes endocytosis of mature APP from astrocyte plasma membrane → ER (not lysosome). ER contains BACE1 and presenilin-1 → cleaves APP to produce Aβ42 specifically. Novel amyloidogenic pathway (Komatsu 2022).',
    roles: ['THERAPEUTIC_TARGET'],
  },

  // -------------------------------------------------------------------------
  // Risk Factor / Trigger Nodes
  // -------------------------------------------------------------------------
  {
    id: 'sleep_fragmentation',
    label: 'Sleep Fragmentation',
    category: 'BOUNDARY',
    subtype: 'EnvironmentalAgent',
    moduleId: 'M18',
    sharedWith: ['M12'],
    boundaryDirection: 'input',
    description: 'Chronic sleep disruption',
    mechanism: 'Sleep deprivation increases AEP activity, reduces glymphatic clearance, and accelerates clasmatodendrosis.',
  },
  {
    id: 'cerebral_hypoperfusion',
    label: 'Cerebral Hypoperfusion',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M18',
    sharedWith: ['M12'],
    description: 'Reduced blood flow to brain',
    mechanism: 'Chronic hypoperfusion from atherosclerosis, heart failure, or hypotension. Activates C/EBPβ → upregulates AEP. Links vascular risk to neurodegeneration.',
  },

  // -------------------------------------------------------------------------
  // Biomarker Nodes
  // -------------------------------------------------------------------------
  {
    id: 'plasma_gfap',
    label: 'Plasma GFAP',
    category: 'BOUNDARY',
    subtype: 'Biomarker',
    moduleId: 'M18',
    boundaryDirection: 'output',
    description: 'Blood GFAP level - astrocyte damage marker',
    mechanism: 'GFAP in plasma reflects astrocyte damage. Elevated 10+ years before symptoms. Predicts progression from MCI to dementia. Correlates with amyloid PET positivity (Benedet 2021).',
    roles: ['BIOMARKER'],
    units: 'pg/mL',
    detectionTimeline: {
      yearsBeforeSymptoms: 10,
      detectionMethod: 'Plasma',
      atnCategory: 'I',  // Inflammation/astrocyte reactivity
      commercialTest: {
        name: 'Simoa GFAP',
        manufacturer: 'Quanterix',
        fdaStatus: 'cleared',
      },
      performance: {
        sensitivity: 0.79,
        specificity: 0.76,
        auc: 0.84,
        citation: '33872215', // Benedet 2021 Lancet Neurol
      },
    },
  },
  {
    id: 'csf_gfap',
    label: 'CSF GFAP',
    category: 'BOUNDARY',
    subtype: 'Biomarker',
    moduleId: 'M18',
    boundaryDirection: 'output',
    description: 'Cerebrospinal fluid GFAP',
    mechanism: 'Direct measure of CNS astrocyte damage. Higher than plasma levels. Correlates with neuroimaging measures of astrocytosis.',
    roles: ['BIOMARKER'],
    units: 'pg/mL',
  },
  {
    id: 'dti_alps',
    label: 'DTI-ALPS Index',
    category: 'BOUNDARY',
    subtype: 'Biomarker',
    moduleId: 'M18',
    sharedWith: ['M12'],
    boundaryDirection: 'output',
    description: 'MRI glymphatic function measure',
    mechanism: 'Diffusion tensor imaging along perivascular spaces. Lower ALPS index indicates impaired glymphatic function. Correlates with PVS enlargement and GFAP elevation.',
    roles: ['BIOMARKER'],
  },
  {
    id: 'vimentin_fragments',
    label: 'Vimentin Fragments',
    category: 'BOUNDARY',
    subtype: 'Biomarker',
    moduleId: 'M18',
    boundaryDirection: 'output',
    description: 'N283 cleavage products (novel biomarker)',
    mechanism: 'Specific vimentin fragments from AEP cleavage. Could distinguish AEP-mediated damage from other astrocyte injury. Not yet clinically validated.',
    roles: ['BIOMARKER'],
  },
];

// ============================================================================
// EXPORT ALL NODES
