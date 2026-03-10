use std::collections::{BinaryHeap, HashMap, HashSet, VecDeque};

use crate::graph::AdGraph;
use crate::types::{CausalConfidence, DrugPathwayResult, NeighborhoodResult, PathResult};

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
                .map(|e| e.causal_confidence.distance_weight_with(&graph.confidence_weights))
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
                .map(|e| e.causal_confidence.strength_weight_with(&graph.confidence_weights))
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

// ── Drug pathway analysis ──────────────────────────────────────────────────

/// Compute the pathway for a drug given its target node IDs.
/// BFS upstream (predecessors) and downstream (successors) from targets,
/// collecting all pathway edges and affected modules.
pub fn drug_pathway(
    graph: &AdGraph,
    target_ids: &[String],
    max_depth: usize,
) -> DrugPathwayResult {
    let target_set: HashSet<&str> = target_ids.iter().map(|s| s.as_str()).collect();
    let all_node_ids: HashSet<String> = graph.node_ids().into_iter().collect();
    let mut upstream = HashSet::new();
    let mut downstream = HashSet::new();
    let mut pathway_edges = HashSet::new();

    // Collect edges between targets
    for tid in &target_set {
        for edge in graph.edges() {
            if edge.source == *tid && target_set.contains(edge.target.as_str()) {
                pathway_edges.insert(edge.id.clone());
            }
        }
    }

    // BFS upstream from each target (follow predecessors)
    {
        let mut visited: HashSet<String> = target_set.iter().map(|s| s.to_string()).collect();
        let mut queue: VecDeque<(String, usize)> = target_set
            .iter()
            .map(|s| (s.to_string(), 0))
            .collect();

        while let Some((node, depth)) = queue.pop_front() {
            if depth >= max_depth {
                continue;
            }
            for pred in graph.predecessors(&node) {
                if !all_node_ids.contains(&pred) || visited.contains(&pred) {
                    continue;
                }
                // Record the edge
                if let Some(edge) = graph.edge_between(&pred, &node) {
                    pathway_edges.insert(edge.id.clone());
                }
                if !target_set.contains(pred.as_str()) {
                    upstream.insert(pred.clone());
                }
                visited.insert(pred.clone());
                queue.push_back((pred, depth + 1));
            }
        }
    }

    // BFS downstream from each target (follow successors)
    {
        let mut visited: HashSet<String> = target_set.iter().map(|s| s.to_string()).collect();
        let mut queue: VecDeque<(String, usize)> = target_set
            .iter()
            .map(|s| (s.to_string(), 0))
            .collect();

        while let Some((node, depth)) = queue.pop_front() {
            if depth >= max_depth {
                continue;
            }
            for succ in graph.successors(&node) {
                if !all_node_ids.contains(&succ) || visited.contains(&succ) {
                    continue;
                }
                if let Some(edge) = graph.edge_between(&node, &succ) {
                    pathway_edges.insert(edge.id.clone());
                }
                if !target_set.contains(succ.as_str()) {
                    downstream.insert(succ.clone());
                }
                visited.insert(succ.clone());
                queue.push_back((succ, depth + 1));
            }
        }
    }

    // Collect affected modules
    let mut affected_modules = HashSet::new();
    for id in target_ids.iter().chain(upstream.iter()).chain(downstream.iter()) {
        if let Some(node) = graph.node(id) {
            affected_modules.insert(node.module_id.clone());
        }
    }

    DrugPathwayResult {
        target_nodes: target_ids.to_vec(),
        upstream_nodes: upstream.into_iter().collect(),
        downstream_nodes: downstream.into_iter().collect(),
        pathway_edges: pathway_edges.into_iter().collect(),
        affected_modules: affected_modules.into_iter().collect(),
    }
}

