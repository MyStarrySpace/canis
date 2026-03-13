/**
 * Module 5: Microglial Phenotypes
 */

import type { MechanisticNode } from '../types';

export const module5Nodes: MechanisticNode[] = [
  {
    id: 'microglia_activated',
    label: 'Activated Microglia',
    category: 'STOCK',
    subtype: 'PhenotypePool',
    moduleId: 'M05',
    references: { cellType: 'CL:0000129' },
    description: 'Microglia leaving homeostatic state',
    mechanism: 'Triggered by neuroinflammation; transitions to multiple phenotypes',
  },
  {
    id: 'nf_kb_active',
    label: 'NF-κB Active',
    category: 'STOCK', // SBSF v2.0: Was REGULATOR, now STOCK with REGULATOR role
    subtype: 'Activator',
    moduleId: 'M05',
    references: { protein: 'UniProt:Q04206' },
    description: 'Nuclear NF-κB transcription factor',
    mechanism: 'Drives inflammatory gene transcription, HIF-1α stabilization',
    roles: ['REGULATOR', 'THERAPEUTIC_TARGET'],
  },
  {
    id: 'hif1a_stabilized',
    label: 'HIF-1α Stabilized',
    category: 'STOCK', // SBSF v2.0: Was REGULATOR, now STOCK with REGULATOR role
    subtype: 'Activator',
    moduleId: 'M05',
    references: { protein: 'UniProt:Q16665' },
    description: 'Hypoxia-inducible factor stabilized under normoxia',
    mechanism: 'Stabilized by NF-κB signaling; drives glycolytic switch',
    roles: ['REGULATOR'],
  },
  {
    id: 'glycolytic_switch',
    label: 'Glycolytic Switch',
    category: 'STATE',
    subtype: 'MetabolicState',
    moduleId: 'M05',
    description: 'Warburg-like metabolism in microglia',
    mechanism: 'HIF-1α → PKM2 dimer → aerobic glycolysis',
  },
  {
    id: 'srebp1_active',
    label: 'SREBP1 Active',
    category: 'STOCK', // SBSF v2.0: Was REGULATOR, now STOCK with REGULATOR role
    subtype: 'Activator',
    moduleId: 'M05',
    references: { protein: 'UniProt:P36956' },
    description: 'Lipogenic transcription factor',
    mechanism: 'Drives lipid droplet formation',
    roles: ['REGULATOR'],
  },
  {
    id: 'lipid_droplets',
    label: 'Lipid Droplets',
    category: 'STOCK',
    subtype: 'Aggregate',
    moduleId: 'M05',
    description: 'Intracellular lipid storage organelles',
    mechanism: 'SREBP1 → lipogenesis → LD formation',
  },
  {
    id: 'ldam',
    label: 'LDAM Microglia',
    category: 'STATE',
    subtype: 'LDAM',
    moduleId: 'M05',
    description: 'Lipid-droplet-accumulating microglia',
    mechanism: 'Defective phagocytosis, high ROS, pro-inflammatory cytokines',
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'dam_stage1',
    label: 'DAM Stage 1',
    category: 'STATE',
    subtype: 'DAM',
    moduleId: 'M05',
    description: 'Disease-associated microglia Stage 1 (TREM2-independent)',
    mechanism: 'P2ry12↓, Cx3cr1↓, Tyrobp↑ (checkpoint release)',
  },
  {
    id: 'dam_stage2',
    label: 'DAM Stage 2',
    category: 'STATE',
    subtype: 'DAM',
    moduleId: 'M05',
    description: 'Disease-associated microglia Stage 2 (TREM2-dependent)',
    mechanism: 'Lpl↑, Cst7↑, Cd9↑, Itgax↑ (full activation)',
  },
  {
    id: 'phagocytosis_impaired',
    label: 'Phagocytosis Impaired',
    category: 'STATE', // SBSF v2.0: Was PROCESS, now STATE (process activity as categorical state)
    subtype: 'Phagocytosis',
    moduleId: 'M05',
    references: { process: 'GO:0006909' },
    description: 'LDAM-associated phagocytic failure',
    mechanism: 'Lipid-laden lysosomes impair phagosome maturation',
  },
  {
    id: 'il1a',
    label: 'IL-1α',
    category: 'STOCK',
    subtype: 'CytokineLevel',
    moduleId: 'M05',
    references: { protein: 'UniProt:P01583' },
    description: 'Required for A1 astrocyte induction',
  },
  {
    id: 'tnf',
    label: 'TNF-α',
    category: 'STOCK',
    subtype: 'CytokineLevel',
    moduleId: 'M05',
    references: { protein: 'UniProt:P01375' },
    description: 'Required for A1 astrocyte induction',
  },
  {
    id: 'c1q',
    label: 'C1q',
    category: 'STOCK',
    subtype: 'ProteinPool',
    moduleId: 'M05',
    references: { protein: 'UniProt:P02745' },
    description: 'Complement component; required for A1 induction and synapse tagging',
    mechanism: 'IL-1α + TNF + C1q are necessary and sufficient for A1',
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'a1_astrocytes',
    label: 'A1 Astrocytes',
    category: 'STATE',
    subtype: 'A1_Astrocyte',
    moduleId: 'M05',
    description: 'Neurotoxic reactive astrocytes',
    mechanism: `A1 astrocytes are induced by IL-1α + TNF + C1q from activated microglia.
      They LOSE: synaptogenic support, phagocytosis, glutamate uptake (EAAT2).
      They GAIN: secretion of toxic saturated lipids via ELOVL1 upregulation.
      The toxic lipids are carried in APOE/APOJ lipoparticles (Guttenplan 2021).`,
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'a1_toxic_lipid_secretion',
    label: 'A1 Toxic Lipid Secretion',
    category: 'STATE',
    subtype: 'PhysiologicalState',
    moduleId: 'M05',
    sharedWith: ['M10'], // APOE module - lipids are carried in APOE particles
    description: 'Long-chain saturated lipids secreted by A1 astrocytes that kill neurons and OLs',
    mechanism: `Guttenplan 2021 (Nature) identified the A1 toxic factor:
      - NOT a protein - saturated LIPIDS
      - Carried in APOE and APOJ lipoparticles
      - Synthesized by ELOVL1 (elongation of very long chain fatty acids 1)
      - ELOVL1 knockout in astrocytes ELIMINATES toxicity
      - Specific toxic species: long-chain saturated fatty acids (C24:0, C26:0)

      THERAPEUTIC IMPLICATION: ELOVL1 inhibitors could block A1 toxicity
      without blocking beneficial astrocyte functions.`,
    roles: ['THERAPEUTIC_TARGET'],
    references: {
      gene: 'HGNC:14417', // ELOVL1
    },
  },

  // ============================================================================
  // METABOLIC CASCADE NODES (Infection → AD Pathway)
  // Key insight: mTOR-HIF1α axis drives glycolytic shift, IRG1/itaconate shunt
  // disrupts TCA cycle, compensatory glutaminolysis produces toxic ammonia
  // ============================================================================
  {
    id: 'mtor_hif1a_axis',
    label: 'mTOR-HIF1α Axis',
    category: 'STATE',
    subtype: 'SignalingPathway',
    moduleId: 'M05',
    references: {
      protein: 'UniProt:P42345', // MTOR
    },
    description: 'mTOR-HIF1α signaling axis drives glycolytic shift in AD microglia',
    mechanism:
      'mTORC1 → HIF-1α stabilization (via 4E-BP1 phosphorylation, reduced PHD activity) independent of hypoxia → PKM2 dimerization → aerobic glycolysis → loss of metabolic flexibility. VALIDATED IN HUMAN AD TISSUE. Old female microglia show STRONGER shift (Kang 2024).',
    roles: ['THERAPEUTIC_TARGET', 'LEVERAGE_POINT'],
  },
  {
    id: 'irg1_itaconate_shunt',
    label: 'IRG1/Itaconate Shunt',
    category: 'STATE',
    subtype: 'BiologicalProcess',
    moduleId: 'M05',
    references: {
      gene: 'HGNC:33532', // ACOD1/IRG1
      protein: 'UniProt:A6NK06',
    },
    description: 'IRG1 (ACOD1) diverts aconitate from TCA cycle to produce itaconate',
    mechanism:
      'Chronic inflammation → NF-κB → IRG1 transcription → aconitate diverted from TCA cycle → itaconate production. Itaconate competitively inhibits SDH and modifies KEAP1 cysteines → Nrf2 activation. Creates metabolic inflexibility. Mills 2018 Nature: IRG1 highly induced by LPS, IFNγ, TNF.',
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'sdh_inhibited',
    label: 'SDH Inhibited',
    category: 'STATE',
    subtype: 'BiologicalProcess',
    moduleId: 'M05',
    references: {
      protein: 'UniProt:P31040', // SDHA
      process: 'GO:0000104', // succinate dehydrogenase activity
    },
    description: 'Succinate dehydrogenase inhibition by itaconate',
    mechanism:
      'Itaconate competitively inhibits SDH (TCA cycle Complex II) → succinate accumulates → pseudohypoxic signaling → HIF-1α stabilization INDEPENDENT of oxygen. Creates positive feedback to glycolytic switch. Cordes 2016: itaconate is SDH competitive inhibitor.',
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'tca_disrupted',
    label: 'TCA Cycle Disrupted',
    category: 'STATE',
    subtype: 'MetabolicState',
    moduleId: 'M05',
    description: 'Broken TCA cycle forces compensatory pathways',
    mechanism:
      'SDH block + aconitate diversion = TCA cycle disruption → cells cannot generate ATP via OXPHOS efficiently → must find alternative carbon/nitrogen sources → compensatory glutaminolysis. Constantino 2025: AD is "a disorder of metabolic inflexibility."',
  },
  {
    id: 'glutaminolysis_compensatory',
    label: 'Compensatory Glutaminolysis',
    category: 'STATE',
    subtype: 'BiologicalProcess',
    moduleId: 'M05',
    references: {
      process: 'GO:0006541', // glutamine metabolic process
    },
    description: 'Increased glutamine catabolism to feed broken TCA cycle',
    mechanism:
      'Glutamine → glutamate (glutaminase) + NH₃ → α-ketoglutarate (anaplerotic). Generates 0.5-1 mol ammonia per mol glutamine. GAC (glutaminase C) heightened expression in early AD mouse brain. SDH-deficient cells show 75% of succinate from glutamine (vs 32% WT).',
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'ammonia_accumulation',
    label: 'Ammonia Accumulation',
    category: 'STOCK',
    subtype: 'MetabolitePool',
    moduleId: 'M05',
    sharedWith: ['M18'], // Links to astrocyte endfoot module
    description: 'Toxic ammonia from glutaminolysis',
    mechanism:
      'Excessive ammonia levels detected in brains of AD patients (Adlimoghaddam 2016). Ammonia → astrocyte GS saturation → glutamine accumulation → osmotic swelling → clasmatodendrosis. Links metabolic collapse to structural damage. MAO-B also generates ammonia + H₂O₂.',
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'ldam_super_seeders',
    label: 'LDAM Super-seeders',
    category: 'STATE',
    subtype: 'LDAM',
    moduleId: 'M05',
    description:
      'PARADIGM SHIFT: Iron-loaded, lipid-laden microglia with dysfunctional lysosomes that SEED amyloid plaques',
    mechanism:
      "CRITICAL (Baligács 2024): Microglia don't clear Aβ—they AGGREGATE it. When microglia are depleted: insoluble Aβ (plaques) DECREASED but soluble Aβ UNCHANGED. This proves microglia convert soluble → insoluble. Iron loading + lysosomal dysfunction + lipid accumulation = 'super-seeder' phenotype. ~40-50% of Aβ accumulation from microglial ASC specks (Venegas 2017).",
    roles: ['THERAPEUTIC_TARGET', 'LEVERAGE_POINT'],
  },
];

// ============================================================================
// MODULE 6: Amyloid Pathology
