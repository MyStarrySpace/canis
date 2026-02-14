use std::collections::{HashSet, VecDeque};

use crate::graph::AdGraph;
use crate::types::RemovalImpact;

/// Compute impact of removing a single node.
pub fn removal_impact(graph: &AdGraph, node_id: &str) -> RemovalImpact {
    let components_before = count_weakly_connected_components(graph, None);

    let components_after_info = count_weakly_connected_components(graph, Some(node_id));

    // Find disconnected nodes: nodes that were reachable before but not after
    let all_ids: HashSet<String> = graph.node_ids().into_iter().collect();
    let remaining: HashSet<String> = all_ids
        .iter()
        .filter(|id| id.as_str() != node_id)
        .cloned()
        .collect();

    RemovalImpact {
        removed: node_id.to_string(),
        components_before,
        components_after: components_after_info,
        disconnected_nodes: vec![], // Simplified: we track component count change
        largest_component_size: remaining.len().saturating_sub(components_after_info - 1),
    }
}

/// Compute removal impact for all nodes, ranked by impact.
pub fn ranked_removal_impact(graph: &AdGraph) -> Vec<RemovalImpact> {
    let mut results: Vec<RemovalImpact> = graph
        .node_ids()
        .iter()
        .map(|id| removal_impact(graph, id))
        .collect();

    results.sort_by(|a, b| {
        b.components_after
            .cmp(&a.components_after)
            .then(a.largest_component_size.cmp(&b.largest_component_size))
    });

    results
}

/// Count weakly connected components, optionally excluding a node.
fn count_weakly_connected_components(graph: &AdGraph, exclude: Option<&str>) -> usize {
    let node_ids: Vec<String> = graph
        .node_ids()
        .into_iter()
        .filter(|id| exclude.map_or(true, |ex| id != ex))
        .collect();

    let id_set: HashSet<&str> = node_ids.iter().map(|s| s.as_str()).collect();
    let mut visited: HashSet<String> = HashSet::new();
    let mut components = 0;

    for id in &node_ids {
        if visited.contains(id) {
            continue;
        }
        components += 1;
        // BFS in both directions (undirected/weak connectivity)
        let mut queue: VecDeque<String> = VecDeque::new();
        queue.push_back(id.clone());
        visited.insert(id.clone());

        while let Some(node) = queue.pop_front() {
            for succ in graph.successors(&node) {
                if id_set.contains(succ.as_str()) && !visited.contains(&succ) {
                    visited.insert(succ.clone());
                    queue.push_back(succ);
                }
            }
            for pred in graph.predecessors(&node) {
                if id_set.contains(pred.as_str()) && !visited.contains(&pred) {
                    visited.insert(pred.clone());
                    queue.push_back(pred);
                }
            }
        }
    }

    components
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_removal_impact() {
        // Graph: a -> b -> c, with b as a bridge
        let g = AdGraph::from_json(
            r#"{
            "nodes": [
                {"id": "a", "label": "A", "category": "STOCK", "subtype": "Organelle", "moduleId": "M01", "description": "A"},
                {"id": "b", "label": "B", "category": "STATE", "subtype": "MetabolicState", "moduleId": "M01", "description": "B"},
                {"id": "c", "label": "C", "category": "PROCESS", "subtype": "BiologicalProcess", "moduleId": "M01", "description": "C"}
            ],
            "edges": [
                {"id": "e1", "source": "a", "target": "b", "relation": "increases", "moduleId": "M01"},
                {"id": "e2", "source": "b", "target": "c", "relation": "increases", "moduleId": "M01"}
            ]
        }"#,
        )
        .unwrap();

        let impact = removal_impact(&g, "b");
        assert_eq!(impact.components_before, 1); // All connected
        assert_eq!(impact.components_after, 2); // a and c become disconnected
    }
}
