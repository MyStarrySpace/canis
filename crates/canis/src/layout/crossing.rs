use std::collections::{HashMap, HashSet};

use crate::graph::AdGraph;

/// Barycentric crossing minimization.
///
/// Given nodes organized into layers, reorder nodes within each layer
/// to minimize edge crossings. Uses alternating up/down sweeps.
pub fn minimize_crossings(
    layers: &HashMap<String, usize>,
    edges: &[(String, String)], // all edges including ghost segments
    max_iterations: u32,
) -> Vec<Vec<String>> {
    let num_layers = layers.values().copied().max().unwrap_or(0) + 1;

    // Build initial ordering: group nodes by layer
    let mut layer_order: Vec<Vec<String>> = vec![Vec::new(); num_layers];
    for (id, &layer) in layers {
        layer_order[layer].push(id.clone());
    }
    // Sort within each layer for deterministic initial order
    for layer in &mut layer_order {
        layer.sort();
    }

    // Build adjacency maps
    let mut upper_neighbors: HashMap<String, Vec<String>> = HashMap::new(); // neighbors in layer-1
    let mut lower_neighbors: HashMap<String, Vec<String>> = HashMap::new(); // neighbors in layer+1

    for (src, tgt) in edges {
        let src_layer = layers.get(src).copied().unwrap_or(0);
        let tgt_layer = layers.get(tgt).copied().unwrap_or(0);

        if src_layer + 1 == tgt_layer {
            // src is upper, tgt is lower
            lower_neighbors
                .entry(src.clone())
                .or_default()
                .push(tgt.clone());
            upper_neighbors
                .entry(tgt.clone())
                .or_default()
                .push(src.clone());
        } else if tgt_layer + 1 == src_layer {
            // tgt is upper, src is lower
            lower_neighbors
                .entry(tgt.clone())
                .or_default()
                .push(src.clone());
            upper_neighbors
                .entry(src.clone())
                .or_default()
                .push(tgt.clone());
        }
    }

    let mut best_order = layer_order.clone();
    let mut best_crossings = count_all_crossings(&best_order, edges, layers);

    let half = max_iterations / 2;

    for iter in 0..max_iterations {
        if iter < half {
            // Down sweep: fix layer i, reorder layer i+1
            for i in 0..num_layers.saturating_sub(1) {
                let fixed = &layer_order[i];
                let pos: HashMap<String, usize> = fixed
                    .iter()
                    .enumerate()
                    .map(|(pos, id)| (id.clone(), pos))
                    .collect();

                layer_order[i + 1].sort_by(|a, b| {
                    let bc_a = barycenter(a, &upper_neighbors, &pos);
                    let bc_b = barycenter(b, &upper_neighbors, &pos);
                    bc_a.partial_cmp(&bc_b).unwrap_or(std::cmp::Ordering::Equal)
                });
            }
        } else {
            // Up sweep: fix layer i, reorder layer i-1
            for i in (1..num_layers).rev() {
                let fixed = &layer_order[i];
                let pos: HashMap<String, usize> = fixed
                    .iter()
                    .enumerate()
                    .map(|(pos, id)| (id.clone(), pos))
                    .collect();

                layer_order[i - 1].sort_by(|a, b| {
                    let bc_a = barycenter(a, &lower_neighbors, &pos);
                    let bc_b = barycenter(b, &lower_neighbors, &pos);
                    bc_a.partial_cmp(&bc_b).unwrap_or(std::cmp::Ordering::Equal)
                });
            }
        }

        let crossings = count_all_crossings(&layer_order, edges, layers);
        if crossings < best_crossings {
            best_crossings = crossings;
            best_order = layer_order.clone();
        }
    }

    best_order
}

/// Compute barycenter: average position of neighbors in adjacent layer
fn barycenter(
    node: &str,
    neighbors: &HashMap<String, Vec<String>>,
    positions: &HashMap<String, usize>,
) -> f64 {
    let nbrs = match neighbors.get(node) {
        Some(n) => n,
        None => return f64::MAX, // no neighbors, put at end
    };

    let mut sum: f64 = 0.0;
    let mut count: usize = 0;

    for nbr in nbrs {
        if let Some(&pos) = positions.get(nbr) {
            sum += pos as f64;
            count += 1;
        }
    }

    if count == 0 {
        f64::MAX
    } else {
        sum / count as f64
    }
}

/// Count total edge crossings across all adjacent layer pairs
pub fn count_all_crossings(
    layer_order: &[Vec<String>],
    edges: &[(String, String)],
    layers: &HashMap<String, usize>,
) -> usize {
    let mut total = 0;

    for i in 0..layer_order.len().saturating_sub(1) {
        total += count_crossings_between(&layer_order[i], &layer_order[i + 1], edges, layers);
    }

    total
}

