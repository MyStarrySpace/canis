/**
 * Systems Biology Stock-Flow (SBSF) Framework Types
 *
 * This framework combines:
 * 1. Donella Meadows' Systems Dynamics - Stock-flow thinking, feedback loops, leverage points
 * 2. BEL (Biological Expression Language) - Causal semantics, entity functions
 * 3. SBGN/SBO - Visual notation standards, entity classification
 * 4. OBO Relation Ontology - Standardized biological relationships
 *
 * Model Performance: ROC ~0.90 for predicting clinical trial failure
 */

// ============================================================================
// NODE TYPES
// ============================================================================

/**
 * Primary node categories following Meadows' systems dynamics (SBSF v2.0)
 *
 * In v2.0, processes are EDGES (verbs), not nodes (nouns).
 * REGULATOR is now an optional role annotation, not a node category.
 */
export type NodeCategory =
  | 'STOCK'      // Accumulations; continuous quantities with units (protein levels, cell counts, plaque burden)
  | 'STATE'      // Categorical/discrete conditions (cell phenotype, compartment integrity, binary states)
  | 'BOUNDARY';  // System boundary condition (gene, drug, clinical outcome)

/**
 * Role annotations for nodes (SBSF v2.0)
 * These describe the functional role a node plays in the system,
 * independent of its structural category.
 *
 * Consolidated from legacy NodeRole - use this for all role annotations.
 */
export type NodeRoleAnnotation =
  | 'REGULATOR'           // Controls rate of other processes (enzymes, receptors, channels)
  | 'BIOMARKER'           // Measurable indicator of disease state
  | 'THERAPEUTIC_TARGET'  // Potential intervention point
  | 'DRUG'                // Pharmacological agent
  // System dynamics roles (from Meadows)
  | 'RATE_LIMITER'        // Bottleneck that limits flow through pathway
  | 'LEVERAGE_POINT'      // High-impact intervention point
  | 'FEEDBACK_HUB';       // Node participating in multiple feedback loops

/**
 * Stock subtypes - things that accumulate
 */
export type StockSubtype =
  // Molecular stocks
  | 'ProteinPool'         // Total protein abundance (any form)
  | 'ActiveProteinPool'   // Active/phosphorylated/bound form specifically
  | 'MetabolitePool'      // Iron, lipids, ATP, ROS, etc.
  | 'RNAPool'             // mRNA, miRNA levels
  | 'ComplexPool'         // Assembled protein complexes (e.g., inflammasome)
  // Cellular stocks
  | 'CellPopulation'      // Count of cells (neurons, microglia, etc.)
  | 'PhenotypePool'       // Count in specific phenotype (LDAM, DAM, M1, M2)
  // Structural stocks
  | 'Aggregate'           // Plaques, tangles, lipid droplets, lipofuscin
  | 'OrganellePool'       // Functional lysosomes, mitochondria
  | 'CompartmentState'    // BBB integrity, lysosomal pH, membrane potential
  // Signal stocks
  | 'CytokineLevel'       // IL-6, TNF-α, IFN-γ concentrations
  | 'CytokineSignal'      // Secreted cytokine (TGF-β1, etc.)
  | 'HormoneLevel'        // Hepcidin, insulin, cortisol
  | 'MetaboliteSignal'    // When metabolite acts as signal
  // Immune stocks
  | 'Autoantibody';       // Self-reactive antibodies (anti-IgLON5, AD autoantibodies)

/**
 * Regulator subtypes - things that control rates
 */
export type RegulatorSubtype =
  // Enzymes
  | 'Kinase'              // Phosphorylation
  | 'Phosphatase'         // Dephosphorylation
  | 'Protease'            // Cleavage (caspases, cathepsins)
  | 'Transferase'         // Transfer groups
  // Receptors
  | 'SurfaceReceptor'     // TLR4, TREM2, cytokine receptors
  | 'NuclearReceptor'     // Steroid receptors, PPARs
  | 'IntracellularSensor' // NLRP3, cGAS-STING
  // Channels/Transporters
  | 'IonChannel'          // Ca2+, K+, Na+ channels
  | 'Transporter'         // DMT1, ferroportin, glucose transporters
  | 'Pump'                // ATP-dependent pumps
  // Transcription factors
  | 'Activator'           // NRF2, TFEB, HIF-1α
  | 'Repressor'           // REST, HDACs
  | 'MasterRegulator';    // PGC-1α, SREBP

