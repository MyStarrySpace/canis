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
    /// Weight for "strongest path" queries: higher = stronger evidence
    pub fn strength_weight(&self) -> f64 {
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
}

impl Default for CausalConfidence {
    fn default() -> Self {
        CausalConfidence::L7
    }
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

/// Complete layout result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LayoutResult {
    pub nodes: Vec<NodePosition>,
    pub ghost_nodes: Vec<GhostNode>,
    pub edges: Vec<EdgeRoute>,
    pub bounds: Bounds,
    pub stats: LayoutStats,
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
