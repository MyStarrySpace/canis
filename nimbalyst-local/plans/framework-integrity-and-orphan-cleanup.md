---
planStatus:
  planId: plan-framework-integrity
  title: Framework Integrity Verification & Orphan Node Cleanup
  status: ready-for-development
  planType: feature
  priority: high
  owner: developer
  stakeholders:
    - developer
  tags:
    - data-quality
    - citation-integrity
    - layout
    - graph
  created: "2026-03-08"
  updated: "2026-03-08T15:37:00.343Z"
  progress: 0
---

# Framework Integrity Verification & Orphan Node Cleanup

## Goals
- Make the CANIS demo graph legible by removing unconnected nodes from the layout
- Create a citation integrity script that validates edge metadata against PubMed
- Establish a quality baseline so data gaps are visible and trackable

## Problem Description

The CANIS demo graph is currently unusable due to two compounding issues:

**1. Orphan node clutter (176/379 nodes = 46%)**
Nodes with zero edges get placed in the first Sugiyama layer, creating a massive wall of disconnected rectangles that obscures the actual network. These nodes exist in the Excel framework but have no edges connecting them. Entire modules are fully orphaned (M14: 55 nodes, M13: 25 nodes, M15: 17 nodes).

**2. Zero citation coverage (0/293 edges have PMIDs)**
No edge in the current dataset has a PMID, first author, or year. The `mechanismDescription` field is populated on 273/293 edges, but there is no traceable citation linking any causal claim to primary literature. This makes the framework unverifiable.

## High-Level Approach

### Phase A: Verify-framework script
Write `scripts/verify-framework.cjs` for the CANIS project that performs:

- **Structural checks**: orphan nodes, broken edges (referencing nonexistent nodes), duplicate edge IDs
- **Throughline path checks**: BFS from key root nodes (aging, labile_iron_pool, NLRP3, etc.) to terminal outcomes (mortality, cognitive_function)
- **Citation coverage report**: count and list edges missing PMID, firstAuthor, year
- **PMID verification** (optional flag): for edges that DO have PMIDs, validate against PubMed E-utilities API (modeled after plig-framework's verify-bibliography.ts)
- **Summary statistics**: total nodes, edges, modules, orphan count, citation coverage percentage

The script reads directly from `demo/src/data/ad-framework-data.json` so it works without TypeScript compilation.

### Phase B: Filter orphans from demo view
Modify the demo's pre-filtering logic in `demo/src/App.tsx` to exclude nodes with zero connections from the dataset sent to the WASM layout engine. This is a view-layer filter, not a data deletion. The orphan nodes remain in the JSON for future edge-building but don't clutter the rendered graph.

### Phase C: Fix at the Excel source (deferred)
Eventually, either connect orphan nodes with proper cited edges or remove them from the Excel framework. This is a research task, not an engineering task, and is out of scope for now.

## Key Files Affected

- `scripts/verify-framework.cjs` (new) - integrity verification script
- `demo/src/App.tsx` - add orphan filtering to pre-filter logic
- `demo/src/data/ad-framework-data.json` - read-only target of verification

## Acceptance Criteria

- [ ] `node scripts/verify-framework.cjs` runs and prints a clear report of structural issues and citation gaps
- [ ] The script exits with code 1 if broken edges are found (hard failure)
- [ ] The script reports orphan nodes and citation gaps as warnings (soft failure)
- [ ] Demo graph only renders the connected subgraph (no orphan nodes in layout)
- [ ] Node/edge counts in the demo's bottom-left panel reflect filtered counts
- [ ] When PMIDs are eventually added, the script can verify them against PubMed with a `--verify-pmids` flag

## Success Metrics

- Orphan nodes in rendered graph: 0 (currently 176)
- All broken edges identified and reported
- Citation coverage percentage clearly displayed in script output
- Demo graph shows a coherent, readable network layout