/// Count crossings between two adjacent layers
fn count_crossings_between(
    upper: &[String],
    lower: &[String],
    edges: &[(String, String)],
    layers: &HashMap<String, usize>,
) -> usize {
    // Position maps
    let upper_pos: HashMap<&str, usize> = upper
        .iter()
        .enumerate()
        .map(|(i, id)| (id.as_str(), i))
        .collect();
    let lower_pos: HashMap<&str, usize> = lower
        .iter()
        .enumerate()
        .map(|(i, id)| (id.as_str(), i))
        .collect();

    // Collect edges between these two layers as (upper_pos, lower_pos) pairs
    let mut edge_pairs: Vec<(usize, usize)> = Vec::new();

    for (src, tgt) in edges {
        let src_layer = layers.get(src.as_str()).copied().unwrap_or(usize::MAX);
        let tgt_layer = layers.get(tgt.as_str()).copied().unwrap_or(usize::MAX);

        if let (Some(&up), Some(&lp)) = if src_layer < tgt_layer {
            (upper_pos.get(src.as_str()), lower_pos.get(tgt.as_str()))
        } else {
            (upper_pos.get(tgt.as_str()), lower_pos.get(src.as_str()))
        } {
            edge_pairs.push((up, lp));
        }
    }

    // Count inversions (crossings) using simple O(n^2) for correctness
    let mut crossings = 0;
    for i in 0..edge_pairs.len() {
        for j in (i + 1)..edge_pairs.len() {
            let (u1, l1) = edge_pairs[i];
            let (u2, l2) = edge_pairs[j];
            if (u1 < u2 && l1 > l2) || (u1 > u2 && l1 < l2) {
                crossings += 1;
            }
        }
    }

    crossings
}

/// Reorder nodes within each layer so that children connected by stronger
/// edges appear earlier (closer to position 0). Works per-parent to preserve
/// the overall graph structure from crossing minimization.
///
/// For each parent in layer i, its children in layer i+1 are collected and
/// sorted by descending edge weight. The children are then placed at the same
/// set of positions they originally occupied, but in strength order.
/// Children shared by multiple parents are assigned to the parent with the
/// strongest connection to them; subsequent parents skip already-placed children.
pub fn strength_reorder(layer_order: &mut [Vec<String>], graph: &AdGraph) {
    for layer_idx in 0..layer_order.len().saturating_sub(1) {
        // Build position index for the next layer
        let next_layer = &layer_order[layer_idx + 1];
        let pos_index: HashMap<&str, usize> = next_layer
            .iter()
            .enumerate()
            .map(|(i, id)| (id.as_str(), i))
            .collect();

        // For each parent, collect children in next layer with edge weights
        struct ParentChildren {
            children: Vec<(String, f64)>, // (child_id, edge_weight)
        }

        let mut parent_groups: Vec<ParentChildren> = Vec::new();

        for parent_id in &layer_order[layer_idx] {
            let mut children: Vec<(String, f64)> = Vec::new();
            for edge in graph.edges() {
                if edge.source == *parent_id && pos_index.contains_key(edge.target.as_str()) {
                    children.push((edge.target.clone(), edge.weight));
                }
            }
            if children.len() > 1 {
                // Sort by weight descending (strongest first)
                children.sort_by(|a, b| {
                    b.1.partial_cmp(&a.1)
                        .unwrap_or(std::cmp::Ordering::Equal)
                });
                parent_groups.push(ParentChildren { children });
            }
        }

        // Apply reordering: process parents left-to-right.
        // Each parent swaps its children's positions so strongest is first.
        // Already-claimed children are skipped to avoid conflicts.
        let mut claimed: HashSet<String> = HashSet::new();
        let mut new_next_layer = layer_order[layer_idx + 1].clone();

        for group in &parent_groups {
            // Filter to unclaimed children only
            let unclaimed: Vec<&(String, f64)> = group
                .children
                .iter()
                .filter(|(id, _)| !claimed.contains(id))
                .collect();

            if unclaimed.len() < 2 {
                // Mark any single child as claimed too
                for (id, _) in &unclaimed {
                    claimed.insert(id.clone());
                }
                continue;
            }

            // Get current positions of these unclaimed children (sorted ascending)
            let mut current_positions: Vec<usize> = unclaimed
                .iter()
                .filter_map(|(id, _)| pos_index.get(id.as_str()).copied())
                .collect();
            current_positions.sort();

            // Place the strength-sorted children at these positions
            for (i, (child_id, _)) in unclaimed.iter().enumerate() {
                if i < current_positions.len() {
                    new_next_layer[current_positions[i]] = child_id.clone();
                }
                claimed.insert(child_id.clone());
            }
        }

        layer_order[layer_idx + 1] = new_next_layer;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_no_crossings() {
        let mut layers = HashMap::new();
        layers.insert("a".into(), 0);
        layers.insert("b".into(), 0);
        layers.insert("c".into(), 1);
        layers.insert("d".into(), 1);

        let edges = vec![
            ("a".into(), "c".into()),
            ("b".into(), "d".into()),
        ];

        let order = minimize_crossings(&layers, &edges, 24);
        let crossings = count_all_crossings(&order, &edges, &layers);
        assert_eq!(crossings, 0);
    }

    #[test]
    fn test_crossing_reduction() {
        let mut layers = HashMap::new();
        layers.insert("a".into(), 0);
        layers.insert("b".into(), 0);
        layers.insert("c".into(), 1);
        layers.insert("d".into(), 1);

        // Edges cross: a->d and b->c
        let edges = vec![
            ("a".into(), "d".into()),
            ("b".into(), "c".into()),
        ];

        let order = minimize_crossings(&layers, &edges, 24);
        let crossings = count_all_crossings(&order, &edges, &layers);
        assert_eq!(crossings, 0); // Should be resolved
    }
}
