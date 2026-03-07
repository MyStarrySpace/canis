use std::collections::HashMap;

use crate::graph::AdGraph;
use crate::types::{CommunityResult, ModuleConnectivity};

/// Label propagation community detection.
pub fn label_propagation(graph: &AdGraph, max_iter: u32) -> CommunityResult {
    let node_ids = graph.node_ids();
    let n = node_ids.len();

    // Initialize: each node in its own community
    let mut labels: HashMap<String, usize> = HashMap::new();
    for (i, id) in node_ids.iter().enumerate() {
        labels.insert(id.clone(), i);
    }

    for _ in 0..max_iter {
        let mut changed = false;

        for id in &node_ids {
            // Count labels among neighbors (both directions for undirected community detection)
            let mut label_counts: HashMap<usize, usize> = HashMap::new();

            for succ in graph.successors(id) {
                if let Some(&label) = labels.get(&succ) {
                    *label_counts.entry(label).or_insert(0) += 1;
                }
            }
            for pred in graph.predecessors(id) {
                if let Some(&label) = labels.get(&pred) {
                    *label_counts.entry(label).or_insert(0) += 1;
                }
            }

            if label_counts.is_empty() {
                continue;
            }

            // Pick the most common label
            let best_label = label_counts
                .iter()
                .max_by_key(|(_, count)| **count)
                .map(|(label, _)| *label)
                .unwrap();

            if labels[id] != best_label {
                labels.insert(id.clone(), best_label);
                changed = true;
            }
        }

        if !changed {
            break;
        }
    }

    // Group nodes by label
    let mut community_map: HashMap<usize, Vec<String>> = HashMap::new();
    for (id, label) in &labels {
        community_map.entry(*label).or_default().push(id.clone());
    }

    let communities: Vec<Vec<String>> = community_map.into_values().collect();

    // Compute modularity
    let modularity = compute_modularity(graph, &labels, n);

    CommunityResult {
        communities,
        modularity,
    }
}

/// Compute modularity Q for the given partition.
fn compute_modularity(graph: &AdGraph, labels: &HashMap<String, usize>, _n: usize) -> f64 {
    let m = graph.edge_count() as f64;
    if m == 0.0 {
        return 0.0;
    }

    let mut q: f64 = 0.0;

    let node_ids = graph.node_ids();

    // Precompute degrees
    let mut out_deg: HashMap<String, f64> = HashMap::new();
    let mut in_deg: HashMap<String, f64> = HashMap::new();
    for id in &node_ids {
        out_deg.insert(id.clone(), graph.successors(id).len() as f64);
        in_deg.insert(id.clone(), graph.predecessors(id).len() as f64);
    }

    for edge in graph.edges() {
        let src_label = labels.get(&edge.source).unwrap_or(&0);
        let tgt_label = labels.get(&edge.target).unwrap_or(&0);

        if src_label == tgt_label {
            let ki_out = out_deg.get(&edge.source).unwrap_or(&0.0);
            let kj_in = in_deg.get(&edge.target).unwrap_or(&0.0);
            q += 1.0 - (ki_out * kj_in) / m;
        }
    }

    q / m
}

/// Compute module connectivity matrix: count edges between modules.
pub fn module_connectivity(graph: &AdGraph) -> ModuleConnectivity {
    let node_ids = graph.node_ids();

    // Collect unique modules
    let mut module_set: Vec<String> = Vec::new();
    let mut node_module: HashMap<String, String> = HashMap::new();

    for id in &node_ids {
        if let Some(node) = graph.node(id) {
            node_module.insert(id.clone(), node.module_id.clone());
            if !module_set.contains(&node.module_id) {
                module_set.push(node.module_id.clone());
            }
        }
    }
    module_set.sort();

    let mod_idx: HashMap<&str, usize> = module_set
        .iter()
        .enumerate()
        .map(|(i, m)| (m.as_str(), i))
        .collect();

    let nm = module_set.len();
    let mut matrix = vec![vec![0usize; nm]; nm];
    let mut conf_sums = vec![vec![0.0f64; nm]; nm];
    let mut conf_counts = vec![vec![0usize; nm]; nm];

    for edge in graph.edges() {
        let src_mod = node_module.get(&edge.source);
        let tgt_mod = node_module.get(&edge.target);

        if let (Some(sm), Some(tm)) = (src_mod, tgt_mod) {
            if let (Some(&si), Some(&ti)) = (mod_idx.get(sm.as_str()), mod_idx.get(tm.as_str())) {
                matrix[si][ti] += 1;
                conf_sums[si][ti] += edge.causal_confidence.strength_weight();
                conf_counts[si][ti] += 1;
            }
        }
    }

    let avg_confidence: Vec<Vec<String>> = (0..nm)
        .map(|i| {
            (0..nm)
                .map(|j| {
                    if conf_counts[i][j] > 0 {
                        format!("{:.2}", conf_sums[i][j] / conf_counts[i][j] as f64)
                    } else {
                        "0".to_string()
                    }
                })
                .collect()
        })
        .collect();

    ModuleConnectivity {
        matrix,
        avg_confidence,
        modules: module_set,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_label_propagation() {
        let g = AdGraph::from_json(
            r#"{
            "nodes": [
                {"id": "a", "label": "A", "category": "STOCK", "subtype": "Organelle", "moduleId": "M01", "description": "A"},
                {"id": "b", "label": "B", "category": "STATE", "subtype": "MetabolicState", "moduleId": "M01", "description": "B"},
                {"id": "c", "label": "C", "category": "PROCESS", "subtype": "BiologicalProcess", "moduleId": "M02", "description": "C"},
                {"id": "d", "label": "D", "category": "STATE", "subtype": "MetabolicState", "moduleId": "M02", "description": "D"}
            ],
            "edges": [
                {"id": "e1", "source": "a", "target": "b", "relation": "increases", "moduleId": "M01"},
                {"id": "e2", "source": "c", "target": "d", "relation": "increases", "moduleId": "M02"}
            ]
        }"#,
        )
        .unwrap();

        let result = label_propagation(&g, 100);
        // Should find 2 communities: {a,b} and {c,d}
        assert_eq!(result.communities.len(), 2);
    }

    #[test]
    fn test_module_connectivity() {
        let g = AdGraph::from_json(
            r#"{
            "nodes": [
                {"id": "a", "label": "A", "category": "STOCK", "subtype": "Organelle", "moduleId": "M01", "description": "A"},
                {"id": "b", "label": "B", "category": "STATE", "subtype": "MetabolicState", "moduleId": "M02", "description": "B"}
            ],
            "edges": [
                {"id": "e1", "source": "a", "target": "b", "relation": "increases", "moduleId": "M01", "causalConfidence": "L3"}
            ]
        }"#,
        )
        .unwrap();

        let result = module_connectivity(&g);
        assert_eq!(result.modules.len(), 2);
        // Should have 1 edge from M01 to M02
        let m01_idx = result.modules.iter().position(|m| m == "M01").unwrap();
        let m02_idx = result.modules.iter().position(|m| m == "M02").unwrap();
        assert_eq!(result.matrix[m01_idx][m02_idx], 1);
    }
}
