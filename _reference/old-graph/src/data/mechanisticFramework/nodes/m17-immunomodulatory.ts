/**
 * Module 17: Trained Immunity / Vaccine-Mediated Neuroprotection
 *
 * Key insight: BOTH adjuvanted and non-adjuvanted vaccines protect against dementia.
 * This rules out adjuvant-specific mechanisms and points to trained immunity as the
 * unifying mechanism. Trained immunity is long-term epigenetic reprogramming of
 * innate immune cells (including microglia) that persists for months to years.
 */

import type { MechanisticNode } from '../types';

export const module17Nodes: MechanisticNode[] = [
  {
    id: 'vaccination',
    label: 'Vaccination',
    category: 'BOUNDARY',
    subtype: 'Biologic',
    moduleId: 'M17',
    boundaryDirection: 'input',
    description: 'Any vaccine (adjuvanted or live-attenuated)',
    mechanism: `Multiple vaccines show 17-45% dementia reduction:
    - Zostavax (live-attenuated, NO adjuvant): 17% (Pomirchy 2026)
    - Shingrix (recombinant + adjuvant): 17-18%
    - BCG (live-attenuated): ~45% in bladder cancer patients
    - RSV vaccines: 29%

    The fact that non-adjuvanted vaccines (Zostavax, BCG) protect equally well
    rules out adjuvant-specific mechanisms. Trained immunity is the unifying mechanism.`,
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'trained_immunity_induction',
    label: 'Trained Immunity Induction',
    category: 'STATE',
    subtype: 'BiologicalProcess',
    moduleId: 'M17',
    description: 'Long-term innate immune reprogramming',
    mechanism: `Trained immunity involves:
    - Epigenetic modifications (H3K4me3, H3K27ac at inflammatory gene promoters)
    - Metabolic reprogramming (glycolysis, TCA cycle alterations)
    - Occurs in monocytes, macrophages, NK cells, AND microglia
    - Duration: months to years (possibly lifelong via bone marrow progenitor reprogramming)

    Key regulatory node: IRG1/itaconate pathway determines tolerance vs training.`,
  },
  {
    id: 'microglial_reprogramming',
    label: 'Microglial Reprogramming',
    category: 'STATE',
    subtype: 'PhysiologicalState', // Cell phenotype altered by trained immunity
    moduleId: 'M17',
    description: 'Long-lived microglia as trained immunity substrates',
    mechanism: `Unlike peripheral macrophages, microglia are long-lived and self-renewing,
    making them ideal substrates for persistent trained immunity effects.

    Evidence (Heng 2021): Systemic β-glucan induces trained immunity in microglia.
    Peripheral immune challenges alter microglial phenotype for weeks-months.

    Result: Enhanced but regulated clearance of pathological proteins (Aβ, tau)
    and/or reduced chronic neuroinflammation.`,
    roles: ['LEVERAGE_POINT', 'THERAPEUTIC_TARGET'],
  },
  {
    id: 'ifn_gamma',
    label: 'IFN-γ',
    category: 'STOCK',
    subtype: 'CytokineLevel',
    moduleId: 'M17',
    references: { protein: 'UniProt:P01579' },
    description: 'Interferon gamma; key trained immunity effector',
    mechanism: 'May attenuate amyloid plaque deposition; negatively correlated with cognitive decline in unimpaired elderly. Part of the cytokine cascade triggered by trained immunity.',
    roles: ['BIOMARKER'],
  },
];

// ============================================================================
// MODULE 18: Astrocyte Endfoot Integrity / Clasmatodendrosis
