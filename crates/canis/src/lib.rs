pub mod types;
pub mod graph;
pub mod layout;
pub mod analysis;
pub mod export;

use wasm_bindgen::prelude::*;

use crate::analysis::centrality::{betweenness_centrality, closeness_centrality, degree_centrality, pagerank};
use crate::analysis::communities::{label_propagation, module_connectivity};
use crate::analysis::loops::detect_feedback_loops;
use crate::analysis::paths::{all_simple_paths, drug_pathway, filter_by_modules, filter_edges_by_confidence, modules_for_nodes, neighborhood, shortest_path_bfs, shortest_path_dijkstra, strongest_path};
use crate::types::CausalConfidence;
use crate::analysis::robustness::ranked_removal_impact;
use crate::export::csv::to_csv;
use crate::export::gexf::to_gexf;
use crate::export::graphml::to_graphml;
use crate::export::json_graph::to_networkx_json;
use crate::graph::AdGraph;
use crate::layout::sugiyama::layout;
use crate::types::LayoutOptions;

/// The WASM-exported graph engine.
#[wasm_bindgen]
pub struct GraphEngine {
    graph: AdGraph,
}

#[wasm_bindgen]
impl GraphEngine {
    /// Create a new graph engine from JSON data.
    #[wasm_bindgen(constructor)]
    pub fn new(graph_json: &str) -> Result<GraphEngine, JsValue> {
        let graph = AdGraph::from_json(graph_json)
            .map_err(|e| JsValue::from_str(&e))?;
        Ok(GraphEngine { graph })
    }

    /// Replace the graph with new data.
    #[wasm_bindgen(js_name = "updateGraph")]
    pub fn update_graph(&mut self, graph_json: &str) -> Result<(), JsValue> {
        self.graph = AdGraph::from_json(graph_json)
            .map_err(|e| JsValue::from_str(&e))?;
        Ok(())
    }

    /// Get graph stats.
    #[wasm_bindgen(js_name = "stats")]
    pub fn stats(&self) -> String {
        serde_json::json!({
            "nodeCount": self.graph.node_count(),
            "edgeCount": self.graph.edge_count(),
        })
        .to_string()
    }

    // ── Layout ────────────────────────────────────────────────────────────

