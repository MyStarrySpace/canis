use crate::graph::AdGraph;

/// Export nodes and edges as CSV strings.
pub fn to_csv(graph: &AdGraph) -> (String, String) {
    let mut nodes_csv = String::new();
    nodes_csv.push_str("id,label,category,subtype,moduleId,description,roles,pmid\n");

    for id in graph.node_ids() {
        if let Some(node) = graph.node(&id) {
            nodes_csv.push_str(&format!(
                "{},{},{:?},{},{},{},{},{}\n",
                csv_escape(&node.id),
                csv_escape(&node.label),
                node.category,
                csv_escape(&node.subtype),
                csv_escape(&node.module_id),
                csv_escape(&node.description),
                csv_escape(&node.roles.join(";")),
                csv_escape(node.pmid.as_deref().unwrap_or("")),
            ));
        }
    }

    let mut edges_csv = String::new();
    edges_csv.push_str("id,source,target,relation,moduleId,causalConfidence,weight,mechanismDescription,keyInsight,pmid,firstAuthor,year,methodType\n");

    for edge in graph.edges() {
        edges_csv.push_str(&format!(
            "{},{},{},{:?},{},{:?},{},{},{},{},{},{},{}\n",
            csv_escape(&edge.id),
            csv_escape(&edge.source),
            csv_escape(&edge.target),
            edge.relation,
            csv_escape(&edge.module_id),
            edge.causal_confidence,
            edge.weight,
            csv_escape(edge.mechanism_description.as_deref().unwrap_or("")),
            csv_escape(edge.key_insight.as_deref().unwrap_or("")),
            csv_escape(edge.pmid.as_deref().unwrap_or("")),
            csv_escape(edge.first_author.as_deref().unwrap_or("")),
            edge.year.map(|y| y.to_string()).unwrap_or_default(),
            csv_escape(edge.method_type.as_deref().unwrap_or("")),
        ));
    }

    (nodes_csv, edges_csv)
}

fn csv_escape(s: &str) -> String {
    if s.contains(',') || s.contains('"') || s.contains('\n') {
        format!("\"{}\"", s.replace('"', "\"\""))
    } else {
        s.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_csv_export() {
        let g = AdGraph::from_json(
            r#"{
            "nodes": [
                {"id": "a", "label": "Node A", "category": "STOCK", "subtype": "Organelle", "moduleId": "M01", "description": "Test, with comma"}
            ],
            "edges": []
        }"#,
        )
        .unwrap();

        let (nodes, edges) = to_csv(&g);
        assert!(nodes.contains("id,label"));
        assert!(nodes.contains("\"Test, with comma\"")); // comma properly escaped
        assert!(edges.contains("id,source"));
    }
}
