use std::collections::HashMap;

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
