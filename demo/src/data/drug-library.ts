/**
 * Treatment Library for AD Mechanistic Network - adapted from alz-market-viz aac70c8
 *
 * Node IDs updated to match ad-framework-data.json (379 nodes).
 * Types and deprecated aliases removed for cleanliness.
 */

export type TreatmentEffect = 'activates' | 'inhibits' | 'modulates';
export type EffectStrength = 'strong' | 'moderate' | 'weak';
export type TreatmentType =
  | 'small_molecule' | 'antibody' | 'biologic' | 'supplement'
  | 'device' | 'lifestyle' | 'behavioral';
export type RegulatoryStatus =
  | 'approved' | 'phase3' | 'phase2' | 'phase1'
  | 'preclinical' | 'no_pathway' | 'lifestyle' | 'device_cleared';

export interface TreatmentTarget {
  nodeId: string;
  effect: TreatmentEffect;
  strength: EffectStrength;
  mechanism?: string;
}

export interface TreatmentADEvidence {
  level: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7';
  summary: string;
  pmids?: string[];
}

export interface TreatmentLibraryEntry {
  id: string;
  name: string;
  type: TreatmentType;
  fdaStatus: RegulatoryStatus;
  primaryTargets: TreatmentTarget[];
  mechanismSummary: string;
  adEvidence: TreatmentADEvidence;
  annualCost?: number;
  availability?: string;
  notes?: string;
}