    /// Run Sugiyama layout on the full graph.
    #[wasm_bindgen(js_name = "layoutSugiyama")]
    pub fn layout_sugiyama(&self, options_json: &str) -> Result<String, JsValue> {
        let opts: LayoutOptions = if options_json.is_empty() {
            LayoutOptions::default()
        } else {
            serde_json::from_str(options_json)
                .map_err(|e| JsValue::from_str(&format!("Invalid layout options: {}", e)))?
        };

        let result = layout(&self.graph, &opts);
        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Run Sugiyama layout on a subgraph.
    #[wasm_bindgen(js_name = "layoutSubgraph")]
    pub fn layout_subgraph(
        &self,
        node_ids_json: &str,
        options_json: &str,
    ) -> Result<String, JsValue> {
        let node_ids: Vec<String> = serde_json::from_str(node_ids_json)
            .map_err(|e| JsValue::from_str(&format!("Invalid node IDs: {}", e)))?;

        let sub = self
            .graph
            .subgraph(&node_ids)
            .map_err(|e| JsValue::from_str(&e))?;

        let opts: LayoutOptions = if options_json.is_empty() {
            LayoutOptions::default()
        } else {
            serde_json::from_str(options_json)
                .map_err(|e| JsValue::from_str(&format!("Invalid layout options: {}", e)))?
        };

        let result = layout(&sub, &opts);
        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    // ── Analysis: Centrality ──────────────────────────────────────────────

    /// Degree centrality for all nodes.
    #[wasm_bindgen(js_name = "degreeCentrality")]
    pub fn degree_centrality_wasm(&self) -> String {
        let results = degree_centrality(&self.graph);
        serde_json::to_string(&results).unwrap_or_default()
    }

    /// Betweenness centrality (Brandes algorithm).
    #[wasm_bindgen(js_name = "betweennessCentrality")]
    pub fn betweenness_centrality_wasm(&self, weighted: bool) -> String {
        let results = betweenness_centrality(&self.graph, weighted);
        serde_json::to_string(&results).unwrap_or_default()
    }

    /// Closeness centrality (harmonic, for disconnected graphs).
    #[wasm_bindgen(js_name = "closenessCentrality")]
    pub fn closeness_centrality_wasm(&self) -> String {
        let results = closeness_centrality(&self.graph);
        serde_json::to_string(&results).unwrap_or_default()
    }

    /// PageRank.
    #[wasm_bindgen(js_name = "pagerank")]
    pub fn pagerank_wasm(&self, damping: f64, max_iter: u32, tolerance: f64) -> String {
        let results = pagerank(&self.graph, damping, max_iter, tolerance);
        serde_json::to_string(&results).unwrap_or_default()
    }

    // ── Analysis: Paths ───────────────────────────────────────────────────

    /// Shortest path (BFS, unweighted).
    #[wasm_bindgen(js_name = "shortestPath")]
    pub fn shortest_path_wasm(&self, from: &str, to: &str) -> String {
        match shortest_path_bfs(&self.graph, from, to) {
            Some(result) => serde_json::to_string(&result).unwrap_or_default(),
            None => "null".to_string(),
        }
    }

    /// Shortest path (Dijkstra, confidence-weighted).
    #[wasm_bindgen(js_name = "shortestPathWeighted")]
    pub fn shortest_path_weighted_wasm(&self, from: &str, to: &str) -> String {
        match shortest_path_dijkstra(&self.graph, from, to) {
            Some(result) => serde_json::to_string(&result).unwrap_or_default(),
            None => "null".to_string(),
        }
    }

    /// Strongest path (maximizes minimum confidence).
    #[wasm_bindgen(js_name = "strongestPath")]
    pub fn strongest_path_wasm(&self, from: &str, to: &str) -> String {
        match strongest_path(&self.graph, from, to) {
            Some(result) => serde_json::to_string(&result).unwrap_or_default(),
            None => "null".to_string(),
        }
    }

    /// All simple paths between two nodes (bounded).
    #[wasm_bindgen(js_name = "allSimplePaths")]
    pub fn all_simple_paths_wasm(&self, from: &str, to: &str, max_depth: usize) -> String {
        let results = all_simple_paths(&self.graph, from, to, max_depth);
        serde_json::to_string(&results).unwrap_or_default()
    }

    /// Neighborhood query (upstream, downstream, bidirectional).
    #[wasm_bindgen(js_name = "neighborhood")]
    pub fn neighborhood_wasm(&self, node_id: &str, max_depth: usize) -> String {
        let result = neighborhood(&self.graph, node_id, max_depth);
        serde_json::to_string(&result).unwrap_or_default()
    }

    /// Drug pathway analysis: BFS from targets to find upstream/downstream.
    #[wasm_bindgen(js_name = "drugPathway")]
    pub fn drug_pathway_wasm(&self, target_ids_json: &str, max_depth: usize) -> Result<String, JsValue> {
        let target_ids: Vec<String> = serde_json::from_str(target_ids_json)
            .map_err(|e| JsValue::from_str(&format!("Invalid target IDs: {}", e)))?;
        let result = drug_pathway(&self.graph, &target_ids, max_depth);
        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Filter nodes by module IDs.
    #[wasm_bindgen(js_name = "filterByModules")]
    pub fn filter_by_modules_wasm(&self, module_ids_json: &str) -> Result<String, JsValue> {
        let module_ids: Vec<String> = serde_json::from_str(module_ids_json)
            .map_err(|e| JsValue::from_str(&format!("Invalid module IDs: {}", e)))?;
        let result = filter_by_modules(&self.graph, &module_ids);
        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Filter edges by minimum causal confidence level.
    #[wasm_bindgen(js_name = "filterEdgesByConfidence")]
    pub fn filter_edges_by_confidence_wasm(&self, min_level: &str) -> Result<String, JsValue> {
        let level: CausalConfidence = serde_json::from_str(&format!("\"{}\"", min_level))
            .map_err(|e| JsValue::from_str(&format!("Invalid confidence level: {}", e)))?;
        let result = filter_edges_by_confidence(&self.graph, &level);
        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Get module IDs for a set of node IDs.
    #[wasm_bindgen(js_name = "modulesForNodes")]
    pub fn modules_for_nodes_wasm(&self, node_ids_json: &str) -> Result<String, JsValue> {
        let node_ids: Vec<String> = serde_json::from_str(node_ids_json)
            .map_err(|e| JsValue::from_str(&format!("Invalid node IDs: {}", e)))?;
        let result = modules_for_nodes(&self.graph, &node_ids);
        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    // ── Analysis: Loops ───────────────────────────────────────────────────

    /// Detect feedback loops.
    #[wasm_bindgen(js_name = "feedbackLoops")]
    pub fn feedback_loops_wasm(&self, max_length: usize) -> String {
        let results = detect_feedback_loops(&self.graph, max_length);
        serde_json::to_string(&results).unwrap_or_default()
    }

    // ── Analysis: Communities ─────────────────────────────────────────────

    /// Community detection via label propagation.
    #[wasm_bindgen(js_name = "detectCommunities")]
    pub fn detect_communities_wasm(&self, max_iter: u32) -> String {
        let result = label_propagation(&self.graph, max_iter);
        serde_json::to_string(&result).unwrap_or_default()
    }

    /// Module connectivity matrix.
    #[wasm_bindgen(js_name = "moduleConnectivity")]
    pub fn module_connectivity_wasm(&self) -> String {
        let result = module_connectivity(&self.graph);
        serde_json::to_string(&result).unwrap_or_default()
    }

    // ── Analysis: Robustness ──────────────────────────────────────────────

    /// Ranked node removal impact.
    #[wasm_bindgen(js_name = "rankedRemovalImpact")]
    pub fn ranked_removal_impact_wasm(&self) -> String {
        let results = ranked_removal_impact(&self.graph);
        serde_json::to_string(&results).unwrap_or_default()
    }

    // ── Export ─────────────────────────────────────────────────────────────

    /// Export as NetworkX JSON.
    #[wasm_bindgen(js_name = "exportNetworkxJson")]
    pub fn export_networkx_json(&self) -> String {
        to_networkx_json(&self.graph)
    }

    /// Export as GraphML XML.
    #[wasm_bindgen(js_name = "exportGraphml")]
    pub fn export_graphml(&self) -> String {
        to_graphml(&self.graph)
    }

    /// Export as GEXF XML.
    #[wasm_bindgen(js_name = "exportGexf")]
    pub fn export_gexf(&self) -> String {
        to_gexf(&self.graph)
    }

    /// Export as CSV (returns JSON with nodes_csv and edges_csv fields).
    #[wasm_bindgen(js_name = "exportCsv")]
    pub fn export_csv(&self) -> String {
        let (nodes, edges) = to_csv(&self.graph);
        serde_json::json!({
            "nodesCsv": nodes,
            "edgesCsv": edges,
        })
        .to_string()
    }
}
