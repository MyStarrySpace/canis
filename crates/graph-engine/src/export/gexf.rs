use crate::graph::AdGraph;

/// Export as GEXF XML (Gephi compatible).
pub fn to_gexf(graph: &AdGraph) -> String {
    let mut xml = String::new();
    xml.push_str(r#"<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://gexf.net/1.3" version="1.3"
      xmlns:viz="http://gexf.net/1.3/viz"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://gexf.net/1.3 http://gexf.net/1.3/gexf.xsd">
  <meta>
    <creator>mechanistic-graph</creator>
    <description>Alzheimer's Mechanistic Network</description>
  </meta>
  <graph defaultedgetype="directed">
    <attributes class="node">
      <attribute id="0" title="category" type="string"/>
      <attribute id="1" title="subtype" type="string"/>
      <attribute id="2" title="moduleId" type="string"/>
      <attribute id="3" title="description" type="string"/>
    </attributes>
    <attributes class="edge">
      <attribute id="0" title="relation" type="string"/>
      <attribute id="1" title="moduleId" type="string"/>
      <attribute id="2" title="causalConfidence" type="string"/>
    </attributes>
    <nodes>
"#);

    for id in graph.node_ids() {
        if let Some(node) = graph.node(&id) {
            xml.push_str(&format!(
                r#"      <node id="{}" label="{}">
        <attvalues>
          <attvalue for="0" value="{}"/>
          <attvalue for="1" value="{}"/>
          <attvalue for="2" value="{}"/>
          <attvalue for="3" value="{}"/>
        </attvalues>
      </node>
"#,
                escape_xml(&node.id),
                escape_xml(&node.label),
                escape_xml(&format!("{:?}", node.category)),
                escape_xml(&node.subtype),
                escape_xml(&node.module_id),
                escape_xml(&node.description),
            ));
        }
    }

    xml.push_str("    </nodes>\n    <edges>\n");

    for edge in graph.edges() {
        xml.push_str(&format!(
            r#"      <edge id="{}" source="{}" target="{}" weight="{}">
        <attvalues>
          <attvalue for="0" value="{}"/>
          <attvalue for="1" value="{}"/>
          <attvalue for="2" value="{}"/>
        </attvalues>
      </edge>
"#,
            escape_xml(&edge.id),
            escape_xml(&edge.source),
            escape_xml(&edge.target),
            edge.weight,
            escape_xml(&format!("{:?}", edge.relation)),
            escape_xml(&edge.module_id),
            escape_xml(&format!("{:?}", edge.causal_confidence)),
        ));
    }

    xml.push_str("    </edges>\n  </graph>\n</gexf>\n");
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
    fn test_gexf_export() {
        let g = AdGraph::from_json(
            r#"{
            "nodes": [
                {"id": "a", "label": "A", "category": "STOCK", "subtype": "Organelle", "moduleId": "M01", "description": "A"}
            ],
            "edges": []
        }"#,
        )
        .unwrap();

        let xml = to_gexf(&g);
        assert!(xml.contains("<gexf"));
        assert!(xml.contains(r#"<node id="a""#));
    }
}
