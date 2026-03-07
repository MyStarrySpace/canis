/**
 * Network Presets - adapted from alz-market-viz aac70c8
 *
 * Node IDs updated to match the current ad-framework-data.json (379 nodes).
 * Missing node IDs are omitted (the new framework uses different naming).
 */

import { treatmentLibrary, type TreatmentLibraryEntry } from './drug-library';

export type PresetCategory =
  | 'approved_drugs'
  | 'failed_stage1'
  | 'failed_stage2'
  | 'failed_stage3'
  | 'lifestyle'
  | 'hypotheses';

export interface PresetOption {
  id: string;
  label: string;
  description: string;
  category: PresetCategory;
  treatmentIds?: string[];
  nodeIds?: string[];
  color: string;
}

export interface PresetGroup {
  category: PresetCategory;
  label: string;
  description: string;
  options: PresetOption[];
}

// ── Hypothesis presets ───────────────────────────────────────────────────────

export const hypothesisPresets: PresetOption[] = [
  {
    id: 'amyloid_cascade',
    label: 'Amyloid Cascade Hypothesis',
    description: 'A-beta accumulation triggers downstream tau pathology, neuroinflammation, and neurodegeneration',
    category: 'hypotheses',
    nodeIds: [
      'Abeta_oligomers', 'Abeta_plaques', 'abeta_production', 'abeta_aggregation',
      'tau_hyperphosphorylated', 'tau_aggregated', 'tau_aggregated_PHF',
      'synaptic_vulnerability', 'cognitive_score',
    ],
    color: '#60a5fa',
  },
  {
    id: 'peripheral_sink',
    label: 'Peripheral Sink Hypothesis',
    description: 'Peripheral removal shifts brain-blood equilibrium',
    category: 'hypotheses',
    nodeIds: [
      'lrp1', 'LRP1_surface', 'endothelial_LRP1',
      'meningeal_lymphatic_drainage', 'meningeal_lymphatic_vessels',
      'glymphatic_flow_rate', 'sleep_glymphatic_enhancement',
      'abeta_clearance', 'Abeta_oligomers', 'ISF_Abeta',
    ],
    color: '#a78bfa',
  },
  {
    id: 'prion_like_spreading',
    label: 'Prion-like Spreading',
    description: 'Tau and amyloid spread trans-synaptically following neural connectivity',
    category: 'hypotheses',
    nodeIds: [
      'tau_hyperphosphorylated', 'tau_aggregated', 'tau_aggregated_PHF',
      'tau_seeding', 'tau_exosomal_release',
      'synaptic_vulnerability', 'Abeta_oligomers',
    ],
    color: '#f472b6',
  },
  {
    id: 'mitochondrial_cascade',
    label: 'Mitochondrial Cascade',
    description: 'Mitochondrial dysfunction drives AD through ROS, energy failure, and mtDNA mutations',
    category: 'hypotheses',
    nodeIds: [
      'damaged_mito_pool', 'mito_ROS', 'mitochondrial_ATP',
      'mitochondrial_Ca', 'mitochondrial_Ca_overload',
      'mitophagy_rate_reduced', 'mitophagosome',
      'pink1_parkin',
    ],
    color: '#8ecae6',
  },
  {
    id: 'neuroinflammation_hypothesis',
    label: 'Neuroinflammation Hypothesis',
    description: 'Chronic microglial activation and inflammasome signaling drive neurodegeneration',
    category: 'hypotheses',
    nodeIds: [
      'NLRP3', 'NLRP3_active', 'caspase1_active', 'IL1B', 'IL18',
      'microglia_activated', 'microglia_dam', 'microglia_ldam',
      'A1_astrocytes', 'complement_activation',
      'neuroinflammation',
    ],
    color: '#c75146',
  },
  {
    id: 'vascular_hypothesis',
    label: 'Vascular/BBB Hypothesis',
    description: 'Vascular dysfunction and BBB breakdown precede and exacerbate AD pathology',
    category: 'hypotheses',
    nodeIds: [
      'BBB_compromised', 'BBB_intact', 'BBB_integrity',
      'pericytes', 'pericyte_count', 'pericyte_PDGFRbeta',
      'CypA', 'MMP9',
      'endfoot_AQP4_polarization', 'AQP4_perivascular', 'AQP4_parenchymal',
      'glymphatic_flow_rate',
    ],
    color: '#a78bfa',
  },
  {
    id: 'cholinergic_hypothesis',
    label: 'Cholinergic Hypothesis',
    description: 'Degeneration of cholinergic neurons causes cognitive decline',
    category: 'hypotheses',
    nodeIds: [
      'BFCNs', 'myelin_integrity', 'myelin_debris',
      'cognitive_score', 'cognitive_function',
    ],
    color: '#34d399',
  },
  {
    id: 'lipid_metabolism',
    label: 'Lipid/APOE Hypothesis',
    description: 'APOE4 and lipid dysregulation impair clearance and promote neurodegeneration',
    category: 'hypotheses',
    nodeIds: [
      'apoe4', 'APOE4_genotype', 'APOE_lipidated', 'APOE_expression_brain',
      'ABCA1_activity', 'lysosomal_cholesterol', 'oligodendrocyte_cholesterol',
      'BBB_compromised', 'abeta_clearance',
    ],
    color: '#E5AF19',
  },
  {
    id: 'iron_hypothesis',
    label: 'Iron Maldistribution',
    description: 'Iron redistribution from functional pools to labile iron drives ferroptosis and aggregation',
    category: 'hypotheses',
    nodeIds: [
      'labile_iron_pool', 'cytosolic_labile_iron', 'ferritin_iron',
      'lysosomal_iron', 'lysosomal_iron_release',
      'iron_trapped_aggregates', 'functional_iron_deficiency',
      'iron_release', 'iron_redistribution',
      'GPX4_activity', 'tau_iron_binding',
      'total_brain_iron', 'brain_iron_accumulation',
    ],
    color: '#C3577F',
  },
  {
    id: 'biomarker_timeline',
    label: 'Biomarker Timeline',
    description: 'Biomarkers ordered by years before symptom onset',
    category: 'hypotheses',
    nodeIds: [
      'pericyte_PDGFRbeta', 'CSF_sPDGFRb',
      'plasma_Abeta42_40', 'CSF_Abeta42_40_ratio',
      'plasma_pTau217', 'CSF_pTau217',
      'CSF_GFAP', 'CSF_pTau181',
      'CSF_NfL',
      'cognitive_score',
    ],
    color: '#007385',
  },
];

