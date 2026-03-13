use serde::{Deserialize, Serialize};

/// Node categories based on Systems Biology Stock-Flow semantics
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum NodeCategory {
    #[serde(rename = "STOCK")]
    Stock,
    #[serde(rename = "STATE")]
    State,
    #[serde(rename = "BOUNDARY")]
    Boundary,
    #[serde(rename = "PROCESS")]
    Process,
}

/// Edge relation types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum EdgeRelation {
    Increases,
    Decreases,
    DirectlyIncreases,
    DirectlyDecreases,
    Regulates,
    Modulates,
    Produces,
    Degrades,
    Binds,
    Transports,
    CausesNoChange,
    Association,
    Catalyzes,
    Traps,
    Protects,
    Disrupts,
    Requires,
    Amplifies,
    Substrateof,
    Inhibits,
}

impl EdgeRelation {
    /// Whether this relation has an inhibitory/decreasing effect
    pub fn is_inhibitory(&self) -> bool {
        matches!(
            self,
            EdgeRelation::Decreases
                | EdgeRelation::DirectlyDecreases
                | EdgeRelation::Degrades
                | EdgeRelation::Traps
                | EdgeRelation::Disrupts
                | EdgeRelation::Inhibits
        )
    }
}

/// Causal confidence levels (L1 = strongest evidence)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum CausalConfidence {
    L1,
    L2,
    L3,
    L4,
    L5,
    L6,
    L7,
}

impl CausalConfidence {
    /// Weight for "strongest path" queries: higher = stronger evidence.
    /// Uses custom weights if provided, otherwise falls back to built-in defaults.
    pub fn strength_weight(&self) -> f64 {
        self.default_strength_weight()
    }

    /// Resolve strength weight using a custom mapping, falling back to defaults.
    pub fn strength_weight_with(
        &self,
        custom: &Option<std::collections::HashMap<String, f64>>,
    ) -> f64 {
        if let Some(map) = custom {
            let key = format!("{:?}", self);
            if let Some(&w) = map.get(&key) {
                return w;
            }
        }
        self.default_strength_weight()
    }

    /// Built-in default strength weights.
    pub fn default_strength_weight(&self) -> f64 {
        match self {
            CausalConfidence::L1 => 1.0,
            CausalConfidence::L2 => 0.85,
            CausalConfidence::L3 => 0.7,
            CausalConfidence::L4 => 0.55,
            CausalConfidence::L5 => 0.4,
            CausalConfidence::L6 => 0.3,
            CausalConfidence::L7 => 0.2,
        }
    }

    /// Weight for "shortest path" queries: lower confidence = higher cost
    pub fn distance_weight(&self) -> f64 {
        1.0 / self.strength_weight()
    }

    /// Distance weight using a custom mapping.
    pub fn distance_weight_with(
        &self,
        custom: &Option<std::collections::HashMap<String, f64>>,
    ) -> f64 {
        1.0 / self.strength_weight_with(custom)
    }
}

impl Default for CausalConfidence {
    fn default() -> Self {
        CausalConfidence::L7
    }
}

// ── Confidence classification scheme ─────────────────────────────────────

/// A single rule in a confidence classification scheme.
/// All specified fields must match for the rule to apply (AND logic).
/// Unspecified (None) fields are ignored (match anything).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfidenceRule {
    /// Method types that trigger this rule (case-insensitive, OR within list).
    /// e.g. ["RCT", "rct", "clinical_trial"]
    #[serde(default)]
    pub method_types: Vec<String>,
    /// If true, edge must have a PMID to match this rule.
    #[serde(default)]
    pub requires_pmid: Option<bool>,
    /// If set, edge's existing confidence must be at or above this level.
    #[serde(default)]
    pub min_existing_confidence: Option<CausalConfidence>,
    /// The confidence level to assign when this rule matches.
    pub confidence: CausalConfidence,
}

/// A named confidence classification scheme.
/// Rules are evaluated in order — first match wins.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfidenceScheme {
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    /// Ordered rules. First matching rule determines the confidence level.
    pub rules: Vec<ConfidenceRule>,
    /// Default confidence when no rule matches. Defaults to L7.
    #[serde(default)]
    pub default_confidence: CausalConfidence,
}