// NOTE: ProcessSubtype removed in SBSF v2.0 - processes are now edge labels (mechanism_label)
// Former PROCESS nodes should be reclassified as:
// - Edge labels (mechanism_label field) for transformations
// - STATE nodes for conditions like "NLRP3_primed"
// - STOCK nodes with REGULATOR role for rate-controlling entities

/**
 * State subtypes - qualitative conditions
 */
export type StateSubtype =
  // Activation states
  | 'Phosphorylated'      // Specific residue modifications
  | 'Bound'               // In complex with partner
  | 'NuclearLocalized'    // Translocated to nucleus
  | 'Cleaved'             // Proteolytically processed
  // Cell phenotypes
  | 'M1_Microglial'       // Pro-inflammatory
  | 'M2_Microglial'       // Anti-inflammatory
  | 'LDAM'                // Lipid-droplet accumulating
  | 'DAM'                 // Disease-associated microglia
  | 'Senescent'           // SASP-positive
  | 'A1_Astrocyte'        // Neurotoxic reactive
  // System states
  | 'CompartmentIntegrity'// BBB_intact, lysosomal_pH_normal
  | 'MetabolicState'      // Glycolytic, oxidative
  | 'DiseaseStage'        // Preclinical, MCI, dementia
  | 'Homeostatic'         // Normal function state (capacity, integrity)
  | 'PhysiologicalState'  // Normal physiological function (neuroprotection, etc.)
  | 'SignalingPathway'    // Active signaling state (insulin signaling, etc.)
  // SBSF v2.0: Former PROCESS subtypes migrated to STATE
  | 'BiologicalProcess'   // GO Biological Process (activity state)
  | 'Phagocytosis'        // GO:0006909
  | 'Autophagy'           // GO:0006914
  | 'Mitophagy'           // GO:0000422
  | 'Apoptosis'           // GO:0006915
  | 'Ferroptosis'         // Non-canonical cell death
  | 'Neuroinflammation'   // MESH:D000071618
  | 'Neurodegeneration'   // HP:0002180
  | 'Reaction';           // Specific biochemical reactions

/**
 * Boundary subtypes - system edges
 */
export type BoundarySubtype =
  // Genetic elements (inputs)
  | 'Gene'                // Source of transcription
  | 'GeneticVariant'      // APOE4, TREM2 R47H
  // External exposures
  | 'DietaryIntake'       // Nutrients, xenobiotics
  | 'EnvironmentalAgent'  // Pathogens, toxins
  | 'EnvironmentalExposure' // Chronic stress, pollution
  | 'Excretion'           // Renal, biliary elimination
  // Interventions
  | 'SmallMolecule'       // Drugs, supplements
  | 'Biologic'            // Antibodies, vaccines
  | 'Lifestyle'           // Exercise, diet change, sleep
  | 'LifestyleIntervention' // Specific lifestyle changes (stress reduction, diet)
  | 'DrugIntervention'    // Pharmacological interventions (HRT, insulin)
  // Hormonal signals
  | 'HormoneSignal'       // Estrogen, testosterone, cortisol, thyroid
  // Degradation
  | 'Proteolysis'         // Proteasome, lysosome
  | 'CellDeath'           // Apoptosis, necrosis
  // Clinical measures (outputs)
  | 'Biomarker'           // CSF tau, PET signal
  | 'CognitiveScore'      // MMSE, CDR, ADAS-Cog
  | 'Diagnosis';          // MCI, dementia

/**
 * Boundary direction - determines layout position
 * Input boundaries go on the left, output boundaries on the right
 */
export type BoundaryDirection = 'input' | 'output' | 'bidirectional';

// ============================================================================
// BIOMARKER DETECTION TIMELINE
// ============================================================================

/**
 * Detection method for biomarkers
 */
export type DetectionMethod = 'CSF' | 'Plasma' | 'PET' | 'MRI' | 'Retinal' | 'EEG';

/**
 * ATN+ classification categories (NIA-AA extended)
 * A = Amyloid, T = Tau, N = Neurodegeneration, I = Inflammation, V = Vascular
 */
export type ATNCategory = 'A' | 'T' | 'N' | 'I' | 'V';

/**
 * FDA regulatory status for commercial tests
 */
export type FDATestStatus = 'cleared' | 'pending' | 'none';