// ── Preset groups ────────────────────────────────────────────────────────────

function getTreatmentIdsByStatus(statuses: string[]): string[] {
  return treatmentLibrary
    .filter((t) => statuses.includes(t.fdaStatus))
    .map((t) => t.id);
}

function getTreatmentIdsByType(types: string[]): string[] {
  return treatmentLibrary
    .filter((t) => types.includes(t.type))
    .map((t) => t.id);
}

export const presetGroups: PresetGroup[] = [
  {
    category: 'approved_drugs',
    label: 'Approved Drugs',
    description: 'FDA-approved treatments',
    options: [
      {
        id: 'all_approved',
        label: 'All Approved',
        description: 'All FDA-approved treatments',
        category: 'approved_drugs',
        treatmentIds: getTreatmentIdsByStatus(['approved']),
        color: '#5a8a6e',
      },
      {
        id: 'amyloid_antibodies',
        label: 'Anti-Amyloid Antibodies',
        description: 'Lecanemab, Aducanumab, Donanemab',
        category: 'approved_drugs',
        treatmentIds: ['lecanemab', 'aducanumab', 'donanemab'],
        color: '#60a5fa',
      },
    ],
  },
  {
    category: 'failed_stage1',
    label: 'Failed Drugs (Amyloid)',
    description: 'Treatments that failed targeting amyloid',
    options: [
      {
        id: 'failed_amyloid',
        label: 'Failed Amyloid Clearance',
        description: 'Antibodies that failed to show benefit',
        category: 'failed_stage1',
        treatmentIds: ['semaglutide'],
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
        description: 'Exercise, sleep, devices',
        category: 'lifestyle',
        treatmentIds: getTreatmentIdsByType(['lifestyle', 'behavioral', 'device']),
        color: '#34d399',
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

// ── Utilities ────────────────────────────────────────────────────────────────

export function getPresetById(id: string): PresetOption | undefined {
  for (const group of presetGroups) {
    const preset = group.options.find((p) => p.id === id);
    if (preset) return preset;
  }
  return undefined;
}

export function getTreatmentsForPreset(presetId: string): TreatmentLibraryEntry[] {
  const preset = getPresetById(presetId);
  if (!preset?.treatmentIds) return [];
  return treatmentLibrary.filter((t) => preset.treatmentIds!.includes(t.id));
}

export function isHypothesisPreset(preset: PresetOption): boolean {
  return preset.category === 'hypotheses' && !!preset.nodeIds?.length;
}