impl ConfidenceScheme {
    /// Classify an edge using this scheme. Returns the assigned confidence level.
    pub fn classify(&self, edge: &SbsfEdge) -> CausalConfidence {
        let method = edge
            .method_type
            .as_deref()
            .unwrap_or("")
            .to_lowercase();

        for rule in &self.rules {
            // Check method_types (OR — any match suffices; empty = match all)
            let method_ok = rule.method_types.is_empty()
                || rule
                    .method_types
                    .iter()
                    .any(|m| m.to_lowercase() == method);

            if !method_ok {
                continue;
            }

            // Check requires_pmid
            if let Some(req) = rule.requires_pmid {
                let has_pmid = edge.pmid.is_some();
                if req != has_pmid {
                    continue;
                }
            }

            // Check min_existing_confidence
            if let Some(ref min_conf) = rule.min_existing_confidence {
                if edge.causal_confidence > *min_conf {
                    continue;
                }
            }

            return rule.confidence.clone();
        }

        self.default_confidence.clone()
    }

    /// The built-in default scheme matching the original hardcoded mapping.
    pub fn default_scheme() -> Self {
        ConfidenceScheme {
            name: "Default".to_string(),
            description: Some(
                "Standard biomedical evidence hierarchy (RCT > MR > GWAS+functional > animal > in vitro > observational > review)"
                    .to_string(),
            ),
            rules: vec![
                ConfidenceRule {
                    method_types: vec![
                        "rct".into(),
                        "RCT".into(),
                        "clinical_trial".into(),
                    ],
                    requires_pmid: None,
                    min_existing_confidence: None,
                    confidence: CausalConfidence::L1,
                },
                ConfidenceRule {
                    method_types: vec![
                        "mendelian_randomization".into(),
                        "MR".into(),
                        "natural_experiment".into(),
                    ],
                    requires_pmid: None,
                    min_existing_confidence: None,
                    confidence: CausalConfidence::L2,
                },
                ConfidenceRule {
                    method_types: vec![
                        "knockout".into(),
                        "GWAS".into(),
                        "transgenic".into(),
                    ],
                    requires_pmid: None,
                    min_existing_confidence: None,
                    confidence: CausalConfidence::L3,
                },
                ConfidenceRule {
                    method_types: vec![
                        "intervention_animal".into(),
                        "animal".into(),
                        "epidemiological".into(),
                        "imaging".into(),
                    ],
                    requires_pmid: None,
                    min_existing_confidence: None,
                    confidence: CausalConfidence::L4,
                },
                ConfidenceRule {
                    method_types: vec![
                        "in_vitro".into(),
                        "intervention_cells".into(),
                        "biochemistry".into(),
                        "cryo_em".into(),
                        "transcriptomics".into(),
                    ],
                    requires_pmid: None,
                    min_existing_confidence: None,
                    confidence: CausalConfidence::L5,
                },
                ConfidenceRule {
                    method_types: vec![
                        "cohort".into(),
                        "observational".into(),
                        "meta_analysis".into(),
                    ],
                    requires_pmid: None,
                    min_existing_confidence: None,
                    confidence: CausalConfidence::L6,
                },
                ConfidenceRule {
                    method_types: vec!["review".into(), "expert_opinion".into()],
                    requires_pmid: None,
                    min_existing_confidence: None,
                    confidence: CausalConfidence::L7,
                },
            ],
            default_confidence: CausalConfidence::L7,
        }
    }
}

/// Effect direction for boundary node variants
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum EffectDirection {
    Protective,
    Neutral,
    Risk,
}

/// A variant of a boundary node (e.g., APOE ε2, ε3, ε4)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BoundaryVariant {
    pub id: String,
    pub node_id: String,
    pub label: String,
    pub effect_direction: EffectDirection,
    pub effect_magnitude: f64,
    #[serde(default)]
    pub effect_description: Option<String>,
    #[serde(default)]
    pub frequency: Option<f64>,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(default)]
    pub is_default: bool,
    #[serde(default)]
    pub pmid: Option<String>,
    #[serde(default)]
    pub odds_ratio: Option<f64>,
    #[serde(default)]
    pub ci_low: Option<f64>,
    #[serde(default)]
    pub ci_high: Option<f64>,
    #[serde(default)]
    pub population: Option<String>,
}

