/**
 * Module 11: TREM2 & DAM
 */

import type { MechanisticNode } from '../types';

export const module11Nodes: MechanisticNode[] = [
  {
    id: 'trem2_surface',
    label: 'TREM2 Surface Expression',
    category: 'STOCK',
    subtype: 'ProteinPool',
    moduleId: 'M11',
    references: { protein: 'UniProt:Q9NZC2' },
    description: 'TREM2 on microglial surface',
    mechanism: 'R47H/R62H variants reduce surface expression/function',
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'strem2',
    label: 'Soluble TREM2',
    category: 'STOCK',
    subtype: 'ProteinPool',
    moduleId: 'M11',
    description: 'Shed TREM2 ectodomain in CSF',
    mechanism: 'sTREM2↑ = slower progression (protective biomarker?)',
    units: 'pg/mL',
    roles: ['BIOMARKER'],
  },
  {
    id: 'dam_transition_blocked',
    label: 'DAM Transition Blocked',
    category: 'STATE',
    subtype: 'DAM',
    moduleId: 'M11',
    description: 'TREM2-/- or variant: Stage 1 → Stage 2 blocked',
    mechanism: 'Microglia cannot fully activate protective response',
  },
  {
    id: 'plaque_barrier_function',
    label: 'Microglial Plaque Barrier',
    category: 'STATE', // SBSF v2.0: Was PROCESS, now STATE (process activity as categorical state)
    subtype: 'BiologicalProcess',
    moduleId: 'M11',
    description: 'TREM2-dependent plaque compaction',
    mechanism: 'Microglia form barrier → reduced neuritic dystrophy',
  },
  {
    id: 'senescent_trem2_microglia',
    label: 'Senescent TREM2+ Microglia',
    category: 'STATE',
    subtype: 'Senescent',
    moduleId: 'M11',
    description: 'TREM2 promotes senescent microglia (harmful)',
    mechanism: 'Paradox: TREM2 required for both DAM and senescence',
  },
];

// ============================================================================
// MODULE 12: BBB & Glymphatic
