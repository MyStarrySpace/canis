use std::collections::{BinaryHeap, HashMap, HashSet, VecDeque};

use crate::graph::AdGraph;
use crate::types::{NeighborhoodResult, PathResult};

/// BFS shortest path (unweighted).
pub fn shortest_path_bfs(graph: &AdGraph, from: &str, to: &str) -> Option<PathResult> {
    let mut dist: HashMap<String, f64> = HashMap::new();
    let mut prev: HashMap<String, String> = HashMap::new();
    let mut queue: VecDeque<String> = VecDeque::new();

    dist.insert(from.to_string(), 0.0);
    queue.push_back(from.to_string());

    while let Some(node) = queue.pop_front() {
        if node == to {
            break;
        }
        let d = dist[&node];
        for succ in graph.successors(&node) {
            if !dist.contains_key(&succ) {
                dist.insert(succ.clone(), d + 1.0);
                prev.insert(succ.clone(), node.clone());
                queue.push_back(succ);
            }
        }
    }

    if !dist.contains_key(to) {
        return None;
    }

    reconstruct_path(graph, from, to, &prev, *dist.get(to).unwrap())
}

/// Dijkstra shortest path using confidence-based distance weights.
pub fn shortest_path_dijkstra(graph: &AdGraph, from: &str, to: &str) -> Option<PathResult> {
    let mut dist: HashMap<String, f64> = HashMap::new();
    let mut prev: HashMap<String, String> = HashMap::new();
    let mut heap: BinaryHeap<DijkNode> = BinaryHeap::new();

    dist.insert(from.to_string(), 0.0);
    heap.push(DijkNode {
        cost: 0.0,
        node: from.to_string(),
    });

    while let Some(DijkNode { cost, node }) = heap.pop() {
        if cost > *dist.get(&node).unwrap_or(&f64::INFINITY) {
            continue;
        }
        if node == to {
            break;
        }
        for succ in graph.successors(&node) {
            let edge = graph.edge_between(&node, &succ);
            let w = edge
                .map(|e| e.causal_confidence.distance_weight())
                .unwrap_or(5.0);
            let new_dist = cost + w;
            if new_dist < *dist.get(&succ).unwrap_or(&f64::INFINITY) {
                dist.insert(succ.clone(), new_dist);
                prev.insert(succ.clone(), node.clone());
                heap.push(DijkNode {
                    cost: new_dist,
                    node: succ,
                });
            }
        }
    }

    if !dist.contains_key(to) {
        return None;
    }

    reconstruct_path(graph, from, to, &prev, *dist.get(to).unwrap())
}

/// Strongest path: maximizes minimum confidence along the path.
/// Uses Dijkstra with negated strength weights.
pub fn strongest_path(graph: &AdGraph, from: &str, to: &str) -> Option<PathResult> {
    // Modified Dijkstra: maximize the minimum edge weight along the path.
    // We track the min-strength seen on the best path to each node.
    let mut best: HashMap<String, f64> = HashMap::new();
    let mut prev: HashMap<String, String> = HashMap::new();
    let mut heap: BinaryHeap<DijkNode> = BinaryHeap::new();

    best.insert(from.to_string(), f64::INFINITY);
    heap.push(DijkNode {
        cost: f64::INFINITY, // We want max, so this is fine with our cmp
        node: from.to_string(),
    });

    while let Some(DijkNode { cost: min_strength, node }) = heap.pop() {
        if min_strength < *best.get(&node).unwrap_or(&0.0) {
            continue;
        }
        if node == to {
            break;
        }
        for succ in graph.successors(&node) {
            let edge = graph.edge_between(&node, &succ);
            let w = edge
                .map(|e| e.causal_confidence.strength_weight())
                .unwrap_or(0.1);
            let new_min = min_strength.min(w);
            if new_min > *best.get(&succ).unwrap_or(&0.0) {
                best.insert(succ.clone(), new_min);
                prev.insert(succ.clone(), node.clone());
                heap.push(DijkNode {
                    cost: new_min,
                    node: succ,
                });
            }
        }
    }

    if !best.contains_key(to) || *best.get(to).unwrap() == 0.0 {
        return None;
    }

    reconstruct_path(graph, from, to, &prev, *best.get(to).unwrap())
}