export const treatmentLibrary: TreatmentLibraryEntry[] = [
  {
    id: 'rapamycin',
    name: 'Rapamycin (Sirolimus)',
    type: 'small_molecule',
    fdaStatus: 'approved',
    mechanismSummary: 'mTORC1 inhibitor that restores autophagy and reduces protein aggregation',
    primaryTargets: [
      { nodeId: 'mTORC1_hyperactive', effect: 'inhibits', strength: 'strong',
        mechanism: 'Binds FKBP12, which then inhibits mTORC1 kinase activity' },
    ],
    adEvidence: { level: 'L4', summary: 'Animal studies show improved cognition and reduced pathology. Human AD trials pending.', pmids: ['22956686', '25381458'] },
    annualCost: 500,
    notes: 'Most promising mTOR inhibitor for AD but POOR BBB penetration.',
  },
  {
    id: 'lithium_microdose',
    name: 'Lithium (Microdose)',
    type: 'small_molecule',
    fdaStatus: 'approved',
    mechanismSummary: 'GSK3-beta inhibitor that reduces tau phosphorylation and promotes autophagy',
    primaryTargets: [
      { nodeId: 'GSK3beta_active', effect: 'inhibits', strength: 'moderate',
        mechanism: 'Competes with Mg2+ for binding, inhibiting GSK3-beta kinase activity' },
    ],
    adEvidence: { level: 'L4', summary: 'Epidemiological studies show reduced dementia in lithium users.', pmids: ['17592124', '21525519'] },
    annualCost: 50,
  },
  {
    id: 'colchicine',
    name: 'Colchicine',
    type: 'small_molecule',
    fdaStatus: 'approved',
    mechanismSummary: 'NLRP3 inflammasome inhibitor that reduces neuroinflammation',
    primaryTargets: [
      { nodeId: 'NLRP3_active', effect: 'inhibits', strength: 'moderate',
        mechanism: 'Disrupts microtubule assembly, preventing inflammasome formation' },
    ],
    adEvidence: { level: 'L6', summary: 'Epidemiological studies suggest reduced dementia in gout patients on colchicine.', pmids: ['32571790'] },
    annualCost: 2500,
  },
  {
    id: 'aducanumab',
    name: 'Aducanumab (Aduhelm)',
    type: 'antibody',
    fdaStatus: 'approved',
    mechanismSummary: 'Anti-amyloid antibody that clears plaques via microglial phagocytosis',
    primaryTargets: [
      { nodeId: 'Abeta_plaques', effect: 'inhibits', strength: 'strong',
        mechanism: 'Binds aggregated A-beta, promoting microglial clearance' },
    ],
    adEvidence: { level: 'L1', summary: 'Phase 3 trials showed plaque clearance but inconsistent clinical benefit. Withdrawn 2024.', pmids: ['33497548'] },
    annualCost: 28000,
    notes: 'Withdrawn from market 2024. ARIA in ~40% of patients.',
  },
  {
    id: 'lecanemab',
    name: 'Lecanemab (Leqembi)',
    type: 'antibody',
    fdaStatus: 'approved',
    mechanismSummary: 'Anti-amyloid antibody with highest protofibril selectivity',
    primaryTargets: [
      { nodeId: 'Abeta_oligomers', effect: 'inhibits', strength: 'strong',
        mechanism: 'Binds protofibrils with 10x selectivity over fibrils' },
      { nodeId: 'Abeta_plaques', effect: 'inhibits', strength: 'moderate',
        mechanism: 'Secondary plaque clearance' },
    ],
    adEvidence: { level: 'L1', summary: 'CLARITY-AD showed 27% slowing of decline at 18 months.', pmids: ['36449413'] },
    annualCost: 26500,
  },
  {
    id: 'donanemab',
    name: 'Donanemab (Kisunla)',
    type: 'antibody',
    fdaStatus: 'approved',
    mechanismSummary: 'Anti-amyloid antibody targeting pyroglutamate A-beta in plaques',
    primaryTargets: [
      { nodeId: 'Abeta_plaques', effect: 'inhibits', strength: 'strong',
        mechanism: 'Targets N-terminal pyroglutamate specific to deposited A-beta' },
    ],
    adEvidence: { level: 'L1', summary: 'TRAILBLAZER-ALZ2 showed 35% slowing in early AD.', pmids: ['37459141'] },
    annualCost: 32000,
  },
  {
    id: 'urolithin_a',
    name: 'Urolithin A',
    type: 'supplement',
    fdaStatus: 'no_pathway',
    mechanismSummary: 'Mitophagy enhancer via PINK1/Parkin',
    primaryTargets: [
      { nodeId: 'pink1_parkin', effect: 'activates', strength: 'moderate',
        mechanism: 'Upregulates PINK1/Parkin expression, enhancing mitophagy' },
    ],
    adEvidence: { level: 'L4', summary: 'Mouse AD studies show reduced pathology. Improves mitochondrial function in humans.', pmids: ['27274687'] },
    annualCost: 400,
  },
  {
    id: 'nad_precursors',
    name: 'NAD+ Precursors (NMN/NR)',
    type: 'supplement',
    fdaStatus: 'no_pathway',
    mechanismSummary: 'Restore NAD+ levels to support mitochondrial function',
    primaryTargets: [
      { nodeId: 'mito_ROS', effect: 'inhibits', strength: 'moderate',
        mechanism: 'NAD+ supports mitochondrial function and reduces oxidative stress' },
    ],
    adEvidence: { level: 'L5', summary: 'Mouse studies show neuroprotection. Human AD data limited.', pmids: ['27872959'] },
    annualCost: 600,
  },
  {
    id: 'gv971',
    name: 'GV-971 (Oligomannate)',
    type: 'small_molecule',
    fdaStatus: 'phase3',
    mechanismSummary: 'Gut-brain axis modulator reducing neuroinflammation via microbiome',
    primaryTargets: [
      { nodeId: 'neuroinflammation', effect: 'inhibits', strength: 'moderate',
        mechanism: 'Reduces neuroinflammation via gut-brain axis' },
      { nodeId: 'microglia_activated', effect: 'inhibits', strength: 'moderate',
        mechanism: 'Reduces Th1 cell infiltration and microglial activation' },
    ],
    adEvidence: { level: 'L1', summary: 'China Phase 3 showed cognitive improvement. GREEN MEMORY global trial ongoing.', pmids: ['31488882'] },
    annualCost: 3000,
  },
  {
    id: 'semaglutide',
    name: 'Semaglutide (Ozempic/Wegovy)',
    type: 'biologic',
    fdaStatus: 'approved',
    mechanismSummary: 'GLP-1 agonist with poor BBB penetration to hippocampus',
    primaryTargets: [
      { nodeId: 'insulin_resistance', effect: 'inhibits', strength: 'strong',
        mechanism: 'Enhances insulin secretion and sensitivity (peripheral)' },
      { nodeId: 'neuroinflammation', effect: 'inhibits', strength: 'weak',
        mechanism: 'Anti-inflammatory effects limited by poor CNS penetration' },
    ],
    adEvidence: { level: 'L1', summary: 'EVOKE/EVOKE+ Phase 3 FAILED Nov 2025. No clinical benefit despite 3,800 patients.', pmids: ['35216679'] },
    annualCost: 12000,
    notes: 'EVOKE FAILED: Peptide cannot cross BBB.',
  },
  {
    id: 'dasatinib_quercetin',
    name: 'Dasatinib + Quercetin (D+Q)',
    type: 'small_molecule',
    fdaStatus: 'approved',
    mechanismSummary: 'Senolytic combination that clears senescent cells',
    primaryTargets: [
      { nodeId: 'senescent_cell_count', effect: 'inhibits', strength: 'strong',
        mechanism: 'Induces apoptosis in senescent cells' },
    ],
    adEvidence: { level: 'L4', summary: 'Mouse studies show improved cognition after senescent cell clearance.', pmids: ['31097543'] },
    annualCost: 5000,
  },
  {
    id: 'galantamine',
    name: 'Galantamine (Razadyne)',
    type: 'small_molecule',
    fdaStatus: 'approved',
    mechanismSummary: 'AChE inhibitor and alpha-7 nAChR PAM protecting BBB via splenic anti-inflammatory pathway',
    primaryTargets: [
      { nodeId: 'BFCNs', effect: 'activates', strength: 'moderate',
        mechanism: 'Inhibits AChE, increasing acetylcholine at synapses' },
      { nodeId: 'BBB_integrity', effect: 'activates', strength: 'moderate',
        mechanism: 'alpha-7 nAChR PAM -> splenic anti-inflammatory -> tight junction proteins' },
      { nodeId: 'neuroinflammation', effect: 'inhibits', strength: 'moderate',
        mechanism: 'Cholinergic anti-inflammatory pathway via vagus -> spleen' },
    ],
    adEvidence: { level: 'L1', summary: 'FDA-approved for AD. Dash lab showed BBB protection via alpha-7 nAChR on splenic immune cells.', pmids: ['29088998'] },
    annualCost: 360,
  },
  {
    id: 'curcumin',
    name: 'Curcumin',
    type: 'supplement',
    fdaStatus: 'no_pathway',
    mechanismSummary: 'Pleiotropic anti-inflammatory with poor bioavailability',
    primaryTargets: [
      { nodeId: 'Abeta_oligomers', effect: 'inhibits', strength: 'weak',
        mechanism: 'May bind A-beta and prevent fibrillization (in vitro)' },
    ],
    adEvidence: { level: 'L5', summary: 'Extensive in vitro evidence but human trials disappointing.', pmids: ['15590663'] },
    annualCost: 100,
  },
  {
    id: 'gamma_40hz',
    name: '40Hz Gamma Stimulation',
    type: 'device',
    fdaStatus: 'phase3',
    mechanismSummary: 'Audio-visual entrainment promotes glymphatic clearance via VIP interneurons',
    primaryTargets: [
      { nodeId: 'endfoot_AQP4_polarization', effect: 'activates', strength: 'moderate',
        mechanism: 'VIP signaling restores AQP4 localization at astrocyte endfeet' },
      { nodeId: 'glymphatic_flow_rate', effect: 'activates', strength: 'moderate',
        mechanism: 'Enhanced CSF influx and clearance' },
    ],
    adEvidence: { level: 'L4', summary: 'Mouse studies show increased glymphatic clearance. Phase 3 EVOKE ongoing.', pmids: ['38418876'] },
    annualCost: 1500,
  },
  {
    id: 'exercise_aerobic',
    name: 'Aerobic Exercise',
    type: 'lifestyle',
    fdaStatus: 'lifestyle',
    mechanismSummary: 'Restores AQP4 polarization, increases arterial pulsatility, promotes BDNF',
    primaryTargets: [
      { nodeId: 'endfoot_AQP4_polarization', effect: 'activates', strength: 'moderate',
        mechanism: 'Upregulates Lama1 and Dp71, restoring AQP4 to endfeet' },
      { nodeId: 'glymphatic_flow_rate', effect: 'activates', strength: 'moderate',
        mechanism: 'AQP4 and pulsatility effects converge on glymphatic enhancement' },
      { nodeId: 'neuroinflammation', effect: 'inhibits', strength: 'moderate',
        mechanism: 'Reduces systemic and CNS inflammation' },
    ],
    adEvidence: { level: 'L4', summary: 'Meta-analyses show 15-20% AD risk reduction.', pmids: ['39971255'] },
  },
  {
    id: 'sleep_apnea_treatment',
    name: 'Sleep Apnea Treatment (CPAP)',
    type: 'lifestyle',
    fdaStatus: 'lifestyle',
    mechanismSummary: 'Restores nocturnal glymphatic clearance by maintaining slow-wave sleep',
    primaryTargets: [
      { nodeId: 'glymphatic_flow_rate', effect: 'activates', strength: 'strong',
        mechanism: 'Sleep apnea disrupts slow-wave sleep; treatment restores clearance window' },
      { nodeId: 'neuroinflammation', effect: 'inhibits', strength: 'moderate',
        mechanism: 'Intermittent hypoxia triggers inflammation; CPAP reduces hypoxic episodes' },
      { nodeId: 'oxidative_stress', effect: 'inhibits', strength: 'moderate',
        mechanism: 'Reduces hypoxia-reoxygenation ROS' },
    ],
    adEvidence: { level: 'L4', summary: 'OSA increases AD risk 1.5-2x. CPAP associated with delayed cognitive decline.', pmids: ['36378032'] },
  },
  {
    id: 'metformin',
    name: 'Metformin',
    type: 'small_molecule',
    fdaStatus: 'approved',
    mechanismSummary: 'AMPK activator that inhibits mTORC1, suppresses NF-kB, promotes autophagy',
    primaryTargets: [
      { nodeId: 'mTORC1_hyperactive', effect: 'inhibits', strength: 'moderate',
        mechanism: 'Activates AMPK -> TSC2 -> mTORC1 inhibition' },
      { nodeId: 'NLRP3_active', effect: 'inhibits', strength: 'moderate',
        mechanism: 'AMPK suppresses NF-kB -> reduced NLRP3 activation' },
    ],
    adEvidence: { level: 'L3', summary: 'Mouse studies show attenuated deficits. MAP Trial Phase 2 ongoing. APOE4 interaction concern.', pmids: ['29262791'] },
    annualCost: 48,
    notes: 'MARKET FAILURE EXEMPLAR: $4/month generic with strong preclinical evidence but no pharma funding.',
  },
  {
    id: 'dimethyl_fumarate',
    name: 'Dimethyl Fumarate (Tecfidera)',
    type: 'small_molecule',
    fdaStatus: 'approved',
    mechanismSummary: 'Nrf2 activator that suppresses NF-kB and NLRP3 inflammasome',
    primaryTargets: [
      { nodeId: 'Nrf2_activity', effect: 'activates', strength: 'strong',
        mechanism: 'Covalent Keap1 modification releases Nrf2' },
      { nodeId: 'NLRP3_active', effect: 'inhibits', strength: 'moderate',
        mechanism: 'Nrf2 -> NF-kB suppression -> reduced NLRP3 transcription' },
      { nodeId: 'GPX4_activity', effect: 'activates', strength: 'moderate',
        mechanism: 'Nrf2 induces GPX4 and ferroptosis-protective genes' },
    ],
    adEvidence: { level: 'L4', summary: 'Wang 2024: App-KI mice showed improved cognition. No active AD trial despite published design.', pmids: ['38374046'] },
    annualCost: 50,
    notes: 'MARKET FAILURE: FDA-approved, CNS-penetrant, $50/year generic. No AD trial.',
  },
  {
    id: 'ic100',
    name: 'IC 100 (ZyVersa)',
    type: 'antibody',
    fdaStatus: 'preclinical',
    mechanismSummary: 'Anti-ASC mAb targeting the common inflammasome adaptor protein',
    primaryTargets: [
      { nodeId: 'NLRP3_active', effect: 'inhibits', strength: 'strong',
        mechanism: 'Binds ASC, prevents inflammasome assembly across NLRP1/2/3, NLRC4, AIM2' },
      { nodeId: 'caspase1_active', effect: 'inhibits', strength: 'strong',
        mechanism: 'Prevents caspase-1 activation by blocking ASC assembly' },
      { nodeId: 'IL1B', effect: 'inhibits', strength: 'moderate',
        mechanism: 'Reduces IL-1B release by blocking inflammasome' },
      { nodeId: 'Abeta_oligomers', effect: 'inhibits', strength: 'moderate',
        mechanism: 'ASC specks seed A-beta aggregation; blocking disrupts the amplification cycle' },
    ],
    adEvidence: { level: 'L4', summary: 'Preclinical: NLRP3 inhibition reduces A-beta and neuroinflammation in AD mice. ASC specks seed plaques.' },
    notes: 'Targets ASC (common adaptor), not NLRP3 sensor. BBB penetration concern for antibodies.',
  },
];

// ── Utility functions ────────────────────────────────────────────────────────

export function getTreatmentById(id: string): TreatmentLibraryEntry | undefined {
  return treatmentLibrary.find((d) => d.id === id);
}

export function getTreatmentsTargetingNode(nodeId: string): TreatmentLibraryEntry[] {
  return treatmentLibrary.filter((d) =>
    d.primaryTargets.some((t) => t.nodeId === nodeId),
  );
}

export function getAllTargetNodeIds(): string[] {
  const ids = new Set<string>();
  treatmentLibrary.forEach((d) => {
    d.primaryTargets.forEach((t) => ids.add(t.nodeId));
  });
  return Array.from(ids);
}
