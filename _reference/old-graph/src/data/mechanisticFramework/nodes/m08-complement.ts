/**
 * Module 8: Complement & Synaptic Pruning
 */

import type { MechanisticNode } from '../types';

export const module8Nodes: MechanisticNode[] = [
  {
    id: 'c1q_elevated',
    label: 'C1q Elevated',
    category: 'STOCK',
    subtype: 'ProteinPool',
    moduleId: 'M08',
    references: { protein: 'UniProt:P02745' },
    description: 'C1q increases 300-fold with aging',
    mechanism: 'Tags synapses for elimination; initiates classical complement',
    roles: ['THERAPEUTIC_TARGET', 'BIOMARKER'],
  },
  {
    id: 'c3_opsonization',
    label: 'C3 Opsonization',
    category: 'STATE', // SBSF v2.0: Was PROCESS, now STATE (process activity as categorical state)
    subtype: 'BiologicalProcess',
    moduleId: 'M08',
    references: { protein: 'UniProt:P01024' },
    description: 'C3 cleavage → C3b deposits on tagged synapses',
    mechanism: 'C1q → C4 → C2 → C3 convertase → C3b',
  },
  {
    id: 'cr3_mediated_pruning',
    label: 'CR3-Mediated Synapse Pruning',
    category: 'STATE', // SBSF v2.0: Was PROCESS, now STATE (process activity as categorical state)
    subtype: 'Phagocytosis',
    moduleId: 'M08',
    references: { protein: 'UniProt:P11215' },
    description: 'Microglial CR3 engulfs C3-tagged synapses',
    mechanism: 'iC3b/C3b on synapse → CR3 binding → engulfment',
  },
  {
    id: 'synapse_elimination',
    label: 'Synapse Elimination',
    category: 'STATE', // SBSF v2.0: Was PROCESS, now STATE (process activity as categorical state)
    subtype: 'BiologicalProcess',
    moduleId: 'M08',
    description: 'Complement-mediated synapse loss',
    mechanism: 'Reactivated developmental pruning pathway in AD',
  },
  // ============================================================================
  // Synaptic Function Nodes - More specific than vague "synaptic dysfunction"
  // ============================================================================
  {
    id: 'synaptic_plasticity',
    label: 'Synaptic Plasticity',
    category: 'STATE',
    subtype: 'BiologicalProcess',
    moduleId: 'M08',
    sharedWith: ['M06', 'M07', 'M15'], // LTP inhibition (M06), tau (M07), interventions (M15)
    references: {
      process: 'GO:0048167', // regulation of synaptic plasticity
    },
    description: 'Capacity for LTP/LTD and dendritic spine remodeling; correlates with learning/memory',
    mechanism: `Synaptic plasticity = ability to strengthen/weaken synapses in response to activity.
      Measured by: LTP/LTD induction, spine density, spine morphology (mushroom vs thin).
      Impaired by: Aβ oligomers (block LTP), tau missorting, inflammation, BDNF↓.
      PDE9 inhibitors (PF-04447943) prevented spine loss in young Tg2576 mice but couldn't reverse in established AD.
      Key distinction: Plasticity impairment is potentially reversible; synapse elimination is permanent.`,
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'bdnf',
    label: 'BDNF',
    category: 'STOCK',
    subtype: 'CytokineSignal',
    moduleId: 'M08',
    sharedWith: ['M15', 'M20'], // Exercise (M15), hormones (M20)
    references: {
      gene: 'HGNC:1033', // BDNF
      protein: 'UniProt:P23560',
    },
    description: 'Brain-derived neurotrophic factor; master regulator of synaptic plasticity',
    mechanism: `BDNF is essential for LTP, spine formation, and neuronal survival.
      Reduced in AD hippocampus and serum. Val66Met polymorphism affects activity-dependent secretion.
      Upregulated by: Exercise (most potent), estrogen, environmental enrichment, ketones.
      Downregulated by: Chronic stress/cortisol, Aβ, inflammation, sleep deprivation.
      Signals via TrkB receptor → MAPK/ERK, PI3K/Akt, PLCγ pathways.`,
    units: 'ng/mL (serum)',
    roles: ['THERAPEUTIC_TARGET', 'BIOMARKER'],
  },
  {
    id: 'dendritic_spine_density',
    label: 'Dendritic Spine Density',
    category: 'STOCK',
    subtype: 'CompartmentState',
    moduleId: 'M08',
    sharedWith: ['M06'], // Aβ-mediated spine loss
    references: {
      phenotype: 'HP:0007359', // reduced number of dendritic spines
    },
    description: 'Number of dendritic spines per unit dendrite length; structural basis of plasticity',
    mechanism: `Spine density reflects synaptic connectivity and capacity for plasticity.
      Reduced early in AD, even before synapse elimination. Aβ oligomers cause rapid spine retraction.
      Types: Thin (immature, plastic), Mushroom (mature, stable), Stubby (transitional).
      AD shows loss of mushroom spines and shift to thin spines before total loss.`,
    units: 'spines/μm',
    roles: ['BIOMARKER'],
  },
];

// ============================================================================
// MODULE 9: Iron Dysregulation & Ferroptosis