/**
 * Commercial test information
 */
export interface CommercialTest {
  name: string;                 // e.g., "PrecivityAD2"
  manufacturer: string;         // e.g., "C2N Diagnostics"
  fdaStatus: FDATestStatus;
}

/**
 * Diagnostic performance metrics
 */
export interface BiomarkerPerformance {
  sensitivity?: number;         // 0-1
  specificity?: number;         // 0-1
  auc?: number;                 // Area under ROC curve, 0-1
  ppv?: number;                 // Positive predictive value, 0-1
  npv?: number;                 // Negative predictive value, 0-1
  citation?: string;            // PMID or DOI for performance data
}

/**
 * Diagnostic cut-off values for quantitative biomarkers
 */
export interface BiomarkerCutoffs {
  negative: number;             // Below this value = negative (rules out disease)
  intermediate?: number;        // Below this value = intermediate (needs workup)
  positive: number;             // Above or equal to this value = positive (confirms disease)
}

/**
 * Detection timeline for biomarkers
 *
 * Captures when a biomarker becomes detectable relative to symptom onset,
 * enabling visualization of the preclinical cascade.
 */
export interface DetectionTimeline {
  /** Years before symptom onset when biomarker becomes abnormal (e.g., 45 for sPDGFRβ) */
  yearsBeforeSymptoms: number;
  /** Primary detection method */
  detectionMethod: DetectionMethod;
  /** Commercial test availability (if any) */
  commercialTest?: CommercialTest;
  /** ATN+ classification category */
  atnCategory?: ATNCategory;
  /** Diagnostic performance metrics */
  performance?: BiomarkerPerformance;
  /** Diagnostic cut-offs for quantitative biomarkers (e.g., pTau217 pg/mL) */
  cutoffs?: BiomarkerCutoffs;
}

export type NodeSubtype = StockSubtype | RegulatorSubtype | StateSubtype | BoundarySubtype;

// ============================================================================
// DISCRIMINATED UNIONS FOR TYPE SAFETY
// ============================================================================

/**
 * Valid subtype combinations per category.
 * This enforces that you can't put a Kinase subtype on a BOUNDARY node, etc.
 */
export type ValidStockSubtype = StockSubtype | RegulatorSubtype;
export type ValidStateSubtype = StateSubtype;
export type ValidBoundarySubtype = BoundarySubtype;

/**
 * Category-specific node base (for discriminated unions)
 */
interface BaseNode {
  id: string;                 // Unique identifier (lowercase_snake_case)
  label: string;              // Human-readable display name
  moduleId: string;           // Primary module this belongs to
  sharedWith?: string[];      // Other modules that use this node

  // Optional metadata
  references?: OntologyReferences;
  compartment?: Compartment;
  roles?: NodeRoleAnnotation[];
  timescale?: Timescale;
  units?: string;

  // For visualization
  description?: string;
  mechanism?: string;

  // State/modification details
  modifications?: {
    type: string;
    sites?: string[];
    effect?: string;
  }[];
}

/**
 * STOCK node - accumulations with continuous quantities
 */
export interface StockNode extends BaseNode {
  category: 'STOCK';
  subtype: ValidStockSubtype;

  // Stock-specific
  inflows?: string[];
  outflows?: string[];
}

/**
 * STATE node - categorical/discrete conditions
 */
export interface StateNode extends BaseNode {
  category: 'STATE';
  subtype: ValidStateSubtype;
}

/**
 * BOUNDARY node - system inputs/outputs
 */
export interface BoundaryNode extends BaseNode {
  category: 'BOUNDARY';
  subtype: ValidBoundarySubtype;

  // Boundary-specific
  variants?: BoundaryVariant[];
  defaultVariant?: string;
  boundaryDirection?: BoundaryDirection;
}

/**
 * Discriminated union of all node types
 * Use this for strict type checking when creating nodes
 */
export type StrictMechanisticNode = StockNode | StateNode | BoundaryNode;

// ============================================================================
// EDGE/RELATION TYPES (SBSF v2.0)
// ============================================================================

