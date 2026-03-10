use std::collections::HashMap;

use crate::graph::AdGraph;
use crate::types::{
    Bounds, ClusterInfo, Direction, EdgeRelation, EdgeRoute, GhostNode, GraphData, LayoutMode,
    LayoutOptions, LayoutResult, LayoutStats, NodeCategory, NodePosition, SbsfEdge, SbsfNode,
};

use super::clustering::{spectral_cluster, ClusterAssignment};
use super::sugiyama::flat_layout;

/// Two-level hierarchical Sugiyama layout:
///   1. Cluster nodes via spectral analysis (or module grouping)
///   2. Run Sugiyama on each cluster independently
///   3. Build a meta-graph (one node per cluster, cross-cluster edges)
///   4. Run Sugiyama on the meta-graph to position clusters
///   5. Compose: offset each cluster's internal layout by its meta-position
pub fn hierarchical_layout(graph: &AdGraph, opts: &LayoutOptions) -> LayoutResult {
    let cluster_opts = opts.cluster_options.clone().unwrap_or_default();

    // 1. Cluster the nodes
    let assignment = spectral_cluster(graph, &cluster_opts);

    // Degenerate: ≤1 cluster means clustering didn't help, fall back to flat
    if assignment.k <= 1 {
        return flat_layout(graph, opts);
    }

    // 2. Run Sugiyama on each cluster independently
    let internal_opts = LayoutOptions {
        layout_mode: LayoutMode::Flat,
        cluster_options: None,
        ..opts.clone()
    };

    let mut cluster_layouts: Vec<LayoutResult> = Vec::new();
    let mut cluster_bounds: Vec<(f64, f64)> = Vec::new();

    for cluster_nodes in &assignment.clusters {
        if cluster_nodes.is_empty() {
            cluster_layouts.push(empty_layout());
            cluster_bounds.push((0.0, 0.0));
            continue;
        }

        if cluster_nodes.len() == 1 {
            // Single node: trivial layout
            let np = NodePosition {
                id: cluster_nodes[0].clone(),
                x: 0.0,
                y: 0.0,
                layer: 0,
                position: 0,
            };
            cluster_layouts.push(LayoutResult {
                nodes: vec![np],
                ghost_nodes: vec![],
                edges: vec![],
                bounds: Bounds {
                    width: 100.0,
                    height: 100.0,
                },
                stats: LayoutStats {
                    crossing_count: 0,
                    layer_count: 1,
                    ghost_count: 0,
                },
                clusters: vec![],
            });
            cluster_bounds.push((100.0, 100.0));
            continue;
        }

        match graph.subgraph(cluster_nodes) {
            Ok(sub) => {
                let sub_result = flat_layout(&sub, &internal_opts);
                cluster_bounds.push((sub_result.bounds.width, sub_result.bounds.height));
                cluster_layouts.push(sub_result);
            }
            Err(_) => {
                cluster_layouts.push(empty_layout());
                cluster_bounds.push((0.0, 0.0));
            }
        }
    }

    // 3. Build meta-graph and run Sugiyama for ordering only
    //    (we use layer + position assignments, not the coordinates)
    let pad = cluster_opts.cluster_padding;
    let meta_graph = build_meta_graph(graph, &assignment);
    let meta_layout = flat_layout(
        &meta_graph,
        &LayoutOptions {
            direction: opts.direction.clone(),
            max_iterations: opts.max_iterations,
            layout_mode: LayoutMode::Flat,
            ..LayoutOptions::default()
        },
    );

    // 4. Group clusters into meta-layers using the meta-graph's layer/position
    let num_meta_layers = meta_layout
        .nodes
        .iter()
        .map(|n| n.layer + 1)
        .max()
        .unwrap_or(1);
    let mut meta_layers: Vec<Vec<usize>> = vec![Vec::new(); num_meta_layers];
    // Sort into layers, ordered by position within each layer
    let mut meta_node_info: Vec<(usize, usize, usize)> = Vec::new(); // (cluster_idx, layer, position)
    for n in &meta_layout.nodes {
        if let Some(ci) = n.id.strip_prefix("__cluster_").and_then(|s| s.parse::<usize>().ok()) {
            meta_node_info.push((ci, n.layer, n.position));
        }
    }
    for &(ci, layer, _pos) in &meta_node_info {
        if layer < meta_layers.len() {
            meta_layers[layer].push(ci);
        }
    }
    // Sort each meta-layer by position
    for layer in &mut meta_layers {
        layer.sort_by_key(|ci| {
            meta_node_info
                .iter()
                .find(|(c, _, _)| *c == *ci)
                .map(|(_, _, p)| *p)
                .unwrap_or(0)
        });
    }

    // 5. Tight packing: compute cluster top-left offsets based on actual sizes
    let mut cluster_offsets: HashMap<usize, (f64, f64)> = HashMap::new();

    match opts.direction {
        Direction::LeftToRight => {
            // Flow axis = x (horizontal, layers), cross axis = y (vertical, within layer)
            let mut flow_x = 0.0;
            for layer in &meta_layers {
                if layer.is_empty() {
                    continue;
                }
                // Max width in this layer determines how far to advance flow_x
                let layer_max_w = layer
                    .iter()
                    .map(|&ci| cluster_bounds[ci].0)
                    .fold(0.0f64, f64::max);
                // Stack clusters vertically, centered on y=0
                let total_h: f64 = layer.iter().map(|&ci| cluster_bounds[ci].1).sum::<f64>()
                    + pad * (layer.len().saturating_sub(1)) as f64;
                let mut cross_y = -total_h / 2.0;
                for &ci in layer {
                    let (cw, ch) = cluster_bounds[ci];
                    let x = flow_x + (layer_max_w - cw) / 2.0;
                    cluster_offsets.insert(ci, (x, cross_y));
                    cross_y += ch + pad;
                }
                flow_x += layer_max_w + pad;
            }
        }
        Direction::TopToBottom => {
            // Flow axis = y (vertical, layers), cross axis = x (horizontal, within layer)
            let mut flow_y = 0.0;
            for layer in &meta_layers {
                if layer.is_empty() {
                    continue;
                }
                let layer_max_h = layer
                    .iter()
                    .map(|&ci| cluster_bounds[ci].1)
                    .fold(0.0f64, f64::max);
                let total_w: f64 = layer.iter().map(|&ci| cluster_bounds[ci].0).sum::<f64>()
                    + pad * (layer.len().saturating_sub(1)) as f64;
                let mut cross_x = -total_w / 2.0;
                for &ci in layer {
                    let (cw, ch) = cluster_bounds[ci];
                    let y = flow_y + (layer_max_h - ch) / 2.0;
                    cluster_offsets.insert(ci, (cross_x, y));
                    cross_x += cw + pad;
                }
                flow_y += layer_max_h + pad;
            }
        }
    }

    // 6. Compose all cluster layouts into global coordinates
    let mut all_nodes: Vec<NodePosition> = Vec::new();
    let mut all_ghosts: Vec<GhostNode> = Vec::new();
    let mut all_edges: Vec<EdgeRoute> = Vec::new();
    let mut all_clusters: Vec<ClusterInfo> = Vec::new();

    for (cluster_idx, (cluster_node_ids, cluster_layout)) in assignment
        .clusters
        .iter()
        .zip(cluster_layouts.iter())
        .enumerate()
    {
        let (offset_x, offset_y) = cluster_offsets
            .get(&cluster_idx)
            .copied()
            .unwrap_or((0.0, 0.0));
        let (cw, ch) = cluster_bounds[cluster_idx];

        all_clusters.push(ClusterInfo {
            id: cluster_idx,
            node_ids: cluster_node_ids.clone(),
            x: offset_x,
            y: offset_y,
            width: cw,
            height: ch,
        });

        for node in &cluster_layout.nodes {
            all_nodes.push(NodePosition {
                id: node.id.clone(),
                x: node.x + offset_x,
                y: node.y + offset_y,
                layer: node.layer,
                position: node.position,
            });
        }

        for ghost in &cluster_layout.ghost_nodes {
            all_ghosts.push(GhostNode {
                id: ghost.id.clone(),
                x: ghost.x + offset_x,
                y: ghost.y + offset_y,
                layer: ghost.layer,
                original_edge_id: ghost.original_edge_id.clone(),
            });
        }

        for edge in &cluster_layout.edges {
            all_edges.push(edge.clone());
        }
    }

    // 7. Add cross-cluster edges as single-segment direct routes
    for edge in graph.edges() {
        let src_cluster = assignment.assignments.get(&edge.source).copied().unwrap_or(0);
        let tgt_cluster = assignment.assignments.get(&edge.target).copied().unwrap_or(0);
        if src_cluster != tgt_cluster {
            all_edges.push(EdgeRoute {
                from: edge.source.clone(),
                to: edge.target.clone(),
                original_edge_id: edge.id.clone(),
                is_first: true,
                is_last: true,
            });
        }
    }

    // 8. Compute overall bounds
    let mut max_x: f64 = 0.0;
    let mut max_y: f64 = 0.0;
    for node in &all_nodes {
        if node.x > max_x { max_x = node.x; }
        if node.y > max_y { max_y = node.y; }
    }
    for ghost in &all_ghosts {
        if ghost.x > max_x { max_x = ghost.x; }
        if ghost.y > max_y { max_y = ghost.y; }
    }

    let total_crossings: usize = cluster_layouts
        .iter()
        .map(|cl| cl.stats.crossing_count)
        .sum();

    LayoutResult {
        nodes: all_nodes,
        ghost_nodes: all_ghosts.clone(),
        edges: all_edges,
        bounds: Bounds {
            width: max_x + 100.0,
            height: max_y + 100.0,
        },
        stats: LayoutStats {
            crossing_count: total_crossings,
            layer_count: num_meta_layers,
            ghost_count: all_ghosts.len(),
        },
        clusters: all_clusters,
    }
}

