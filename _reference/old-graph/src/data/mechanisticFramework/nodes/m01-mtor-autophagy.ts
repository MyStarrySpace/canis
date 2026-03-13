/**
 * Module 1: Insulin/mTOR/Autophagy Axis
 */

import type { MechanisticNode } from '../types';

export const module1Nodes: MechanisticNode[] = [
  {
    id: 'insulin_resistance',
    label: 'Brain Insulin Resistance',
    category: 'STATE',
    subtype: 'MetabolicState',
    moduleId: 'M01',
    references: {
      disease: 'DOID:9352',
      phenotype: 'HP:0000855',
    },
    description: 'Brain insulin resistance ± systemic T2DM',
    mechanism: '"Type 3 Diabetes" concept - impaired brain insulin signaling',
    roles: ['LEVERAGE_POINT'],
  },
  {
    id: 'mtorc1_hyperactive',
    label: 'mTORC1 Hyperactive',
    category: 'STOCK', // SBSF v2.0: Was REGULATOR, now STOCK with REGULATOR role
    subtype: 'Kinase',
    moduleId: 'M01',
    references: {
      process: 'GO:0031931',
      protein: 'UniProt:P42345',
    },
    compartment: { subcellular: 'Lysosomal membrane' },
    description: 'Constitutively active mTORC1 complex',
    mechanism: 'On lysosomal membrane due to chronic AKT signaling',
    roles: ['REGULATOR', 'THERAPEUTIC_TARGET', 'RATE_LIMITER'],
  },
  {
    id: 'tfeb_phosphorylated',
    label: 'TFEB Phosphorylated',
    category: 'STATE',
    subtype: 'Phosphorylated',
    moduleId: 'M01',
    references: { protein: 'UniProt:P19484' },
    compartment: { subcellular: 'Cytoplasm' },
    description: 'pSer211 + pSer142 creates 14-3-3 binding',
    mechanism: 'Cytoplasmic sequestration prevents nuclear translocation',
    modifications: [
      { type: 'phosphorylation', sites: ['Ser211', 'Ser142'], effect: '14-3-3 binding → cytoplasmic retention' },
    ],
  },
  {
    id: 'ampk_phosphorylated',
    label: 'AMPK Phosphorylated (Inhibited)',
    category: 'STOCK', // SBSF v2.0: Was REGULATOR, now STOCK with REGULATOR role
    subtype: 'Kinase',
    moduleId: 'M01',
    references: { protein: 'UniProt:P54646' },
    description: 'pSer345 by mTORC1 prevents lysosomal recruitment',
    mechanism: 'Cannot be recruited to lysosome for nutrient-sensing autophagy activation',
    modifications: [
      { type: 'phosphorylation', sites: ['Ser345'], effect: 'Prevents lysosomal recruitment' },
    ],
    roles: ['REGULATOR'],
  },
  {
    id: 'sirt1_activity',
    label: 'SIRT1 (Sirtuin 1)',
    category: 'STOCK', // SBSF v2.0: STOCK with REGULATOR role
    subtype: 'Transferase', // Deacetylase - transfers acetyl groups
    moduleId: 'M01',
    references: { protein: 'UniProt:Q96EB6' },
    description: 'NAD+-dependent deacetylase; longevity-associated enzyme',
    mechanism: 'Deacetylates tau, PGC-1α, FOXO, NF-κB p65; anti-inflammatory and pro-autophagy',
    roles: ['REGULATOR', 'THERAPEUTIC_TARGET'],
  },
  {
    id: 'ulk1_phosphorylated',
    label: 'ULK1 Phosphorylated (Inhibited)',
    category: 'STOCK', // SBSF v2.0: Was REGULATOR, now STOCK with REGULATOR role
    subtype: 'Kinase',
    moduleId: 'M01',
    references: { protein: 'UniProt:O75385' },
    description: 'pSer757 blocks AMPK binding site',
    mechanism: 'Inhibits autophagy initiation',
    modifications: [
      { type: 'phosphorylation', sites: ['Ser757'], effect: 'Blocks AMPK binding → autophagy inhibited' },
    ],
    roles: ['REGULATOR'],
  },
  {
    id: 'lysosomal_genes_down',
    label: 'Lysosomal Genes Downregulated',
    category: 'STATE', // SBSF v2.0: Was PROCESS, now STATE (process activity as categorical state)
    subtype: 'BiologicalProcess',
    moduleId: 'M01',
    references: {
      process: 'GO:0007040', // lysosome assembly
    },
    description: 'TFEB targets: ATP6V0A1, ATP6V1H, CTSD, CTSB, LAMP1, LAMP2, GBA',
    mechanism: 'TFEB nuclear exclusion → CLEAR network genes not transcribed',
  },
  {
    id: 'lysosomal_dysfunction',
    label: 'Lysosomal Dysfunction',
    category: 'STATE',
    subtype: 'CompartmentIntegrity',
    moduleId: 'M02',  // Moved from M01 - this node belongs in Lysosomal module
    references: {
      phenotype: 'HP:0003236',
      process: 'GO:0005764',
    },
    description: 'pH >5.5, ↓cathepsin activity, ↓degradation',
    mechanism: 'Central node linking mTOR axis to downstream pathology',
    roles: ['FEEDBACK_HUB', 'LEVERAGE_POINT'],
  },
  {
    id: 'mitophagy_rate_reduced',
    label: 'Mitophagy Rate Reduced',
    category: 'STATE', // SBSF v2.0: Was PROCESS, now STATE (process activity as categorical state)
    subtype: 'Mitophagy',
    moduleId: 'M01',
    references: { process: 'GO:0000422' },
    description: 'AMPK/ULK1 pathway impaired; PINK1/Parkin still functional',
    mechanism: 'Autophagosome formation reduced despite mitochondrial damage',
  },
  // S6K1-IRS1 feedback loop nodes
  {
    id: 's6k1_active',
    label: 'S6K1 Active',
    category: 'STOCK', // SBSF v2.0: Was REGULATOR, now STOCK with REGULATOR role
    subtype: 'Kinase',
    moduleId: 'M01',
    references: { protein: 'UniProt:P23443' },
    description: 'p70 S6 kinase; phosphorylated at Thr389 by mTORC1',
    mechanism: 'Canonical mTORC1 substrate; phosphorylates IRS-1',
    modifications: [
      { type: 'phosphorylation', sites: ['Thr389'], effect: 'Full activation' },
    ],
    roles: ['REGULATOR'],
  },
  {
    id: 'irs1_serine_phosphorylated',
    label: 'IRS-1 Serine Phosphorylated',
    category: 'STATE',
    subtype: 'Phosphorylated',
    moduleId: 'M01',
    references: { protein: 'UniProt:P35568' },
    description: 'pS307, pS312, pS527, pS616, pS636/639 = inhibitory',
    mechanism: 'Creates 14-3-3 binding sites, promotes degradation',
    modifications: [
      { type: 'phosphorylation', sites: ['Ser307', 'Ser312', 'Ser616', 'Ser636'], effect: 'Inhibits insulin signaling' },
    ],
  },
];

// ============================================================================
// MODULE 2: Lysosomal Pathology