/// Find all simple paths from `from` to `to`, bounded by max_depth.
pub fn all_simple_paths(
    graph: &AdGraph,
    from: &str,
    to: &str,
    max_depth: usize,
) -> Vec<PathResult> {
    let mut results: Vec<PathResult> = Vec::new();
    let mut path: Vec<String> = vec![from.to_string()];
    let mut visited: HashSet<String> = HashSet::new();
    visited.insert(from.to_string());

    dfs_all_paths(graph, from, to, max_depth, &mut path, &mut visited, &mut results);

    results
}

fn dfs_all_paths(
    graph: &AdGraph,
    current: &str,
    target: &str,
    max_depth: usize,
    path: &mut Vec<String>,
    visited: &mut HashSet<String>,
    results: &mut Vec<PathResult>,
) {
    if current == target && path.len() > 1 {
        let pr = build_path_result(graph, path);
        results.push(pr);
        return;
    }

    if path.len() > max_depth {
        return;
    }

    for succ in graph.successors(current) {
        if !visited.contains(&succ) {
            visited.insert(succ.clone());
            path.push(succ.clone());
            dfs_all_paths(graph, &succ, target, max_depth, path, visited, results);
            path.pop();
            visited.remove(&succ);
        }
    }
}

/// BFS neighborhood: upstream, downstream, bidirectional within depth limit.
pub fn neighborhood(graph: &AdGraph, node_id: &str, max_depth: usize) -> NeighborhoodResult {
    let upstream = bfs_direction(graph, node_id, max_depth, false);
    let downstream = bfs_direction(graph, node_id, max_depth, true);

    let bidirectional: Vec<String> = {
        let up_set: HashSet<&String> = upstream.iter().collect();
        let down_set: HashSet<&String> = downstream.iter().collect();
        let mut all: HashSet<String> = HashSet::new();
        all.extend(upstream.iter().cloned());
        all.extend(downstream.iter().cloned());
        // Bidirectional = intersection of upstream and downstream
        let both: Vec<String> = up_set
            .intersection(&down_set)
            .map(|s| (*s).clone())
            .collect();
        both
    };

    NeighborhoodResult {
        upstream,
        downstream,
        bidirectional,
    }
}

fn bfs_direction(
    graph: &AdGraph,
    start: &str,
    max_depth: usize,
    forward: bool,
) -> Vec<String> {
    let mut visited: HashSet<String> = HashSet::new();
    let mut queue: VecDeque<(String, usize)> = VecDeque::new();
    let mut result: Vec<String> = Vec::new();

    visited.insert(start.to_string());
    queue.push_back((start.to_string(), 0));

    while let Some((node, depth)) = queue.pop_front() {
        if depth > 0 {
            result.push(node.clone());
        }
        if depth >= max_depth {
            continue;
        }

        let neighbors = if forward {
            graph.successors(&node)
        } else {
            graph.predecessors(&node)
        };

        for nbr in neighbors {
            if !visited.contains(&nbr) {
                visited.insert(nbr.clone());
                queue.push_back((nbr, depth + 1));
            }
        }
    }

    result
}

// ── Helpers ────────────────────────────────────────────────────────────────

fn reconstruct_path(
    graph: &AdGraph,
    from: &str,
    to: &str,
    prev: &HashMap<String, String>,
    total_weight: f64,
) -> Option<PathResult> {
    let mut path: Vec<String> = Vec::new();
    let mut current = to.to_string();

    while current != from {
        path.push(current.clone());
        match prev.get(&current) {
            Some(p) => current = p.clone(),
            None => return None,
        }
    }
    path.push(from.to_string());
    path.reverse();

    let pr = build_path_result_with_weight(graph, &path, total_weight);
    Some(pr)
}

