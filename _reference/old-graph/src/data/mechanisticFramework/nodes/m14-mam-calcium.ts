/**
 * Module 14: MAM & Calcium
 */

import type { MechanisticNode } from '../types';

export const module14Nodes: MechanisticNode[] = [
  {
    id: 'mam_hyperconnectivity',
    label: 'MAM Hyperconnectivity',
    category: 'STATE',
    subtype: 'CompartmentIntegrity',
    moduleId: 'M14',
    description: 'Increased ER-mitochondria contact sites',
    mechanism: 'FAD mutations → PS2-Mfn2 binding, APP C99 at MAM',
  },
  {
    id: 'er_mito_ca_flux',
    label: 'ER-Mito Ca²⁺ Flux Increased',
    category: 'STATE', // SBSF v2.0: Was PROCESS, now STATE (process activity as categorical state)
    subtype: 'BiologicalProcess',
    moduleId: 'M14',
    description: 'Enhanced Ca²⁺ transfer ER → mitochondria',
    mechanism: 'IP3R-VDAC-MCU axis at MAM',
  },
  {
    id: 'gamma_secretase_mam',
    label: 'γ-Secretase at MAM',
    category: 'STOCK', // SBSF v2.0: Was REGULATOR, now STOCK with REGULATOR role
    subtype: 'Protease',
    moduleId: 'M14',
    description: 'γ-secretase activity enriched at MAM',
    mechanism: 'MAM cholesterol → enhanced γ-secretase → more Aβ',
    roles: ['REGULATOR'],
  },
  {
    id: 'er_ca_stores',
    label: 'ER Ca²⁺ Stores',
    category: 'STOCK',
    subtype: 'MetabolitePool',
    moduleId: 'M14',
    description: 'PS1 mutations → ER Ca²⁺ leak dysfunction',
    mechanism: 'Increased ER Ca²⁺ → enhanced release to mitochondria',
  },
  {
    id: 'mito_ca_overload_mam',
    label: 'Mitochondrial Ca²⁺ Overload (MAM)',
    category: 'STATE',
    subtype: 'CompartmentIntegrity',
    moduleId: 'M14',
    description: 'MAM-mediated Ca²⁺ overload',
    mechanism: 'Hyperconnected MAM → excessive Ca²⁺ transfer → mPTP',
  },
];

// ============================================================================
// MODULE 15: Interventions & Clinical Boundaries