/**
 * Edge types in SBSF v2.0 - structural classification of edges
 *
 * FLOW: Mass-conserving transformation (X → Y, X decreases as Y increases)
 *       Example: tau → pTau (phosphorylation), APP → Aβ (cleavage)
 *
 * TRANSITION: State change of same entity (discrete categorical change)
 *             Example: microglia_homeostatic → microglia_DAM
 *
 * MODULATION: Rate control (source affects rate of target process)
 *             Example: TREM2 --modulates--> phagocytosis
 *
 * INFLUENCE: Indirect/downstream effect (causal but not mechanistically direct)
 *            Example: Aβ_plaque --influences--> cognitive_score
 */
export type EdgeType =
  // Core SBSF types
  | 'FLOW'              // Mass-conserving transformation between stocks
  | 'TRANSITION'        // State change (same entity, different categorical state)
  | 'MODULATION'        // Rate control (regulator affects process rate)
  | 'INFLUENCE'         // Indirect downstream effect
  // Therapeutic evidence types
  | 'INTERVENTION'      // Drug or treatment effect on target
  | 'BIOMARKER_EFFECT'  // Effect on measurable biomarker
  | 'CLINICAL_OUTCOME'  // Effect on clinical endpoint
  | 'ADVERSE_EVENT'     // Safety/toxicity effect
  | 'PHARMACOLOGY'      // Drug mechanism of action
  | 'METABOLIC';        // Drug metabolism pathway

/**
 * Causal relation types
 * - Direct: Physical interaction known
 * - Indirect: Pathway exists, details hidden
 */
export type RelationType =
  // Direct causation
  | 'directlyIncreases'   // => Physical interaction, increases
  | 'directlyDecreases'   // =| Physical interaction, decreases
  // Indirect causation
  | 'increases'           // -> Indirect/pathway, increases
  | 'decreases'           // -| Indirect/pathway, decreases
  // Regulatory
  | 'regulates'           // Direction unknown or context-dependent
  | 'modulates'           // Bidirectional modification
  // Biochemical relationships
  | 'substrateof'         // A is a substrate of enzyme B
  | 'productof'           // A is a product of reaction B
  // No effect (important for negative results)
  | 'causesNoChange'      // A perturbed, B unchanged
  | 'noCorrelation'       // No correlation found
  // Correlative (non-causal)
  | 'positiveCorrelation' // A and B increase/decrease together
  | 'negativeCorrelation' // A increases as B decreases
  | 'association';        // Associated, mechanism unknown

/**
 * Modulation effects - how a state affects an edge's behavior
 */
export type ModulationEffect =
  | 'potentiates'         // Increases edge strength
  | 'attenuates'          // Decreases edge strength
  | 'blocks'              // Prevents edge from acting
  | 'enables'             // Required for edge to act (permissive)
  | 'reverses';           // Flips edge polarity

// ============================================================================
// EVIDENCE & METHODOLOGY
// ============================================================================

/**
 * Method types with causal strength hierarchy
 */
export type MethodType =
  | 'rct'                 // L1 - Human randomized controlled trial
  | 'mr'                  // L2 - Mendelian randomization
  | 'knockout'            // L3 - Genetic knockout
  | 'knockin'             // L3 - Genetic knock-in
  | 'transgenic'          // L3 - Transgenic overexpression
  | 'intervention_animal' // L4 - Drug/compound in animals
  | 'intervention_human'  // L4 - Open-label human study
  | 'intervention_cells'  // L4 - Drug/compound in cell models
  | 'in_vitro'            // L5 - Cell culture, biochemical assays
  | 'ex_vivo'             // L5 - Tissue slices, organoids
  | 'biochemistry'        // L5 - Biochemical/enzymatic assays
  | 'cohort'              // L6 - Prospective cohort
  | 'case_control'        // L6 - Retrospective comparison
  | 'cross_sectional'     // L7 - Single timepoint association
  | 'case_report'         // L7 - Clinical observation
  | 'transcriptomics'     // L5 - RNA-seq, gene expression analysis
  | 'imaging'             // L5 - Neuroimaging, microscopy
  | 'cryo_em'             // L5 - Cryo-electron microscopy
  | 'review'              // N/A - Narrative review (not causal)
  | 'toxicology'          // L-Tox - Poisoning/adverse event
  | 'computational'       // L-Comp - Modeling, prediction
  | 'meta_analysis';      // Varies - Pooled analysis

/**
 * Causal confidence levels (L1 = strongest)
 */
export type CausalConfidence = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7';

/**
 * Species information for translational assessment
 */