/// Build a synthetic AdGraph representing the meta-graph:
/// one node per cluster, one edge per cross-cluster edge pair.
fn build_meta_graph(graph: &AdGraph, assignment: &ClusterAssignment) -> AdGraph {
    let nodes: Vec<SbsfNode> = (0..assignment.k)
        .map(|i| SbsfNode {
            id: format!("__cluster_{}", i),
            label: format!("Cluster {}", i),
            category: NodeCategory::Process,
            subtype: "Cluster".to_string(),
            module_id: format!("C{:02}", i),
            description: format!(
                "Cluster {} ({} nodes)",
                i,
                assignment.clusters[i].len()
            ),
            mechanism: None,
            roles: vec![],
            pmid: None,
            notes: None,
            x: 0.0,
            y: 0.0,
        })
        .collect();

    // Count cross-cluster edges (deduplicated by cluster pair)
    let mut meta_edge_counts: HashMap<(usize, usize), usize> = HashMap::new();
    for edge in graph.edges() {
        let src_c = assignment.assignments.get(&edge.source).copied().unwrap_or(0);
        let tgt_c = assignment.assignments.get(&edge.target).copied().unwrap_or(0);
        if src_c != tgt_c {
            *meta_edge_counts.entry((src_c, tgt_c)).or_insert(0) += 1;
        }
    }

    let edges: Vec<SbsfEdge> = meta_edge_counts
        .iter()
        .enumerate()
        .map(|(i, ((src, tgt), _count))| SbsfEdge {
            id: format!("__meta_e_{}", i),
            source: format!("__cluster_{}", src),
            target: format!("__cluster_{}", tgt),
            relation: EdgeRelation::Increases,
            module_id: "META".to_string(),
            causal_confidence: crate::types::CausalConfidence::L4,
            mechanism_description: None,
            key_insight: None,
            pmid: None,
            first_author: None,
            year: None,
            method_type: None,
            notes: None,
            weight: 1.0,
        })
        .collect();

    AdGraph::from_data(GraphData {
        nodes,
        edges,
        modules: vec![],
        confidence_weights: None,
        confidence_scheme: None,
    })
    .expect("meta-graph construction should not fail")
}

