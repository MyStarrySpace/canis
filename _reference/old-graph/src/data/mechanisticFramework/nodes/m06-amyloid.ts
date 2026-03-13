/**
 * Module 6: Amyloid Pathology
 */

import type { MechanisticNode } from '../types';

export const module6Nodes: MechanisticNode[] = [
  {
    id: 'bace1_upregulated',
    label: 'BACE1 Upregulated',
    category: 'STOCK', // SBSF v2.0: Was REGULATOR, now STOCK with REGULATOR role
    subtype: 'Protease',
    moduleId: 'M06',
    references: { protein: 'UniProt:P56817', process: 'GO:0004190' },
    description: 'β-secretase; rate-limiting for Aβ production',
    mechanism: 'NF-κB-driven transcription; cleaves APP at β-site',
    roles: ['REGULATOR', 'THERAPEUTIC_TARGET', 'RATE_LIMITER'],
  },
  {
    id: 'app_betactf',
    label: 'APP β-CTF (C99)',
    category: 'STOCK',
    subtype: 'ProteinPool',
    moduleId: 'M06',
    references: { protein: 'UniProt:P05067' },
    description: 'β-secretase cleavage product; membrane-bound C-terminal fragment',
    mechanism: 'BACE1 cleaves APP → sAPPβ released + C99 remains membrane-bound → γ-secretase substrate',
  },
  {
    id: 'abeta_monomers',
    label: 'Aβ Monomers',
    category: 'STOCK',
    subtype: 'ProteinPool',
    moduleId: 'M06',
    references: { drug: 'CHEBI:64645' },
    description: 'Soluble monomeric Aβ peptides (Aβ40, Aβ42, Aβ43)',
    mechanism: 'γ-secretase cleavage of C99 releases Aβ monomers; Aβ42 > Aβ40 in aggregation propensity',
    units: 'pg/mL',
  },
  {
    id: 'app_processing_amyloidogenic',
    label: 'Amyloidogenic APP Processing',
    category: 'STATE', // SBSF v2.0: Was PROCESS, now STATE (process activity as categorical state)
    subtype: 'BiologicalProcess',
    moduleId: 'M06',
    references: { process: 'GO:0042987' },
    description: 'BACE1 → C99 → γ-secretase → Aβ',
    mechanism: 'Sequential cleavage producing Aβ40/42',
  },
  {
    id: 'abeta_production',
    label: 'Aβ Production Rate',
    category: 'STATE', // SBSF v2.0: Was PROCESS, now STATE (process activity as categorical state)
    subtype: 'BiologicalProcess',
    moduleId: 'M06',
    references: { drug: 'CHEBI:64645' },
    description: 'Aβ generation rate; Aβ42 > Aβ40 in aggregation',
    units: 'pg/mL/h',
  },
  {
    id: 'abeta_plaques',
    label: 'Aβ Plaques',
    category: 'STOCK',
    subtype: 'Aggregate',
    moduleId: 'M06',
    references: { phenotype: 'HP:0100256' },
    description: 'Insoluble fibrillar deposits',
    mechanism: 'Endpoint of aggregation cascade; may sequester toxic oligomers',
    roles: ['BIOMARKER'],
  },
  {
    id: 'abeta_clearance',
    label: 'Aβ Clearance',
    category: 'STATE', // SBSF v2.0: Was PROCESS, now STATE (process activity as categorical state)
    subtype: 'Phagocytosis',
    moduleId: 'M06',
    references: { process: 'GO:0006909' },
    description: 'Aβ clearance rate (microglial, glymphatic, BBB-mediated)',
    mechanism: 'Impaired in LDAM; late-onset AD likely involves clearance failure',
  },
  {
    id: 'plaque_compaction',
    label: 'Plaque Compaction',
    category: 'STATE', // SBSF v2.0: Was PROCESS, now STATE (process activity as categorical state)
    subtype: 'BiologicalProcess',
    moduleId: 'M06',
    description: 'TREM2/microglia-dependent PROTECTIVE compaction',
    mechanism: `Yuan 2016 (Neuron): Microglia COMPACT plaques as a protective response.

      Dense-core plaques = successful containment:
      - Microglia form tight barriers around plaque
      - Toxic oligomers sequestered in fibrillar core
      - Less neuritic dystrophy in surrounding neuropil

      TREM2 deficiency → plaque compaction failure:
      - Diffuse, filamentous plaques (failed containment)
      - MORE neurotoxicity, not less
      - Greater tau hyperphosphorylation in surrounding neurons

      CRITICAL PARADIGM SHIFT: Dense-core plaques may be PROTECTIVE.
      Anti-amyloid therapies that disrupt plaque structure might
      release toxic oligomers - explains ARIA and cognitive worsening.`,
    roles: ['THERAPEUTIC_TARGET'],
  },

  // ============================================================================
  // PLAQUE BARRIER - Dense-Core vs Diffuse
  // Key insight: Plaque morphology reflects containment success/failure
  // ============================================================================
  {
    id: 'dense_core_plaque',
    label: 'Dense-Core Plaque',
    category: 'STATE',
    subtype: 'Homeostatic', // Counterintuitively, this is a PROTECTED state
    moduleId: 'M06',
    description: 'Successfully compacted plaque with microglial barrier - PROTECTIVE',
    mechanism: `Dense-core plaques represent SUCCESSFUL microglial response:
      - Compact fibrillar core sequesters toxic species
      - Microglial barrier prevents oligomer diffusion
      - Less neuritic dystrophy in surrounding tissue
      - Associated with slower cognitive decline

      Yuan 2016: "Dense-core plaques are surrounded by microglia that
      form a barrier limiting neurotoxicity"

      This challenges the "plaques are bad" narrative:
      Dense-core plaques may be the best outcome given pathology.`,
  },
  {
    id: 'diffuse_filamentous_plaque',
    label: 'Diffuse Filamentous Plaque',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M06',
    description: 'Uncompacted plaque with failed microglial barrier - MORE toxic',
    mechanism: `Diffuse plaques represent FAILED microglial containment:
      - No compact core - amyloid spreads diffusely
      - Toxic oligomers leak into surrounding tissue
      - Greater neuritic dystrophy
      - Associated with faster cognitive decline

      TREM2 loss-of-function → diffuse plaques:
      - Microglia cannot form effective barrier
      - Paradoxically LESS plaque but MORE neurotoxicity
      - This explains why some anti-amyloid trials worsened outcomes`,
    roles: ['BIOMARKER'],
  },
  {
    id: 'plaque_associated_microglia',
    label: 'Plaque-Associated Microglia',
    category: 'STOCK',
    subtype: 'PhenotypePool',
    moduleId: 'M06',
    sharedWith: ['M05', 'M11'], // Links to Microglia and TREM2 modules
    description: 'Microglia forming protective barrier around plaques',
    mechanism: `Specialized microglial phenotype at plaque interface:
      - TREM2-dependent recruitment and activation
      - Barrier-forming morphology (flat, adherent processes)
      - Express DAM markers (Apoe, Lpl, Cst7, Itgax)

      Function: Physical containment of toxic amyloid species.

      CRITICAL: These are PROTECTIVE, not harmful microglia.
      Therapies should enhance, not suppress, barrier function.`,
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'synaptic_abeta_binding',
    label: 'Synaptic Aβ Binding',
    category: 'STATE', // SBSF v2.0: Was PROCESS, now STATE (process activity as categorical state)
    subtype: 'BiologicalProcess',
    moduleId: 'M06',
    description: 'Oligomer binding to PrPc, mGluR5, NMDAR',
    mechanism: 'Disrupts synaptic function; blocks LTP',
  },
  {
    id: 'ltp_inhibition',
    label: 'LTP Inhibition',
    category: 'STATE',
    subtype: 'CompartmentIntegrity',
    moduleId: 'M06',
    description: 'Long-term potentiation blocked by Aβ oligomers',
    mechanism: 'Oligomers specifically inhibit LTP; fibrils do not',
  },
];

// ============================================================================
// MODULE 7: Tau Pathology
