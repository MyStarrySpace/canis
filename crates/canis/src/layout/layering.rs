use std::collections::{HashMap, HashSet, VecDeque};

use crate::graph::AdGraph;

/// Assign layers using longest-path algorithm.
/// Sources (no incoming edges) go to layer 0.
/// All others get max(predecessors' layers) + 1.
///
/// Handles cycles by detecting back-edges via DFS and temporarily ignoring them.
pub fn assign_layers(graph: &AdGraph) -> HashMap<String, usize> {
    let node_ids = graph.node_ids();

    // Detect and remove back-edges to break cycles
    let back_edges = detect_back_edges(graph);

    // Build adjacency without back-edges
    let mut incoming: HashMap<String, Vec<String>> = HashMap::new();
    let mut in_degree: HashMap<String, usize> = HashMap::new();
    for id in &node_ids {
        incoming.insert(id.clone(), Vec::new());
        in_degree.insert(id.clone(), 0);
    }

    for edge in graph.edges() {
        let key = (edge.source.clone(), edge.target.clone());
        if back_edges.contains(&key) {
            continue;
        }
        incoming
            .get_mut(&edge.target)
            .unwrap()
            .push(edge.source.clone());
        *in_degree.get_mut(&edge.target).unwrap() += 1;
    }

    // Topological sort using Kahn's algorithm + longest path
    let mut layers: HashMap<String, usize> = HashMap::new();
    let mut queue: VecDeque<String> = VecDeque::new();

    for id in &node_ids {
        if *in_degree.get(id).unwrap() == 0 {
            queue.push_back(id.clone());
            layers.insert(id.clone(), 0);
        }
    }

    // Build forward adjacency (without back-edges)
    let mut outgoing: HashMap<String, Vec<String>> = HashMap::new();
    for id in &node_ids {
        outgoing.insert(id.clone(), Vec::new());
    }
    for edge in graph.edges() {
        let key = (edge.source.clone(), edge.target.clone());
        if back_edges.contains(&key) {
            continue;
        }
        outgoing
            .get_mut(&edge.source)
            .unwrap()
            .push(edge.target.clone());
    }

    while let Some(node) = queue.pop_front() {
        let node_layer = *layers.get(&node).unwrap_or(&0);
        for target in outgoing.get(&node).unwrap_or(&vec![]) {
            let new_layer = node_layer + 1;
            let current = layers.get(target).copied().unwrap_or(0);
            if new_layer > current {
                layers.insert(target.clone(), new_layer);
            }
            let deg = in_degree.get_mut(target).unwrap();
            *deg -= 1;
            if *deg == 0 {
                queue.push_back(target.clone());
            }
        }
    }

    // Any nodes not assigned (isolated or in unbroken cycles) get layer 0
    for id in &node_ids {
        layers.entry(id.clone()).or_insert(0);
    }

    layers
}

/// Detect back-edges using DFS to identify cycles
fn detect_back_edges(graph: &AdGraph) -> HashSet<(String, String)> {
    let node_ids = graph.node_ids();
    let mut visited: HashSet<String> = HashSet::new();
    let mut in_stack: HashSet<String> = HashSet::new();
    let mut back_edges: HashSet<(String, String)> = HashSet::new();

    for start in &node_ids {
        if !visited.contains(start) {
            dfs_back_edges(graph, start, &mut visited, &mut in_stack, &mut back_edges);
        }
    }

    back_edges
}

fn dfs_back_edges(
    graph: &AdGraph,
    node: &str,
    visited: &mut HashSet<String>,
    in_stack: &mut HashSet<String>,
    back_edges: &mut HashSet<(String, String)>,
) {
    visited.insert(node.to_string());
    in_stack.insert(node.to_string());

    for succ in graph.successors(node) {
        if !visited.contains(&succ) {
            dfs_back_edges(graph, &succ, visited, in_stack, back_edges);
        } else if in_stack.contains(&succ) {
            back_edges.insert((node.to_string(), succ));
        }
    }

    in_stack.remove(node);
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_graph(json: &str) -> AdGraph {
        AdGraph::from_json(json).unwrap()
    }

    #[test]
    fn test_linear_layering() {
        let g = make_graph(
            r#"{
            "nodes": [
                {"id": "a", "label": "A", "category": "STOCK", "subtype": "Organelle", "moduleId": "M01", "description": "A"},
                {"id": "b", "label": "B", "category": "STOCK", "subtype": "Organelle", "moduleId": "M01", "description": "B"},
                {"id": "c", "label": "C", "category": "STOCK", "subtype": "Organelle", "moduleId": "M01", "description": "C"}
            ],
            "edges": [
                {"id": "e1", "source": "a", "target": "b", "relation": "increases", "moduleId": "M01"},
                {"id": "e2", "source": "b", "target": "c", "relation": "increases", "moduleId": "M01"}
            ]
        }"#,
        );
        let layers = assign_layers(&g);
        assert_eq!(layers["a"], 0);
        assert_eq!(layers["b"], 1);
        assert_eq!(layers["c"], 2);
    }

    #[test]
    fn test_cycle_handling() {
        let g = make_graph(
            r#"{
            "nodes": [
                {"id": "a", "label": "A", "category": "STOCK", "subtype": "Organelle", "moduleId": "M01", "description": "A"},
                {"id": "b", "label": "B", "category": "STOCK", "subtype": "Organelle", "moduleId": "M01", "description": "B"}
            ],
            "edges": [
                {"id": "e1", "source": "a", "target": "b", "relation": "increases", "moduleId": "M01"},
                {"id": "e2", "source": "b", "target": "a", "relation": "increases", "moduleId": "M01"}
            ]
        }"#,
        );
        let layers = assign_layers(&g);
        // Both should get valid layers (one of the cycle edges is broken)
        assert!(layers.contains_key("a"));
        assert!(layers.contains_key("b"));
    }
}
