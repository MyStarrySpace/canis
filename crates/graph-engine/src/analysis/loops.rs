use std::collections::HashSet;

use petgraph::algo::tarjan_scc;

use crate::graph::AdGraph;
use crate::types::{CausalConfidence, FeedbackLoop, LoopPolarity};

/// Detect feedback loops using Tarjan's SCC + bounded cycle enumeration.
pub fn detect_feedback_loops(graph: &AdGraph, max_length: usize) -> Vec<FeedbackLoop> {
    let sccs = tarjan_scc(&graph.graph);
    let mut loops: Vec<FeedbackLoop> = Vec::new();

    for scc in &sccs {
        if scc.len() < 2 {
            continue;
        }

        // Get node ids in this SCC
        let scc_ids: HashSet<String> = scc
            .iter()
            .filter_map(|idx| graph.index_to_id.get(idx).cloned())
            .collect();

        // Find cycles within this SCC using bounded DFS
        let cycles = enumerate_cycles_in_scc(graph, &scc_ids, max_length);

        for cycle in cycles {
            let loop_result = classify_cycle(graph, &cycle);
            loops.push(loop_result);
        }
    }

    loops
}

/// Enumerate simple cycles within an SCC, bounded by max_length.
/// Uses a simplified Johnson-like approach.
fn enumerate_cycles_in_scc(
    graph: &AdGraph,
    scc_ids: &HashSet<String>,
    max_length: usize,
) -> Vec<Vec<String>> {
    let mut all_cycles: Vec<Vec<String>> = Vec::new();
    let ids: Vec<String> = scc_ids.iter().cloned().collect();

    for start in &ids {
        let mut path: Vec<String> = vec![start.clone()];
        let mut visited: HashSet<String> = HashSet::new();
        visited.insert(start.clone());

        dfs_cycles(
            graph,
            start,
            start,
            scc_ids,
            max_length,
            &mut path,
            &mut visited,
            &mut all_cycles,
        );
    }

    // Deduplicate cycles (same cycle can be found from different starting nodes)
    deduplicate_cycles(all_cycles)
}

fn dfs_cycles(
    graph: &AdGraph,
    start: &str,
    current: &str,
    scc_ids: &HashSet<String>,
    max_length: usize,
    path: &mut Vec<String>,
    visited: &mut HashSet<String>,
    results: &mut Vec<Vec<String>>,
) {
    if path.len() > max_length {
        return;
    }

    for succ in graph.successors(current) {
        if !scc_ids.contains(&succ) {
            continue;
        }

        if succ == start && path.len() >= 2 {
            results.push(path.clone());
            continue;
        }

        if !visited.contains(&succ) {
            visited.insert(succ.clone());
            path.push(succ.clone());
            dfs_cycles(graph, start, &succ, scc_ids, max_length, path, visited, results);
            path.pop();
            visited.remove(&succ);
        }
    }
}

/// Classify a cycle as reinforcing or balancing based on edge polarity.
fn classify_cycle(graph: &AdGraph, cycle: &[String]) -> FeedbackLoop {
    let mut edges: Vec<String> = Vec::new();
    let mut inhibitory_count = 0;
    let mut min_confidence = CausalConfidence::L1;

    for i in 0..cycle.len() {
        let next = if i + 1 < cycle.len() {
            &cycle[i + 1]
        } else {
            &cycle[0]
        };

        if let Some(edge) = graph.edge_between(&cycle[i], next) {
            edges.push(edge.id.clone());

            if edge.relation.is_inhibitory() {
                inhibitory_count += 1;
            }

            if edge.causal_confidence > min_confidence {
                min_confidence = edge.causal_confidence.clone();
            }
        }
    }

    // Even number of inhibitory edges = reinforcing, odd = balancing
    let polarity = if inhibitory_count % 2 == 0 {
        LoopPolarity::Reinforcing
    } else {
        LoopPolarity::Balancing
    };

    FeedbackLoop {
        nodes: cycle.to_vec(),
        edges,
        polarity,
        min_confidence,
    }
}

/// Deduplicate cycles by normalizing (rotate to start with smallest id).
fn deduplicate_cycles(cycles: Vec<Vec<String>>) -> Vec<Vec<String>> {
    let mut seen: HashSet<Vec<String>> = HashSet::new();
    let mut result: Vec<Vec<String>> = Vec::new();

    for cycle in cycles {
        let normalized = normalize_cycle(&cycle);
        if seen.insert(normalized.clone()) {
            result.push(normalized);
        }
    }

    result
}

fn normalize_cycle(cycle: &[String]) -> Vec<String> {
    if cycle.is_empty() {
        return vec![];
    }

    // Find the position of the lexicographically smallest element
    let min_pos = cycle
        .iter()
        .enumerate()
        .min_by_key(|(_, id)| (*id).clone())
        .map(|(i, _)| i)
        .unwrap_or(0);

    // Rotate to start with that element
    let mut result: Vec<String> = Vec::with_capacity(cycle.len());
    for i in 0..cycle.len() {
        result.push(cycle[(min_pos + i) % cycle.len()].clone());
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cycle_detection() {
        let g = AdGraph::from_json(
            r#"{
            "nodes": [
                {"id": "a", "label": "A", "category": "STOCK", "subtype": "Organelle", "moduleId": "M01", "description": "A"},
                {"id": "b", "label": "B", "category": "STATE", "subtype": "MetabolicState", "moduleId": "M01", "description": "B"},
                {"id": "c", "label": "C", "category": "PROCESS", "subtype": "BiologicalProcess", "moduleId": "M01", "description": "C"}
            ],
            "edges": [
                {"id": "e1", "source": "a", "target": "b", "relation": "increases", "moduleId": "M01"},
                {"id": "e2", "source": "b", "target": "c", "relation": "increases", "moduleId": "M01"},
                {"id": "e3", "source": "c", "target": "a", "relation": "increases", "moduleId": "M01"}
            ]
        }"#,
        )
        .unwrap();

        let loops = detect_feedback_loops(&g, 5);
        assert_eq!(loops.len(), 1);
        assert_eq!(loops[0].nodes.len(), 3);
        assert!(matches!(loops[0].polarity, LoopPolarity::Reinforcing));
    }

    #[test]
    fn test_balancing_loop() {
        let g = AdGraph::from_json(
            r#"{
            "nodes": [
                {"id": "a", "label": "A", "category": "STOCK", "subtype": "Organelle", "moduleId": "M01", "description": "A"},
                {"id": "b", "label": "B", "category": "STATE", "subtype": "MetabolicState", "moduleId": "M01", "description": "B"}
            ],
            "edges": [
                {"id": "e1", "source": "a", "target": "b", "relation": "increases", "moduleId": "M01"},
                {"id": "e2", "source": "b", "target": "a", "relation": "decreases", "moduleId": "M01"}
            ]
        }"#,
        )
        .unwrap();

        let loops = detect_feedback_loops(&g, 5);
        assert_eq!(loops.len(), 1);
        assert!(matches!(loops[0].polarity, LoopPolarity::Balancing));
    }
}
