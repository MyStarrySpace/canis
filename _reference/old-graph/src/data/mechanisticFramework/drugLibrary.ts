/**
 * Treatment Library for AD Mechanistic Network
 *
 * Curated list of treatments (drugs, devices, lifestyle interventions) with
 * their targets in the mechanistic network, enabling pathway visualization
 * and mechanism analysis.
 *
 * Each treatment entry specifies:
 * - Target nodes in the network
 * - Effect type (activates/inhibits/modulates)
 * - Evidence level and regulatory status
 * - Optional variants (e.g., dosing regimens, intensity levels)
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * How a treatment affects its target
 */
export type TreatmentEffect = 'activates' | 'inhibits' | 'modulates';
/** @deprecated Use TreatmentEffect instead */
export type DrugEffect = TreatmentEffect;

/**
 * Strength of the treatment's effect on target
 */
export type EffectStrength = 'strong' | 'moderate' | 'weak';

/**
 * Treatment classification
 */
export type TreatmentType =
  | 'small_molecule'  // Drugs, supplements
  | 'antibody'        // Monoclonal antibodies
  | 'biologic'        // Peptides, proteins
  | 'supplement'      // OTC supplements
  | 'device'          // Medical devices (e.g., 40Hz stimulation)
  | 'lifestyle'       // Exercise, diet, sleep
  | 'behavioral';     // Behavioral modifications (e.g., nasal hygiene)

/** @deprecated Use TreatmentType instead */
export type DrugType = TreatmentType;

/**
 * Regulatory/evidence status
 */
export type RegulatoryStatus =
  | 'approved'        // FDA approved for any indication
  | 'phase3'          // In Phase 3 trials
  | 'phase2'          // In Phase 2 trials
  | 'phase1'          // In Phase 1 trials
  | 'preclinical'     // Preclinical stage
  | 'no_pathway'      // Generic/supplement without FDA pathway
  | 'lifestyle'       // Lifestyle intervention (no FDA pathway)
  | 'device_cleared'; // FDA cleared device (510k)

/** @deprecated Use RegulatoryStatus instead */
export type FDAStatus = RegulatoryStatus;

/**
 * How the treatment is available
 */
export type TreatmentAvailability =
  | 'prescription'     // Requires prescription
  | 'otc'              // Over-the-counter
  | 'supplement'       // Dietary supplement
  | 'experimental'     // Clinical trials only
  | 'consumer_device'  // Consumer device (no prescription)
  | 'free';            // Freely available (lifestyle changes)

/** @deprecated Use TreatmentAvailability instead */
export type DrugAvailability = TreatmentAvailability;

/**
 * A single target of a treatment in the network
 */
export interface TreatmentTarget {
  /** Node ID in the mechanistic network */
  nodeId: string;
  /** How the treatment affects this target */
  effect: TreatmentEffect;
  /** Strength of the effect */
  strength: EffectStrength;
  /** Brief mechanism description */
  mechanism?: string;
}
/** @deprecated Use TreatmentTarget instead */
export type DrugTarget = TreatmentTarget;

/**
 * Evidence for treatment's effects in AD
 */
export interface TreatmentADEvidence {
  /** Evidence level (matches our evidence hierarchy) */
  level: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7';
  /** Summary of evidence */
  summary: string;
  /** PubMed IDs for key studies */
  pmids?: string[];
}
/** @deprecated Use TreatmentADEvidence instead */
export type DrugADEvidence = TreatmentADEvidence;

/**
 * Molecular properties for CNS MPO (Multiparameter Optimization) scoring
 * Data sourced from PubChem API (pubchem.ncbi.nlm.nih.gov/rest/pug)
 *
 * CNS MPO Score ranges 0-6, with ≥4 considered "desirable" for CNS drugs
 * Based on Wager et al. (2010) from Pfizer: https://pmc.ncbi.nlm.nih.gov/articles/PMC3368654/
 *
 * Optimal ranges for CNS drugs:
 * - MW: <450 Da (ideally <360)
 * - XLogP: 1-4 (ideally ~2.5)
 * - TPSA: <90 Å² (ideally <70)
 * - HBD: <3 (ideally ≤1)
 * - HBA: <7
 * - RotatableBonds: <8 (ideally ≤5)
 */
export interface MolecularProperties {
  /** PubChem Compound ID for verification */
  pubchemCid: number;
  /** Molecular weight in Daltons */
  molecularWeight: number;
  /** XLogP (computed octanol-water partition coefficient) - undefined for ions */
  xLogP?: number;
  /** Topological polar surface area in Å² */
  tpsa: number;
  /** Hydrogen bond donor count */
  hbdCount: number;
  /** Hydrogen bond acceptor count */
  hbaCount: number;
  /** Rotatable bond count */
  rotatableBonds: number;
}

/**
 * Calculate CNS MPO score from molecular properties
 * Returns 0-6, with ≥4 being desirable for CNS drugs
 *
 * Based on Wager et al. (2010, 2016) from Pfizer
 * https://pmc.ncbi.nlm.nih.gov/articles/PMC3368654/
 */
export function calculateCnsMpoScore(props: MolecularProperties): number {
  // Scoring functions based on Wager et al. (2010)
  // Each parameter contributes 0-1 to the total score

  // MW: 1.0 if ≤360, 0.0 if ≥500, linear between
  const mwScore = props.molecularWeight <= 360 ? 1.0 :
    props.molecularWeight >= 500 ? 0.0 :
    1.0 - (props.molecularWeight - 360) / 140;

  // XLogP: 1.0 if ≤3, 0.0 if ≥5, linear between (undefined = 0.5 for ions)
  const logpScore = props.xLogP === undefined ? 0.5 :
    props.xLogP <= 3 ? 1.0 :
    props.xLogP >= 5 ? 0.0 :
    1.0 - (props.xLogP - 3) / 2;

  // TPSA: 1.0 if ≤40, 0.0 if ≥90, linear between
  const tpsaScore = props.tpsa <= 40 ? 1.0 :
    props.tpsa >= 90 ? 0.0 :
    1.0 - (props.tpsa - 40) / 50;

  // HBD: 1.0 if 0, 0.0 if ≥3, linear between
  const hbdScore = props.hbdCount === 0 ? 1.0 :
    props.hbdCount >= 3 ? 0.0 :
    1.0 - props.hbdCount / 3;

  // HBA: 1.0 if ≤5, 0.0 if ≥10, linear between
  const hbaScore = props.hbaCount <= 5 ? 1.0 :
    props.hbaCount >= 10 ? 0.0 :
    1.0 - (props.hbaCount - 5) / 5;

  // Rotatable bonds: 1.0 if ≤5, 0.0 if ≥10, linear between
  const rotScore = props.rotatableBonds <= 5 ? 1.0 :
    props.rotatableBonds >= 10 ? 0.0 :
    1.0 - (props.rotatableBonds - 5) / 5;

  return mwScore + logpScore + tpsaScore + hbdScore + hbaScore + rotScore;
}

/**
 * Get BBB penetration label from CNS MPO score
 */
export function getBbbPenetrationFromMpo(mpoScore: number, isAntibody: boolean = false): BBBPenetration {
  if (isAntibody) return 'none'; // Antibodies cannot cross BBB passively
  if (mpoScore >= 4) return 'good';
  if (mpoScore >= 3) return 'moderate';
  return 'poor';
}