export interface SpeciesInfo {
  ncbiTaxon: string;          // e.g., "NCBITaxon:10090"
  commonName: string;         // e.g., "mouse"
  strain?: string;            // e.g., "C57BL/6J"
  model?: string;             // e.g., "5xFAD"
  modelId?: string;           // e.g., "MGI:3693208"
  geneticModification?: string;
  notes?: string;
}

/**
 * Evidence citation
 */
export interface EvidenceCitation {
  pmid?: string;
  doi?: string;
  firstAuthor: string;
  year: number;
  title?: string;             // Paper title (optional for abbreviated citations)
  quote?: string;             // Exact quote from paper
  species?: SpeciesInfo;
  methodType: MethodType;
  methodDetails?: string;
  causalConfidence: CausalConfidence;
}

// ============================================================================
// ONTOLOGY REFERENCES
// ============================================================================

/**
 * External ontology references for interoperability
 */
export interface OntologyReferences {
  gene?: string;              // HGNC ID (e.g., "HGNC:6018")
  protein?: string;           // UniProt ID (e.g., "UniProt:P05231")
  process?: string;           // GO ID (e.g., "GO:0006909")
  disease?: string;           // DOID (e.g., "DOID:10652")
  drug?: string;              // CHEBI (e.g., "CHEBI:75291")
  cellType?: string;          // CL ontology (e.g., "CL:0000129")
  anatomy?: string;           // UBERON (e.g., "UBERON:0000955")
  phenotype?: string;         // HP ontology
  sbo?: string;               // Systems Biology Ontology
}

/**
 * Compartment/location information
 */
export interface Compartment {
  cellType?: string;          // CL ontology or description
  subcellular?: string;       // GO cellular component
  tissue?: string;            // UBERON or description
  region?: string;            // Brain region (hippocampus, cortex, etc.)
}

// ============================================================================
// NODE DEFINITION
// ============================================================================

/**
 * Node roles in the system
 * @deprecated Use NodeRoleAnnotation instead - this alias exists for backwards compatibility
 */
export type NodeRole = NodeRoleAnnotation;

/**
 * Timescale of node dynamics
 */
export type Timescale =
  | 'seconds' | 'minutes' | 'hours' | 'days'
  | 'weeks' | 'months' | 'years' | 'decades';

/**
 * Boundary variant - for genetic/environmental inputs with multiple alleles/values
 * Each variant has its own effect on downstream edges
 */
export interface BoundaryVariant {
  id: string;                   // e.g., "APOE2", "APOE3", "APOE4"
  label: string;                // Human-readable name
  frequency?: number;           // Population frequency (0-1)

  // Effect on downstream edges (relative to reference)
  effectDirection: 'protective' | 'neutral' | 'risk';
  effectMagnitude?: number;     // Fold-change or odds ratio
  effectDescription?: string;   // Brief explanation of the effect

  // Evidence for this variant's effect
  evidence?: {
    pmid?: string;
    oddsRatio?: number;
    confidenceInterval?: [number, number];
    population?: string;        // e.g., "European", "Global"
  }[];

  // Visual styling hints
  color?: string;               // Override color for this variant
}

/**
 * Full node definition
 *
 * For stricter type checking, use StrictMechanisticNode instead.
 * This interface is kept for backwards compatibility.
 */
export interface MechanisticNode {
  id: string;                 // Unique identifier (lowercase_snake_case)
  label: string;              // Human-readable display name
  category: NodeCategory;
  subtype: NodeSubtype;
  moduleId: string;           // Primary module this belongs to
  sharedWith?: string[];      // Other modules that use this node (for cross-module nodes)

  // Optional metadata
  references?: OntologyReferences;
  compartment?: Compartment;
  roles?: NodeRoleAnnotation[];  // Use NodeRoleAnnotation (NodeRole is deprecated alias)
  timescale?: Timescale;
  units?: string;             // e.g., "pg/mL", "ASC specks/cell"

  // For visualization
  description?: string;       // Brief explanation
  mechanism?: string;         // Longer mechanistic description

  // Stock-specific
  inflows?: string[];         // IDs of edges flowing into this stock
  outflows?: string[];        // IDs of edges flowing out of this stock

  // State/modification details
  modifications?: {
    type: string;             // e.g., "phosphorylation"
    sites?: string[];         // e.g., ["S396", "S404"]
    effect?: string;
  }[];

