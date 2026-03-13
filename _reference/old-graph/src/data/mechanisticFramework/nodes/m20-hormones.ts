/**
 * Module 20: Hormonal Influences on AD
 *
 * This module captures the bidirectional relationships between hormones
 * and Alzheimer's disease pathology, including:
 * - Sex hormones (estrogen, progesterone, testosterone)
 * - Stress hormones (cortisol, HPA axis)
 * - Metabolic hormones (thyroid, insulin)
 *
 * Key insight: Hormone changes represent both risk factors AND therapeutic targets,
 * with effects that vary by APOE genotype and sex.
 */

import { MechanisticNode } from '../types';

export const module20Nodes: MechanisticNode[] = [
  // ============================================================================
  // SEX HORMONES - ESTROGEN
  // ============================================================================
  {
    id: 'estrogen_level',
    label: 'Estrogen Level',
    category: 'BOUNDARY',
    subtype: 'HormoneSignal',
    moduleId: 'M20',
    sharedWith: ['M16'], // Used by sex → estrogen_level edges in M16
    boundaryDirection: 'input',
    description: 'Circulating estrogen (E2) - declines sharply at menopause',
    mechanism: 'Estrogen is neuroprotective: promotes synaptic plasticity, reduces Aβ production, and enhances mitochondrial function. Menopause triggers 60% decline in E2 levels over 2-3 years. APOE4 women lose these protective effects earlier and more severely.',
    roles: ['BIOMARKER', 'THERAPEUTIC_TARGET'],
    units: 'pg/mL',
    references: {
      gene: 'NCBI:2099', // ESR1
      process: 'GO:0043627', // estrogen response
    },
  },
  {
    id: 'hrt_intervention',
    label: 'Hormone Replacement Therapy',
    category: 'BOUNDARY',
    subtype: 'DrugIntervention',
    moduleId: 'M20',
    boundaryDirection: 'input',
    description: 'Estrogen ± progesterone replacement therapy',
    mechanism: 'HRT benefits depend on TIMING and GENOTYPE. Critical window hypothesis: HRT started within 5 years of menopause may be neuroprotective; started later may be harmful. APOE4 women show LARGER benefit from HRT (Saleh 2023 EPAD cohort).',
    roles: ['DRUG', 'LEVERAGE_POINT'],
    references: {
      drug: 'CHEBI:50114', // estradiol
    },
  },
  {
    id: 'estrogen_neuroprotection',
    label: 'Estrogen Neuroprotection',
    category: 'STATE',
    subtype: 'PhysiologicalState',
    moduleId: 'M20',
    description: 'Estrogen-mediated neuroprotective mechanisms',
    mechanism: 'E2 acts via ERα/ERβ receptors to: (1) increase BDNF expression, (2) promote dendritic spine formation, (3) reduce APP processing to Aβ, (4) enhance mitochondrial respiration, (5) reduce neuroinflammation via microglial modulation.',
    roles: ['LEVERAGE_POINT'],
  },

  // ============================================================================
  // SEX HORMONES - TESTOSTERONE
  // ============================================================================
  {
    id: 'testosterone_level',
    label: 'Testosterone Level',
    category: 'BOUNDARY',
    subtype: 'HormoneSignal',
    moduleId: 'M20',
    sharedWith: ['M16'], // Used by sex → testosterone_level edges in M16
    boundaryDirection: 'input',
    description: 'Circulating testosterone - gradual decline with age in men',
    mechanism: 'Testosterone declines ~1-2% per year after age 30 in men. Low bioavailable testosterone associated with higher dementia risk (HR 1.29). However, testosterone replacement trials show mixed results for cognition. Currently a BIOMARKER not a proven therapeutic target.',
    roles: ['BIOMARKER'],
    units: 'ng/dL',
    references: {
      gene: 'NCBI:367', // AR (androgen receptor)
    },
  },
  {
    id: 'testosterone_neuroprotection',
    label: 'Testosterone Neuroprotection',
    category: 'STATE',
    subtype: 'PhysiologicalState',
    moduleId: 'M20',
    description: 'Testosterone-mediated neuroprotective mechanisms',
    mechanism: 'In animal models, testosterone reduces Aβ production, improves synaptic signaling, and counteracts neuronal death. Brain testosterone is lower in men with AD vs controls (post-mortem). However, clinical trial benefits remain unproven.',
    roles: [],
  },

  // ============================================================================
  // STRESS HORMONES - HPA AXIS
  // ============================================================================
  {
    id: 'cortisol_level',
    label: 'Cortisol Level',
    category: 'BOUNDARY',
    subtype: 'HormoneSignal',
    moduleId: 'M20',
    boundaryDirection: 'input',
    sharedWith: ['M12'], // Links to BBB/vascular
    description: 'Circulating cortisol - elevated in chronic stress and AD',
    mechanism: 'Cortisol is significantly elevated in AD patients vs controls. Chronic elevation causes: hippocampal atrophy, synaptic dysfunction, increased Aβ production, and enhanced tau phosphorylation. Creates VICIOUS CIRCLE: hippocampal damage → HPA disinhibition → more cortisol.',
    roles: ['BIOMARKER', 'THERAPEUTIC_TARGET'],
    units: 'μg/dL',
    references: {
      process: 'GO:0042755', // eating behavior
    },
  },
  {
    id: 'hpa_axis_activation',
    label: 'HPA Axis Activation',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M20',
    description: 'Hypothalamic-pituitary-adrenal axis dysregulation',
    mechanism: 'Chronic stress → CRH release → ACTH → cortisol. In AD, hippocampal damage removes inhibitory control over HPA axis, leading to chronic cortisol elevation. This is a REINFORCING LOOP: stress → cortisol → hippocampal damage → more cortisol.',
    roles: ['LEVERAGE_POINT'],
    references: {
      process: 'GO:0071345', // HPA axis
    },
  },
  {
    id: 'chronic_stress',
    label: 'Chronic Psychosocial Stress',
    category: 'BOUNDARY',
    subtype: 'EnvironmentalExposure',
    moduleId: 'M20',
    boundaryDirection: 'input',
    description: 'Chronic psychological/social stress exposure',
    mechanism: 'Chronic psychosocial stress is increasingly recognized as a MODIFIABLE risk factor for AD. Higher self-reported stress correlates with reduced hippocampal/PFC volume, faster cognitive decline, and higher dementia risk.',
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'stress_reduction',
    label: 'Stress Reduction Interventions',
    category: 'BOUNDARY',
    subtype: 'LifestyleIntervention',
    moduleId: 'M20',
    boundaryDirection: 'input',
    description: 'Mindfulness, meditation, social support, lifestyle interventions',
    mechanism: 'Stress-reducing interventions may be neuroprotective by normalizing HPA axis function. GR antagonist mifepristone reduces Aβ and tau in mouse models. Non-pharmacological approaches (meditation, exercise, social engagement) also reduce cortisol.',
    roles: ['DRUG', 'LEVERAGE_POINT'],
  },

  // ============================================================================
  // THYROID HORMONES
  // ============================================================================
  {
    id: 'thyroid_function',
    label: 'Thyroid Function',
    category: 'BOUNDARY',
    subtype: 'HormoneSignal',
    moduleId: 'M20',
    boundaryDirection: 'input',
    description: 'Thyroid hormone levels (T3, T4, TSH)',
    mechanism: 'Both hypo- and hyperthyroidism associated with increased AD risk. Hypothyroidism: 2-fold increased AD risk (Framingham). Reduced T4→T3 conversion (DIO2) in AD brain. Thyroid hormones regulate myelination, synaptic function, and metabolism.',
    roles: ['BIOMARKER'],
    units: 'TSH mIU/L, T4 μg/dL',
    references: {
      gene: 'NCBI:7170', // TPO
    },
  },
  {
    id: 'hypothyroidism',
    label: 'Hypothyroidism',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M20',
    description: 'Clinical or subclinical hypothyroidism',
    mechanism: 'Hypothyroidism more prevalent in AD (6.4% vs 2.4% in controls). May contribute via: reduced brain metabolism, impaired cholesterol clearance (APOE pathway), or reduced synaptic plasticity. Treatment does not clearly reverse cognitive effects.',
    roles: [],
    references: {
      disease: 'DOID:1659', // hypothyroidism
    },
  },

  // ============================================================================
  // INSULIN AND METABOLIC HORMONES
  // ============================================================================
  {
    id: 'insulin_signaling',
    label: 'Brain Insulin Signaling',
    category: 'STATE',
    subtype: 'SignalingPathway',
    moduleId: 'M20',
    sharedWith: ['M05', 'M02'], // Links to metabolism and lysosomes
    description: 'Insulin/IGF-1 signaling in the brain',
    mechanism: 'Brain insulin resistance is a core feature of AD ("Type 3 diabetes"). Impaired insulin signaling reduces: glucose uptake, Aβ clearance (IDE), and TFEB activation. APOE4 worsens brain insulin resistance. Intranasal insulin shows modest benefits in APOE4- patients.',
    roles: ['BIOMARKER', 'THERAPEUTIC_TARGET'],
    references: {
      process: 'GO:0008286', // insulin receptor signaling pathway
    },
  },
  {
    id: 'intranasal_insulin',
    label: 'Intranasal Insulin',
    category: 'BOUNDARY',
    subtype: 'DrugIntervention',
    moduleId: 'M20',
    boundaryDirection: 'input',
    description: 'Intranasal insulin delivery to brain',
    mechanism: 'Bypasses BBB to deliver insulin directly to brain. SNIFF trials showed memory improvement in APOE4-negative patients only. APOE4 carriers did not benefit, possibly due to different insulin resistance mechanisms.',
    roles: ['DRUG'],
    references: {
      drug: 'CHEBI:5931', // insulin
    },
  },

  // ============================================================================
  // MELATONIN AND CIRCADIAN
  // ============================================================================
  {
    id: 'melatonin_level',
    label: 'Melatonin Level',
    category: 'BOUNDARY',
    subtype: 'HormoneSignal',
    moduleId: 'M20',
    boundaryDirection: 'input',
    sharedWith: ['M12'], // Links to glymphatic
    description: 'Pineal melatonin production - declines with age',
    mechanism: 'Melatonin is reduced in AD patients. Regulates circadian rhythm, which controls glymphatic clearance during sleep. Also has direct antioxidant and anti-inflammatory properties. Supplementation may improve sleep quality but cognitive effects unclear.',
    roles: ['BIOMARKER', 'THERAPEUTIC_TARGET'],
    units: 'pg/mL',
    references: {
      gene: 'NCBI:4543', // MTNR1A
    },
  },
];