/// A node in the mechanistic framework
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SbsfNode {
    pub id: String,
    pub label: String,
    pub category: NodeCategory,
    pub subtype: String,
    pub module_id: String,
    pub description: String,
    #[serde(default)]
    pub mechanism: Option<String>,
    #[serde(default)]
    pub roles: Vec<String>,
    #[serde(default)]
    pub pmid: Option<String>,
    #[serde(default)]
    pub notes: Option<String>,
    /// Variants for BOUNDARY nodes (e.g., APOE genotypes, age buckets)
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub variants: Vec<BoundaryVariant>,
    /// ID of the default/reference variant
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default_variant: Option<String>,
    // Layout coordinates (set by layout engine)
    #[serde(default)]
    pub x: f64,
    #[serde(default)]
    pub y: f64,
}

/// An edge connecting two nodes
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SbsfEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    pub relation: EdgeRelation,
    pub module_id: String,
    #[serde(default)]
    pub causal_confidence: CausalConfidence,
    #[serde(default)]
    pub mechanism_description: Option<String>,
    #[serde(default)]
    pub key_insight: Option<String>,
    #[serde(default)]
    pub pmid: Option<String>,
    #[serde(default)]
    pub first_author: Option<String>,
    #[serde(default)]
    pub year: Option<u32>,
    #[serde(default)]
    pub method_type: Option<String>,
    #[serde(default)]
    pub notes: Option<String>,
    // Computed from causal_confidence
    #[serde(default = "default_weight")]
    pub weight: f64,
}

fn default_weight() -> f64 {
    1.0
}

/// Module definition
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModuleDef {
    pub id: String,
    pub name: String,
    pub short_name: String,
    pub description: String,
    pub color: String,
}

/// Input format: the complete graph data
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphData {
    pub nodes: Vec<SbsfNode>,
    pub edges: Vec<SbsfEdge>,
    #[serde(default)]
    pub modules: Vec<ModuleDef>,
    /// Custom confidence → strength weight mapping (e.g. {"L1": 1.0, "L2": 0.9, ...}).
    /// When provided, overrides the built-in defaults for all weight computations.
    #[serde(default)]
    pub confidence_weights: Option<std::collections::HashMap<String, f64>>,
    /// Confidence classification scheme. When provided, edges are reclassified
    /// based on their methodType and other metadata using these rules.
    /// If not provided, each edge's existing causalConfidence is used as-is.
    #[serde(default)]
    pub confidence_scheme: Option<ConfidenceScheme>,
}

// ── Layout types ──────────────────────────────────────────────────────────

/// Direction for Sugiyama layout
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Direction {
    TopToBottom,
    LeftToRight,
}

impl Default for Direction {
    fn default() -> Self {
        Direction::TopToBottom
    }
}

/// Layout mode: flat (standard Sugiyama) or hierarchical (spectral clustering + two-level Sugiyama)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LayoutMode {
    Flat,
    Hierarchical,
}

impl Default for LayoutMode {
    fn default() -> Self {
        LayoutMode::Flat
    }
}

/// How to determine the number of clusters in hierarchical layout
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ClusterCountMode {
    /// Auto-detect via eigengap heuristic
    Auto,
    /// Use a fixed number (from cluster_count field)
    Fixed,
    /// Use the number of distinct modules in the graph
    ModuleCount,
}

impl Default for ClusterCountMode {
    fn default() -> Self {
        ClusterCountMode::Auto
    }
}

/// Options for hierarchical clustering layout
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClusterOptions {
    #[serde(default)]
    pub count_mode: ClusterCountMode,
    /// Number of clusters when count_mode = Fixed
    #[serde(default)]
    pub cluster_count: Option<usize>,
    /// Use modules as base clusters instead of spectral analysis
    #[serde(default)]
    pub hybrid_modules: bool,
    /// Padding between cluster bounding boxes (pixels)
    #[serde(default = "default_cluster_padding")]
    pub cluster_padding: f64,
    /// Minimum nodes per cluster; smaller clusters get merged into nearest
    #[serde(default = "default_min_cluster_size")]
    pub min_cluster_size: usize,
    /// Module IDs that should always be placed in their own dedicated cluster,
    /// regardless of the clustering algorithm used. Useful for boundary modules.
    #[serde(default)]
    pub pinned_modules: Vec<String>,
}

fn default_cluster_padding() -> f64 {
    50.0
}

fn default_min_cluster_size() -> usize {
    3
}