/// Identify transitive-redundant edges.
///
/// An edge A→B is "transitive redundant" if there exists an alternative path
/// A→...→B (length >= 2) where the minimum confidence along that path is at
/// least as strong as (<=) the direct edge's confidence.
///
/// Returns edge IDs that are redundant.
pub fn transitive_redundancies(graph: &AdGraph, max_depth: usize) -> Vec<String> {
    let mut redundant = Vec::new();

    for edge in graph.edges() {
        let direct_conf = &edge.causal_confidence;

        // Temporarily conceptually "remove" the direct edge by finding paths
        // that don't use it. We do a bounded DFS from source to target,
        // skipping the direct edge, tracking the weakest confidence seen.
        let found = has_stronger_alternate_path(
            graph,
            &edge.source,
            &edge.target,
            &edge.id,
            direct_conf,
            max_depth,
        );

        if found {
            redundant.push(edge.id.clone());
        }
    }

    redundant
}

/// Check if there's an alternate path from `from` to `to` (not using `skip_edge_id`)
/// where the minimum confidence along the path is at least as strong as `threshold`.
fn has_stronger_alternate_path(
    graph: &AdGraph,
    from: &str,
    to: &str,
    skip_edge_id: &str,
    threshold: &CausalConfidence,
    max_depth: usize,
) -> bool {
    // DFS with pruning: track best (strongest) min-confidence to each node
    let mut best_to_node: HashMap<String, CausalConfidence> = HashMap::new();
    // Stack: (node, depth, min_confidence_so_far)
    let mut stack: Vec<(String, usize, CausalConfidence)> = Vec::new();

    // Start with L1 (strongest possible) as the "min so far" since no edges traversed yet
    stack.push((from.to_string(), 0, CausalConfidence::L1));
    best_to_node.insert(from.to_string(), CausalConfidence::L1);

    while let Some((node, depth, min_conf)) = stack.pop() {
        if node == to && depth > 0 {
            // Found a path — check if min confidence is at least as strong as threshold
            if min_conf <= *threshold {
                return true;
            }
            continue;
        }

        if depth >= max_depth {
            continue;
        }

        for succ in graph.successors(&node) {
            if let Some(e) = graph.edge_between(&node, &succ) {
                // Skip the direct edge we're testing
                if e.id == skip_edge_id {
                    continue;
                }

                let path_min = if min_conf > e.causal_confidence {
                    e.causal_confidence.clone()
                } else {
                    min_conf.clone()
                };

                // Prune: if this path's min confidence is weaker than threshold,
                // no point continuing (can't get better downstream)
                if path_min > *threshold {
                    continue;
                }

                // Only visit if we arrive with a better (stronger) min confidence
                // than any previous visit
                let dominated = best_to_node
                    .get(&succ)
                    .map(|prev| path_min >= *prev)
                    .unwrap_or(false);

                if !dominated {
                    best_to_node.insert(succ.clone(), path_min.clone());
                    stack.push((succ, depth + 1, path_min));
                }
            }
        }
    }

    false
}

/// Return node IDs that belong to the specified modules.
pub fn filter_by_modules(graph: &AdGraph, module_ids: &[String]) -> Vec<String> {
    let module_set: HashSet<&str> = module_ids.iter().map(|s| s.as_str()).collect();
    graph
        .node_ids()
        .into_iter()
        .filter(|id| {
            graph
                .node(id)
                .map(|n| module_set.contains(n.module_id.as_str()))
                .unwrap_or(false)
        })
        .collect()
}

/// Return edge IDs with causal confidence at or above the threshold.
/// L1 is strongest, L7 is weakest. `min_level` = L3 means keep L1, L2, L3.
pub fn filter_edges_by_confidence(
    graph: &AdGraph,
    min_level: &CausalConfidence,
) -> Vec<String> {
    graph
        .edges()
        .into_iter()
        .filter(|e| e.causal_confidence <= *min_level)
        .map(|e| e.id.clone())
        .collect()
}