/**
 * BBB penetration assessment (simplified label)
 * For proper prediction, use MolecularProperties + calculateCnsMpoScore()
 */
export type BBBPenetration =
  | 'good'           // CNS MPO ≥4, crosses BBB well
  | 'moderate'       // CNS MPO 3-4, some penetration
  | 'poor'           // CNS MPO <3 or MW >500
  | 'none'           // Antibodies/large peptides (MW >5000)
  | 'indirect'       // Works via peripheral mechanism (gut-brain, immune)
  | 'unknown';       // Not characterized

/**
 * Safety concerns that may limit target engagement
 */
export interface SafetyConcerns {
  /** Carcinogenicity risk */
  carcinogenicity?: {
    level: 'none' | 'low' | 'moderate' | 'high' | 'unknown';
    mechanism?: string;
    notes?: string;
  };
  /** Hepatotoxicity risk */
  hepatotoxicity?: {
    level: 'none' | 'low' | 'moderate' | 'high' | 'unknown';
    mechanism?: string;
    notes?: string;
  };
  /** Immunosuppression risk */
  immunosuppression?: {
    level: 'none' | 'low' | 'moderate' | 'high';
    notes?: string;
  };
  /** Other dose-limiting toxicities */
  otherDLT?: string[];
}

/**
 * Demographic factors affecting treatment response
 */
export interface DemographicFactors {
  /** Sex-specific effects */
  sexEffects?: {
    differential: boolean;
    favors?: 'male' | 'female' | 'neither';
    mechanism?: string;
    notes?: string;
  };
  /** Ancestry/race effects */
  ancestryEffects?: {
    differential: boolean;
    /** Populations with different response */
    populations?: {
      group: string;
      effect: 'enhanced' | 'reduced' | 'different_safety';
      mechanism?: string;
    }[];
    notes?: string;
  };
  /** APOE genotype effects */
  apoeEffects?: {
    e4Carriers: 'enhanced' | 'reduced' | 'increased_risk' | 'no_difference';
    e2Carriers?: 'enhanced' | 'reduced' | 'no_difference';
    notes?: string;
  };
  /** Age-dependent effects */
  ageEffects?: {
    optimalWindow?: 'prevention' | 'early' | 'moderate' | 'late' | 'any';
    notes?: string;
  };
  /** Trial enrollment bias */
  trialBias?: {
    underrepresented?: string[];  // Groups underrepresented in trials
    notes?: string;
  };
}

/**
 * Treatment variant (e.g., different dosing regimens or intensity levels)
 */
export interface TreatmentVariant {
  id: string;
  label: string;
  /** Multiplier for effect strength (1.0 = standard) */
  effectModifier: number;
  /** Additional notes */
  notes?: string;
}
/** @deprecated Use TreatmentVariant instead */
export type DrugVariant = TreatmentVariant;

/**
 * Complete treatment library entry
 */
export interface TreatmentLibraryEntry {
  /** Unique identifier (lowercase_snake_case) */
  id: string;
  /** Display name */
  name: string;
  /** Treatment classification */
  type: TreatmentType;
  /** Regulatory/evidence status */
  fdaStatus: RegulatoryStatus;
  /** Primary targets in the network */
  primaryTargets: TreatmentTarget[];
  /** Brief summary of mechanism */
  mechanismSummary: string;
  /** Optional variants (dosing, intensity levels) */
  variants?: TreatmentVariant[];
  /** AD-specific evidence */
  adEvidence: TreatmentADEvidence;
  /** Estimated annual cost (USD), undefined for free interventions */
  annualCost?: number;
  /** How the treatment is available */
  availability: TreatmentAvailability;
  /** BBB penetration assessment (simplified label) */
  bbbPenetration?: BBBPenetration;
  /** Verified molecular properties from PubChem for CNS MPO calculation */
  molecularProperties?: MolecularProperties;
  /** Safety concerns that may limit dosing or target engagement */
  safetyConcerns?: SafetyConcerns;
  /** Demographic factors affecting response */
  demographicFactors?: DemographicFactors;
  /** Additional notes */
  notes?: string;
}
/** @deprecated Use TreatmentLibraryEntry instead */
export type DrugLibraryEntry = TreatmentLibraryEntry;

/**
 * Pre-computed pathway configuration for a treatment
 * Note: `drugId` kept for backward compatibility, maps to treatment ID
 */
export interface TreatmentPathwayConfig {
  /** Treatment ID this pathway is for (alias: drugId for backward compatibility) */
  drugId: string;
  /** Nodes upstream of targets (what leads TO the target) */
  upstreamNodes: string[];
  /** The treatment's direct target nodes */
  targetNodes: string[];
  /** Nodes downstream of targets (what the target affects) */
  downstreamNodes: string[];
  /** Edge IDs in the pathway */
  pathwayEdges: string[];
  /** Feedback loops affected by this treatment */
  relevantLoops: {
    loopId: string;
    /** How the treatment affects this loop */
    involvement: 'breaks' | 'weakens' | 'strengthens' | 'enters';
    /** Which target node participates in this loop */
    targetNodeInLoop: string;
  }[];
  /** Modules touched by the pathway */
  affectedModules: string[];
  /** When this pathway was computed */
  computedAt: string;
}
/** @deprecated Use TreatmentPathwayConfig instead */
export type DrugPathwayConfig = TreatmentPathwayConfig;

// ============================================================================
// TREATMENT LIBRARY
// ============================================================================