  // Boundary-specific: variants with different effects
  variants?: BoundaryVariant[];
  defaultVariant?: string;    // ID of the default/reference variant

  // Boundary-specific: direction for layout positioning
  boundaryDirection?: BoundaryDirection;  // 'input' = left, 'output' = right

  // Biomarker-specific: detection timeline
  detectionTimeline?: DetectionTimeline;  // When biomarker becomes detectable
}

// ============================================================================
// EDGE DEFINITION
// ============================================================================

/**
 * Edge modulation by a state node
 */
export interface EdgeModulation {
  modulator: string;          // Node ID of the state that modifies this edge
  effect: ModulationEffect;
  quantitative?: number;      // Fold-change in edge strength
  mechanism?: string;
  evidence?: string;          // PMID
}

/**
 * Quantitative edge parameters (optional, when available)
 */
export interface QuantitativeData {
  // Kinetic parameters
  km?: number;                // μM - substrate concentration at half-max
  vmax?: number;              // μmol/min - maximum reaction rate
  kcat?: number;              // s⁻¹ - catalytic rate constant
  ki?: number;                // μM - inhibition constant
  kd?: number;                // nM - dissociation constant
  ic50?: number;              // nM - half-maximal inhibitory concentration
  ec50?: number;              // nM - half-maximal effective concentration
  hillCoefficient?: number;

  // Correlation data
  correlationCoefficient?: number;
  correlationType?: 'pearson' | 'spearman' | 'partial';
  pValue?: number;
  sampleSize?: number;

  // Effect size
  foldChange?: number;
  direction?: 'increase' | 'decrease';
  confidenceInterval?: [number, number];
}

/**
 * Full edge definition (SBSF v2.0)
 */
export interface MechanisticEdge {
  id: string;                 // Unique identifier (e.g., "E04.001")
  source: string;             // Source node ID (lowercase_snake_case)
  target: string;             // Target node ID (lowercase_snake_case)
  relation: RelationType;
  moduleId: string;           // Which module this belongs to

  // SBSF v2.0: Edge type classification
  edgeType?: EdgeType;        // FLOW, TRANSITION, MODULATION, or INFLUENCE
                              // If not set, can be derived from relation + node types

  // Mechanism details (in v2.0, mechanism_label replaces PROCESS nodes)
  mechanismLabel?: string;    // The process name (what was formerly a PROCESS node)
  mechanismDescription?: string;

  // Temporal dynamics - how fast does this edge act?
  timescale?: Timescale;      // How long does this process take? (seconds, minutes, hours, etc.)
  timeLag?: Timescale;        // Delay before effect is observable

  // Evidence
  evidence: EvidenceCitation[];
  causalConfidence: CausalConfidence; // Summary confidence

  // Cross-module connections
  crossModule?: string;       // e.g., "Input from Module 3"
  sharedWith?: string[];      // Module IDs this edge is shared with

  // Intervention timing
  interventionWindow?: 'prevention' | 'early' | 'late' | 'management';

  // Optional annotations
  modulations?: EdgeModulation[];
  quantitative?: QuantitativeData;

  // For visualization
  keyInsight?: string;        // Important takeaway
  therapeuticImplication?: string;
  translationalGap?: string;  // e.g., "Mouse-only evidence"
}

// ============================================================================
// MODULE DEFINITION
// ============================================================================

/**
 * Module metadata
 */
export interface MechanisticModule {
  id: string;                 // e.g., "M01", "M02"
  name: string;               // e.g., "Insulin/mTOR/Autophagy Axis"
  shortName: string;          // e.g., "mTOR/Autophagy"
  description: string;

  // Overview
  overview?: string;          // Longer description of module function
  keyFindings?: string[];     // Bullet points of key discoveries
  paradigmShifts?: {
    year: number;
    discovery: string;
    pmid?: string;
  }[];

  // Connections to other modules
  upstreamModules?: string[]; // Module IDs that feed into this one
  downstreamModules?: string[];

  // Key papers for this module
  landmarkPapers?: {
    pmid: string;
    discovery: string;
  }[];

  // Therapeutic implications
  therapeuticTargets?: string[];  // Node IDs
  interventionWindow?: 'prevention' | 'early_treatment' | 'treatment' | 'management';

  // For visualization
  color?: string;             // Module color for network viz
  icon?: string;              // Lucide icon name
}

// ============================================================================
// FEEDBACK LOOPS
// ============================================================================

