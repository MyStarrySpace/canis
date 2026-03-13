/**
 * Network Presets
 *
 * Pre-defined configurations for loading groups of nodes/treatments into the
 * mechanistic network visualization. Presets can represent:
 * - Drug categories (approved, failed by stage)
 * - Lifestyle/environmental interventions
 * - Theoretical frameworks (hypotheses that span modules)
 *
 * Hypotheses are cross-cutting theories that connect nodes across multiple modules,
 * unlike modules which represent mechanistic components.
 */

import type { TreatmentLibraryEntry } from './drugLibrary';
import { treatmentLibrary } from './drugLibrary';

// ============================================================================
// TYPES
// ============================================================================

export type PresetCategory =
  | 'approved_drugs'
  | 'failed_stage1'    // Failed at amyloid-level (antibodies, secretase inhibitors)
  | 'failed_stage2'    // Failed at tau/inflammation
  | 'failed_stage3'    // Failed at symptomatic treatment
  | 'lifestyle'
  | 'hypotheses';

export interface PresetOption {
  id: string;
  label: string;
  description: string;
  category: PresetCategory;
  /** For drug presets: IDs from treatmentLibrary */
  treatmentIds?: string[];
  /** For hypothesis presets: node IDs to highlight */
  nodeIds?: string[];
  /** For hypothesis presets: edge IDs to highlight */
  edgeIds?: string[];
  /** Color for visualization */
  color: string;
}

export interface PresetGroup {
  category: PresetCategory;
  label: string;
  description: string;
  options: PresetOption[];
}

// ============================================================================
// HYPOTHESIS PRESETS
// ============================================================================

/**
 * Cross-cutting hypotheses that span multiple modules.
 * These are theoretical frameworks, not mechanistic components.
 */