impl Default for ClusterOptions {
    fn default() -> Self {
        ClusterOptions {
            count_mode: ClusterCountMode::Auto,
            cluster_count: None,
            hybrid_modules: false,
            cluster_padding: default_cluster_padding(),
            min_cluster_size: default_min_cluster_size(),
            pinned_modules: Vec::new(),
        }
    }
}

/// Options for the Sugiyama layout algorithm
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LayoutOptions {
    #[serde(default = "default_layer_spacing")]
    pub layer_spacing: f64,
    #[serde(default = "default_node_spacing")]
    pub node_spacing: f64,
    #[serde(default)]
    pub direction: Direction,
    #[serde(default = "default_max_iterations")]
    pub max_iterations: u32,
    #[serde(default)]
    pub module_grouping: bool,
    /// When true, reorder nodes within each layer so that children connected
    /// by stronger-weighted edges appear earlier (closer to position 0).
    /// This is applied per-parent after crossing minimization.
    #[serde(default = "default_true")]
    pub strength_ordering: bool,
    /// Flat (default) or Hierarchical (spectral clustering + two-level Sugiyama)
    #[serde(default)]
    pub layout_mode: LayoutMode,
    /// Clustering options for hierarchical layout mode
    #[serde(default)]
    pub cluster_options: Option<ClusterOptions>,
}

fn default_layer_spacing() -> f64 {
    250.0
}
fn default_node_spacing() -> f64 {
    70.0
}
fn default_max_iterations() -> u32 {
    24
}
fn default_true() -> bool {
    true
}

impl Default for LayoutOptions {
    fn default() -> Self {
        LayoutOptions {
            layer_spacing: default_layer_spacing(),
            node_spacing: default_node_spacing(),
            direction: Direction::default(),
            max_iterations: default_max_iterations(),
            module_grouping: false,
            strength_ordering: true,
            layout_mode: LayoutMode::default(),
            cluster_options: None,
        }
    }
}

/// Position of a node after layout
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodePosition {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub layer: usize,
    pub position: usize,
}

/// A ghost node inserted for multi-layer edges
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GhostNode {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub layer: usize,
    pub original_edge_id: String,
}

/// A segment of a routed edge
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EdgeRoute {
    pub from: String,
    pub to: String,
    pub original_edge_id: String,
    pub is_first: bool,
    pub is_last: bool,
}

/// Bounding box
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bounds {
    pub width: f64,
    pub height: f64,
}

/// Statistics about the layout
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LayoutStats {
    pub crossing_count: usize,
    pub layer_count: usize,
    pub ghost_count: usize,
}

/// Module composition within a cluster
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModuleSlice {
    pub module_id: String,
    pub count: usize,
}

/// Information about a cluster in hierarchical layout
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClusterInfo {
    pub id: usize,
    pub node_ids: Vec<String>,
    /// Top-left x of cluster bounding box
    pub x: f64,
    /// Top-left y of cluster bounding box
    pub y: f64,
    pub width: f64,
    pub height: f64,
    /// Modules present in this cluster and how many nodes each contributes
    #[serde(default)]
    pub module_composition: Vec<ModuleSlice>,
}

/// Diagnostics about spectral clustering quality
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClusterDiagnostics {
    /// How k was chosen: "eigengap", "fixed", "module_count", or "module_passthrough"
    pub method: String,
    /// Number of clusters produced
    pub k: usize,
    /// Eigenvalues of the graph Laplacian (first few, sorted ascending)
    #[serde(default)]
    pub eigenvalues: Vec<f64>,
    /// Normalized Mutual Information between spectral clusters and module assignments (0..1)
    /// 1.0 = spectral clusters perfectly match modules, 0.0 = no correlation
    pub module_agreement: f64,
    /// Fraction of cross-cluster edges vs total edges (lower = better separation)
    pub cross_cluster_edge_ratio: f64,
    /// Number of modules that got split across multiple clusters
    pub modules_split: usize,
    /// Number of clusters that contain nodes from multiple modules
    pub mixed_clusters: usize,
}

/// Complete layout result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LayoutResult {
    pub nodes: Vec<NodePosition>,
    pub ghost_nodes: Vec<GhostNode>,
    pub edges: Vec<EdgeRoute>,
    pub bounds: Bounds,
    pub stats: LayoutStats,
    /// Cluster boundaries (non-empty only for hierarchical layout)
    #[serde(default)]
    pub clusters: Vec<ClusterInfo>,
    /// Diagnostics about the clustering (only for hierarchical layout)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cluster_diagnostics: Option<ClusterDiagnostics>,
}

