/**
 * Module 2: Lysosomal Pathology
 */

import type { MechanisticNode } from '../types';

export const module2Nodes: MechanisticNode[] = [
  {
    id: 'lysosome_pool',
    label: 'Lysosome Pool',
    category: 'STOCK',
    subtype: 'OrganellePool',
    moduleId: 'M02',
    references: {
      process: 'GO:0005764', // lysosome
    },
    description: 'Functional lysosome organelle pool; depleted by reduced biogenesis',
    mechanism: 'TFEB drives lysosomal biogenesis; reduced TFEB nuclear activity → fewer functional lysosomes',
    units: 'LAMP1+ puncta per cell',
    roles: ['RATE_LIMITER'],
  },
  {
    id: 'damaged_mito_pool',
    label: 'Damaged Mitochondria Pool',
    category: 'STOCK',
    subtype: 'OrganellePool',
    moduleId: 'M02',
    references: { process: 'GO:0005739' },
    description: 'Accumulating damaged mitochondria',
    mechanism: 'Source for Routes 1B (lysosomal) and 2 (pre-lysosomal)',
    units: 'TMRM low/total mito ratio',
  },
  {
    id: 'cargo_accumulation',
    label: 'Cargo Accumulation',
    category: 'STOCK',
    subtype: 'Aggregate',
    moduleId: 'M02',
    description: 'Aβ, tau, lipids, iron, undegraded organelles',
    mechanism: 'Builds up when degradation rate < delivery rate',
  },
  {
    id: 'lipofuscin',
    label: 'Lipofuscin',
    category: 'STOCK',
    subtype: 'Aggregate',
    moduleId: 'M02',
    references: { drug: 'CHEBI:34813' },
    description: 'Cross-linked proteins + oxidized lipids; undegradable',
    mechanism: 'Irreversible age pigment that damages lysosomal membrane',
    timescale: 'years',
  },
  {
    id: 'bmp_lysosomal',
    label: 'BMP (Bis(monoacylglycero)phosphate)',
    category: 'STOCK',
    subtype: 'MetabolitePool',
    moduleId: 'M02',
    references: {
      drug: 'CHEBI:73497', // bis(monoacylglycero)phosphate
    },
    description: 'Lysosome-specific lipid; biomarker for lysosomal stress/storage disorders',
    mechanism: 'BMP is enriched in late endosomes/lysosomes; facilitates lipid degradation by activating acid sphingomyelinase. ↑BMP indicates lysosomal stress, ↓BMP impairs lipid catabolism. In AD: elevated BMP(22:6-22:6) suggests compensatory response to lysosomal dysfunction. Key evidence: Nguyen 2024 showed BMP(22:6-22:6) significantly elevated in AD brains; Raben 2013 (PMID:23670896) showed BMP correlates with lysosomal storage disease severity',
    units: 'nmol/mg protein',
    roles: ['BIOMARKER'],
  },
  {
    id: 'lmp',
    label: 'Lysosomal Membrane Permeabilization',
    category: 'STATE', // SBSF v2.0: Was PROCESS, now STATE (process activity as categorical state)
    subtype: 'BiologicalProcess',
    moduleId: 'M02',
    references: { process: 'GO:0090559' },
    description: 'Lysosomal membrane breach',
    mechanism: 'Releases cathepsins and other DAMPs to cytosol',
  },
  {
    id: 'cathepsin_b_cytosolic',
    label: 'Cytosolic Cathepsin B',
    category: 'STOCK',
    subtype: 'ActiveProteinPool',
    moduleId: 'M02',
    references: {
      protein: 'UniProt:P07858',
      process: 'GO:0005829',
    },
    compartment: { subcellular: 'Cytosol' },
    description: 'Active cathepsin B escaped from lysosome',
    mechanism: 'Danger signal that activates NLRP3 inflammasome',
    units: 'U/mg protein',
  },
  {
    id: 'mitophagosome',
    label: 'Mitophagosome',
    category: 'STOCK',
    subtype: 'OrganellePool',
    moduleId: 'M02',
    references: { process: 'GO:0000421' },
    description: 'PINK1/Parkin-tagged mitochondrion in autophagosome',
    mechanism: 'Intermediate in mitophagy pathway',
  },
  {
    id: 'autolysosome',
    label: 'Autolysosome',
    category: 'STOCK',
    subtype: 'OrganellePool',
    moduleId: 'M02',
    references: { process: 'GO:0044754' },
    description: 'Mitophagosome fused with lysosome',
    mechanism: 'Where degradation should occur (but may fail)',
  },
  {
    id: 'mtdna_undegraded',
    label: 'Undegraded mtDNA (Lysosomal)',
    category: 'STOCK',
    subtype: 'MetabolitePool',
    moduleId: 'M02',
    description: 'DNase II inactive at high pH; mtDNA persists',
    mechanism: 'Accumulates in autolysosome due to pH failure',
  },
  {
    id: 'mtdna_from_lysosome',
    label: 'mtDNA Escaped from Lysosome',
    category: 'STOCK',
    subtype: 'MetabolitePool',
    moduleId: 'M02',
    description: 'mtDNA escaped through compromised membrane; DAMP',
    mechanism: 'Route 1B: lysosome → cytosol → cGAS-STING',
  },
];

// ============================================================================
// MODULE 3: Mitochondrial Dysfunction
