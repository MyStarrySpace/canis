use std::collections::{BinaryHeap, HashMap, VecDeque};

use crate::graph::AdGraph;
use crate::types::{CentralityResult, DegreeResult};

/// Degree centrality for all nodes.
pub fn degree_centrality(graph: &AdGraph) -> Vec<DegreeResult> {
    let n = graph.node_count();
    let norm = if n > 1 { (n - 1) as f64 } else { 1.0 };

    graph
        .node_ids()
        .iter()
        .map(|id| {
            let in_deg = graph.predecessors(id).len();
            let out_deg = graph.successors(id).len();
            let total = in_deg + out_deg;
            DegreeResult {
                node_id: id.clone(),
                in_degree: in_deg,
                out_degree: out_deg,
                total,
                normalized: total as f64 / norm,
            }
        })
        .collect()
}

/// Brandes betweenness centrality.
///
/// `weighted`: if true, uses Dijkstra with distance weights (1/confidence).
///             if false, uses unweighted BFS.
pub fn betweenness_centrality(graph: &AdGraph, weighted: bool) -> Vec<CentralityResult> {
    let node_ids = graph.node_ids();
    let n = node_ids.len();
    let mut cb: HashMap<String, f64> = HashMap::new();
    for id in &node_ids {
        cb.insert(id.clone(), 0.0);
    }

    for s in &node_ids {
        let mut stack: Vec<String> = Vec::new();
        let mut predecessors: HashMap<String, Vec<String>> = HashMap::new();
        let mut sigma: HashMap<String, f64> = HashMap::new();
        let mut dist: HashMap<String, f64> = HashMap::new();

        for id in &node_ids {
            predecessors.insert(id.clone(), Vec::new());
            sigma.insert(id.clone(), 0.0);
            dist.insert(id.clone(), f64::INFINITY);
        }

        *sigma.get_mut(s).unwrap() = 1.0;
        *dist.get_mut(s).unwrap() = 0.0;

        if weighted {
            // Dijkstra
            let mut heap: BinaryHeap<OrdF64Node> = BinaryHeap::new();
            heap.push(OrdF64Node {
                cost: 0.0,
                node: s.clone(),
            });

            while let Some(OrdF64Node { cost, node }) = heap.pop() {
                if cost > *dist.get(&node).unwrap() {
                    continue;
                }
                stack.push(node.clone());

                for succ in graph.successors(&node) {
                    let edge = graph.edge_between(&node, &succ);
                    let edge_weight = edge
                        .map(|e| e.causal_confidence.distance_weight_with(&graph.confidence_weights))
                        .unwrap_or(5.0);

                    let new_dist = dist[&node] + edge_weight;
                    let old_dist = *dist.get(&succ).unwrap();

                    if new_dist < old_dist {
                        *dist.get_mut(&succ).unwrap() = new_dist;
                        *sigma.get_mut(&succ).unwrap() = 0.0;
                        predecessors.get_mut(&succ).unwrap().clear();
                    }

                    if (new_dist - *dist.get(&succ).unwrap()).abs() < 1e-10 {
                        *sigma.get_mut(&succ).unwrap() += sigma[&node];
                        predecessors.get_mut(&succ).unwrap().push(node.clone());
                        if new_dist < old_dist {
                            heap.push(OrdF64Node {
                                cost: new_dist,
                                node: succ,
                            });
                        }
                    }
                }
            }
        } else {
            // BFS
            let mut queue: VecDeque<String> = VecDeque::new();
            queue.push_back(s.clone());

            while let Some(node) = queue.pop_front() {
                stack.push(node.clone());
                let d = *dist.get(&node).unwrap();

                for succ in graph.successors(&node) {
                    if *dist.get(&succ).unwrap() == f64::INFINITY {
                        *dist.get_mut(&succ).unwrap() = d + 1.0;
                        queue.push_back(succ.clone());
                    }

                    if (*dist.get(&succ).unwrap() - (d + 1.0)).abs() < 1e-10 {
                        *sigma.get_mut(&succ).unwrap() += sigma[&node];
                        predecessors.get_mut(&succ).unwrap().push(node.clone());
                    }
                }
            }
        }

        // Accumulation
        let mut delta: HashMap<String, f64> = HashMap::new();
        for id in &node_ids {
            delta.insert(id.clone(), 0.0);
        }

        while let Some(w) = stack.pop() {
            for v in predecessors.get(&w).unwrap_or(&vec![]).clone() {
                let coeff = (sigma[&v] / sigma[&w]) * (1.0 + delta[&w]);
                *delta.get_mut(&v).unwrap() += coeff;
            }
            if &w != s {
                *cb.get_mut(&w).unwrap() += delta[&w];
            }
        }
    }

    // Normalize
    let norm = if n > 2 {
        ((n - 1) * (n - 2)) as f64
    } else {
        1.0
    };

    let mut results: Vec<CentralityResult> = cb
        .into_iter()
        .map(|(node_id, score)| CentralityResult {
            node_id,
            score: score / norm,
        })
        .collect();

    results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    results
}

