/**
 * Module 3: Mitochondrial Dysfunction
 */

import type { MechanisticNode } from '../types';

export const module3Nodes: MechanisticNode[] = [
  {
    id: 'mito_ros',
    label: 'Mitochondrial ROS',
    category: 'STOCK',
    subtype: 'MetabolitePool',
    moduleId: 'M03',
    references: { drug: 'CHEBI:26523' },
    compartment: { subcellular: 'Mitochondrial matrix' },
    description: 'Superoxide/H₂O₂ from dysfunctional ETC',
    mechanism: 'Generated at Complex I/III by electron leak',
    units: 'MitoSOX fluorescence',
  },
  {
    id: 'mtdna_oxidized',
    label: 'Oxidized mtDNA',
    category: 'STOCK',
    subtype: 'MetabolitePool',
    moduleId: 'M03',
    references: { drug: 'CHEBI:78804' },
    compartment: { subcellular: 'Mitochondrial matrix' },
    description: '8-oxo-dG modified mtDNA within mitochondria',
    mechanism: 'ROS oxidizes guanine bases → 8-oxo-deoxyguanosine',
  },
  {
    id: 'ca_overload',
    label: 'Mitochondrial Ca²⁺ Overload',
    category: 'STATE',
    subtype: 'CompartmentIntegrity',
    moduleId: 'M03',
    references: { process: 'GO:0036437' },
    compartment: { subcellular: 'Mitochondrial matrix' },
    description: 'Matrix Ca²⁺ overload',
    mechanism: 'ROS damages Ca²⁺ handling → impaired efflux + sustained MCU uptake',
  },
  {
    id: 'mptp_open',
    label: 'mPTP Open',
    category: 'STATE',
    subtype: 'CompartmentIntegrity',
    moduleId: 'M03',
    references: { process: 'GO:0046929' },
    description: 'Mitochondrial permeability transition pore open state',
    mechanism: 'Ca²⁺ binds CypD → conformational change → pore opens',
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'vdac_oligomer',
    label: 'VDAC Oligomers',
    category: 'STOCK',
    subtype: 'ComplexPool',
    moduleId: 'M03',
    references: { protein: 'UniProt:P21796' },
    compartment: { subcellular: 'Outer mitochondrial membrane' },
    description: 'VDAC oligomers forming pores in outer membrane',
    mechanism: 'Allow mtDNA fragment exit',
  },
  {
    id: 'ox_mtdna_cytosolic',
    label: 'Cytosolic Oxidized mtDNA',
    category: 'STOCK',
    subtype: 'MetabolitePool',
    moduleId: 'M03',
    compartment: { subcellular: 'Cytosol' },
    description: '500-650 bp oxidized mtDNA fragments in cytosol (FEN1-cleaved)',
    mechanism: 'Route 2: exits via mPTP/VDAC → activates NLRP3',
  },
  {
    id: 'mtdna_cytosolic',
    label: 'Cytosolic mtDNA (Non-oxidized)',
    category: 'STOCK',
    subtype: 'MetabolitePool',
    moduleId: 'M03',
    compartment: { subcellular: 'Cytosol' },
    description: 'Non-oxidized mtDNA in cytosol',
    mechanism: 'Route 2: exits via VDAC → activates cGAS-STING',
  },
  {
    id: 'pink1_parkin',
    label: 'PINK1/Parkin Mitophagy',
    category: 'STOCK', // SBSF v2.0: Was REGULATOR, now STOCK with REGULATOR role
    subtype: 'MasterRegulator',
    moduleId: 'M03',
    references: {
      protein: 'UniProt:Q9BXM7', // PINK1
    },
    description: 'Mitophagy gatekeepers',
    mechanism: 'Clear damaged mitochondria BEFORE mtDNA can escape',
    roles: ['REGULATOR', 'THERAPEUTIC_TARGET'],
  },
];

// ============================================================================
// MODULE 4: Inflammasome & Cytokines
