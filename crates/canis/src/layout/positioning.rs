use crate::types::{Direction, LayoutOptions};

/// Assign x,y coordinates to nodes based on their layer and position within layer.
///
/// Simple centered grid: each layer is evenly spaced, centered on the widest layer.
/// The crossing minimization step has already determined the optimal ordering.
pub fn assign_coordinates(
    layer_order: &[Vec<String>],
    _edges: &[(String, String)],
    opts: &LayoutOptions,
) -> Vec<(String, f64, f64)> {
    let mut positions: Vec<(String, f64, f64)> = Vec::new();

    // Find the widest layer for centering
    let max_width = layer_order
        .iter()
        .map(|layer| layer.len())
        .max()
        .unwrap_or(1);

    for (layer_idx, layer) in layer_order.iter().enumerate() {
        let layer_width = layer.len();
        // Center this layer relative to the widest layer
        let offset = ((max_width as f64 - layer_width as f64) / 2.0) * opts.node_spacing;

        for (pos_idx, node_id) in layer.iter().enumerate() {
            let (x, y) = match opts.direction {
                Direction::TopToBottom => {
                    let x = offset + pos_idx as f64 * opts.node_spacing;
                    let y = layer_idx as f64 * opts.layer_spacing;
                    (x, y)
                }
                Direction::LeftToRight => {
                    let x = layer_idx as f64 * opts.layer_spacing;
                    let y = offset + pos_idx as f64 * opts.node_spacing;
                    (x, y)
                }
            };

            positions.push((node_id.clone(), x, y));
        }
    }

    positions
}

// Approximate node dimensions (must match React rendering).
// Nodes are 180px wide; height varies but ~60px is typical.
pub const NODE_WIDTH: f64 = 180.0;
pub const NODE_HEIGHT: f64 = 60.0;

/// Compute the bounding box of the layout, accounting for node dimensions.
pub fn compute_bounds(positions: &[(String, f64, f64)]) -> (f64, f64) {
    if positions.is_empty() {
        return (0.0, 0.0);
    }

    let mut min_x = f64::MAX;
    let mut min_y = f64::MAX;
    let mut max_x: f64 = 0.0;
    let mut max_y: f64 = 0.0;

    for (_, x, y) in positions {
        if *x < min_x { min_x = *x; }
        if *y < min_y { min_y = *y; }
        if *x > max_x { max_x = *x; }
        if *y > max_y { max_y = *y; }
    }

    // Extent = range + node size + small buffer
    let width = (max_x - min_x) + NODE_WIDTH + 20.0;
    let height = (max_y - min_y) + NODE_HEIGHT + 20.0;
    (width, height)
}

/// Normalize positions so the minimum coordinate is (0, 0).
/// Returns the (min_x, min_y) that was subtracted.
pub fn normalize_positions(positions: &mut [(String, f64, f64)]) -> (f64, f64) {
    if positions.is_empty() {
        return (0.0, 0.0);
    }
    let min_x = positions.iter().map(|(_, x, _)| *x).fold(f64::MAX, f64::min);
    let min_y = positions.iter().map(|(_, _, y)| *y).fold(f64::MAX, f64::min);
    for pos in positions.iter_mut() {
        pos.1 -= min_x;
        pos.2 -= min_y;
    }
    (min_x, min_y)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_top_to_bottom() {
        let layers = vec![
            vec!["a".to_string(), "b".to_string()],
            vec!["c".to_string()],
        ];
        let edges = vec![
            ("a".to_string(), "c".to_string()),
        ];
        let opts = LayoutOptions::default();
        let positions = assign_coordinates(&layers, &edges, &opts);

        assert_eq!(positions.len(), 3);
        // Layer 0: a and b should be at y=0
        let a = positions.iter().find(|(id, _, _)| id == "a").unwrap();
        assert_eq!(a.2, 0.0);
        // Layer 1: c should be at y=layer_spacing
        let c = positions.iter().find(|(id, _, _)| id == "c").unwrap();
        assert_eq!(c.2, opts.layer_spacing);
    }
}
