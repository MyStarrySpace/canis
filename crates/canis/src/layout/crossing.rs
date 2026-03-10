use std::collections::HashMap;

use crate::graph::AdGraph;

/// Barycenter crossing minimization, ported from the original alz-market-viz
/// TypeScript implementation (layout-network.ts).
///
/// Performs alternating forward and backward sweeps: each layer is sorted by
/// the average position of its connected neighbors in the adjacent (already-
/// fixed) layer. This is the standard Sugiyama barycenter heuristic.
///
/// No local-swap refinement phase — the original TS never had one, and the
/// swap loop was the cause of WASM hangs on larger graphs.
pub fn minimize_crossings(
    layers: &HashMap<String, usize>,
    edges: &[(String, String)],
    max_iterations: u32,
    module_map: Option<&HashMap<String, String>>,
) -> Vec<Vec<String>> {
    let num_layers = layers.values().copied().max().unwrap_or(0) + 1;

    // Build initial ordering: group nodes by layer, sorted by (moduleId, nodeId)
    // so that nodes from the same module cluster together.
    let mut layer_order: Vec<Vec<String>> = vec![Vec::new(); num_layers];
    for (id, &layer) in layers {
        layer_order[layer].push(id.clone());
    }
    let empty = String::new();
    for layer in &mut layer_order {
        layer.sort_by(|a, b| {
            let ma = module_map.and_then(|m| m.get(a)).unwrap_or(&empty);
            let mb = module_map.and_then(|m| m.get(b)).unwrap_or(&empty);
            ma.cmp(mb).then_with(|| a.cmp(b))
        });
    }

    // Position of each node within its layer
    let mut positions: HashMap<String, usize> = HashMap::new();
    for layer in &layer_order {
        for (idx, id) in layer.iter().enumerate() {
            positions.insert(id.clone(), idx);
        }
    }

    // Pre-build adjacency: for each node, which edges connect to the previous
    // or next layer? We only care about edges between adjacent layers.
    let mut preds_in_prev: HashMap<String, Vec<String>> = HashMap::new();
    let mut succs_in_next: HashMap<String, Vec<String>> = HashMap::new();

    for (src, tgt) in edges {
        let src_layer = layers.get(src).copied().unwrap_or(0);
        let tgt_layer = layers.get(tgt).copied().unwrap_or(0);

        if src_layer + 1 == tgt_layer {
            // src is in layer L, tgt is in layer L+1
            succs_in_next.entry(src.clone()).or_default().push(tgt.clone());
            preds_in_prev.entry(tgt.clone()).or_default().push(src.clone());
        } else if tgt_layer + 1 == src_layer {
            // tgt is in layer L, src is in layer L+1  (reversed edge)
            succs_in_next.entry(tgt.clone()).or_default().push(src.clone());
            preds_in_prev.entry(src.clone()).or_default().push(tgt.clone());
        }
    }

    let sorted_layer_indices: Vec<usize> = (0..num_layers).collect();

    let mut best_order = layer_order.clone();
    let mut best_crossings = count_all_crossings(&best_order, edges, layers);

    for _iter in 0..max_iterations {
        // Forward pass: for layers 1..n, sort by avg position of predecessors
        for &li in sorted_layer_indices.iter().skip(1) {
            let node_ids = &layer_order[li];
            let mut barycenters: Vec<(String, f64)> = Vec::with_capacity(node_ids.len());

            for id in node_ids {
                if let Some(preds) = preds_in_prev.get(id) {
                    let pred_positions: Vec<f64> = preds
                        .iter()
                        .filter_map(|p| positions.get(p).map(|&pos| pos as f64))
                        .collect();
                    if !pred_positions.is_empty() {
                        let avg = pred_positions.iter().sum::<f64>() / pred_positions.len() as f64;
                        barycenters.push((id.clone(), avg));
                    } else {
                        barycenters.push((id.clone(), positions.get(id).copied().unwrap_or(0) as f64));
                    }
                } else {
                    barycenters.push((id.clone(), positions.get(id).copied().unwrap_or(0) as f64));
                }
            }

            barycenters.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));

            layer_order[li] = barycenters.iter().map(|(id, _)| id.clone()).collect();
            for (idx, id) in layer_order[li].iter().enumerate() {
                positions.insert(id.clone(), idx);
            }
        }

        // Backward pass: for layers n-2..0, sort by avg position of successors
        for &li in sorted_layer_indices.iter().rev().skip(1) {
            let node_ids = &layer_order[li];
            let mut barycenters: Vec<(String, f64)> = Vec::with_capacity(node_ids.len());

            for id in node_ids {
                if let Some(succs) = succs_in_next.get(id) {
                    let succ_positions: Vec<f64> = succs
                        .iter()
                        .filter_map(|s| positions.get(s).map(|&pos| pos as f64))
                        .collect();
                    if !succ_positions.is_empty() {
                        let avg = succ_positions.iter().sum::<f64>() / succ_positions.len() as f64;
                        barycenters.push((id.clone(), avg));
                    } else {
                        barycenters.push((id.clone(), positions.get(id).copied().unwrap_or(0) as f64));
                    }
                } else {
                    barycenters.push((id.clone(), positions.get(id).copied().unwrap_or(0) as f64));
                }
            }

            barycenters.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));

            layer_order[li] = barycenters.iter().map(|(id, _)| id.clone()).collect();
            for (idx, id) in layer_order[li].iter().enumerate() {
                positions.insert(id.clone(), idx);
            }
        }

        let crossings = count_all_crossings(&layer_order, edges, layers);
        if crossings < best_crossings {
            best_crossings = crossings;
            best_order = layer_order.clone();
        }

        if best_crossings == 0 {
            break;
        }
    }

    best_order
}

/// Count total edge crossings across all adjacent layer pairs.
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

/// Count crossings between two adjacent layers.
fn count_crossings_between(
    upper: &[String],
    lower: &[String],
    edges: &[(String, String)],
    layers: &HashMap<String, usize>,
) -> usize {
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
/// edges appear earlier (closer to position 0).
pub fn strength_reorder(layer_order: &mut [Vec<String>], graph: &AdGraph) {
    use std::collections::HashSet;

    for layer_idx in 0..layer_order.len().saturating_sub(1) {
        let next_layer = &layer_order[layer_idx + 1];
        let pos_index: HashMap<&str, usize> = next_layer
            .iter()
            .enumerate()
            .map(|(i, id)| (id.as_str(), i))
            .collect();

        struct ParentChildren {
            children: Vec<(String, f64)>,
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
                children.sort_by(|a, b| {
                    b.1.partial_cmp(&a.1)
                        .unwrap_or(std::cmp::Ordering::Equal)
                });
                parent_groups.push(ParentChildren { children });
            }
        }

        let mut claimed: HashSet<String> = HashSet::new();
        let mut new_next_layer = layer_order[layer_idx + 1].clone();

        for group in &parent_groups {
            let unclaimed: Vec<&(String, f64)> = group
                .children
                .iter()
                .filter(|(id, _)| !claimed.contains(id))
                .collect();

            if unclaimed.len() < 2 {
                for (id, _) in &unclaimed {
                    claimed.insert(id.clone());
                }
                continue;
            }

            let mut current_positions: Vec<usize> = unclaimed
                .iter()
                .filter_map(|(id, _)| pos_index.get(id.as_str()).copied())
                .collect();
            current_positions.sort();

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

        let order = minimize_crossings(&layers, &edges, 24, None);
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

        let order = minimize_crossings(&layers, &edges, 24, None);
        let crossings = count_all_crossings(&order, &edges, &layers);
        assert_eq!(crossings, 0);
    }
}