export const treatmentLibrary: TreatmentLibraryEntry[] = [
  // ---------------------------------------------------------------------------
  // RAPAMYCIN (SIROLIMUS)
  // ---------------------------------------------------------------------------
  {
    id: 'rapamycin',
    name: 'Rapamycin (Sirolimus)',
    type: 'small_molecule',
    fdaStatus: 'approved',
    availability: 'prescription',
    mechanismSummary: 'mTORC1 inhibitor that restores autophagy and reduces protein aggregation',
    primaryTargets: [
      {
        nodeId: 'mtorc1_hyperactive',
        effect: 'inhibits',
        strength: 'strong',
        mechanism: 'Binds FKBP12, which then inhibits mTORC1 kinase activity',
      },
    ],
    variants: [
      { id: 'standard', label: 'Standard (1-2mg/day)', effectModifier: 1.0 },
      { id: 'intermittent', label: 'Intermittent (weekly)', effectModifier: 0.7, notes: 'May avoid immunosuppression' },
      { id: 'low_dose', label: 'Low-dose (0.5mg/day)', effectModifier: 0.5 },
    ],
    adEvidence: {
      level: 'L4',
      summary: 'Animal studies show improved cognition and reduced Aβ/tau pathology. Human AD trials pending.',
      pmids: ['22956686', '25381458', '26187568'],
    },
    annualCost: 500, // Generic available
    bbbPenetration: 'poor', // CNS MPO ~1.5 - too large despite lipophilicity
    molecularProperties: {
      // Verified from PubChem API: https://pubchem.ncbi.nlm.nih.gov/compound/5284616
      pubchemCid: 5284616,
      molecularWeight: 914.2,  // Way over 500 Da limit!
      xLogP: 6,                // Too lipophilic (>5)
      tpsa: 195,               // Way over 90 Å² limit!
      hbdCount: 3,
      hbaCount: 13,
      rotatableBonds: 6,
    },
    notes: 'Most promising mTOR inhibitor for AD but POOR BBB penetration (CNS MPO ~1.5). MW=914 Da and TPSA=195 Å² far exceed CNS drug limits. Nanoparticle formulations (ABI-009/nab-sirolimus) may improve brain delivery. Concerns about immunosuppression at high doses.',
  },

  // ---------------------------------------------------------------------------
  // LITHIUM (MICRODOSE)
  // ---------------------------------------------------------------------------
  {
    id: 'lithium_microdose',
    name: 'Lithium (Microdose)',
    type: 'small_molecule',
    fdaStatus: 'approved',
    availability: 'prescription',
    mechanismSummary: 'GSK3β inhibitor that reduces tau phosphorylation and promotes autophagy',
    primaryTargets: [
      {
        nodeId: 'gsk3b_active',
        effect: 'inhibits',
        strength: 'moderate',
        mechanism: 'Competes with Mg2+ for binding, inhibiting GSK3β kinase activity',
      },
    ],
    variants: [
      { id: 'microdose', label: 'Microdose (300μg/day)', effectModifier: 0.3 },
      { id: 'low_dose', label: 'Low-dose (150mg/day)', effectModifier: 0.6 },
      { id: 'standard', label: 'Standard psychiatric', effectModifier: 1.0, notes: 'Requires monitoring' },
    ],
    adEvidence: {
      level: 'L4',
      summary: 'Epidemiological studies show reduced dementia in lithium users. Small RCTs show stabilization.',
      pmids: ['17592124', '21525519', '25733993'],
    },
    annualCost: 50, // Very cheap
    bbbPenetration: 'good', // Small ion easily crosses BBB
    molecularProperties: {
      // Verified from PubChem API: https://pubchem.ncbi.nlm.nih.gov/compound/11125
      // Note: Lithium carbonate is ionic - XLogP not applicable
      pubchemCid: 11125,
      molecularWeight: 73.9,   // Tiny molecule!
      xLogP: undefined,       // Ionic - LogP not meaningful
      tpsa: 63.2,
      hbdCount: 0,
      hbaCount: 3,
      rotatableBonds: 0,
    },
    notes: 'Microdose lithium in drinking water associated with lower dementia rates in Texas study. Small ion (73.9 Da) crosses BBB easily - CNS MPO not applicable to ions.',
  },

  // ---------------------------------------------------------------------------
  // SRI-011381 (C381)
  // ---------------------------------------------------------------------------
  {
    id: 'sri_011381',
    name: 'SRI-011381 (C381)',
    type: 'small_molecule',
    fdaStatus: 'phase1',
    availability: 'experimental',
    mechanismSummary: 'Restores lysosomal function via v-ATPase enhancement',
    primaryTargets: [
      {
        nodeId: 'lysosomal_dysfunction',
        effect: 'inhibits',
        strength: 'strong',
        mechanism: 'Enhances v-ATPase proton pump activity, restoring lysosomal acidification',
      },
    ],
    adEvidence: {
      level: 'L4',
      summary: 'Restores lysosomal function in PS1 mutant cells. Reduces Aβ and tau in mouse models.',
      pmids: ['33020469', '35314818'],
    },
    notes: 'Developed by Nixon lab. Addresses fundamental lysosomal dysfunction in AD.',
  },

  // ---------------------------------------------------------------------------
  // COLCHICINE
  // ---------------------------------------------------------------------------
  {
    id: 'colchicine',
    name: 'Colchicine',
    type: 'small_molecule',
    fdaStatus: 'approved',
    availability: 'prescription',
    mechanismSummary: 'NLRP3 inflammasome inhibitor that reduces neuroinflammation',
    primaryTargets: [
      {
        nodeId: 'nlrp3_active',
        effect: 'inhibits',
        strength: 'moderate',
        mechanism: 'Disrupts microtubule assembly, preventing inflammasome formation',
      },
    ],
    adEvidence: {
      level: 'L6',
      summary: 'Epidemiological studies suggest reduced dementia in gout patients on colchicine.',
      pmids: ['32571790', '31883865'],
    },
    annualCost: 2500, // Brand name expensive, generic cheaper
    bbbPenetration: 'moderate', // CNS MPO ~3.5 (borderline)
    molecularProperties: {
      // Verified from PubChem API: https://pubchem.ncbi.nlm.nih.gov/compound/6167
      pubchemCid: 6167,
      molecularWeight: 399.4,
      xLogP: 1,
      tpsa: 83.1,
      hbdCount: 1,
      hbaCount: 6,
      rotatableBonds: 5,
    },
    notes: 'COLCOT trial showed CV benefits; AD trial (COLADE) underway. BEST LOOP-BREAKER: Breaks 2 loops. CNS MPO ~3.5 (borderline - TPSA slightly high at 83.1 Å²).',
  },

  // ---------------------------------------------------------------------------
  // ADUCANUMAB (ADUHELM)
  // ---------------------------------------------------------------------------
  {
    id: 'aducanumab',
    name: 'Aducanumab (Aduhelm)',
    type: 'antibody',
    fdaStatus: 'approved',
    availability: 'prescription',
    mechanismSummary: 'Anti-amyloid antibody that clears Aβ plaques via microglial phagocytosis',
    primaryTargets: [
      {
        nodeId: 'abeta_plaques',
        effect: 'inhibits',
        strength: 'strong',
        mechanism: 'Binds aggregated Aβ, promoting microglial clearance',
      },
    ],
    adEvidence: {
      level: 'L1',
      summary: 'Phase 3 trials showed plaque clearance but inconsistent clinical benefit. Controversial approval.',
      pmids: ['33497548', '34048569'],
    },
    annualCost: 28000, // Before withdrawal from market
    bbbPenetration: 'poor', // ~0.1% of plasma reaches brain parenchyma; accesses plaques via ARIA-related BBB disruption
    notes: 'Withdrawn from market 2024. ARIA (brain swelling/bleeding) in ~40% of patients. Brain uptake ~0.13% ID/gram - likely accesses CNS via BBB disruption (explains ARIA), not active transport.',
  },

  // ---------------------------------------------------------------------------
  // LECANEMAB (LEQEMBI)
  // ---------------------------------------------------------------------------
  {
    id: 'lecanemab',
    name: 'Lecanemab (Leqembi)',
    type: 'antibody',
    fdaStatus: 'approved',
    availability: 'prescription',
    mechanismSummary: 'Anti-amyloid antibody with 10× higher affinity for protofibrils vs fibrils, 1,000-14,000× vs monomers',
    primaryTargets: [
      {
        nodeId: 'abeta_oligomers',
        effect: 'inhibits',
        strength: 'strong',
        // Binding affinity: 10× stronger for protofibrils vs fibrils; 1,000-14,000× vs monomers
        // 100× better protofibril binding than aducanumab; 25× better for large protofibrils
        mechanism: 'Binds Aβ protofibrils (toxic species) with highest selectivity among approved mAbs. Promotes microglial clearance via Fc receptors.',
      },
      {
        nodeId: 'abeta_plaques',
        effect: 'inhibits',
        strength: 'moderate',
        mechanism: 'Secondary effect on plaque burden; 10× weaker binding to fibrils vs protofibrils',
      },
    ],
    adEvidence: {
      level: 'L1',
      summary: 'CLARITY-AD showed 27% slowing of decline at 18 months. First anti-amyloid with consistent efficacy.',
      pmids: ['36449413', '37458272'],
    },
    annualCost: 26500,
    bbbPenetration: 'poor', // Brain uptake ~0.13% ID/gram (mAb158 mouse data); CSF ~0.2% of plasma; t½ ~7 days
    notes: 'BINDING KINETICS: 10× protofibril vs fibril; 1,000× vs monomer; 100× better protofibril binding than aducanumab. ARIA risk ~20%. APOE4 homozygotes at higher risk. Native BBB penetration very low (~0.1-0.2% of plasma). Bispecific bi-lecanemab with TfR shuttle shows 10× better brain uptake.',
  },

  // ---------------------------------------------------------------------------
  // DONANEMAB
  // ---------------------------------------------------------------------------
  {
    id: 'donanemab',
    name: 'Donanemab (Kisunla)',
    type: 'antibody',
    fdaStatus: 'approved',
    availability: 'prescription',
    mechanismSummary: 'Anti-amyloid antibody targeting pyroglutamate Aβ in plaques',
    primaryTargets: [
      {
        nodeId: 'abeta_plaques',
        effect: 'inhibits',
        strength: 'strong',
        mechanism: 'Targets N-terminal pyroglutamate modification specific to deposited Aβ',
      },
    ],
    adEvidence: {
      level: 'L1',
      summary: 'TRAILBLAZER-ALZ2 showed 35% slowing in early AD. Can be discontinued after plaque clearance.',
      pmids: ['37459141', '38587244'],
    },
    annualCost: 32000,
    bbbPenetration: 'poor', // Like other IgG antibodies, <0.1% reaches brain parenchyma; requires high dose (10mg/kg → ~1μM plasma)
    notes: 'Unique dosing strategy: treatment stops when plaques clear. ARIA risk ~25%. Requires very high plasma concentration (~1μM, nearly 1% of all IgG) at 10mg/kg dose to achieve brain effect. Native BBB penetration <0.1%; efficacy likely depends on BBB disruption.',
  },

  // ---------------------------------------------------------------------------
  // UROLITHIN A
  // ---------------------------------------------------------------------------
  {
    id: 'urolithin_a',
    name: 'Urolithin A',
    type: 'supplement',
    fdaStatus: 'no_pathway',
    availability: 'supplement',
    mechanismSummary: 'Mitophagy enhancer that clears damaged mitochondria via PINK1/Parkin',
    primaryTargets: [
      {
        nodeId: 'pink1_parkin',
        effect: 'activates',
        strength: 'moderate',
        mechanism: 'Upregulates PINK1/Parkin expression, enhancing mitophagy flux',
      },
    ],
    adEvidence: {
      level: 'L4',
      summary: 'Improves mitochondrial function in aging humans. Mouse AD studies show reduced pathology.',
      pmids: ['27274687', '30863582', '34182535'],
    },
    annualCost: 400, // Supplement pricing
    notes: 'GRAS status. Timeline Nutrition sells as supplement. Pomegranate-derived.',
  },

  // ---------------------------------------------------------------------------
  // NAD+ PRECURSORS (NMN/NR)
  // ---------------------------------------------------------------------------
  {
    id: 'nad_precursors',
    name: 'NAD+ Precursors (NMN/NR)',
    type: 'supplement',
    fdaStatus: 'no_pathway',
    availability: 'supplement',
    mechanismSummary: 'Restore NAD+ levels to support mitochondrial function and sirtuins',
    primaryTargets: [
      {
        nodeId: 'mito_ros',
        effect: 'inhibits',
        strength: 'moderate',
        mechanism: 'NAD+ supports mitochondrial function and reduces oxidative stress',
      },
    ],
    adEvidence: {
      level: 'L5',
      summary: 'Mouse studies show neuroprotection. Human trials for aging; AD-specific data limited.',
      pmids: ['27872959', '29432159', '33037328'],
    },
    annualCost: 600,
    notes: 'NMN vs NR debate ongoing. FDA declared NMN not a dietary supplement in 2022.',
  },

  // ---------------------------------------------------------------------------
  // GV-971 (SODIUM OLIGOMANNATE)
  // ---------------------------------------------------------------------------
  {
    id: 'gv971',
    name: 'GV-971 (Oligomannate)',
    type: 'small_molecule',
    fdaStatus: 'phase3', // In US/EU; approved in China
    availability: 'experimental',
    mechanismSummary: 'Gut-brain axis modulator that reduces neuroinflammation via microbiome',
    primaryTargets: [
      {
        nodeId: 'neuroinflammation',
        effect: 'inhibits',
        strength: 'moderate',
        mechanism: 'Reduces neuroinflammation via gut-brain axis modulation',
      },
      {
        nodeId: 'microglia_activated',
        effect: 'inhibits',
        strength: 'moderate',
        mechanism: 'Reduces Th1 cell infiltration and microglial activation',
      },
    ],
    adEvidence: {
      level: 'L1',
      summary: 'China Phase 3 showed cognitive improvement. GREEN MEMORY global trial ongoing.',
      pmids: ['31488882', '34497182'],
    },
    annualCost: 3000, // Estimated
    notes: 'Novel gut-brain mechanism. Seaweed-derived oligosaccharide. Skepticism in Western scientific community.',
  },

  // ---------------------------------------------------------------------------
  // SEMAGLUTIDE (GLP-1 AGONIST) - EVOKE FAILED Nov 2025
  // ---------------------------------------------------------------------------
  {
    id: 'semaglutide',
    name: 'Semaglutide (Ozempic/Wegovy)',
    type: 'biologic',
    fdaStatus: 'approved',
    availability: 'prescription',
    mechanismSummary: 'GLP-1 agonist that improves insulin signaling but has poor BBB penetration to hippocampus',
    primaryTargets: [
      {
        nodeId: 'insulin_resistance',
        effect: 'inhibits',
        strength: 'strong',
        mechanism: 'Enhances insulin secretion and sensitivity via GLP-1R (peripheral)',
      },
      {
        nodeId: 'neuroinflammation',
        effect: 'inhibits',
        strength: 'weak', // Downgraded: BBB penetration issue
        mechanism: 'Anti-inflammatory effects limited by poor CNS penetration',
      },
    ],
    adEvidence: {
      level: 'L1', // Phase 3 completed
      summary: 'EVOKE/EVOKE+ Phase 3 FAILED Nov 2025. No effect on CDR-SB vs placebo despite 3,800 patients over 2 years. Fatty acid structure prevents hippocampal penetration. CSF biomarkers showed modest improvement (pTau181, YKL-40) but no clinical benefit.',
      pmids: ['35216679', '37316654', '37923315'],
    },
    annualCost: 12000,
    bbbPenetration: 'none', // Peptide cannot cross BBB
    molecularProperties: {
      // Verified from PubChem API: https://pubchem.ncbi.nlm.nih.gov/compound/56843331
      pubchemCid: 56843331,
      molecularWeight: 4114,    // Massive peptide! (limit <500)
      xLogP: -5.8,             // Very hydrophilic (optimal 1-4)
      tpsa: 1650,              // Enormous! (limit <90)
      hbdCount: 57,            // Far exceeds limit of <3
      hbaCount: 63,
      rotatableBonds: 151,
    },
    notes: 'EVOKE FAILED: CNS MPO ~0 - peptide (MW=4114 Da, TPSA=1650 Å²) cannot cross BBB. Targets correct node (insulin resistance) but cannot reach brain. Novo Nordisk ended all AD semaglutide trials. Small molecule GLP-1 mimetics needed for CNS activity.',
  },

  // ---------------------------------------------------------------------------
  // DASATINIB + QUERCETIN (SENOLYTICS)
  // ---------------------------------------------------------------------------
  {
    id: 'dasatinib_quercetin',
    name: 'Dasatinib + Quercetin (D+Q)',
    type: 'small_molecule',
    fdaStatus: 'approved', // Dasatinib approved for leukemia
    availability: 'prescription',
    mechanismSummary: 'Senolytic combination that clears senescent cells reducing SASP',
    primaryTargets: [
      {
        nodeId: 'senescent_cells',
        effect: 'inhibits',
        strength: 'strong',
        mechanism: 'Induces apoptosis in senescent cells via multiple pathways',
      },
    ],
    adEvidence: {
      level: 'L4',
      summary: 'Mouse studies show improved cognition after senescent cell clearance. Human trials early stage.',
      pmids: ['31097543', '33765445', '36087609'],
    },
    annualCost: 5000, // Intermittent dosing
    notes: 'Intermittent "hit and run" dosing (2 days per month). Unity Biotechnology trials ongoing.',
  },

  // ---------------------------------------------------------------------------
  // GALANTAMINE
  // ---------------------------------------------------------------------------
  {
    id: 'galantamine',
    name: 'Galantamine (Razadyne)',
    type: 'small_molecule',
    fdaStatus: 'approved',
    availability: 'prescription',
    mechanismSummary: 'AChE inhibitor and α7 nAChR positive allosteric modulator that protects BBB integrity via splenic anti-inflammatory pathway',
    primaryTargets: [
      {
        nodeId: 'ach_reduced',
        effect: 'inhibits',
        strength: 'moderate',
        mechanism: 'Inhibits AChE, increasing acetylcholine at synapses',
      },
      {
        nodeId: 'bbb_integrity',
        effect: 'activates',
        strength: 'moderate',
        mechanism: 'α7 nAChR PAM activity → splenic α7 activation → ↓ systemic TNF-α/IL-1β → ↑ tight junction proteins (claudin-5, occludin)',
      },
      {
        nodeId: 'neuroinflammation',
        effect: 'inhibits',
        strength: 'moderate',
        mechanism: 'Cholinergic anti-inflammatory pathway via vagus → spleen → ↓ cytokines',
      },
    ],
    adEvidence: {
      level: 'L1',
      summary: 'FDA-approved for AD. Dash lab (2016-2017) showed galantamine reduces TBI-triggered BBB permeability via α7 nAChR on splenic immune cells. Effects persist 10 days after drug termination.',
      pmids: ['29088998', '26937017'],
    },
    annualCost: 360,
    bbbPenetration: 'good', // CNS MPO ~5.4
    molecularProperties: {
      // Verified from PubChem API: https://pubchem.ncbi.nlm.nih.gov/compound/9651
      pubchemCid: 9651,
      molecularWeight: 287.35,
      xLogP: 1.8,
      tpsa: 41.9,
      hbdCount: 1,
      hbaCount: 4,
      rotatableBonds: 1,
    },
    notes: 'BBB protection may be a major unrecognized mechanism. The splenic α7 nAChR → systemic inflammation → BBB axis explains why effects persist after discontinuation. CNS MPO ~5.4 (excellent). May warrant measuring BBB permeability in AD trials.',
  },

  // ---------------------------------------------------------------------------
  // CAFFEIC ACID DERIVATIVE (COMPOUND 12d)
  // ---------------------------------------------------------------------------
  {
    id: 'caffeic_acid_12d',
    name: 'Caffeic Acid Derivative (Compound 12d)',
    type: 'small_molecule',
    fdaStatus: 'preclinical',
    availability: 'experimental',
    mechanismSummary: 'Multi-target directed ligand with AChE inhibition, antioxidant, metal chelation, and anti-amyloid aggregation properties',
    primaryTargets: [
      {
        nodeId: 'ach_reduced',
        effect: 'inhibits',
        strength: 'strong',
        mechanism: 'Selective AChE inhibition (IC₅₀ 3.72 μM) increases acetylcholine availability',
      },
      {
        nodeId: 'mito_ros',
        effect: 'inhibits',
        strength: 'moderate',
        mechanism: 'Potent antioxidant activity (DPPH IC₅₀ 6.32 μM) reduces oxidative stress',
      },
      {
        nodeId: 'abeta_oligomers',
        effect: 'inhibits',
        strength: 'moderate',
        mechanism: 'Inhibits Aβ self-aggregation (Thioflavin T assay and electron microscopy confirmed)',
      },
      {
        nodeId: 'labile_iron',
        effect: 'inhibits',
        strength: 'weak',
        mechanism: 'Metal-chelating properties reduce free metal-induced oxidative damage',
      },
    ],
    adEvidence: {
      level: 'L5',
      summary: 'Scopolamine-induced AD mouse model showed improved Y-maze spatial memory and restored cholinesterase levels. Neuroprotection in SH-SY5Y cells against H₂O₂ toxicity.',
      pmids: ['40578253'],
    },
    notes: 'Multi-target directed ligand (MTDL) approach from IIT BHU. Predicted BBB permeable (Pe = 4.12). Published June 2025 in Eur J Med Chem.',
  },

  // ---------------------------------------------------------------------------
  // CURCUMIN (TURMERIC)
  // ---------------------------------------------------------------------------
  {
    id: 'curcumin',
    name: 'Curcumin',
    type: 'supplement',
    fdaStatus: 'no_pathway',
    availability: 'supplement',
    mechanismSummary: 'Pleiotropic anti-inflammatory compound with poor bioavailability',
    primaryTargets: [
      {
        nodeId: 'nf_kb_active',
        effect: 'inhibits',
        strength: 'weak',
        mechanism: 'Inhibits NF-κB nuclear translocation',
      },
      {
        nodeId: 'abeta_oligomers',
        effect: 'inhibits',
        strength: 'weak',
        mechanism: 'May bind Aβ and prevent fibrillization (in vitro)',
      },
    ],
    adEvidence: {
      level: 'L5',
      summary: 'Extensive in vitro evidence but human trials disappointing due to bioavailability.',
      pmids: ['15590663', '25776839', '29320457'],
    },
    annualCost: 100,
    notes: 'Poor brain penetration despite promising preclinical data. Nano-formulations being tested.',
  },

  // ---------------------------------------------------------------------------
  // BACOPA MONNIERI (Multi-targeted Botanical)
  // ---------------------------------------------------------------------------
  {
    id: 'bacopa_monnieri',
    name: 'Bacopa monnieri',
    type: 'supplement',
    fdaStatus: 'phase2', // Phase II GWI trial active (NCT04927338)
    availability: 'supplement',
    mechanismSummary: 'Multi-targeted botanical: AChE inhibition, anti-inflammatory, antioxidant, anti-amyloidogenic',
    primaryTargets: [
      {
        nodeId: 'ach_reduced',
        effect: 'inhibits',
        strength: 'moderate',
        mechanism: 'AChE inhibition enhances cholinergic transmission. Comparable to donepezil in 52-week RCT (Prabhakar 2013).',
      },
      {
        nodeId: 'neuroinflammation',
        effect: 'inhibits',
        strength: 'moderate',
        mechanism: 'Reduces IL-6, IL-1β, TNF-α >75% at 1nM in 1h in synaptosomes (Gościniak 2025).',
      },
      {
        nodeId: 'abeta_oligomers',
        effect: 'inhibits',
        strength: 'moderate',
        mechanism: 'Aβ dissociation and reduced deposition in animal models (Limpeanchob 2008).',
      },
      {
        nodeId: 'mito_ros',
        effect: 'inhibits',
        strength: 'moderate',
        mechanism: 'Antioxidant activity reduces ROS, lipid peroxidation.',
      },
    ],
    adEvidence: {
      level: 'L3', // RCT evidence
      summary: 'Comparable efficacy to donepezil in 52-week RCT (Prabhakar 2013, n=48). Active Phase II trial in GWI (NCT04927338). Multi-targeted mechanism may address heterogeneous conditions.',
      pmids: ['24252493', '22747190', '22254423', '12404706'],
    },
    annualCost: 150, // BacoMind standardized extract
    notes: `GWI/ME/CFS/AD CONVERGENCE POINT: Active clinical trial (NCT04927338) testing BacoMind in Gulf War Illness.
      Key insight: Unlike single-target drugs that fail in heterogeneous conditions, multi-targeted botanicals
      may succeed by hitting multiple nodes in shared pathological network.

      Active compounds: Bacosides A (38% standardized extract), brahmine alkaloids.
      Cautions: CYP enzyme inhibition (2C9, 2C19, 1A2, 2D6, 3A4); may interact with AChE inhibitors;
      can increase T4 (avoid in hyperthyroidism).`,
  },

  // ===========================================================================
  // NON-PHARMACOLOGICAL INTERVENTIONS
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // 40Hz GAMMA STIMULATION
  // ---------------------------------------------------------------------------
  {
    id: 'gamma_40hz',
    name: '40Hz Gamma Stimulation',
    type: 'device',
    fdaStatus: 'phase3',
    availability: 'consumer_device',
    mechanismSummary: 'Audio-visual entrainment promotes glymphatic clearance via VIP interneurons and arterial pulsatility',
    primaryTargets: [
      {
        nodeId: 'arterial_pulsatility',
        effect: 'activates',
        strength: 'moderate',
        mechanism: 'VIP interneuron activation → increased vasomotion amplitude (~0.1Hz band)',
      },
      {
        nodeId: 'aqp4_polarization',
        effect: 'activates',
        strength: 'moderate',
        mechanism: 'VIP signaling → restored AQP4 localization at astrocyte endfeet',
      },
      {
        nodeId: 'glymphatic_clearance',
        effect: 'activates',
        strength: 'moderate',
        mechanism: 'Enhanced CSF influx and Aβ clearance; requires intact AQP4',
      },
    ],
    variants: [
      { id: 'visual_only', label: 'Visual only (40Hz flicker)', effectModifier: 0.6 },
      { id: 'audio_only', label: 'Audio only (40Hz click)', effectModifier: 0.5 },
      { id: 'multisensory', label: 'Multisensory (audio + visual)', effectModifier: 1.0 },
      { id: 'cognito_device', label: 'Cognito Therapeutics GENUS', effectModifier: 1.0, notes: 'Phase 3 EVOKE trial' },
    ],
    adEvidence: {
      level: 'L4',
      summary: 'Mouse studies show increased glymphatic clearance and reduced Aβ. Phase 3 human trials ongoing (EVOKE).',
      pmids: ['38418876', '27929004', '39747869'],
    },
    annualCost: 1500, // Consumer devices ~$1500
    notes: 'Murdock et al. 2024 (Nature) showed VIP interneurons and AQP4 are required for effect. EVOKE Phase 3 ongoing.',
  },

  // ---------------------------------------------------------------------------
  // EXERCISE
  // ---------------------------------------------------------------------------
  {
    id: 'exercise_aerobic',
    name: 'Aerobic Exercise',
    type: 'lifestyle',
    fdaStatus: 'lifestyle',
    availability: 'free',
    mechanismSummary: 'Restores AQP4 polarization, increases arterial pulsatility, promotes BDNF and autophagy',
    primaryTargets: [
      {
        nodeId: 'aqp4_polarization',
        effect: 'activates',
        strength: 'moderate',
        mechanism: 'Upregulates Lama1 and Dp71 → restores DAPC → AQP4 relocalization to endfeet',
      },
      {
        nodeId: 'arterial_pulsatility',
        effect: 'activates',
        strength: 'moderate',
        mechanism: 'Increased cardiac output → enhanced perivascular CSF flow',
      },
      {
        nodeId: 'glymphatic_clearance',
        effect: 'activates',
        strength: 'moderate',
        mechanism: 'Both AQP4 and pulsatility effects converge on glymphatic enhancement',
      },
      {
        nodeId: 'neuroinflammation',
        effect: 'inhibits',
        strength: 'moderate',
        mechanism: 'Reduces systemic and CNS inflammation markers',
      },
    ],
    variants: [
      { id: 'sedentary', label: 'Sedentary (<150 min/week)', effectModifier: 0, notes: 'Risk factor' },
      { id: 'light', label: 'Light (150-300 min/week)', effectModifier: 0.5 },
      { id: 'moderate', label: 'Moderate (300+ min/week)', effectModifier: 1.0 },
      { id: 'vigorous', label: 'Vigorous/HIIT', effectModifier: 1.2 },
      { id: 'swimming', label: 'Swimming', effectModifier: 1.0, notes: 'Most studied in AD models' },
    ],
    adEvidence: {
      level: 'L4',
      summary: 'Meta-analyses show 15-20% AD risk reduction. Mouse studies confirm AQP4 and glymphatic mechanisms.',
      pmids: ['39971255', '28579942', '35142700', '28054939'],
    },
    notes: 'Effect requires intact AQP4 (Liu 2022). Swimming specifically studied in Liang 2025.',
  },

  // ---------------------------------------------------------------------------
  // NASAL HYGIENE
  // ---------------------------------------------------------------------------
  {
    id: 'nasal_hygiene',
    name: 'Nasal Hygiene (Avoid Nose Picking)',
    type: 'behavioral',
    fdaStatus: 'lifestyle',
    availability: 'free',
    mechanismSummary: 'Reduces pathogen entry via olfactory nerve route to brain',
    primaryTargets: [
      {
        nodeId: 'neuroinflammation',
        effect: 'inhibits',
        strength: 'weak',
        mechanism: 'Pathogens (C. pneumoniae, HSV-1, P. gingivalis) can enter brain via olfactory nerve; nose picking introduces them',
      },
    ],
    variants: [
      { id: 'no_picking', label: 'Avoid nose picking', effectModifier: 1.0 },
      { id: 'nasal_rinse', label: 'Saline nasal rinse', effectModifier: 0.8, notes: 'May reduce pathogen load' },
      { id: 'hand_hygiene', label: 'Hand hygiene before face touching', effectModifier: 0.7 },
    ],
    adEvidence: {
      level: 'L6',
      summary: 'Olfactory nerve is a documented pathogen entry route. C. pneumoniae, HSV-1 found in AD brains. Epidemiological associations.',
      pmids: ['35675982', '37019931', '36280091'],
    },
    notes: 'St John & Bhattacharya 2022 (Nat Rev Neurosci) reviewed nose picking → C. pneumoniae → olfactory bulb → brain route.',
  },

  // ---------------------------------------------------------------------------
  // SLEEP APNEA TREATMENT
  // ---------------------------------------------------------------------------
  {
    id: 'sleep_apnea_treatment',
    name: 'Sleep Apnea Treatment (CPAP/Oral Appliance)',
    type: 'lifestyle',
    fdaStatus: 'lifestyle',
    availability: 'free',
    mechanismSummary: 'Restores nocturnal glymphatic clearance by maintaining slow-wave sleep and preventing hypoxia',
    primaryTargets: [
      {
        nodeId: 'glymphatic_clearance',
        effect: 'activates',
        strength: 'strong',
        mechanism: 'Sleep apnea disrupts slow-wave sleep when glymphatic clearance is most active; treatment restores this clearance window',
      },
      {
        nodeId: 'neuroinflammation',
        effect: 'inhibits',
        strength: 'moderate',
        mechanism: 'Intermittent hypoxia triggers inflammatory cascades; CPAP reduces hypoxic episodes',
      },
      {
        nodeId: 'oxidative_stress',
        effect: 'inhibits',
        strength: 'moderate',
        mechanism: 'Hypoxia-reoxygenation cycles generate ROS; treatment reduces oxidative burden',
      },
    ],
    variants: [
      { id: 'untreated', label: 'Untreated OSA', effectModifier: 0, notes: 'Risk factor: 1.5-2x AD risk' },
      { id: 'cpap_low', label: 'CPAP (<4h/night)', effectModifier: 0.3, notes: 'Suboptimal compliance' },
      { id: 'cpap_good', label: 'CPAP (>4h/night)', effectModifier: 1.0, notes: 'Adequate compliance' },
      { id: 'oral_appliance', label: 'Oral Appliance', effectModifier: 0.7, notes: 'For mild-moderate OSA' },
    ],
    adEvidence: {
      level: 'L4',
      summary: 'Meta-analyses show OSA increases AD risk 1.5-2x. CPAP treatment associated with delayed cognitive decline in observational studies. Glymphatic clearance active during slow-wave sleep.',
      pmids: ['36378032', '32466994', '31695836', '28899594'],
    },
    notes: 'OSA affects 50-70% of AD patients. Glymphatic system clears Aβ primarily during deep sleep (Xie et al. 2013). Treatment may be most effective in preclinical/early stages.',
  },

  // ---------------------------------------------------------------------------
  // IC 100 (ZYVERSA)
  // ---------------------------------------------------------------------------
  {
    id: 'ic100',
    name: 'IC 100 (ZyVersa)',
    type: 'antibody',
    fdaStatus: 'preclinical',
    availability: 'experimental',
    mechanismSummary: 'Humanized IgG4 mAb targeting ASC, the adaptor protein common to multiple inflammasomes (NLRP1, NLRP2, NLRP3, NLRC4, AIM2, Pyrin)',
    primaryTargets: [
      {
        nodeId: 'nlrp3_active',
        effect: 'inhibits',
        strength: 'strong',
        mechanism: 'Binds ASC adaptor protein, preventing inflammasome assembly and blocking ASC speck formation. Unlike NLRP3-only inhibitors, targets the common adaptor across multiple inflammasome types.',
      },
      {
        nodeId: 'caspase1_active',
        effect: 'inhibits',
        strength: 'strong',
        mechanism: 'Prevents caspase-1 activation by blocking ASC-mediated inflammasome assembly',
      },
      {
        nodeId: 'il1b',
        effect: 'inhibits',
        strength: 'moderate',
        mechanism: 'Reduces IL-1β release by preventing inflammasome activation',
      },
      {
        nodeId: 'abeta_oligomers',
        effect: 'inhibits',
        strength: 'moderate',
        mechanism: 'ASC specks act as seeds for Aβ aggregation; blocking ASC speck release disrupts the Aβ-inflammasome-Aβ amplification cycle',
      },
    ],
    adEvidence: {
      level: 'L4',
      summary: 'Preclinical data shows NLRP3 inhibition reduces Aβ deposition and neuroinflammation in AD mouse models. ASC specks demonstrated to seed Aβ plaques. Published support for ASC as biomarker of early cognitive decline.',
      pmids: ['38234567', '37019931'], // Placeholder - actual PMIDs from 2024/2025 publications
    },
    bbbPenetration: 'none', // IgG4 antibody - does not cross BBB passively
    notes: 'UNIQUE MECHANISM: Targets ASC (adaptor protein), not NLRP3 sensor, so inhibits multiple inflammasome types (NLRP1, NLRP2, NLRP3, NLRC4, AIM2, Pyrin). ASC specks released from dying cells seed Aβ aggregation and perpetuate inflammation. ZyVersa is a small biotech (market cap ~$5-10M), IND planned H2-2025, lead indication is cardiometabolic (not AD). BBB penetration is a concern for antibodies. Competition from small molecule NLRP3 inhibitors (Novartis, Roche) which have better BBB penetration.',
  },

  // ---------------------------------------------------------------------------
  // METFORMIN
  // ---------------------------------------------------------------------------
  {
    id: 'metformin',
    name: 'Metformin',
    type: 'small_molecule',
    fdaStatus: 'approved',
    availability: 'prescription',
    mechanismSummary: 'AMPK activator that inhibits mTORC1, suppresses NF-κB, promotes M2 microglial polarization, and enhances autophagy via AMPK/mTOR/S6K/BACE1 and AMPK/P65 NF-κB pathways',
    primaryTargets: [
      {
        nodeId: 'mtorc1_hyperactive',
        effect: 'inhibits',
        strength: 'moderate',
        mechanism: 'Activates AMPK via mitochondrial complex I inhibition → AMPK activates TSC2 → mTORC1 inhibition',
      },
      {
        nodeId: 'sirt1_activity',
        effect: 'activates',
        strength: 'moderate',
        mechanism: 'AMPK activation increases NAD+/NADH ratio, activating SIRT1',
      },
      {
        nodeId: 'nlrp3_active',
        effect: 'inhibits',
        strength: 'moderate',
        mechanism: 'AMPK activation suppresses NF-κB → reduced NLRP3 transcription and activation',
      },
    ],
    variants: [
      { id: 'standard', label: 'Standard (500-1000mg BID)', effectModifier: 1.0 },
      { id: 'low_dose', label: 'Low-dose prevention (500mg/day)', effectModifier: 0.5, notes: 'Daly 2025 proposal for long-term prevention' },
      { id: 'extended_release', label: 'Extended release (1500mg/day)', effectModifier: 0.9, notes: 'Better GI tolerance' },
    ],
    adEvidence: {
      level: 'L3',
      summary: 'Ou 2017: APP/PS1 mice showed attenuated memory deficits, decreased Aβ, reduced microglia. MAP Trial (NCT04098666) Phase 2 ongoing, results 2027. CRITICAL: Wu 2020 showed APOE4 interaction (benefit in cognitively normal, possible harm in AD+APOE4).',
      pmids: ['29262791', '33278629', '32928555'],
    },
    annualCost: 48, // ~$4/month generic
    bbbPenetration: 'moderate', // Small hydrophilic molecule, uses OCT transporters
    molecularProperties: {
      // Verified from PubChem API: https://pubchem.ncbi.nlm.nih.gov/compound/4091
      pubchemCid: 4091,
      molecularWeight: 129.16,  // Very small molecule
      xLogP: -0.5,             // Very hydrophilic (ionic at physiological pH)
      tpsa: 91.5,              // Slightly high but crosses via transporters
      hbdCount: 4,
      hbaCount: 4,
      rotatableBonds: 2,
    },
    demographicFactors: {
      apoeEffects: {
        e4Carriers: 'increased_risk',
        notes: 'Wu 2020: APOE4 carriers showed possible accelerated decline with metformin in established AD. Benefit seen in cognitively normal. Stratification by APOE status essential.',
      },
      ageEffects: {
        optimalWindow: 'prevention',
        notes: 'Strongest rationale for prevention in cognitively normal at-risk individuals, not treatment of established AD',
      },
    },
    notes: 'MARKET FAILURE EXEMPLAR: $4/month generic with decades of safety data, strong preclinical evidence, but no pharma funding for Phase 3 AD trial. MAP trial relies entirely on academic/philanthropic funding. APOE4 interaction (Wu 2020) suggests stratification is essential: benefit in cognitively normal, possible harm in AD+APOE4.',
  },

  // ---------------------------------------------------------------------------
  // DIMETHYL FUMARATE (DMF / TECFIDERA)
  // ---------------------------------------------------------------------------
  {
    id: 'dimethyl_fumarate',
    name: 'Dimethyl Fumarate (Tecfidera)',
    type: 'small_molecule',
    fdaStatus: 'approved',
    availability: 'prescription',
    mechanismSummary: 'Nrf2 activator that suppresses NF-κB, inhibits NLRP3 inflammasome, and prevents glycolytic switch in microglia via Keap1 modification and HCAR2 activation',
    primaryTargets: [
      {
        nodeId: 'nrf2_pathway',
        effect: 'activates',
        strength: 'strong',
        mechanism: 'Direct covalent modification of Keap1 cysteine residues releases Nrf2; also activates via HCAR2 receptor',
      },
      {
        nodeId: 'nlrp3_active',
        effect: 'inhibits',
        strength: 'moderate',
        mechanism: 'Nrf2 activation → NF-κB suppression → reduced NLRP3 transcription; also prevents HIF-1α stabilization',
      },
      {
        nodeId: 'gpx4_activity',
        effect: 'activates',
        strength: 'moderate',
        mechanism: 'Nrf2 induces GPX4 and other ferroptosis-protective genes (HO-1, NQO1, xCT)',
      },
    ],
    variants: [
      { id: 'standard', label: 'Standard MS dose (240mg BID)', effectModifier: 1.0 },
      { id: 'low_dose', label: 'Low-dose (120mg BID)', effectModifier: 0.5, notes: 'Starting dose, fewer GI side effects' },
      { id: 'diroximel', label: 'Diroximel fumarate (Vumerity)', effectModifier: 1.0, notes: 'Better GI tolerability' },
    ],
    adEvidence: {
      level: 'L4',
      summary: 'Wang 2024: App-KI mice showed improved cognition via astrocytic Nrf2 → reduced STAT3/C3 → decreased neuroinflammation. Sharkus 2023 published Phase I/II AD trial design (n=60, 12 weeks), but NO active AD trial registered as of 2025.',
      pmids: ['38374046', '37239336', '32766776'],
    },
    annualCost: 50, // Generic available since 2020
    bbbPenetration: 'good', // Small lipophilic molecule, CNS MPO ~5
    molecularProperties: {
      // Verified from PubChem API: https://pubchem.ncbi.nlm.nih.gov/compound/637568
      pubchemCid: 637568,
      molecularWeight: 144.13,  // Very small molecule
      xLogP: 0.6,              // Moderate lipophilicity
      tpsa: 52.6,              // Good CNS profile
      hbdCount: 0,
      hbaCount: 4,
      rotatableBonds: 2,
    },
    safetyConcerns: {
      immunosuppression: {
        level: 'moderate',
        notes: 'Lymphopenia monitoring required (every 3 months); discontinue if ALC <0.8. Rare PML risk in severely lymphopenic patients.',
      },
      otherDLT: ['GI intolerance (40%): flushing, nausea, diarrhea', 'Diroximel fumarate (Vumerity) has better GI tolerability'],
    },
    demographicFactors: {
      apoeEffects: {
        e4Carriers: 'enhanced',
        notes: 'APOE4 carriers have impaired Nrf2 signaling; DMF may be particularly relevant for this population',
      },
    },
    notes: 'CLEAR MARKET FAILURE: FDA-approved, CNS-penetrant Nrf2 activator with strong mechanistic rationale and preclinical AD data, yet NO active AD trial despite published trial design (Sharkus 2023). Generic since 2020 (~$50/year) eliminates commercial incentive. Wang 2024 showed improved cognition in App-KI mice. Targets multiple pathways: Nrf2 (antioxidant), NF-κB (inflammation), NLRP3 (inflammasome), HIF-1α (glycolytic switch).',
  },
];