// ── Analysis result types ─────────────────────────────────────────────────

/// Centrality result for a single node
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CentralityResult {
    pub node_id: String,
    pub score: f64,
}

/// Degree info for a node
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DegreeResult {
    pub node_id: String,
    pub in_degree: usize,
    pub out_degree: usize,
    pub total: usize,
    pub normalized: f64,
}

/// Path result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PathResult {
    pub path: Vec<String>,
    pub edges: Vec<String>,
    pub total_weight: f64,
    pub weakest_link: Option<String>,
}

/// Feedback loop
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeedbackLoop {
    pub nodes: Vec<String>,
    pub edges: Vec<String>,
    pub polarity: LoopPolarity,
    pub min_confidence: CausalConfidence,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LoopPolarity {
    Reinforcing,
    Balancing,
}

/// Neighborhood query result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NeighborhoodResult {
    pub upstream: Vec<String>,
    pub downstream: Vec<String>,
    pub bidirectional: Vec<String>,
}

// ── Community detection types ─────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommunityResult {
    pub communities: Vec<Vec<String>>,
    pub modularity: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemovalImpact {
    pub removed: String,
    pub components_before: usize,
    pub components_after: usize,
    pub disconnected_nodes: Vec<String>,
    pub largest_component_size: usize,
}

