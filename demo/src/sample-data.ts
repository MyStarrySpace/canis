import type { SimpleJsonData } from '../../src/adapters/simple-json';

/**
 * Sample graph: simplified neuroinflammation signaling pathway.
 * Demonstrates different node categories, subtypes, modules, and edge relations.
 */
export const sampleGraph: SimpleJsonData = {
  modules: [
    { id: 'immune', name: 'Immune Signaling', shortName: 'Immune', color: '#60a5fa' },
    { id: 'neuro', name: 'Neuronal Damage', shortName: 'Neuro', color: '#f87171' },
    { id: 'clearance', name: 'Protein Clearance', shortName: 'Clear', color: '#34d399' },
    { id: 'metabolic', name: 'Metabolic Stress', shortName: 'Metab', color: '#fbbf24' },
  ],
  nodes: [
    // Immune module
    { id: 'microglia', label: 'Microglia', category: 'STOCK', subtype: 'Protein', moduleId: 'immune', description: 'Brain-resident immune cells' },
    { id: 'tnf_alpha', label: 'TNF-\u03b1', category: 'STOCK', subtype: 'Molecule', moduleId: 'immune', description: 'Pro-inflammatory cytokine' },
    { id: 'il1b', label: 'IL-1\u03b2', category: 'STOCK', subtype: 'Molecule', moduleId: 'immune', description: 'Interleukin-1 beta' },
    { id: 'nfkb', label: 'NF-\u03baB', category: 'PROCESS', subtype: 'BiochemicalReaction', moduleId: 'immune', description: 'Master inflammatory transcription factor' },

    // Neuronal damage module
    { id: 'amyloid_beta', label: 'A\u03b2 Oligomers', category: 'STOCK', subtype: 'Protein', moduleId: 'neuro', description: 'Amyloid-beta oligomers', roles: ['BIOMARKER'] },
    { id: 'tau_p', label: 'Phospho-Tau', category: 'STATE', subtype: 'ProteinPool', moduleId: 'neuro', description: 'Hyperphosphorylated tau protein', roles: ['BIOMARKER'] },
    { id: 'synapse_loss', label: 'Synapse Loss', category: 'STATE', subtype: 'CellularState', moduleId: 'neuro', description: 'Loss of synaptic connections' },
    { id: 'neuronal_death', label: 'Neuronal Death', category: 'STATE', subtype: 'CellularState', moduleId: 'neuro', description: 'Irreversible neuron loss' },

    // Clearance module
    { id: 'autophagy', label: 'Autophagy', category: 'PROCESS', subtype: 'BiochemicalReaction', moduleId: 'clearance', description: 'Cellular self-digestion and recycling', roles: ['THERAPEUTIC_TARGET'] },
    { id: 'lysosome', label: 'Lysosome', category: 'STOCK', subtype: 'Organelle', moduleId: 'clearance', description: 'Degradation organelle' },
    { id: 'proteasome', label: 'Proteasome', category: 'STOCK', subtype: 'Organelle', moduleId: 'clearance', description: 'Protein degradation complex', roles: ['THERAPEUTIC_TARGET'] },

    // Metabolic module
    { id: 'ros', label: 'ROS', category: 'STOCK', subtype: 'Molecule', moduleId: 'metabolic', description: 'Reactive oxygen species' },
    { id: 'mitochondria', label: 'Mitochondria', category: 'STOCK', subtype: 'Organelle', moduleId: 'metabolic', description: 'Cellular energy production' },
    { id: 'bbb', label: 'Blood-Brain Barrier', category: 'BOUNDARY', subtype: 'Membrane', moduleId: 'metabolic', description: 'Vascular endothelial barrier' },
  ],
  edges: [
    // Immune cascade
    { source: 'amyloid_beta', target: 'microglia', relation: 'increases', label: 'activates' },
    { source: 'microglia', target: 'tnf_alpha', relation: 'produces', label: 'releases' },
    { source: 'microglia', target: 'il1b', relation: 'produces', label: 'releases' },
    { source: 'tnf_alpha', target: 'nfkb', relation: 'increases', label: 'activates' },
    { source: 'il1b', target: 'nfkb', relation: 'increases', label: 'activates' },
    { source: 'nfkb', target: 'microglia', relation: 'amplifies', label: 'positive feedback' },

    // Neuronal damage
    { source: 'amyloid_beta', target: 'tau_p', relation: 'increases', label: 'promotes' },
    { source: 'tau_p', target: 'synapse_loss', relation: 'increases', label: 'causes' },
    { source: 'synapse_loss', target: 'neuronal_death', relation: 'increases', label: 'leads to' },
    { source: 'tnf_alpha', target: 'synapse_loss', relation: 'increases', label: 'exacerbates' },

    // Clearance pathways
    { source: 'autophagy', target: 'amyloid_beta', relation: 'decreases', label: 'clears' },
    { source: 'lysosome', target: 'autophagy', relation: 'increases', label: 'enables' },
    { source: 'proteasome', target: 'tau_p', relation: 'decreases', label: 'degrades' },

    // Metabolic stress
    { source: 'mitochondria', target: 'ros', relation: 'produces', label: 'generates' },
    { source: 'ros', target: 'mitochondria', relation: 'decreases', label: 'damages' },
    { source: 'ros', target: 'lysosome', relation: 'disrupts', label: 'permeabilizes' },
    { source: 'ros', target: 'nfkb', relation: 'increases', label: 'activates' },
    { source: 'bbb', target: 'microglia', relation: 'regulates', label: 'peripheral signals' },
    { source: 'tnf_alpha', target: 'bbb', relation: 'disrupts', label: 'increases permeability' },
  ],
};