/// Harmonic closeness centrality (works for disconnected graphs).
pub fn closeness_centrality(graph: &AdGraph) -> Vec<CentralityResult> {
    let node_ids = graph.node_ids();
    let n = node_ids.len();

    let mut results: Vec<CentralityResult> = node_ids
        .iter()
        .map(|source| {
            // BFS from source
            let mut dist: HashMap<String, f64> = HashMap::new();
            let mut queue: VecDeque<String> = VecDeque::new();

            dist.insert(source.clone(), 0.0);
            queue.push_back(source.clone());

            while let Some(node) = queue.pop_front() {
                let d = dist[&node];
                for succ in graph.successors(&node) {
                    if !dist.contains_key(&succ) {
                        dist.insert(succ.clone(), d + 1.0);
                        queue.push_back(succ);
                    }
                }
            }

            let reachable = dist.len() - 1; // exclude self
            if reachable == 0 {
                return CentralityResult {
                    node_id: source.clone(),
                    score: 0.0,
                };
            }

            let total_dist: f64 = dist
                .iter()
                .filter(|(id, _)| *id != source)
                .map(|(_, d)| *d)
                .sum();

            // Harmonic closeness: (reachable/(n-1)) * (reachable/totalDist)
            let score = if total_dist > 0.0 && n > 1 {
                (reachable as f64 / (n - 1) as f64) * (reachable as f64 / total_dist)
            } else {
                0.0
            };

            CentralityResult {
                node_id: source.clone(),
                score,
            }
        })
        .collect();

    results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    results
}

/// PageRank with damping factor.
pub fn pagerank(graph: &AdGraph, damping: f64, max_iter: u32, tolerance: f64) -> Vec<CentralityResult> {
    let node_ids = graph.node_ids();
    let n = node_ids.len();
    if n == 0 {
        return vec![];
    }

    let init = 1.0 / n as f64;
    let mut rank: HashMap<String, f64> = HashMap::new();
    for id in &node_ids {
        rank.insert(id.clone(), init);
    }

    // Precompute out-degree
    let mut out_deg: HashMap<String, usize> = HashMap::new();
    for id in &node_ids {
        out_deg.insert(id.clone(), graph.successors(id).len());
    }

    for _ in 0..max_iter {
        let mut new_rank: HashMap<String, f64> = HashMap::new();
        let mut diff: f64 = 0.0;

        // Dangling node mass (nodes with no outgoing edges)
        let dangling_sum: f64 = node_ids
            .iter()
            .filter(|id| *out_deg.get(*id).unwrap() == 0)
            .map(|id| rank[id])
            .sum();

        for id in &node_ids {
            let mut incoming_rank: f64 = 0.0;
            for pred in graph.predecessors(id) {
                let pred_out = *out_deg.get(&pred).unwrap();
                if pred_out > 0 {
                    incoming_rank += rank[&pred] / pred_out as f64;
                }
            }

            let pr = (1.0 - damping) / n as f64
                + damping * (incoming_rank + dangling_sum / n as f64);

            diff += (pr - rank[id]).abs();
            new_rank.insert(id.clone(), pr);
        }

        rank = new_rank;

        if diff < tolerance {
            break;
        }
    }

    let mut results: Vec<CentralityResult> = rank
        .into_iter()
        .map(|(node_id, score)| CentralityResult { node_id, score })
        .collect();

    results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    results
}

/// Helper for Dijkstra priority queue (min-heap via Reverse)
#[derive(Debug, Clone)]
struct OrdF64Node {
    cost: f64,
    node: String,
}

impl PartialEq for OrdF64Node {
    fn eq(&self, other: &Self) -> bool {
        self.cost == other.cost && self.node == other.node
    }
}
impl Eq for OrdF64Node {}

impl Ord for OrdF64Node {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        // Reverse for min-heap
        other
            .cost
            .partial_cmp(&self.cost)
            .unwrap_or(std::cmp::Ordering::Equal)
    }
}

impl PartialOrd for OrdF64Node {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_graph() -> AdGraph {
        AdGraph::from_json(
            r#"{
            "nodes": [
                {"id": "a", "label": "A", "category": "STOCK", "subtype": "Organelle", "moduleId": "M01", "description": "A"},
                {"id": "b", "label": "B", "category": "STATE", "subtype": "MetabolicState", "moduleId": "M01", "description": "B"},
                {"id": "c", "label": "C", "category": "PROCESS", "subtype": "BiologicalProcess", "moduleId": "M02", "description": "C"},
                {"id": "d", "label": "D", "category": "STATE", "subtype": "MetabolicState", "moduleId": "M02", "description": "D"}
            ],
            "edges": [
                {"id": "e1", "source": "a", "target": "b", "relation": "increases", "moduleId": "M01", "causalConfidence": "L2"},
                {"id": "e2", "source": "a", "target": "c", "relation": "increases", "moduleId": "M01", "causalConfidence": "L4"},
                {"id": "e3", "source": "b", "target": "d", "relation": "increases", "moduleId": "M01", "causalConfidence": "L3"},
                {"id": "e4", "source": "c", "target": "d", "relation": "increases", "moduleId": "M02", "causalConfidence": "L5"}
            ]
        }"#,
        )
        .unwrap()
    }

    #[test]
    fn test_degree_centrality() {
        let g = sample_graph();
        let results = degree_centrality(&g);
        let a = results.iter().find(|r| r.node_id == "a").unwrap();
        assert_eq!(a.out_degree, 2);
        assert_eq!(a.in_degree, 0);
        assert_eq!(a.total, 2);
    }

    #[test]
    fn test_betweenness() {
        let g = sample_graph();
        let results = betweenness_centrality(&g, false);
        // All nodes should have non-negative betweenness
        for r in &results {
            assert!(r.score >= 0.0);
        }
    }

    #[test]
    fn test_closeness() {
        let g = sample_graph();
        let results = closeness_centrality(&g);
        // Source node 'a' should have highest closeness
        let a = results.iter().find(|r| r.node_id == "a").unwrap();
        assert!(a.score > 0.0);
    }

    #[test]
    fn test_pagerank() {
        let g = sample_graph();
        let results = pagerank(&g, 0.85, 100, 1e-6);
        let total: f64 = results.iter().map(|r| r.score).sum();
        assert!((total - 1.0).abs() < 0.01);
    }
}