/// Return the unique module IDs for a set of node IDs.
pub fn modules_for_nodes(graph: &AdGraph, node_ids: &[String]) -> Vec<String> {
    let mut modules = HashSet::new();
    for id in node_ids {
        if let Some(node) = graph.node(id) {
            modules.insert(node.module_id.clone());
        }
    }
    modules.into_iter().collect()
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
            let w = edge.causal_confidence.strength_weight_with(&graph.confidence_weights);
            total_weight += edge.causal_confidence.distance_weight_with(&graph.confidence_weights);
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
            let w = edge.causal_confidence.strength_weight_with(&graph.confidence_weights);
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

    /// Larger graph simulating a drug pathway scenario:
    /// upstream1 → upstream2 → target → downstream1 → downstream2
    ///                           ↑ also: sidenode → target
    fn drug_pathway_graph() -> AdGraph {
        AdGraph::from_json(
            r#"{
            "nodes": [
                {"id": "upstream1", "label": "Upstream 1", "category": "STATE", "subtype": "RiskFactor", "moduleId": "M01", "description": "U1"},
                {"id": "upstream2", "label": "Upstream 2", "category": "STOCK", "subtype": "ProteinPool", "moduleId": "M01", "description": "U2"},
                {"id": "target", "label": "Drug Target", "category": "STOCK", "subtype": "Organelle", "moduleId": "M02", "description": "Target", "roles": ["THERAPEUTIC_TARGET"]},
                {"id": "downstream1", "label": "Downstream 1", "category": "PROCESS", "subtype": "BiologicalProcess", "moduleId": "M02", "description": "D1"},
                {"id": "downstream2", "label": "Downstream 2", "category": "STATE", "subtype": "ClinicalOutcome", "moduleId": "M03", "description": "D2"},
                {"id": "sidenode", "label": "Side Node", "category": "BOUNDARY", "subtype": "Barrier", "moduleId": "M03", "description": "Side"},
                {"id": "isolated", "label": "Isolated", "category": "STATE", "subtype": "MetabolicState", "moduleId": "M04", "description": "No connections to target"}
            ],
            "edges": [
                {"id": "e1", "source": "upstream1", "target": "upstream2", "relation": "increases", "moduleId": "M01", "causalConfidence": "L2"},
                {"id": "e2", "source": "upstream2", "target": "target", "relation": "increases", "moduleId": "M01", "causalConfidence": "L3"},
                {"id": "e3", "source": "target", "target": "downstream1", "relation": "increases", "moduleId": "M02", "causalConfidence": "L1"},
                {"id": "e4", "source": "downstream1", "target": "downstream2", "relation": "decreases", "moduleId": "M02", "causalConfidence": "L4"},
                {"id": "e5", "source": "sidenode", "target": "target", "relation": "modulates", "moduleId": "M03", "causalConfidence": "L5"},
                {"id": "e6", "source": "isolated", "target": "sidenode", "relation": "increases", "moduleId": "M04", "causalConfidence": "L7"}
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

    // ── Transitive redundancy tests ──────────────────────────────────────

    #[test]
    fn test_transitive_redundancy_basic() {
        let g = sample_graph();
        // a→c (L6) should be redundant because a→b→c exists with min confidence L4 (stronger than L6)
        let redundant = transitive_redundancies(&g, 4);
        assert!(redundant.contains(&"e3".to_string()), "e3 (a→c, L6) should be redundant");
        // e1 (a→b, L2), e2 (b→c, L4), e4 (c→d, L3) should NOT be redundant
        assert!(!redundant.contains(&"e1".to_string()));
        assert!(!redundant.contains(&"e2".to_string()));
        assert!(!redundant.contains(&"e4".to_string()));
    }

    #[test]
    fn test_transitive_redundancy_depth_limit() {
        let g = sample_graph();
        // With max_depth=1, can't find alternate paths (need at least 2 hops)
        let redundant = transitive_redundancies(&g, 1);
        assert!(redundant.is_empty(), "No edges should be redundant at depth 1");
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

    // ── Drug pathway tests ────────────────────────────────────────────────

    #[test]
    fn test_drug_pathway_basic() {
        let g = drug_pathway_graph();
        let result = drug_pathway(&g, &["target".into()], 2);

        // Target should be in target_nodes
        assert_eq!(result.target_nodes, vec!["target"]);

        // upstream2 and sidenode are direct predecessors (depth 1)
        // upstream1 is 2 hops upstream
        assert!(result.upstream_nodes.contains(&"upstream2".into()));
        assert!(result.upstream_nodes.contains(&"sidenode".into()));
        assert!(result.upstream_nodes.contains(&"upstream1".into()));

        // downstream1 is direct successor, downstream2 is 2 hops
        assert!(result.downstream_nodes.contains(&"downstream1".into()));
        assert!(result.downstream_nodes.contains(&"downstream2".into()));

        // isolated IS in upstream at depth 2 (isolated → sidenode → target)
        assert!(result.upstream_nodes.contains(&"isolated".into()));
        assert!(!result.downstream_nodes.contains(&"isolated".into()));
    }

    #[test]
    fn test_drug_pathway_edges() {
        let g = drug_pathway_graph();
        let result = drug_pathway(&g, &["target".into()], 2);

        // Should include edges connecting to/from target and within pathway
        assert!(result.pathway_edges.contains(&"e2".into())); // upstream2 → target
        assert!(result.pathway_edges.contains(&"e3".into())); // target → downstream1
        assert!(result.pathway_edges.contains(&"e5".into())); // sidenode → target
        assert!(result.pathway_edges.contains(&"e1".into())); // upstream1 → upstream2
        assert!(result.pathway_edges.contains(&"e4".into())); // downstream1 → downstream2
    }

    #[test]
    fn test_drug_pathway_modules() {
        let g = drug_pathway_graph();
        let result = drug_pathway(&g, &["target".into()], 2);

        // Should include M01 (upstream), M02 (target+downstream1), M03 (sidenode+downstream2)
        assert!(result.affected_modules.contains(&"M01".into()));
        assert!(result.affected_modules.contains(&"M02".into()));
        assert!(result.affected_modules.contains(&"M03".into()));
        // M04 (isolated) IS affected since isolated is upstream at depth 2
        assert!(result.affected_modules.contains(&"M04".into()));
    }

    #[test]
    fn test_drug_pathway_depth_1() {
        let g = drug_pathway_graph();
        let result = drug_pathway(&g, &["target".into()], 1);

        // At depth 1, only immediate neighbors
        assert!(result.upstream_nodes.contains(&"upstream2".into()));
        assert!(result.upstream_nodes.contains(&"sidenode".into()));
        assert!(!result.upstream_nodes.contains(&"upstream1".into())); // 2 hops away

        assert!(result.downstream_nodes.contains(&"downstream1".into()));
        assert!(!result.downstream_nodes.contains(&"downstream2".into())); // 2 hops away
    }

    #[test]
    fn test_drug_pathway_multiple_targets() {
        let g = drug_pathway_graph();
        let result = drug_pathway(
            &g,
            &["upstream2".into(), "downstream1".into()],
            1,
        );

        // Both should be targets
        assert!(result.target_nodes.contains(&"upstream2".into()));
        assert!(result.target_nodes.contains(&"downstream1".into()));

        // upstream1 is 1 hop from upstream2
        assert!(result.upstream_nodes.contains(&"upstream1".into()));

        // target is both downstream of upstream2 AND upstream of downstream1
        // It should appear in one of them (not in targets since it's not a target)
        let in_upstream = result.upstream_nodes.contains(&"target".into());
        let in_downstream = result.downstream_nodes.contains(&"target".into());
        assert!(in_upstream || in_downstream);

        // downstream2 is 1 hop from downstream1
        assert!(result.downstream_nodes.contains(&"downstream2".into()));
    }

    #[test]
    fn test_drug_pathway_no_connections() {
        let g = drug_pathway_graph();
        let result = drug_pathway(&g, &["isolated".into()], 2);

        assert_eq!(result.target_nodes, vec!["isolated"]);
        // isolated only has one outgoing edge to sidenode
        assert!(result.downstream_nodes.contains(&"sidenode".into()));
        // No predecessors
        assert!(result.upstream_nodes.is_empty());
    }

    // ── Module/evidence filter tests ──────────────────────────────────────

    #[test]
    fn test_filter_by_modules() {
        let g = drug_pathway_graph();

        let m01_nodes = filter_by_modules(&g, &["M01".into()]);
        assert!(m01_nodes.contains(&"upstream1".into()));
        assert!(m01_nodes.contains(&"upstream2".into()));
        assert!(!m01_nodes.contains(&"target".into())); // M02

        let m02_m03 = filter_by_modules(&g, &["M02".into(), "M03".into()]);
        assert!(m02_m03.contains(&"target".into()));
        assert!(m02_m03.contains(&"downstream1".into()));
        assert!(m02_m03.contains(&"downstream2".into()));
        assert!(m02_m03.contains(&"sidenode".into()));
        assert!(!m02_m03.contains(&"upstream1".into()));
    }

    #[test]
    fn test_filter_by_modules_empty() {
        let g = drug_pathway_graph();
        let result = filter_by_modules(&g, &[]);
        assert!(result.is_empty());
    }

    #[test]
    fn test_filter_edges_by_confidence_strong() {
        let g = drug_pathway_graph();
        // L3 threshold: keep L1, L2, L3
        let strong = filter_edges_by_confidence(&g, &CausalConfidence::L3);
        assert!(strong.contains(&"e1".into())); // L2
        assert!(strong.contains(&"e2".into())); // L3
        assert!(strong.contains(&"e3".into())); // L1
        assert!(!strong.contains(&"e4".into())); // L4
        assert!(!strong.contains(&"e5".into())); // L5
        assert!(!strong.contains(&"e6".into())); // L7
    }

    #[test]
    fn test_filter_edges_by_confidence_moderate() {
        let g = drug_pathway_graph();
        // L5 threshold: keep L1-L5
        let moderate = filter_edges_by_confidence(&g, &CausalConfidence::L5);
        assert_eq!(moderate.len(), 5); // e1-e5, excludes e6 (L7)
        assert!(!moderate.contains(&"e6".into()));
    }

    #[test]
    fn test_filter_edges_by_confidence_all() {
        let g = drug_pathway_graph();
        let all = filter_edges_by_confidence(&g, &CausalConfidence::L7);
        assert_eq!(all.len(), 6); // All edges
    }

    #[test]
    fn test_modules_for_nodes() {
        let g = drug_pathway_graph();
        let modules = modules_for_nodes(
            &g,
            &["upstream1".into(), "target".into(), "downstream2".into()],
        );
        assert!(modules.contains(&"M01".into()));
        assert!(modules.contains(&"M02".into()));
        assert!(modules.contains(&"M03".into()));
        assert!(!modules.contains(&"M04".into()));
    }

    #[test]
    fn test_modules_for_nodes_empty() {
        let g = drug_pathway_graph();
        let modules = modules_for_nodes(&g, &[]);
        assert!(modules.is_empty());
    }

    #[test]
    fn test_modules_for_nodes_nonexistent() {
        let g = drug_pathway_graph();
        let modules = modules_for_nodes(&g, &["nonexistent".into()]);
        assert!(modules.is_empty());
    }

    // ── Integration: filter + pathway ─────────────────────────────────────

    #[test]
    fn test_filter_then_subgraph_pathway() {
        let g = drug_pathway_graph();

        // First filter to M01 + M02 only
        let node_ids = filter_by_modules(&g, &["M01".into(), "M02".into()]);
        let sub = g.subgraph(&node_ids).unwrap();

        // Now compute pathway on the subgraph
        let result = drug_pathway(&sub, &["target".into()], 2);

        // upstream1, upstream2 should be upstream (M01)
        assert!(result.upstream_nodes.contains(&"upstream1".into()));
        assert!(result.upstream_nodes.contains(&"upstream2".into()));

        // downstream1 should be downstream (M02)
        assert!(result.downstream_nodes.contains(&"downstream1".into()));

        // sidenode (M03) and downstream2 (M03) should NOT appear (filtered out)
        assert!(!result.upstream_nodes.contains(&"sidenode".into()));
        assert!(!result.downstream_nodes.contains(&"downstream2".into()));
    }

    #[test]
    fn test_filter_evidence_then_pathway() {
        let g = drug_pathway_graph();

        // Get only strong edges (L1-L3)
        let strong_edges = filter_edges_by_confidence(&g, &CausalConfidence::L3);

        // Compute full pathway
        let result = drug_pathway(&g, &["target".into()], 2);

        // Pathway should have more edges than the strong filter
        assert!(result.pathway_edges.len() > strong_edges.len() - 1);

        // e3 (L1) should be in both
        assert!(strong_edges.contains(&"e3".into()));
        assert!(result.pathway_edges.contains(&"e3".into()));
    }
}