export const hypothesisPresets: PresetOption[] = [
  {
    id: 'amyloid_cascade',
    label: 'Amyloid Cascade Hypothesis',
    description: 'Aβ accumulation triggers downstream tau pathology, neuroinflammation, and neurodegeneration',
    category: 'hypotheses',
    nodeIds: [
      'abeta_monomers',
      'abeta_oligomers',
      'abeta_plaques',
      'tau_hyperphosphorylated',
      'neurofibrillary_tangles',
      'synaptic_plasticity',
      'cognitive_score',
    ],
    color: '#60a5fa', // Soft blue (amyloid color)
  },
  {
    id: 'peripheral_sink',
    label: 'Peripheral Sink Hypothesis',
    description: 'Peripheral Aβ removal shifts brain→blood equilibrium; antibodies work via spleen/liver clearance, not brain penetration',
    category: 'hypotheses',
    nodeIds: [
      // BBB/Transport
      'fcrn_transport',
      'fcrn_recycling',
      'peripheral_sink_hypothesis',
      // Clearance organs
      'splenic_clearance',
      'hepatic_clearance',
      'cervical_lymph_nodes',
      // Drainage pathways
      'meningeal_lymphatics',
      'intramural_periarterial_drainage',
      'glymphatic_clearance',
      // Amyloid
      'abeta_monomers',
      'abeta_oligomers',
    ],
    color: '#a78bfa', // Soft purple (vascular color)
  },
  {
    id: 'prion_like_spreading',
    label: 'Prion-like Spreading',
    description: 'Tau and Aβ spread trans-synaptically in a prion-like manner following neural connectivity',
    category: 'hypotheses',
    nodeIds: [
      'tau_hyperphosphorylated',
      'neurofibrillary_tangles',
      'tau_seeding',
      'synaptic_plasticity',
      'abeta_oligomers',
    ],
    color: '#f472b6', // Soft pink
  },
  {
    id: 'mitochondrial_cascade',
    label: 'Mitochondrial Cascade',
    description: 'Mitochondrial dysfunction drives AD through ROS, energy failure, and mtDNA mutations',
    category: 'hypotheses',
    nodeIds: [
      'mitochondrial_dysfunction',
      'ros_production',
      'atp_depletion',
      'mam_calcium_transfer',
      'drp1_fission',
      'mitophagy_impaired',
      'pqc_overload',
    ],
    color: '#8ecae6', // Soft teal (mitochondrial color)
  },
  {
    id: 'neuroinflammation_hypothesis',
    label: 'Neuroinflammation Hypothesis',
    description: 'Chronic microglial activation and inflammasome signaling drive neurodegeneration',
    category: 'hypotheses',
    nodeIds: [
      'nlrp3_inflammasome',
      'il1beta_release',
      'microglial_activation',
      'a1_astrocytes',
      'complement_c1q',
      'complement_c3',
      'synaptic_pruning_excess',
    ],
    color: '#c75146', // Danger red
  },
  {
    id: 'vascular_hypothesis',
    label: 'Vascular/BBB Hypothesis',
    description: 'Vascular dysfunction and BBB breakdown precede and exacerbate AD pathology',
    category: 'hypotheses',
    nodeIds: [
      'bbb_breakdown',
      'bbb_integrity',
      'pericyte_injury',
      'pericyte_function',
      'cypa_elevated',
      'mmp9_elevated',
      'aqp4_depolarization',
      'glymphatic_clearance',
    ],
    color: '#a78bfa', // Soft purple (vascular)
  },
  {
    id: 'clasmodendrosis',
    label: 'Clasmodendrosis',
    description: 'Astrocyte degeneration with fragmented processes and cytoplasmic inclusions',
    category: 'hypotheses',
    nodeIds: [
      'a1_astrocytes',
      'astrocyte_endfeet',
      'aqp4_depolarization',
      'lysosomal_dysfunction',
      'lipofuscin_accumulation',
    ],
    color: '#fbbf24', // Warm yellow
  },
  {
    id: 'cholinergic_hypothesis',
    label: 'Cholinergic Hypothesis',
    description: 'Degeneration of cholinergic neurons causes cognitive decline; basis for current approved drugs',
    category: 'hypotheses',
    nodeIds: [
      'chat_activity',
      'ach_release',
      'bfcn_health',
      'nbm_degeneration',
      'a7_nachr_function',
      'opc_cholinergic_link',
      'myelin_integrity',
      'cognitive_score',
    ],
    color: '#34d399', // Soft green
  },
  {
    id: 'lipid_metabolism',
    label: 'Lipid/APOE Hypothesis',
    description: 'APOE4 and lipid dysregulation impair Aβ clearance and promote neurodegeneration',
    category: 'hypotheses',
    nodeIds: [
      'apoe_genotype',
      'apoe4_dysfunction',
      'apoe_lipidation',
      'cholesterol_homeostasis',
      'rest_repression',
      'bbb_breakdown',
      'abeta_clearance',
    ],
    color: '#E5AF19', // Warning yellow
  },
  {
    id: 'gut_brain_axis',
    label: 'Gut-Brain Axis',
    description: 'Gut microbiome dysbiosis influences AD via systemic inflammation and metabolites',
    category: 'hypotheses',
    nodeIds: [
      'gut_microbiome',
      'gut_permeability',
      'systemic_inflammation',
      'bbb_breakdown',
      'microglial_activation',
    ],
    color: '#34d399', // Soft green
  },
  {
    id: 'biomarker_timeline',
    label: 'Biomarker Timeline',
    description: 'Biomarkers ordered by years before symptom onset - from earliest (sPDGFRβ, 45y) to latest (NfL, 5y)',
    category: 'hypotheses',
    nodeIds: [
      // Earliest detectable (45 years before symptoms)
      'pericyte_injury',
      'plasma_spdgfrbeta',
      // ~18 years before symptoms
      'pvs_enlarged',
      'plasma_abeta42_40_ratio',
      // ~15 years before symptoms
      'plasma_ptau217',
      'retinal_amyloid',
      // ~10 years before symptoms
      'plasma_gfap',
      'plasma_ptau181',
      // ~7 years before symptoms
      'retinal_rnfl',
      // ~5 years before symptoms
      'plasma_nfl',
      // Symptom onset
      'cognitive_score',
    ],
    color: '#007385', // Teal - vascular/timeline
  },
  {
    id: 'atn_framework_extended',
    label: 'ATN+ Framework',
    description: 'NIA-AA ATN classification extended with I (Inflammation) and V (Vascular) categories',
    category: 'hypotheses',
    nodeIds: [
      // A - Amyloid
      'plasma_abeta42_40_ratio',
      'retinal_amyloid',
      'abeta_monomers',
      'abeta_oligomers',
      'abeta_plaques',
      // T - Tau
      'plasma_ptau217',
      'plasma_ptau181',
      'tau_hyperphosphorylated',
      'neurofibrillary_tangles',
      // N - Neurodegeneration
      'plasma_nfl',
      'retinal_rnfl',
      'neuronal_count',
      'brain_volume',
      // I - Inflammation (extension)
      'plasma_gfap',
      'nlrp3_inflammasome',
      'microglial_activation',
      // V - Vascular (extension)
      'plasma_spdgfrbeta',
      'pvs_enlarged',
      'pericyte_injury',
      'bbb_breakdown',
    ],
    color: '#486393', // Primary blue
  },
  {
    id: 'n_first_pathway',
    label: 'N-first Pathway',
    description: 'SNAP (Suspected Non-Amyloid Pathway): neurodegeneration precedes amyloid positivity in some patients',
    category: 'hypotheses',
    nodeIds: [
      // Vascular/structural damage first
      'pericyte_injury',
      'bbb_breakdown',
      'lrp1_apoe4_impaired',
      // Neurodegeneration markers elevated
      'plasma_nfl',
      'retinal_rnfl',
      'neuronal_count',
      // Tau pathology independent of amyloid
      'tau_hyperphosphorylated',
      'plasma_ptau181',
      // Cognitive decline
      'cognitive_score',
      // Amyloid accumulates LATER
      'abeta_monomers',
      'abeta_plaques',
    ],
    color: '#C3577F', // Rose - alternative pathway
  },
  {
    id: 'infection_ad_cascade',
    label: 'Infection → AD Cascade',
    description: 'The unified mechanism: Infection OR neurotoxicant exposure → immune dysregulation → metabolic collapse → microglial plaque seeding → tau hyperphosphorylation. GWI shows 14× dementia rate, validating environmental triggers.',
    category: 'hypotheses',
    nodeIds: [
      // Triggers (M19 - Infection/chronic immune activation)
      'pathogenic_exposure',
      'chronic_immune_activation',

      // GWI Convergence Pathway (M19) - Environmental triggers also lead to AD
      'neurotoxicant_exposure',
      'gwi_glymphatic_impairment',
      'glymphatic_clearance', // M12 - shared convergence point

      // Metabolic Cascade (M01/M05)
      'mtorc1_hyperactive',
      'mtor_hif1a_axis',
      'hif1a_stabilized',
      'glycolytic_switch',
      'irg1_itaconate_shunt',
      'sdh_inhibited',
      'tca_disrupted',
      'glutaminolysis_compensatory',
      'ammonia_accumulation',

      // Microglial Phenotypes (M05)
      'ldam',
      'ldam_super_seeders',
      'phagocytosis_impaired',

      // Plaque Formation (M06)
      'abeta_oligomers',
      'abeta_plaques',

      // α7nAChR Nexus - Links Aβ to Tau (M13)
      'a7nachr',
      'ab42_a7nachr_complex',
      'intraneuronal_amyloid',

      // Tau Pathology (M07)
      'tau_hyperphosphorylated',
      'microtubule_destabilization',
      'tau_aggregated',

      // Cholinergic Degeneration (M13) - DOWNSTREAM
      'cholinergic_degeneration',
      'ach_reduced',
    ],
    edgeIds: [
      // GWI → AD convergence edges (validates environmental triggers)
      'E19.011', // neurotoxicant_exposure → chronic_immune_activation (14× dementia rate)
      'E19.012', // neurotoxicant_exposure → abeta_plaques (OP → Aβ in wild-type mice)
      'E19.013', // neurotoxicant_exposure → gwi_glymphatic_impairment
      'E19.014', // gwi_glymphatic_impairment → glymphatic_clearance

      // Metabolic cascade edges
      'E05.015', // mtorc1_hyperactive → hif1a_stabilized
      'E05.016', // hif1a_stabilized → glycolytic_switch
      'E05.017', // chronic_immune_activation → irg1_itaconate_shunt
      'E05.018', // irg1_itaconate_shunt → sdh_inhibited
      'E05.019', // sdh_inhibited → tca_disrupted
      'E05.020', // tca_disrupted → glutaminolysis_compensatory
      'E05.021', // glutaminolysis_compensatory → ammonia_accumulation
      'E05.024', // ldam_super_seeders → abeta_plaques (PARADIGM SHIFT)

      // α7nAChR nexus edges
      'E13.033', // abeta_oligomers → ab42_a7nachr_complex
      'E13.034', // ab42_a7nachr_complex → tau_hyperphosphorylated
      'E13.035', // ab42_a7nachr_complex → intraneuronal_amyloid
      'E13.036', // tau_hyperphosphorylated → microtubule_destabilization
      'E13.037', // microtubule_destabilization → tau_aggregated
    ],
    color: '#C9461D', // Orange - inflammation/infection theme
  },
];