fn empty_layout() -> LayoutResult {
    LayoutResult {
        nodes: vec![],
        ghost_nodes: vec![],
        edges: vec![],
        bounds: Bounds {
            width: 0.0,
            height: 0.0,
        },
        stats: LayoutStats {
            crossing_count: 0,
            layer_count: 0,
            ghost_count: 0,
        },
        clusters: vec![],
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{ClusterCountMode, ClusterOptions, LayoutMode};

    fn make_opts(mode: ClusterCountMode, hybrid: bool) -> LayoutOptions {
        LayoutOptions {
            layout_mode: LayoutMode::Hierarchical,
            cluster_options: Some(ClusterOptions {
                count_mode: mode,
                hybrid_modules: hybrid,
                cluster_padding: 50.0,
                min_cluster_size: 1,
                ..ClusterOptions::default()
            }),
            ..LayoutOptions::default()
        }
    }

    #[test]
    fn test_hierarchical_two_modules() {
        let g = AdGraph::from_json(
            r#"{
            "nodes": [
                {"id": "a", "label": "A", "category": "STOCK", "subtype": "X", "moduleId": "M01", "description": "A"},
                {"id": "b", "label": "B", "category": "STOCK", "subtype": "X", "moduleId": "M01", "description": "B"},
                {"id": "c", "label": "C", "category": "STOCK", "subtype": "X", "moduleId": "M02", "description": "C"},
                {"id": "d", "label": "D", "category": "STOCK", "subtype": "X", "moduleId": "M02", "description": "D"}
            ],
            "edges": [
                {"id": "e1", "source": "a", "target": "b", "relation": "increases", "moduleId": "M01"},
                {"id": "e2", "source": "c", "target": "d", "relation": "increases", "moduleId": "M02"},
                {"id": "e3", "source": "b", "target": "c", "relation": "increases", "moduleId": "M01"}
            ]
        }"#,
        )
        .unwrap();

        let result = hierarchical_layout(
            &g,
            &make_opts(ClusterCountMode::ModuleCount, true),
        );

        // All 4 nodes should be positioned
        assert_eq!(result.nodes.len(), 4);
        // Should have 2 clusters
        assert_eq!(result.clusters.len(), 2);
        // Cross-cluster edge (b→c) should be in the edge routes
        let cross = result
            .edges
            .iter()
            .any(|e| e.original_edge_id == "e3" && e.is_first && e.is_last);
        assert!(cross, "cross-cluster edge should be a direct route");
        assert!(result.bounds.width > 0.0);
        assert!(result.bounds.height > 0.0);
    }

    #[test]
    fn test_hierarchical_spectral() {
        let g = AdGraph::from_json(
            r#"{
            "nodes": [
                {"id": "a", "label": "A", "category": "STOCK", "subtype": "X", "moduleId": "M01", "description": "A"},
                {"id": "b", "label": "B", "category": "STOCK", "subtype": "X", "moduleId": "M01", "description": "B"},
                {"id": "c", "label": "C", "category": "STOCK", "subtype": "X", "moduleId": "M02", "description": "C"},
                {"id": "d", "label": "D", "category": "STOCK", "subtype": "X", "moduleId": "M02", "description": "D"}
            ],
            "edges": [
                {"id": "e1", "source": "a", "target": "b", "relation": "increases", "moduleId": "M01"},
                {"id": "e2", "source": "c", "target": "d", "relation": "increases", "moduleId": "M02"}
            ]
        }"#,
        )
        .unwrap();

        let result = hierarchical_layout(&g, &make_opts(ClusterCountMode::Auto, false));
        assert_eq!(result.nodes.len(), 4);
        assert!(result.clusters.len() >= 2);
    }

    #[test]
    fn test_single_node_per_cluster() {
        // Edge case: 2 nodes, no edges, module-based → 2 clusters of 1 each
        let g = AdGraph::from_json(
            r#"{
            "nodes": [
                {"id": "a", "label": "A", "category": "STOCK", "subtype": "X", "moduleId": "M01", "description": "A"},
                {"id": "b", "label": "B", "category": "STOCK", "subtype": "X", "moduleId": "M02", "description": "B"}
            ],
            "edges": []
        }"#,
        )
        .unwrap();

        let result = hierarchical_layout(
            &g,
            &make_opts(ClusterCountMode::ModuleCount, true),
        );
        assert_eq!(result.nodes.len(), 2);
        assert_eq!(result.clusters.len(), 2);
    }

    #[test]
    fn test_fallback_to_flat_on_single_cluster() {
        let g = AdGraph::from_json(
            r#"{
            "nodes": [
                {"id": "a", "label": "A", "category": "STOCK", "subtype": "X", "moduleId": "M01", "description": "A"},
                {"id": "b", "label": "B", "category": "STOCK", "subtype": "X", "moduleId": "M01", "description": "B"}
            ],
            "edges": [
                {"id": "e1", "source": "a", "target": "b", "relation": "increases", "moduleId": "M01"}
            ]
        }"#,
        )
        .unwrap();

        // Module-based with all same module → 1 cluster → falls back to flat
        let result = hierarchical_layout(
            &g,
            &make_opts(ClusterCountMode::ModuleCount, true),
        );
        assert_eq!(result.nodes.len(), 2);
        assert!(result.clusters.is_empty()); // flat layout has no clusters
    }
}
