use std::collections::HashMap;

use petgraph::graph::{DiGraph, NodeIndex};

use crate::types::{GraphData, SbsfEdge, SbsfNode};

/// The core graph structure wrapping petgraph
pub struct AdGraph {
    pub graph: DiGraph<SbsfNode, SbsfEdge>,
    pub id_to_index: HashMap<String, NodeIndex>,
    pub index_to_id: HashMap<NodeIndex, String>,
    /// Custom confidence → strength weight mapping.
    /// When present, all weight lookups use this instead of built-in defaults.
    pub confidence_weights: Option<HashMap<String, f64>>,
}

impl AdGraph {
    /// Construct from JSON string
    pub fn from_json(json: &str) -> Result<Self, String> {
        let data: GraphData =
            serde_json::from_str(json).map_err(|e| format!("JSON parse error: {}", e))?;
        Self::from_data(data)
    }

    /// Construct from parsed data
    pub fn from_data(data: GraphData) -> Result<Self, String> {
        let mut graph = DiGraph::new();
        let mut id_to_index = HashMap::new();
        let mut index_to_id = HashMap::new();
        let custom_weights = data.confidence_weights.clone();
        let scheme = data.confidence_scheme.as_ref();

        // Add all nodes
        for node in &data.nodes {
            let idx = graph.add_node(node.clone());
            id_to_index.insert(node.id.clone(), idx);
            index_to_id.insert(idx, node.id.clone());
        }

        // Add all edges, computing weight from causal_confidence
        // (reclassifies via scheme if provided, then uses custom weights)
        for mut edge in data.edges {
            let source_idx = id_to_index
                .get(&edge.source)
                .ok_or_else(|| format!("Edge {} references unknown source: {}", edge.id, edge.source))?;
            let target_idx = id_to_index
                .get(&edge.target)
                .ok_or_else(|| format!("Edge {} references unknown target: {}", edge.id, edge.target))?;

            // Reclassify confidence if a scheme is provided
            if let Some(s) = scheme {
                edge.causal_confidence = s.classify(&edge);
            }
            edge.weight = edge.causal_confidence.strength_weight_with(&custom_weights);
            graph.add_edge(*source_idx, *target_idx, edge);
        }

        Ok(AdGraph {
            graph,
            id_to_index,
            index_to_id,
            confidence_weights: custom_weights,
        })
    }

    /// Number of nodes
    pub fn node_count(&self) -> usize {
        self.graph.node_count()
    }

    /// Number of edges
    pub fn edge_count(&self) -> usize {
        self.graph.edge_count()
    }

    /// Get node index by id
    pub fn node_index(&self, id: &str) -> Option<NodeIndex> {
        self.id_to_index.get(id).copied()
    }

    /// Get node by id
    pub fn node(&self, id: &str) -> Option<&SbsfNode> {
        self.id_to_index
            .get(id)
            .and_then(|idx| self.graph.node_weight(*idx))
    }

    /// Get all node ids
    pub fn node_ids(&self) -> Vec<String> {
        self.id_to_index.keys().cloned().collect()
    }

    /// Get outgoing neighbor ids for a node
    pub fn successors(&self, id: &str) -> Vec<String> {
        self.id_to_index
            .get(id)
            .map(|idx| {
                self.graph
                    .neighbors_directed(*idx, petgraph::Direction::Outgoing)
                    .filter_map(|n| self.index_to_id.get(&n).cloned())
                    .collect()
            })
            .unwrap_or_default()
    }

    /// Get incoming neighbor ids for a node
    pub fn predecessors(&self, id: &str) -> Vec<String> {
        self.id_to_index
            .get(id)
            .map(|idx| {
                self.graph
                    .neighbors_directed(*idx, petgraph::Direction::Incoming)
                    .filter_map(|n| self.index_to_id.get(&n).cloned())
                    .collect()
            })
            .unwrap_or_default()
    }

    /// Get the edge data between two nodes
    pub fn edge_between(&self, source_id: &str, target_id: &str) -> Option<&SbsfEdge> {
        let src = self.id_to_index.get(source_id)?;
        let tgt = self.id_to_index.get(target_id)?;
        self.graph.find_edge(*src, *tgt).and_then(|e| self.graph.edge_weight(e))
    }

    /// Get all edges as references
    pub fn edges(&self) -> Vec<&SbsfEdge> {
        self.graph
            .edge_indices()
            .filter_map(|e| self.graph.edge_weight(e))
            .collect()
    }

    /// Build a subgraph from a set of node ids
    pub fn subgraph(&self, node_ids: &[String]) -> Result<AdGraph, String> {
        let id_set: std::collections::HashSet<&str> =
            node_ids.iter().map(|s| s.as_str()).collect();

        let nodes: Vec<SbsfNode> = node_ids
            .iter()
            .filter_map(|id| self.node(id).cloned())
            .collect();

        let edges: Vec<SbsfEdge> = self
            .edges()
            .into_iter()
            .filter(|e| id_set.contains(e.source.as_str()) && id_set.contains(e.target.as_str()))
            .cloned()
            .collect();

        AdGraph::from_data(GraphData {
            nodes,
            edges,
            modules: vec![],
            confidence_weights: self.confidence_weights.clone(),
            confidence_scheme: None, // already classified, don't re-apply
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_json() -> &'static str {
        r#"{
            "nodes": [
                {"id": "a", "label": "A", "category": "STOCK", "subtype": "Organelle", "moduleId": "M01", "description": "Node A"},
                {"id": "b", "label": "B", "category": "STATE", "subtype": "MetabolicState", "moduleId": "M01", "description": "Node B"},
                {"id": "c", "label": "C", "category": "PROCESS", "subtype": "BiologicalProcess", "moduleId": "M02", "description": "Node C"}
            ],
            "edges": [
                {"id": "e1", "source": "a", "target": "b", "relation": "increases", "moduleId": "M01", "causalConfidence": "L3"},
                {"id": "e2", "source": "b", "target": "c", "relation": "decreases", "moduleId": "M01", "causalConfidence": "L5"}
            ]
        }"#
    }

    #[test]
    fn test_from_json() {
        let g = AdGraph::from_json(sample_json()).unwrap();
        assert_eq!(g.node_count(), 3);
        assert_eq!(g.edge_count(), 2);
    }

    #[test]
    fn test_neighbors() {
        let g = AdGraph::from_json(sample_json()).unwrap();
        assert_eq!(g.successors("a"), vec!["b"]);
        assert_eq!(g.predecessors("b"), vec!["a"]);
    }

    #[test]
    fn test_subgraph() {
        let g = AdGraph::from_json(sample_json()).unwrap();
        let sub = g.subgraph(&["a".into(), "b".into()]).unwrap();
        assert_eq!(sub.node_count(), 2);
        assert_eq!(sub.edge_count(), 1);
    }

    #[test]
    fn test_invalid_edge_source() {
        let json = r#"{
            "nodes": [{"id": "a", "label": "A", "category": "STOCK", "subtype": "Organelle", "moduleId": "M01", "description": "A"}],
            "edges": [{"id": "e1", "source": "missing", "target": "a", "relation": "increases", "moduleId": "M01"}]
        }"#;
        assert!(AdGraph::from_json(json).is_err());
    }
}