/**
 * Loop polarity
 */
export type LoopType = 'reinforcing' | 'balancing';

/**
 * Feedback loop definition
 */
export interface FeedbackLoop {
  id: string;                 // e.g., "loop_mTORC1_S6K1_IRS1"
  name: string;               // Human-readable name
  type: LoopType;
  description: string;

  // Edges in the loop (in order)
  edgeIds: string[];

  // Clinical significance
  clinicalImplication?: string;
  interventionPoints?: string[];  // Node IDs where loop can be broken

  // Which module(s) this spans
  moduleIds: string[];
}

// ============================================================================
// COMPLETE FRAMEWORK
// ============================================================================

/**
 * The complete mechanistic framework
 */
export interface MechanisticFramework {
  version: string;            // e.g., "1.0.0"
  lastUpdated: string;        // ISO date

  // Model performance
  performance: {
    rocAuc: number;           // ~0.90
    description: string;
  };

  // All modules
  modules: MechanisticModule[];

  // All nodes and edges
  nodes: MechanisticNode[];
  edges: MechanisticEdge[];

  // Feedback loops
  feedbackLoops: FeedbackLoop[];

  // System boundaries
  inputBoundaries: string[];  // Node IDs
  outputBoundaries: string[];
}

// ============================================================================
// VISUALIZATION HELPERS
// ============================================================================

/**
 * Node shape for visualization (based on node category) - SBSF v2.0
 */
export const NODE_SHAPES: Record<NodeCategory, string> = {
  STOCK: 'rectangle',         // Container shape (with units displayed)
  STATE: 'hexagon',           // Hexagon for categorical states
  BOUNDARY: 'cloud',          // Cloud or half-circle for system edges
};

/**
 * Default colors for node categories - SBSF v2.0
 */
export const NODE_CATEGORY_COLORS: Record<NodeCategory, string> = {
  STOCK: '#486393',           // Blue
  STATE: '#a78bfa',           // Purple
  BOUNDARY: '#787473',        // Gray
};

/**
 * Colors for node role annotations (overlay on category color)
 */
export const NODE_ROLE_COLORS: Record<NodeRoleAnnotation, string> = {
  REGULATOR: '#e36216',       // Orange - rate controllers
  BIOMARKER: '#34d399',       // Green - measurable indicators
  THERAPEUTIC_TARGET: '#C9461D', // Red-orange - intervention points
  DRUG: '#5a8a6e',            // Sage green - pharmacological agents
  RATE_LIMITER: '#C3577F',    // Rose - bottlenecks
  LEVERAGE_POINT: '#007385',  // Teal - high-impact points
  FEEDBACK_HUB: '#a78bfa',    // Purple - loop participants
};

/**
 * Colors for edge types - SBSF v2.0
 */
export const EDGE_TYPE_COLORS: Record<EdgeType, string> = {
  // Core SBSF types
  FLOW: '#486393',            // Blue - mass transfer
  TRANSITION: '#a78bfa',      // Purple - state changes
  MODULATION: '#e36216',      // Orange - rate control
  INFLUENCE: '#787473',       // Gray - indirect effects
  // Therapeutic evidence types
  INTERVENTION: '#5a8a6e',    // Sage green - drug effects
  BIOMARKER_EFFECT: '#34d399', // Green - measurable outcomes
  CLINICAL_OUTCOME: '#007385', // Teal - clinical endpoints
  ADVERSE_EVENT: '#c75146',   // Brick red - safety/toxicity
  PHARMACOLOGY: '#C3577F',    // Rose - drug mechanisms
  METABOLIC: '#fbbf24',       // Yellow - metabolism
};

/**
 * Colors for modules (for network visualization)
 */