// ============================================================================
// PRESET GROUPS
// ============================================================================

/**
 * Get treatments by regulatory status
 */
function getTreatmentsByStatus(statuses: string[]): string[] {
  return treatmentLibrary
    .filter(t => statuses.includes(t.fdaStatus))
    .map(t => t.id);
}

/**
 * Get treatments by type
 */
function getTreatmentsByType(types: string[]): string[] {
  return treatmentLibrary
    .filter(t => types.includes(t.type))
    .map(t => t.id);
}

export const presetGroups: PresetGroup[] = [
  {
    category: 'approved_drugs',
    label: 'Approved Drugs',
    description: 'FDA-approved treatments for AD or related conditions',
    options: [
      {
        id: 'all_approved',
        label: 'All Approved',
        description: 'All FDA-approved treatments',
        category: 'approved_drugs',
        treatmentIds: getTreatmentsByStatus(['approved']),
        color: '#5a8a6e',
      },
      {
        id: 'cholinesterase_inhibitors',
        label: 'Cholinesterase Inhibitors',
        description: 'Donepezil, Rivastigmine, Galantamine',
        category: 'approved_drugs',
        treatmentIds: ['donepezil', 'rivastigmine', 'galantamine'],
        color: '#34d399',
      },
      {
        id: 'amyloid_antibodies',
        label: 'Anti-Amyloid Antibodies',
        description: 'Lecanemab, Aducanumab',
        category: 'approved_drugs',
        treatmentIds: ['lecanemab', 'aducanumab'],
        color: '#60a5fa',
      },
    ],
  },
  {
    category: 'failed_stage1',
    label: 'Failed Drugs (Amyloid)',
    description: 'Treatments that failed targeting amyloid pathway',
    options: [
      {
        id: 'failed_secretase_inhibitors',
        label: 'Secretase Inhibitors',
        description: 'BACE and γ-secretase inhibitors that failed trials',
        category: 'failed_stage1',
        treatmentIds: ['verubecestat', 'atabecestat', 'semagacestat'],
        color: '#c75146',
      },
      {
        id: 'failed_amyloid_clearance',
        label: 'Amyloid Clearance',
        description: 'Antibodies and vaccines that failed to show benefit',
        category: 'failed_stage1',
        treatmentIds: ['bapineuzumab', 'solanezumab', 'gantenerumab', 'crenezumab'],
        color: '#c75146',
      },
    ],
  },
  {
    category: 'failed_stage2',
    label: 'Failed Drugs (Tau/Inflammation)',
    description: 'Treatments that failed targeting tau or neuroinflammation',
    options: [
      {
        id: 'failed_tau_drugs',
        label: 'Anti-Tau Therapies',
        description: 'Tau aggregation inhibitors and antibodies that failed',
        category: 'failed_stage2',
        treatmentIds: ['lmtx', 'tideglusib'],
        color: '#c75146',
      },
      {
        id: 'failed_anti_inflammatory',
        label: 'Anti-Inflammatory',
        description: 'NSAIDs and other anti-inflammatory approaches that failed',
        category: 'failed_stage2',
        treatmentIds: [],  // Most NSAIDs not in library yet
        color: '#c75146',
      },
    ],
  },
  {
    category: 'failed_stage3',
    label: 'Failed Drugs (Symptomatic)',
    description: 'Symptomatic treatments that failed to show benefit',
    options: [
      {
        id: 'failed_symptomatic',
        label: 'Symptomatic Treatments',
        description: 'Treatments targeting symptoms that failed',
        category: 'failed_stage3',
        treatmentIds: ['intepirdine', 'encenicline'],
        color: '#c75146',
      },
    ],
  },
  {
    category: 'lifestyle',
    label: 'Lifestyle Interventions',
    description: 'Non-pharmacological interventions',
    options: [
      {
        id: 'all_lifestyle',
        label: 'All Lifestyle',
        description: 'Exercise, sleep, cognitive engagement',
        category: 'lifestyle',
        treatmentIds: getTreatmentsByType(['lifestyle', 'behavioral']),
        color: '#34d399',
      },
      {
        id: 'exercise_interventions',
        label: 'Exercise',
        description: 'Aerobic and resistance exercise',
        category: 'lifestyle',
        treatmentIds: ['aerobic_exercise', 'resistance_exercise'],
        color: '#34d399',
      },
      {
        id: 'sleep_interventions',
        label: 'Sleep Optimization',
        description: 'Sleep hygiene and interventions',
        category: 'lifestyle',
        treatmentIds: ['sleep_optimization'],
        color: '#486393',
      },
      {
        id: 'devices',
        label: 'Devices',
        description: '40Hz light/sound stimulation',
        category: 'lifestyle',
        treatmentIds: getTreatmentsByType(['device']),
        color: '#007385',
      },
    ],
  },
  {
    category: 'hypotheses',
    label: 'Hypotheses',
    description: 'Cross-cutting theoretical frameworks',
    options: hypothesisPresets,
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get a preset by ID
 */
export function getPresetById(id: string): PresetOption | undefined {
  for (const group of presetGroups) {
    const preset = group.options.find(p => p.id === id);
    if (preset) return preset;
  }
  return undefined;
}

/**
 * Get all presets in a category
 */
export function getPresetsByCategory(category: PresetCategory): PresetOption[] {
  const group = presetGroups.find(g => g.category === category);
  return group?.options ?? [];
}

/**
 * Get treatments for a preset
 */
export function getTreatmentsForPreset(presetId: string): TreatmentLibraryEntry[] {
  const preset = getPresetById(presetId);
  if (!preset?.treatmentIds) return [];
  return treatmentLibrary.filter(t => preset.treatmentIds!.includes(t.id));
}

/**
 * Check if a preset is a hypothesis (node-based) vs treatment-based
 */
export function isHypothesisPreset(preset: PresetOption): boolean {
  return preset.category === 'hypotheses' && !!preset.nodeIds?.length;
}

export default presetGroups;