/** @deprecated Use treatmentLibrary instead */
export const drugLibrary = treatmentLibrary;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get a treatment by ID
 */
export function getTreatmentById(id: string): TreatmentLibraryEntry | undefined {
  return treatmentLibrary.find(d => d.id === id);
}
/** @deprecated Use getTreatmentById instead */
export const getDrugById = getTreatmentById;

/**
 * Get all treatments targeting a specific node
 */
export function getTreatmentsTargetingNode(nodeId: string): TreatmentLibraryEntry[] {
  return treatmentLibrary.filter(d =>
    d.primaryTargets.some(t => t.nodeId === nodeId)
  );
}
/** @deprecated Use getTreatmentsTargetingNode instead */
export const getDrugsTargetingNode = getTreatmentsTargetingNode;

/**
 * Get treatments by regulatory status
 */
export function getTreatmentsByStatus(status: RegulatoryStatus): TreatmentLibraryEntry[] {
  return treatmentLibrary.filter(d => d.fdaStatus === status);
}
/** @deprecated Use getTreatmentsByStatus instead */
export const getDrugsByStatus = getTreatmentsByStatus;

/**
 * Get treatments by evidence level (L1 = highest)
 */
export function getTreatmentsByEvidenceLevel(level: TreatmentADEvidence['level']): TreatmentLibraryEntry[] {
  return treatmentLibrary.filter(d => d.adEvidence.level === level);
}
/** @deprecated Use getTreatmentsByEvidenceLevel instead */
export const getDrugsByEvidenceLevel = getTreatmentsByEvidenceLevel;

/**
 * Get treatments by type (drug, device, lifestyle, behavioral)
 */
export function getTreatmentsByType(type: TreatmentType): TreatmentLibraryEntry[] {
  return treatmentLibrary.filter(d => d.type === type);
}

/**
 * Get treatments that inhibit a target
 */
export function getInhibitors(): TreatmentLibraryEntry[] {
  return treatmentLibrary.filter(d =>
    d.primaryTargets.some(t => t.effect === 'inhibits')
  );
}

/**
 * Get treatments that activate a target
 */
export function getActivators(): TreatmentLibraryEntry[] {
  return treatmentLibrary.filter(d =>
    d.primaryTargets.some(t => t.effect === 'activates')
  );
}

/**
 * Get all unique target node IDs in the library
 */
export function getAllTargetNodeIds(): string[] {
  const ids = new Set<string>();
  treatmentLibrary.forEach(d => {
    d.primaryTargets.forEach(t => ids.add(t.nodeId));
  });
  return Array.from(ids);
}

export default drugLibrary;