export const MODULE_COLORS: Record<string, string> = {
  M01: '#486393',   // Insulin/mTOR - Blue
  M02: '#007385',   // Lysosomal - Teal
  M03: '#60a5fa',   // Mitochondrial - Light blue
  M04: '#C9461D',   // Inflammasome - Orange-red
  M05: '#f472b6',   // Microglial - Pink
  M06: '#8ecae6',   // Amyloid - Sky blue
  M07: '#a78bfa',   // Tau - Purple
  M08: '#34d399',   // Complement - Green
  M09: '#fbbf24',   // Iron/Ferroptosis - Yellow
  M10: '#C3577F',   // APOE4/REST - Rose
  M11: '#7ED3FF',   // TREM2/DAM - Light cyan
  M12: '#FFA380',   // BBB/Glymphatic - Coral
  M13: '#787473',   // Cholinergic - Gray
  M14: '#E5AF19',   // MAM/Calcium - Gold
  M15: '#c75146',   // Interventions - Brick red
  M16: '#5a8a6e',   // Sex/Ancestry - Sage green
  M17: '#9B59B6',   // Immunomodulatory - Purple (complementary)
  M18: '#DDA0DD',   // Endfoot Integrity - Plum (suggests astrocytes)
  M19: '#FF6B6B',   // Post-Infectious - Coral red (alert/warning color)
  M20: '#E91E63',   // Hormones - Pink (estrogen association)
};

// ============================================================================
// EDGE TYPE DERIVATION
// ============================================================================

/**
 * Regulator subtypes that indicate MODULATION edges
 */
const REGULATOR_SUBTYPES: NodeSubtype[] = [
  'Kinase', 'Phosphatase', 'Protease', 'Transferase',
  'SurfaceReceptor', 'NuclearReceptor', 'IntracellularSensor',
  'IonChannel', 'Transporter', 'Pump',
  'Activator', 'Repressor', 'MasterRegulator',
];

/**
 * Derive EdgeType from relation type and node information.
 *
 * Rules:
 * - FLOW: relation is 'substrateof' or 'productof' (mass transfer)
 * - TRANSITION: same entity changing state (inferred from node IDs sharing prefix)
 * - MODULATION: source has REGULATOR role or is a Kinase/Phosphatase/etc.
 * - INFLUENCE: default for indirect causal relationships
 *
 * @param edge - The edge to classify
 * @param sourceNode - The source node (optional, for better classification)
 * @param targetNode - The target node (optional, for better classification)
 * @returns The derived EdgeType
 */
export function deriveEdgeType(
  edge: MechanisticEdge,
  sourceNode?: MechanisticNode,
  targetNode?: MechanisticNode
): EdgeType {
  // If explicitly set, use that
  if (edge.edgeType) {
    return edge.edgeType;
  }

  // FLOW: substrate/product relationships (mass-conserving)
  if (edge.relation === 'substrateof' || edge.relation === 'productof') {
    return 'FLOW';
  }

  // TRANSITION: same entity changing state
  // Heuristic: IDs share a common prefix (e.g., 'tfeb_phosphorylated' → 'tfeb_nuclear')
  const sourceBase = edge.source.split('_')[0];
  const targetBase = edge.target.split('_')[0];
  if (sourceBase === targetBase && sourceBase.length > 2) {
    return 'TRANSITION';
  }

  // MODULATION: source is a regulator
  if (sourceNode) {
    // Check if source has REGULATOR role
    if (sourceNode.roles?.includes('REGULATOR')) {
      return 'MODULATION';
    }
    // Check if source has a regulator subtype
    if (REGULATOR_SUBTYPES.includes(sourceNode.subtype)) {
      return 'MODULATION';
    }
  }

  // MODULATION: direct physical interactions that control rates
  if (edge.relation === 'directlyIncreases' || edge.relation === 'directlyDecreases') {
    // If it's a direct effect on a process/state, it's modulation
    if (targetNode?.category === 'STATE') {
      return 'MODULATION';
    }
  }

  // Default: INFLUENCE (indirect downstream effects)
  return 'INFLUENCE';
}

/**
 * Get edge type with derivation fallback.
 * Use this when you need an EdgeType and want automatic derivation.
 */
export function getEdgeType(
  edge: MechanisticEdge,
  sourceNode?: MechanisticNode,
  targetNode?: MechanisticNode
): EdgeType {
  return edge.edgeType ?? deriveEdgeType(edge, sourceNode, targetNode);
}

/**
 * Timescale hierarchy for comparison
 */
export const TIMESCALE_ORDER: Record<Timescale, number> = {
  seconds: 1,
  minutes: 2,
  hours: 3,
  days: 4,
  weeks: 5,
  months: 6,
  years: 7,
  decades: 8,
};

/**
 * Compare two timescales
 * @returns negative if a < b, 0 if equal, positive if a > b
 */
export function compareTimescales(a: Timescale, b: Timescale): number {
  return TIMESCALE_ORDER[a] - TIMESCALE_ORDER[b];
}