/// Drug pathway analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DrugPathwayResult {
    /// The drug's direct target nodes
    pub target_nodes: Vec<String>,
    /// Nodes upstream of targets (predecessors within max_depth)
    pub upstream_nodes: Vec<String>,
    /// Nodes downstream of targets (successors within max_depth)
    pub downstream_nodes: Vec<String>,
    /// Edge IDs in the pathway
    pub pathway_edges: Vec<String>,
    /// Module IDs touched by the pathway
    pub affected_modules: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModuleConnectivity {
    pub matrix: Vec<Vec<usize>>,
    pub avg_confidence: Vec<Vec<String>>,
    pub modules: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn make_edge(method: Option<&str>, pmid: Option<&str>, conf: CausalConfidence) -> SbsfEdge {
        SbsfEdge {
            id: "e1".into(),
            source: "a".into(),
            target: "b".into(),
            relation: EdgeRelation::Increases,
            module_id: "M01".into(),
            causal_confidence: conf,
            mechanism_description: None,
            key_insight: None,
            pmid: pmid.map(|s| s.to_string()),
            first_author: None,
            year: None,
            method_type: method.map(|s| s.to_string()),
            notes: None,
            weight: 1.0,
        }
    }

    // ── CausalConfidence weight tests ────────────────────────────────

    #[test]
    fn test_default_strength_weights() {
        assert_eq!(CausalConfidence::L1.strength_weight(), 1.0);
        assert_eq!(CausalConfidence::L4.strength_weight(), 0.55);
        assert_eq!(CausalConfidence::L7.strength_weight(), 0.2);
    }

    #[test]
    fn test_custom_strength_weights() {
        let mut custom = HashMap::new();
        custom.insert("L1".into(), 1.0);
        custom.insert("L4".into(), 0.9);
        custom.insert("L7".into(), 0.01);
        let custom = Some(custom);

        assert_eq!(CausalConfidence::L4.strength_weight_with(&custom), 0.9);
        assert_eq!(CausalConfidence::L7.strength_weight_with(&custom), 0.01);
        // L2 not in custom map → falls back to default
        assert_eq!(CausalConfidence::L2.strength_weight_with(&custom), 0.85);
    }

    #[test]
    fn test_distance_weight_inverse() {
        let w = CausalConfidence::L3.strength_weight();
        let d = CausalConfidence::L3.distance_weight();
        assert!((w * d - 1.0).abs() < 1e-10);
    }

    #[test]
    fn test_custom_distance_weight() {
        let mut custom = HashMap::new();
        custom.insert("L5".into(), 0.5);
        let custom = Some(custom);
        let d = CausalConfidence::L5.distance_weight_with(&custom);
        assert!((d - 2.0).abs() < 1e-10);
    }

    #[test]
    fn test_none_custom_uses_defaults() {
        let none: Option<HashMap<String, f64>> = None;
        assert_eq!(
            CausalConfidence::L3.strength_weight_with(&none),
            CausalConfidence::L3.default_strength_weight()
        );
    }

    // ── ConfidenceScheme classify tests ──────────────────────────────

    #[test]
    fn test_scheme_classifies_by_method_type() {
        let scheme = ConfidenceScheme::default_scheme();
        let edge = make_edge(Some("rct"), None, CausalConfidence::L7);
        assert_eq!(scheme.classify(&edge), CausalConfidence::L1);
    }

    #[test]
    fn test_scheme_case_insensitive() {
        let scheme = ConfidenceScheme::default_scheme();
        let edge = make_edge(Some("RCT"), None, CausalConfidence::L7);
        assert_eq!(scheme.classify(&edge), CausalConfidence::L1);
    }

    #[test]
    fn test_scheme_knockout_maps_l3() {
        let scheme = ConfidenceScheme::default_scheme();
        let edge = make_edge(Some("knockout"), None, CausalConfidence::L7);
        assert_eq!(scheme.classify(&edge), CausalConfidence::L3);
    }

    #[test]
    fn test_scheme_default_for_unknown_method() {
        let scheme = ConfidenceScheme::default_scheme();
        let edge = make_edge(Some("some_unknown_method"), None, CausalConfidence::L3);
        assert_eq!(scheme.classify(&edge), CausalConfidence::L7);
    }

    #[test]
    fn test_scheme_default_for_no_method() {
        let scheme = ConfidenceScheme::default_scheme();
        let edge = make_edge(None, None, CausalConfidence::L3);
        assert_eq!(scheme.classify(&edge), CausalConfidence::L7);
    }

    #[test]
    fn test_scheme_requires_pmid() {
        let scheme = ConfidenceScheme {
            name: "Strict".into(),
            description: None,
            rules: vec![
                ConfidenceRule {
                    method_types: vec!["knockout".into()],
                    requires_pmid: Some(true),
                    min_existing_confidence: None,
                    confidence: CausalConfidence::L2,
                },
                ConfidenceRule {
                    method_types: vec!["knockout".into()],
                    requires_pmid: None,
                    min_existing_confidence: None,
                    confidence: CausalConfidence::L4,
                },
            ],
            default_confidence: CausalConfidence::L7,
        };

        // With PMID → L2
        let with_pmid = make_edge(Some("knockout"), Some("12345"), CausalConfidence::L7);
        assert_eq!(scheme.classify(&with_pmid), CausalConfidence::L2);

        // Without PMID → falls through to second rule → L4
        let no_pmid = make_edge(Some("knockout"), None, CausalConfidence::L7);
        assert_eq!(scheme.classify(&no_pmid), CausalConfidence::L4);
    }

    #[test]
    fn test_scheme_min_existing_confidence() {
        let scheme = ConfidenceScheme {
            name: "Upgrade".into(),
            description: None,
            rules: vec![ConfidenceRule {
                method_types: vec![],
                requires_pmid: None,
                min_existing_confidence: Some(CausalConfidence::L3),
                confidence: CausalConfidence::L2,
            }],
            default_confidence: CausalConfidence::L7,
        };

        // Edge at L3 (≤ L3) → matches → L2
        let strong = make_edge(None, None, CausalConfidence::L3);
        assert_eq!(scheme.classify(&strong), CausalConfidence::L2);

        // Edge at L5 (> L3) → doesn't match → default L7
        let weak = make_edge(None, None, CausalConfidence::L5);
        assert_eq!(scheme.classify(&weak), CausalConfidence::L7);
    }

    #[test]
    fn test_scheme_first_match_wins() {
        let scheme = ConfidenceScheme {
            name: "Ordered".into(),
            description: None,
            rules: vec![
                ConfidenceRule {
                    method_types: vec!["rct".into()],
                    requires_pmid: None,
                    min_existing_confidence: None,
                    confidence: CausalConfidence::L1,
                },
                ConfidenceRule {
                    method_types: vec!["rct".into()],
                    requires_pmid: None,
                    min_existing_confidence: None,
                    confidence: CausalConfidence::L5,
                },
            ],
            default_confidence: CausalConfidence::L7,
        };

        let edge = make_edge(Some("rct"), None, CausalConfidence::L7);
        // First rule should win → L1, not L5
        assert_eq!(scheme.classify(&edge), CausalConfidence::L1);
    }

    #[test]
    fn test_scheme_empty_method_types_matches_all() {
        let scheme = ConfidenceScheme {
            name: "Blanket".into(),
            description: None,
            rules: vec![ConfidenceRule {
                method_types: vec![],
                requires_pmid: Some(true),
                min_existing_confidence: None,
                confidence: CausalConfidence::L3,
            }],
            default_confidence: CausalConfidence::L7,
        };

        // Any method type with PMID → L3
        let edge = make_edge(Some("anything"), Some("99999"), CausalConfidence::L7);
        assert_eq!(scheme.classify(&edge), CausalConfidence::L3);
    }

    // ── Graph integration tests ──────────────────────────────────────

    #[test]
    fn test_graph_applies_scheme_on_construction() {
        let json = r#"{
            "nodes": [
                {"id": "a", "label": "A", "category": "STOCK", "subtype": "X", "moduleId": "M01", "description": "A"},
                {"id": "b", "label": "B", "category": "STOCK", "subtype": "X", "moduleId": "M01", "description": "B"}
            ],
            "edges": [
                {"id": "e1", "source": "a", "target": "b", "relation": "increases", "moduleId": "M01", "causalConfidence": "L7", "methodType": "rct"}
            ],
            "confidenceScheme": {
                "name": "test",
                "rules": [
                    {"methodTypes": ["rct"], "confidence": "L1"}
                ],
                "defaultConfidence": "L7"
            }
        }"#;
        let g = crate::graph::AdGraph::from_json(json).unwrap();
        let edge = g.edge_between("a", "b").unwrap();
        // Even though JSON said L7, scheme reclassified to L1
        assert_eq!(edge.causal_confidence, CausalConfidence::L1);
        assert_eq!(edge.weight, 1.0); // L1 weight
    }

    #[test]
    fn test_graph_custom_weights_with_scheme() {
        let json = r#"{
            "nodes": [
                {"id": "a", "label": "A", "category": "STOCK", "subtype": "X", "moduleId": "M01", "description": "A"},
                {"id": "b", "label": "B", "category": "STOCK", "subtype": "X", "moduleId": "M01", "description": "B"}
            ],
            "edges": [
                {"id": "e1", "source": "a", "target": "b", "relation": "increases", "moduleId": "M01", "methodType": "knockout"}
            ],
            "confidenceScheme": {
                "name": "test",
                "rules": [
                    {"methodTypes": ["knockout"], "confidence": "L3"}
                ],
                "defaultConfidence": "L7"
            },
            "confidenceWeights": {"L3": 0.99}
        }"#;
        let g = crate::graph::AdGraph::from_json(json).unwrap();
        let edge = g.edge_between("a", "b").unwrap();
        assert_eq!(edge.causal_confidence, CausalConfidence::L3);
        assert!((edge.weight - 0.99).abs() < 1e-10);
    }

    #[test]
    fn test_graph_no_scheme_preserves_original() {
        let json = r#"{
            "nodes": [
                {"id": "a", "label": "A", "category": "STOCK", "subtype": "X", "moduleId": "M01", "description": "A"},
                {"id": "b", "label": "B", "category": "STOCK", "subtype": "X", "moduleId": "M01", "description": "B"}
            ],
            "edges": [
                {"id": "e1", "source": "a", "target": "b", "relation": "increases", "moduleId": "M01", "causalConfidence": "L2", "methodType": "rct"}
            ]
        }"#;
        let g = crate::graph::AdGraph::from_json(json).unwrap();
        let edge = g.edge_between("a", "b").unwrap();
        // No scheme → keeps original L2
        assert_eq!(edge.causal_confidence, CausalConfidence::L2);
    }

    #[test]
    fn test_default_scheme_all_method_types() {
        let scheme = ConfidenceScheme::default_scheme();
        let cases = vec![
            ("rct", CausalConfidence::L1),
            ("RCT", CausalConfidence::L1),
            ("mendelian_randomization", CausalConfidence::L2),
            ("knockout", CausalConfidence::L3),
            ("GWAS", CausalConfidence::L3),
            ("intervention_animal", CausalConfidence::L4),
            ("in_vitro", CausalConfidence::L5),
            ("cohort", CausalConfidence::L6),
            ("review", CausalConfidence::L7),
        ];
        for (method, expected) in cases {
            let edge = make_edge(Some(method), None, CausalConfidence::L7);
            assert_eq!(
                scheme.classify(&edge),
                expected,
                "Failed for method type: {}",
                method
            );
        }
    }
}
