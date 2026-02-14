use std::collections::HashMap;

/// Insert ghost (virtual) nodes for edges that span more than one layer.
/// Returns updated layers map and list of ghost nodes with their original edge ids.
pub fn insert_ghost_nodes(
    layers: &HashMap<String, usize>,
    edges: &[(String, String, String)], // (source_id, target_id, edge_id)
) -> (
    HashMap<String, usize>,       // updated layers (includes ghosts)
    Vec<GhostInfo>,               // ghost node info
    Vec<SegmentedEdge>,           // edges broken into segments
) {
    let mut new_layers = layers.clone();
    let mut ghosts: Vec<GhostInfo> = Vec::new();
    let mut segmented_edges: Vec<SegmentedEdge> = Vec::new();
    let mut ghost_counter: usize = 0;

    for (source, target, edge_id) in edges {
        let src_layer = match layers.get(source) {
            Some(l) => *l,
            None => continue,
        };
        let tgt_layer = match layers.get(target) {
            Some(l) => *l,
            None => continue,
        };

        let (min_layer, max_layer, is_reversed) = if src_layer <= tgt_layer {
            (src_layer, tgt_layer, false)
        } else {
            (tgt_layer, src_layer, true)
        };

        let span = max_layer - min_layer;

        if span <= 1 {
            // No ghost nodes needed, single segment
            segmented_edges.push(SegmentedEdge {
                original_edge_id: edge_id.clone(),
                segments: vec![(source.clone(), target.clone())],
            });
            continue;
        }

        // Insert ghost nodes at intermediate layers
        let mut chain: Vec<String> = Vec::new();
        if !is_reversed {
            chain.push(source.clone());
        } else {
            chain.push(target.clone());
        }

        for layer in (min_layer + 1)..max_layer {
            ghost_counter += 1;
            let ghost_id = format!("__ghost_{}_{}", edge_id, ghost_counter);
            new_layers.insert(ghost_id.clone(), layer);
            ghosts.push(GhostInfo {
                id: ghost_id.clone(),
                layer,
                original_edge_id: edge_id.clone(),
            });
            chain.push(ghost_id);
        }

        if !is_reversed {
            chain.push(target.clone());
        } else {
            chain.push(source.clone());
        }

        // Build segments from chain
        let mut segments: Vec<(String, String)> = Vec::new();
        for i in 0..chain.len() - 1 {
            if !is_reversed {
                segments.push((chain[i].clone(), chain[i + 1].clone()));
            } else {
                // Reverse the segments back to original direction
                segments.push((chain[chain.len() - 1 - i].clone(), chain[chain.len() - 2 - i].clone()));
            }
        }

        segmented_edges.push(SegmentedEdge {
            original_edge_id: edge_id.clone(),
            segments,
        });
    }

    (new_layers, ghosts, segmented_edges)
}

#[derive(Debug, Clone)]
pub struct GhostInfo {
    pub id: String,
    pub layer: usize,
    pub original_edge_id: String,
}

#[derive(Debug, Clone)]
pub struct SegmentedEdge {
    pub original_edge_id: String,
    pub segments: Vec<(String, String)>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_no_ghosts_needed() {
        let mut layers = HashMap::new();
        layers.insert("a".into(), 0);
        layers.insert("b".into(), 1);

        let edges = vec![("a".into(), "b".into(), "e1".into())];
        let (new_layers, ghosts, segs) = insert_ghost_nodes(&layers, &edges);

        assert_eq!(ghosts.len(), 0);
        assert_eq!(new_layers.len(), 2);
        assert_eq!(segs[0].segments.len(), 1);
    }

    #[test]
    fn test_ghost_insertion() {
        let mut layers = HashMap::new();
        layers.insert("a".into(), 0);
        layers.insert("b".into(), 3);

        let edges = vec![("a".into(), "b".into(), "e1".into())];
        let (new_layers, ghosts, segs) = insert_ghost_nodes(&layers, &edges);

        assert_eq!(ghosts.len(), 2); // layers 1 and 2
        assert_eq!(new_layers.len(), 4); // 2 original + 2 ghosts
        assert_eq!(segs[0].segments.len(), 3); // a->g1, g1->g2, g2->b
    }
}
