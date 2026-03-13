/**
 * Module 16: Sex & Ancestry Modifiers
 */

import type { MechanisticNode } from '../types';

export const module16Nodes: MechanisticNode[] = [
  // NOTE: estrogen_level and testosterone_level moved to M20 (Hormonal Influences)
  // with more comprehensive definitions including biomarker detection timelines
  {
    id: 'fsh_elevated',
    label: 'FSH Elevated (Menopause)',
    category: 'STOCK',
    subtype: 'HormoneLevel',
    moduleId: 'M16',
    description: 'Rising FSH at menopause',
    mechanism: 'Acts on hippocampal neurons → C/EBPβ-δ-secretase → Aβ/tau',
  },
  {
    id: 'x_linked_lysosomal_genes',
    label: 'X-Linked Lysosomal Genes',
    category: 'BOUNDARY',
    subtype: 'Gene',
    moduleId: 'M16',
    boundaryDirection: 'input',
    description: 'ATP6AP2, SLC9A7, ATP6AP1, LAMP2 on X chromosome',
    mechanism: 'XX vs XY affects lysosomal gene dosage',
  },
  {
    id: 'visceral_adipose_tissue',
    label: 'Visceral Adipose Tissue',
    category: 'STOCK',
    subtype: 'MetabolitePool',
    moduleId: 'M16',
    description: 'VAT produces IL-6, TNF-α, leptin',
    mechanism: 'Ancestry-dependent distribution; pro-inflammatory',
  },
  {
    id: 'apoe4_ancestry_effect',
    label: 'APOE4 Ancestry Effect',
    category: 'STATE',
    subtype: 'GeneticVariant',
    moduleId: 'M16',
    description: 'APOE4 effect varies by ancestry',
    mechanism: 'Attenuated in African; amplified in Amerindian',
  },
  {
    id: 'female_iron_storage_failure',
    label: 'Female Iron Storage Failure',
    category: 'STATE',
    subtype: 'MetabolicState',
    moduleId: 'M16',
    description: 'Women with AD show opposite iron-ferritin correlation',
    mechanism: 'Microglial ferritin storage fails in female AD',
  },
];

// ============================================================================
// MODULE 17: Immunomodulatory Interventions
