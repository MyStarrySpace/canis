use serde_json::{json, Value};

use crate::graph::AdGraph;

/// Export as NetworkX-compatible node-link JSON.
/// Loadable via `nx.node_link_graph(json.loads(data))` in Python.
pub fn to_networkx_json(graph: &AdGraph) -> String {
    let nodes: Vec<Value> = graph
        .node_ids()
        .iter()
        .filter_map(|id| {
            let node = graph.node(id)?;
            Some(json!({
                "id": node.id,
                "label": node.label,
                "category": node.category,
                "subtype": node.subtype,
                "moduleId": node.module_id,
                "description": node.description,
                "mechanism": node.mechanism,
                "roles": node.roles,
            }))
        })
        .collect();

    let links: Vec<Value> = graph
        .edges()
        .iter()
        .map(|edge| {
            json!({
                "source": edge.source,
                "target": edge.target,
                "id": edge.id,
                "relation": edge.relation,
                "moduleId": edge.module_id,
                "causalConfidence": edge.causal_confidence,
                "weight": edge.weight,
                "mechanismDescription": edge.mechanism_description,
                "keyInsight": edge.key_insight,
            })
        })
        .collect();

    let output = json!({
        "directed": true,
        "multigraph": false,
        "graph": {
            "name": "Alzheimer's Mechanistic Network",
            "node_count": graph.node_count(),
            "edge_count": graph.edge_count(),
        },
        "nodes": nodes,
        "links": links,
    });

    serde_json::to_string_pretty(&output).unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_networkx_export() {
        let g = AdGraph::from_json(
            r#"{
            "nodes": [
                {"id": "a", "label": "A", "category": "STOCK", "subtype": "Organelle", "moduleId": "M01", "description": "A"},
                {"id": "b", "label": "B", "category": "STATE", "subtype": "MetabolicState", "moduleId": "M01", "description": "B"}
            ],
            "edges": [
                {"id": "e1", "source": "a", "target": "b", "relation": "increases", "moduleId": "M01"}
            ]
        }"#,
        )
        .unwrap();

        let json = to_networkx_json(&g);
        let parsed: Value = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed["directed"], true);
        assert_eq!(parsed["nodes"].as_array().unwrap().len(), 2);
        assert_eq!(parsed["links"].as_array().unwrap().len(), 1);
    }
}
