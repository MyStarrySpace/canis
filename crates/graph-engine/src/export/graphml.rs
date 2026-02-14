use crate::graph::AdGraph;

/// Export as GraphML XML (Cytoscape/yEd compatible).
pub fn to_graphml(graph: &AdGraph) -> String {
    let mut xml = String::new();
    xml.push_str(r#"<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphstyle.org/xmlns"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://graphml.graphstyle.org/xmlns http://graphml.graphstyle.org/xmlns/1.0/graphml.xsd">
"#);

    // Node attribute keys
    xml.push_str(r#"  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="category" for="node" attr.name="category" attr.type="string"/>
  <key id="subtype" for="node" attr.name="subtype" attr.type="string"/>
  <key id="moduleId" for="node" attr.name="moduleId" attr.type="string"/>
  <key id="description" for="node" attr.name="description" attr.type="string"/>
"#);

    // Edge attribute keys
    xml.push_str(r#"  <key id="relation" for="edge" attr.name="relation" attr.type="string"/>
  <key id="edgeModuleId" for="edge" attr.name="moduleId" attr.type="string"/>
  <key id="causalConfidence" for="edge" attr.name="causalConfidence" attr.type="string"/>
  <key id="weight" for="edge" attr.name="weight" attr.type="double"/>
"#);

    xml.push_str(r#"  <graph id="G" edgedefault="directed">
"#);

    // Nodes
    for id in graph.node_ids() {
        if let Some(node) = graph.node(&id) {
            xml.push_str(&format!(r#"    <node id="{}">
      <data key="label">{}</data>
      <data key="category">{:?}</data>
      <data key="subtype">{}</data>
      <data key="moduleId">{}</data>
      <data key="description">{}</data>
    </node>
"#,
                escape_xml(&node.id),
                escape_xml(&node.label),
                node.category,
                escape_xml(&node.subtype),
                escape_xml(&node.module_id),
                escape_xml(&node.description),
            ));
        }
    }

    // Edges
    for edge in graph.edges() {
        xml.push_str(&format!(r#"    <edge id="{}" source="{}" target="{}">
      <data key="relation">{:?}</data>
      <data key="edgeModuleId">{}</data>
      <data key="causalConfidence">{:?}</data>
      <data key="weight">{}</data>
    </edge>
"#,
            escape_xml(&edge.id),
            escape_xml(&edge.source),
            escape_xml(&edge.target),
            edge.relation,
            escape_xml(&edge.module_id),
            edge.causal_confidence,
            edge.weight,
        ));
    }

    xml.push_str("  </graph>\n</graphml>\n");
    xml
}

fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_graphml_export() {
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

        let xml = to_graphml(&g);
        assert!(xml.contains("<graphml"));
        assert!(xml.contains(r#"<node id="a">"#));
        assert!(xml.contains(r#"<edge id="e1""#));
    }
}
