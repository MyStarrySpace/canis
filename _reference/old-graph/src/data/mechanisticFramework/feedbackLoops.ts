/**
 * Feedback Loops in the AD Mechanistic Network
 *
 * These self-amplifying (reinforcing) and self-regulating (balancing) loops
 * are critical for understanding disease progression and identifying
 * intervention points.
 *
 * TIPPING POINTS: Each loop has a tipping point where it transitions from
 * manageable to self-sustaining. Understanding these thresholds is critical
 * for timing interventions - targeting loops AFTER their tipping point may be futile.
 *
 * Updated 2026-01-15: Added tipping point annotations and timescale estimates
 */

import type { FeedbackLoop } from './types';

// Extended interface for tipping point information
interface FeedbackLoopWithTipping extends FeedbackLoop {
  tippingPoint?: {
    biomarker: string;           // Measurable indicator
    threshold: string;           // Approximate cutoff
    timescale: string;           // How fast loop accelerates after crossing
    interpretation: string;      // Clinical meaning
    interventionWindow: 'prevention' | 'early' | 'late' | 'management';
  };
  loopTimescale?: string;        // How fast the loop cycles
}

export const feedbackLoops: FeedbackLoopWithTipping[] = [
  // ============================================================================
  // MODULE 1: mTORC1-S6K1-IRS1 Reinforcing Loop
  // ============================================================================
  {
    id: 'loop_mTORC1_S6K1_IRS1',
    name: 'mTORC1-S6K1-IRS1 Insulin Resistance Loop',
    type: 'reinforcing',
    description: `
      Self-amplifying pathological cycle: insulin resistance removes TSC1/2 brake
      on mTORC1 → mTORC1 activates S6K1 → S6K1 phosphorylates IRS-1 → IRS-1
      degradation/inhibition → MORE insulin resistance.

      Once initiated, this cycle is self-sustaining. Explains why metabolic
      dysfunction is progressive in AD.
    `.trim(),
    edgeIds: ['E01.001', 'E01.008', 'E01.009', 'E01.010'],
    // Note: Ghost edge (irs1_serine_phosphorylated → insulin_resistance) already exists as E01.010
    clinicalImplication: 'Breaking the cycle requires intervention at any node',
    interventionPoints: [
      'mtorc1_hyperactive',  // Rapamycin/rapalogs
      's6k1_active',         // S6K1 inhibitors (PF-4708671)
      'insulin_resistance',  // Insulin sensitizers, GLP-1 agonists
    ],
    moduleIds: ['M01'],
    // Tipping point annotation
    tippingPoint: {
      biomarker: 'Brain insulin signaling (pS6/S6 ratio)',
      threshold: '>2x baseline in temporal cortex',
      timescale: 'months to years',
      interpretation: 'Once brain insulin resistance is established, mTORC1 hyperactivation becomes self-sustaining even if peripheral insulin is controlled',
      interventionWindow: 'prevention',
    },
    loopTimescale: 'hours (biochemical), months (disease progression)',
  },

  // ============================================================================
  // MODULE 4-7: NLRP3-Tau Feedforward Loop
  // ============================================================================
  {
    id: 'loop_NLRP3_tau_feedforward',
    name: 'NLRP3-Tau Feedforward Loop',
    type: 'reinforcing',
    description: `
      Self-amplifying tau pathology: NLRP3 activation → GSK3β↑/PP2A↓ → tau
      hyperphosphorylation → tau aggregation → aggregated tau activates NLRP3
      → MORE inflammation.

      This creates exponential progression once initiated.
    `.trim(),
    edgeIds: ['E04.005', 'E04.006', 'E04.007', 'E04.008', 'E04.010'],
    // Note: Loop completion edge (tau_aggregated → nlrp3_active) already exists as E04.010
    clinicalImplication: 'Explains rapid progression once tau pathology begins',
    interventionPoints: [
      'nlrp3_active',       // NLRP3 inhibitors (MCC950, OLT1177)
      'gsk3b_active',       // GSK3β inhibitors, H₂S donors
      'tau_aggregated',     // Anti-tau immunotherapy, aggregation inhibitors
    ],
    moduleIds: ['M04', 'M07'],
    // Tipping point annotation
    tippingPoint: {
      biomarker: 'CSF pTau181 or Tau PET (Braak stage)',
      threshold: 'pTau181 >60 pg/mL OR Braak III/IV',
      timescale: 'weeks (once tau seeds spread)',
      interpretation: 'Once crossed, tau pathology self-propagates even if amyloid is cleared. This explains why anti-Aβ therapies fail in later stages - the tau loop is already autonomous',
      interventionWindow: 'early',
    },
    loopTimescale: 'weeks (seeding), months (spread), years (neurodegeneration)',
  },

  // ============================================================================
  // MODULE 5-6: LDAM-Aβ Accumulation Loop
  // ============================================================================
  {
    id: 'loop_LDAM_Abeta',
    name: 'LDAM-Aβ Clearance Failure Loop',
    type: 'reinforcing',
    description: `
      Phagocytic failure creates accumulation: LDAM phenotype → impaired
      phagocytosis → reduced Aβ clearance → more Aβ oligomers → more
      microglial activation → more LDAM.

      This explains why Aβ accumulation accelerates over time.
    `.trim(),
    edgeIds: ['E05.007', 'E05.008', 'E05.015'],
    // E05.015: abeta_oligomers → microglia_activated (completes the loop)
    clinicalImplication: 'DGAT2 inhibitors may break this loop by reducing lipid droplets',
    interventionPoints: [
      'srebp1_active',      // SREBP1 inhibitors
      'lipid_droplets',     // DGAT2 inhibitors
      'abeta_oligomers',    // Anti-Aβ immunotherapy
    ],
    moduleIds: ['M05', 'M06'],
    // Tipping point annotation
    tippingPoint: {
      biomarker: 'Amyloid PET SUVR or microglial TSPO PET',
      threshold: 'Amyloid PET SUVR >1.1 (A+ threshold)',
      timescale: 'months (once LDAM phenotype established)',
      interpretation: 'Once microglia become lipid-laden, phagocytic capacity is permanently impaired. Anti-Aβ antibodies must clear amyloid since microglia cannot.',
      interventionWindow: 'prevention',
    },
    loopTimescale: 'days (lipid accumulation), months (LDAM establishment), years (plaque deposition)',
  },

  // ============================================================================
  // MODULE 2-4: Lysosomal-Inflammasome Loop
  // ============================================================================
  {
    id: 'loop_lysosome_inflammasome',
    name: 'Lysosomal Dysfunction-Inflammation Loop',
    type: 'reinforcing',
    description: `
      Lysosomal failure amplifies inflammation: lysosomal dysfunction →
      cargo accumulation → lipofuscin → LMP → cathepsin B release →
      NLRP3 activation → IL-1β → NF-κB → more lysosomal stress.

      IL-1β and other cytokines increase lysosomal stress, completing the loop.
    `.trim(),
    edgeIds: ['E01.004', 'E02.001', 'E02.002', 'E02.003', 'E02.004', 'E02.005', 'E02.021'],
    // E02.021: il1b → lysosomal_dysfunction (completes the loop)
    clinicalImplication: 'Breaking at lipofuscin is impossible (irreversible); must target upstream',
    interventionPoints: [
      'mtorc1_hyperactive',  // Restore lysosomal biogenesis
      'nlrp3_active',        // NLRP3 inhibitors
      'cathepsin_b_cytosolic', // Cathepsin B inhibitors (CA-074-Me)
    ],
    moduleIds: ['M01', 'M02', 'M04'],
    // Tipping point annotation
    tippingPoint: {
      biomarker: 'BMP levels or lipofuscin accumulation',
      threshold: 'Lipofuscin >5% lysosomal volume (postmortem) or BMP >3x baseline',
      timescale: 'years (lipofuscin is irreversible)',
      interpretation: 'Lipofuscin accumulation is IRREVERSIBLE. Once significant lipofuscin builds up, lysosomal function cannot be restored. This is the "point of no return" for lysosomal therapy.',
      interventionWindow: 'prevention',
    },
    loopTimescale: 'hours (cathepsin release), days (inflammation), years (lipofuscin)',
  },

  // ============================================================================
  // MODULE 3-4: mtDNA-cGAS-STING Inflammation Loop
  // ============================================================================
  {
    id: 'loop_mtDNA_STING',
    name: 'mtDNA-STING Aging Inflammation Loop',
    type: 'reinforcing',
    description: `
      Mitochondrial damage amplifies via inflammation: damaged mitochondria →
      mtDNA release → cGAS-STING activation → Type I IFN → ISG expression →
      impaired mitophagy → more damaged mitochondria.

      Type I IFN signaling impairs cellular quality control, feeding back.
    `.trim(),
    edgeIds: ['E03.009', 'E04.003', 'E04.004', 'E03.011'],
    // E03.011: type_i_ifn → damaged_mito_pool (completes the loop)
    clinicalImplication: 'STING inhibitors show promise for aging-related inflammation',
    interventionPoints: [
      'pink1_parkin',       // Urolithin A, mitophagy enhancers
      'sting_active',       // STING inhibitors
      'cgas_active',        // cGAS inhibitors
    ],
    moduleIds: ['M03', 'M04'],
    // Tipping point annotation
    tippingPoint: {
      biomarker: 'Plasma cell-free mtDNA or IFN signature',
      threshold: 'cf-mtDNA >5x baseline or IFN score in top quartile',
      timescale: 'days (acute), months (chronic)',
      interpretation: 'Once mitochondrial damage exceeds clearance capacity, the loop becomes self-sustaining. Age-related decline in PINK1/Parkin function lowers the threshold.',
      interventionWindow: 'early',
    },
    loopTimescale: 'hours (IFN response), days (gene expression), weeks (mitochondrial dynamics)',
  },

  // ============================================================================
  // MODULE 5-8: A1 Astrocyte-Synapse Loss Loop
  // ============================================================================
  {
    id: 'loop_A1_synapse',
    name: 'A1 Astrocyte Synapse Loss Loop',
    type: 'reinforcing',
    description: `
      Glial dysfunction amplifies neurodegeneration: activated microglia →
      IL-1α + TNF + C1q → A1 astrocytes → neurotoxicity + C3 production →
      complement-mediated synapse elimination → neuronal stress signals →
      more microglial activation.
    `.trim(),
    edgeIds: ['E05.010', 'E05.011', 'E05.012', 'E05.013', 'E05.014', 'E05.016'],
    // E05.016: synapses → microglia_activated (decreases; synapse loss releases tonic inhibition)
    clinicalImplication: 'Complement inhibitors have early therapeutic window',
    interventionPoints: [
      'c1q',                // Anti-C1q antibodies (ANX005)
      'a1_astrocytes',      // Target A1-specific markers
      'il1a',               // IL-1α blockade
    ],
    moduleIds: ['M05', 'M08'],
    // Tipping point annotation
    tippingPoint: {
      biomarker: 'Synaptic density (SV2A PET) or CSF SNAP-25',
      threshold: 'SV2A SUVR <80% of age-matched controls',
      timescale: 'weeks (C3-mediated), months (synapse loss becomes detectable)',
      interpretation: 'Once significant synapse loss occurs, cognitive reserve is depleted. Complement inhibition may be too late if synapse loss is advanced.',
      interventionWindow: 'early',
    },
    loopTimescale: 'hours (C1q/C3 tagging), days (microglial pruning), weeks-months (cumulative loss)',
  },

  // ============================================================================
  // MODULE 13: OPC-Myelin-White Matter Loop (NEW)
  // ============================================================================
  {
    id: 'loop_OPC_myelin_WM',
    name: 'OPC-Myelin-White Matter Degeneration Loop',
    type: 'reinforcing',
    description: `
      White matter degeneration creates vicious cycle: OPC dysfunction →
      impaired remyelination → myelin debris accumulation → microglial
      activation → A1 astrocyte induction → A1 astrocytes kill OLs →
      more myelin loss → more OPC exhaustion.

      This loop is SLOW (years timescale) but starts EARLY (22+ years pre-symptom).
      Critical: APOE4 accelerates via cholesterol supply failure to OLs.
    `.trim(),
    edgeIds: ['E13.010', 'E13.012', 'E13.018', 'E13.019', 'E13.020', 'E13.023'],
    // E13.023: myelin_breakdown → opcs (decreases; completes the loop)
    clinicalImplication: 'Early white matter changes (DTI) may be the earliest modifiable biomarker. 22-year prodrome suggests large intervention window.',
    interventionPoints: [
      'opcs',               // Anti-LINGO1, clemastine, OPC transplant
      'remyelination_capacity', // Enhance OPC differentiation
      'a1_astrocytes',      // Block A1 astrocyte toxicity
      'ol_cholesterol_synthesis', // Cyclodextrin for APOE4 carriers
    ],
    moduleIds: ['M13', 'M05'],
    // Tipping point annotation
    tippingPoint: {
      biomarker: 'DTI fractional anisotropy (FA) or white matter hyperintensity volume',
      threshold: 'FA <0.3 in corpus callosum OR WMH volume >10 mL',
      timescale: 'years (very slow loop)',
      interpretation: 'White matter changes are detectable 22 years before symptoms (Nasrabady 2018). This is the EARLIEST intervention window but also the slowest loop - trials need long duration or enriched populations.',
      interventionWindow: 'prevention',
    },
    loopTimescale: 'weeks (OPC differentiation), months (myelin turnover), years (WM degeneration)',
  },

  // ============================================================================
  // MODULE 13: OPC-BBB Integrity Loop (NEW)
  // ============================================================================
  {
    id: 'loop_OPC_BBB',
    name: 'OPC-BBB Integrity Loop',
    type: 'balancing',
    description: `
      OPCs maintain BBB homeostasis: healthy OPCs → TGF-β1 secretion →
      tight junction maintenance → BBB integrity → protected brain environment →
      OPC survival.

      This balancing loop maintains BBB until OPCs are depleted.
      CRITICAL: Human OPCs use NOS1/NO signaling absent in mouse models.
    `.trim(),
    edgeIds: ['E13.014', 'E13.015', 'E13.016', 'E13.017', 'E13.024'],
    // E13.024: bbb_integrity → opcs (increases; completes the balancing loop)
    clinicalImplication: 'OPC health may be critical for BBB maintenance. Current BBB models lack OPCs - major translational gap.',
    interventionPoints: [
      'opcs',               // OPC protection/transplantation
      'opc_tgf_beta1',      // Exogenous TGF-β1
      'bbb_integrity',      // Tight junction stabilizers
    ],
    moduleIds: ['M13', 'M12'],
    // Tipping point annotation
    tippingPoint: {
      biomarker: 'CSF/serum albumin ratio or dynamic contrast MRI',
      threshold: 'Albumin ratio >10 (age-adjusted) indicates BBB compromise',
      timescale: 'days (acute), months (chronic)',
      interpretation: 'BBB breakdown allows peripheral factors into CNS, accelerating all other loops. OPC-derived TGF-β1 is essential for maintenance.',
      interventionWindow: 'prevention',
    },
    loopTimescale: 'hours (TGF-β signaling), days (tight junction turnover), months (OPC depletion)',
  },

  // ============================================================================
  // Balancing Loop: PINK1/Parkin Quality Control
  // ============================================================================
  {
    id: 'loop_mitophagy_balance',
    name: 'Mitophagy Quality Control (Balancing)',
    type: 'balancing',
    description: `
      Homeostatic mitochondrial quality control: damaged mitochondria →
      PINK1 stabilization → Parkin recruitment → mitophagy → clearance →
      reduced damaged pool.

      This balancing loop maintains mitochondrial health UNTIL overwhelmed.
    `.trim(),
    edgeIds: ['E02.006', 'E03.010'],
    clinicalImplication: 'Enhancing this loop (urolithin A) may restore balance',
    interventionPoints: [
      'pink1_parkin',       // Urolithin A, NAD+ precursors
    ],
    moduleIds: ['M02', 'M03'],
    // Tipping point annotation
    tippingPoint: {
      biomarker: 'Mitophagy flux (TMRM/MitoTracker ratio) or NAD+/NADH ratio',
      threshold: 'When damaged mito accumulation rate exceeds clearance rate',
      timescale: 'hours (acute), weeks (chronic depletion)',
      interpretation: 'This is a BALANCING loop that becomes overwhelmed with age. The tipping point is when PINK1/Parkin capacity is exceeded - after this, the reinforcing loops dominate.',
      interventionWindow: 'prevention',
    },
    loopTimescale: 'minutes (PINK1 stabilization), hours (Parkin recruitment), days (clearance)',
  },
];

export default feedbackLoops;