fn build_path_result(graph: &AdGraph, path: &[String]) -> PathResult {
    let mut edges: Vec<String> = Vec::new();
    let mut total_weight = 0.0;
    let mut weakest: Option<(String, f64)> = None;

    for i in 0..path.len() - 1 {
        if let Some(edge) = graph.edge_between(&path[i], &path[i + 1]) {
            edges.push(edge.id.clone());
            let w = edge.causal_confidence.strength_weight();
            total_weight += edge.causal_confidence.distance_weight();
            match &weakest {
                None => weakest = Some((edge.id.clone(), w)),
                Some((_, best_w)) if w < *best_w => weakest = Some((edge.id.clone(), w)),
                _ => {}
            }
        }
    }

    PathResult {
        path: path.to_vec(),
        edges,
        total_weight,
        weakest_link: weakest.map(|(id, _)| id),
    }
}

fn build_path_result_with_weight(
    graph: &AdGraph,
    path: &[String],
    total_weight: f64,
) -> PathResult {
    let mut edges: Vec<String> = Vec::new();
    let mut weakest: Option<(String, f64)> = None;

    for i in 0..path.len() - 1 {
        if let Some(edge) = graph.edge_between(&path[i], &path[i + 1]) {
            edges.push(edge.id.clone());
            let w = edge.causal_confidence.strength_weight();
            match &weakest {
                None => weakest = Some((edge.id.clone(), w)),
                Some((_, best_w)) if w < *best_w => weakest = Some((edge.id.clone(), w)),
                _ => {}
            }
        }
    }

    PathResult {
        path: path.to_vec(),
        edges,
        total_weight,
        weakest_link: weakest.map(|(id, _)| id),
    }
}

/// Dijkstra priority queue node
#[derive(Debug, Clone)]
struct DijkNode {
    cost: f64,
    node: String,
}

impl PartialEq for DijkNode {
    fn eq(&self, other: &Self) -> bool {
        self.cost == other.cost
    }
}
impl Eq for DijkNode {}

impl Ord for DijkNode {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        // For strongest path, we want max-heap, but for shortest path, min-heap.
        // We use the same struct for both; the caller ensures correct sign.
        self.cost
            .partial_cmp(&other.cost)
            .unwrap_or(std::cmp::Ordering::Equal)
    }
}

impl PartialOrd for DijkNode {
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
                {"id": "e2", "source": "b", "target": "c", "relation": "increases", "moduleId": "M01", "causalConfidence": "L4"},
                {"id": "e3", "source": "a", "target": "c", "relation": "increases", "moduleId": "M01", "causalConfidence": "L6"},
                {"id": "e4", "source": "c", "target": "d", "relation": "increases", "moduleId": "M02", "causalConfidence": "L3"}
            ]
        }"#,
        )
        .unwrap()
    }

    #[test]
    fn test_shortest_path_bfs() {
        let g = sample_graph();
        let result = shortest_path_bfs(&g, "a", "d").unwrap();
        // a->c->d (2 hops) is shorter than a->b->c->d (3 hops)
        assert_eq!(result.path.len(), 3);
        assert_eq!(result.path, vec!["a", "c", "d"]);
    }

    #[test]
    fn test_no_path() {
        let g = sample_graph();
        let result = shortest_path_bfs(&g, "d", "a");
        assert!(result.is_none());
    }

    #[test]
    fn test_neighborhood() {
        let g = sample_graph();
        let result = neighborhood(&g, "b", 2);
        assert!(result.downstream.contains(&"c".to_string()));
        assert!(result.downstream.contains(&"d".to_string()));
        assert!(result.upstream.contains(&"a".to_string()));
    }

    #[test]
    fn test_all_simple_paths() {
        let g = sample_graph();
        let paths = all_simple_paths(&g, "a", "d", 5);
        assert!(paths.len() >= 2); // a->c->d and a->b->c->d
    }
}
