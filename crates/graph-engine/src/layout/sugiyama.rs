use std::collections::HashMap;

use crate::graph::AdGraph;
use crate::types::{
    Bounds, EdgeRoute, GhostNode, LayoutOptions, LayoutResult, LayoutStats, NodePosition,
};

use super::crossing::{count_all_crossings, minimize_crossings};
use super::ghost::insert_ghost_nodes;
use super::layering::assign_layers;
use super::positioning::{assign_coordinates, compute_bounds};

/// Run the full Sugiyama layout algorithm on the graph.
pub fn layout(graph: &AdGraph, opts: &LayoutOptions) -> LayoutResult {
    // Step 1: Assign layers (longest-path, handles cycles)
    let layers = assign_layers(graph);

    // Step 2: Collect edges as (source, target, edge_id)
    let edge_tuples: Vec<(String, String, String)> = graph
        .edges()
        .iter()
        .map(|e| (e.source.clone(), e.target.clone(), e.id.clone()))
        .collect();

    // Step 3: Insert ghost nodes for multi-layer edges
    let (augmented_layers, ghost_infos, segmented_edges) =
        insert_ghost_nodes(&layers, &edge_tuples);

    // Step 4: Collect all edge segments for crossing minimization
    let all_segments: Vec<(String, String)> = segmented_edges
        .iter()
        .flat_map(|se| se.segments.clone())
        .collect();

    // Step 5: Minimize crossings via barycentric ordering
    let layer_order = minimize_crossings(&augmented_layers, &all_segments, opts.max_iterations);

    // Step 6: Assign coordinates
    let coord_list = assign_coordinates(&layer_order, opts);
    let coord_map: HashMap<String, (f64, f64)> = coord_list
        .iter()
        .map(|(id, x, y)| (id.clone(), (*x, *y)))
        .collect();

    // Step 7: Build position maps for layer/position lookup
    let mut node_layer_pos: HashMap<String, (usize, usize)> = HashMap::new();
    for (layer_idx, layer) in layer_order.iter().enumerate() {
        for (pos_idx, id) in layer.iter().enumerate() {
            node_layer_pos.insert(id.clone(), (layer_idx, pos_idx));
        }
    }

    // Step 8: Build output

    // Real node positions (exclude ghosts)
    let nodes: Vec<NodePosition> = graph
        .node_ids()
        .iter()
        .filter_map(|id| {
            let (x, y) = coord_map.get(id)?;
            let (layer, position) = node_layer_pos.get(id)?;
            Some(NodePosition {
                id: id.clone(),
                x: *x,
                y: *y,
                layer: *layer,
                position: *position,
            })
        })
        .collect();

    // Ghost node positions
    let ghost_nodes: Vec<GhostNode> = ghost_infos
        .iter()
        .filter_map(|gi| {
            let (x, y) = coord_map.get(&gi.id)?;
            Some(GhostNode {
                id: gi.id.clone(),
                x: *x,
                y: *y,
                layer: gi.layer,
                original_edge_id: gi.original_edge_id.clone(),
            })
        })
        .collect();

    // Edge routes
    let edges: Vec<EdgeRoute> = segmented_edges
        .iter()
        .flat_map(|se| {
            let num_segments = se.segments.len();
            se.segments
                .iter()
                .enumerate()
                .map(move |(i, (from, to))| EdgeRoute {
                    from: from.clone(),
                    to: to.clone(),
                    original_edge_id: se.original_edge_id.clone(),
                    is_first: i == 0,
                    is_last: i == num_segments - 1,
                })
        })
        .collect();

    // Bounds
    let (width, height) = compute_bounds(&coord_list);

    // Stats
    let crossing_count = count_all_crossings(&layer_order, &all_segments, &augmented_layers);

    LayoutResult {
        nodes,
        ghost_nodes: ghost_nodes.clone(),
        edges,
        bounds: Bounds { width, height },
        stats: LayoutStats {
            crossing_count,
            layer_count: layer_order.len(),
            ghost_count: ghost_nodes.len(),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_layout_basic() {
        let g = AdGraph::from_json(
            r#"{
            "nodes": [
                {"id": "a", "label": "A", "category": "STOCK", "subtype": "Organelle", "moduleId": "M01", "description": "A"},
                {"id": "b", "label": "B", "category": "STATE", "subtype": "MetabolicState", "moduleId": "M01", "description": "B"},
                {"id": "c", "label": "C", "category": "PROCESS", "subtype": "BiologicalProcess", "moduleId": "M02", "description": "C"}
            ],
            "edges": [
                {"id": "e1", "source": "a", "target": "b", "relation": "increases", "moduleId": "M01"},
                {"id": "e2", "source": "b", "target": "c", "relation": "decreases", "moduleId": "M01"}
            ]
        }"#,
        )
        .unwrap();

        let result = layout(&g, &LayoutOptions::default());
        assert_eq!(result.nodes.len(), 3);
        assert_eq!(result.stats.layer_count, 3);
        assert!(result.bounds.width > 0.0);
        assert!(result.bounds.height > 0.0);
    }

    #[test]
    fn test_layout_with_long_edge() {
        let g = AdGraph::from_json(
            r#"{
            "nodes": [
                {"id": "a", "label": "A", "category": "STOCK", "subtype": "Organelle", "moduleId": "M01", "description": "A"},
                {"id": "b", "label": "B", "category": "STATE", "subtype": "MetabolicState", "moduleId": "M01", "description": "B"},
                {"id": "c", "label": "C", "category": "PROCESS", "subtype": "BiologicalProcess", "moduleId": "M02", "description": "C"}
            ],
            "edges": [
                {"id": "e1", "source": "a", "target": "b", "relation": "increases", "moduleId": "M01"},
                {"id": "e2", "source": "b", "target": "c", "relation": "increases", "moduleId": "M01"},
                {"id": "e3", "source": "a", "target": "c", "relation": "increases", "moduleId": "M01"}
            ]
        }"#,
        )
        .unwrap();

        let result = layout(&g, &LayoutOptions::default());
        // a->c spans 2 layers, should have 1 ghost node
        assert!(result.stats.ghost_count >= 1);
    }
}
