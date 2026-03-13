---
planStatus:
  planId: plan-boundary-variants
  title: Boundary Node Variant Parameterization
  status: in-development
  planType: feature
  priority: high
  owner: quest
  stakeholders:
    - quest
  tags:
    - boundary-nodes
    - variants
    - edge-modulation
    - interactive
    - canis
  created: "2026-03-12"
  updated: "2026-03-13T12:00:00.000Z"
  progress: 25
---

# Boundary Node Variant Parameterization

## Goals

- Reintroduce the ability for BOUNDARY nodes to carry multiple discrete variants (e.g., APOE e2/e3/e4, age buckets, TREM2 R47H/R62H)
- Allow users to select a variant on a boundary node and see downstream edge weights modulated accordingly
- Provide visual feedback on the selected variant's effect direction and magnitude
- Support both discrete variants (genotypes, sex) and continuous-mapped-to-discrete variants (age buckets)

## Problem Description

### What was lost

The original alz-market-viz graph had parameterized boundary nodes. A user could click on "APOE Genotype" and choose between e2 (protective, 0.6x), e3 (neutral, 1.0x reference), e4 heterozygous (3.2x risk), or e4 homozygous (12x risk). Selecting a variant would multiplicatively scale all outgoing edge weights from that node, propagating risk context through the network.

This was stripped out during the migration to CANIS. Currently all 90 BOUNDARY nodes render as plain boxes with no interactivity beyond click-to-inspect.

### Jobs to be Done

1. **As a researcher**, I want to select an APOE genotype and see how it changes the relative strength of downstream pathways, so I can understand genotype-specific disease progression
2. **As an educator**, I want to show how age shifts the balance of multiple pathways simultaneously, so I can demonstrate why AD prevalence increases nonlinearly with age
3. **As a drug developer**, I want to see how a genetic variant interacts with a therapeutic target, so I can evaluate patient stratification strategies

### Key data already exists

The old reference implementation (`canis/_reference/old-graph/src/data/mechanisticFramework/nodes/boundary.ts`) had variant definitions for 3 nodes. We expanded to **7 boundary nodes with 25 total variants**:

- **Aging** (4 variants: <65, 65-74, 75-84, 85+)
- **APOE Genotype** (4 variants: e2, e3, e4 het, e4 hom)
- **TREM2 Variants** (4 variants: common, R47H, R62H, H157Y)
- **Sex** (2 variants: female, male)
- **Familial AD Mutations** (4 variants: none, APP, PSEN1, PSEN2)
- **Sleep State** (4 variants: normal, average, disrupted, apnea/chronic)
- **Menopausal Status** (3 variants: pre, peri, post)

Each variant includes: `effectDirection`, `effectMagnitude`, `effectDescription`, `frequency`, `color`, `pmid`, `oddsRatio`, `ciLow`/`ciHigh`, `population`.

## High-Level Approach

### Phase 1: Data Schema + Types --- COMPLETE

Variant support added across all three layers (alz-market-viz TS, CANIS Rust, CANIS TS). Data flows end-to-end: Excel → data.ts → demo JSON → WASM.

**Completed:**
- `alz-market-viz/src/data/mechanisticFramework/framework.xlsx` — new "Variants" sheet with 25 rows
- `alz-market-viz/src/data/mechanisticFramework/types.ts` — `BoundaryVariant`, `EffectDirection` types
- `alz-market-viz/scripts/generate-framework-data.ts` — parses Variants sheet, attaches to nodes, validates (duplicate IDs, duplicate labels, orphan edges, variant nodeId consistency, default variant count)
- `alz-market-viz/scripts/add-variants-sheet.cjs` — creates/replaces Variants sheet in Excel
- `alz-market-viz/src/data/mechanisticFramework/data.ts` — regenerated with 25 variants across 7 nodes
- `canis/src/types.ts` — `BoundaryVariant`, `EffectDirection`, updated `SbsfNode`
- `canis/crates/canis/src/types.rs` — Rust `BoundaryVariant`, `EffectDirection`, updated `SbsfNode`
- `canis/src/convert.ts` — `convertNode()` passes variants through
- `canis/demo/src/data/ad-framework-data.json` — regenerated with variant data

**Citation verification (2026-03-13):**
- APOE: Fixed PMID 23571587 → **9343467** (Farrer 1997); e4/e4 OR corrected 12.0 → **14.9** (CI 10.8-20.6)
- TREM2 R47H: PMID 23150908 confirmed (Jonsson 2013); CI tightened to 2.16-3.91
- TREM2 R62H: Fixed PMID 25533203 → **24899047** (Jin 2014); OR corrected 1.7 → **2.36** (CI 1.47-3.80)
- TREM2 H157Y: Fixed PMID 27570872 → **28855301** (Thornton 2017); OR corrected 1.5 → **4.22** (CI 1.93-9.21, meta-analysis)
- Aging: Removed incorrect PMID (prevalence data, not from a single genetics paper)

**Excel "Variants" sheet columns:**
- `nodeId` — which BOUNDARY node this variant belongs to
- `variantId` — unique ID within the node (e.g., `apoe4_het`)
- `label` — display name
- `effectDirection` — `protective | neutral | risk`
- `effectMagnitude` — fold-change multiplier (1.0 = reference)
- `effectDescription` — brief text
- `frequency` — population frequency (0-1, optional)
- `color` — hex color override (optional)
- `pmid` — evidence citation (optional)
- `oddsRatio` — from evidence (optional)
- `ciLow` / `ciHigh` — confidence interval bounds (optional)
- `population` — study population (optional)
- `isDefault` — boolean, marks the reference variant

**Design decisions:**
- Variants live in a separate Excel sheet (not crammed into the Nodes sheet) because each node can have 0-N variants
- `effectMagnitude` is relative to the reference variant (which has magnitude 1.0)
- Nodes without variants continue to work exactly as before

### Phase 2: Engine — Edge Weight Modulation

Add a "variant selection" concept to the graph engine so selecting a variant on a boundary node scales its outgoing edges.

**Affected files:**
- `canis/crates/canis/src/graph.rs` (store variant selections, apply multipliers)
- `canis/crates/canis/src/types.rs` (variant selection state)
- `canis/src/types.ts` (worker message types for variant selection)
- `canis/src/worker.ts` (handle `setVariant` messages)
- `canis/src/react.ts` (expose `setVariant` from `useGraph` hook)

**How modulation works:**
- Each boundary node has a "selected variant" (defaults to `defaultVariant` or the neutral one)
- When a variant is selected, all edges originating from that node have their `weight` multiplied by `effectMagnitude`
- This affects layout (heavier edges pull nodes closer in Sugiyama ordering) and analysis (path strength, centrality)
- The modulation is transient (runtime state, not persisted to data)
- Multiple boundary nodes can have different selected variants simultaneously (compound scenarios like "APOE4 + age 85+")

**Key constraint:** The Rust graph stores base weights. Variant modulation is applied as an overlay, not by mutating the stored edge data. This allows instant switching without re-parsing.

### Phase 3: UI — Variant Selector on Boundary Nodes

Render interactive variant selectors on boundary nodes in the React Flow graph.

**Affected files:**
- `canis/demo/src/graph/flow-builder.ts` (pass variant data to custom node component)
- `canis/demo/src/graph/MechanisticNode.tsx` (or new `BoundaryVariantNode.tsx`)
- `canis/demo/src/sidebar/NodeInspector.tsx` (show variant details when boundary node selected)
- `canis/demo/src/App.tsx` (wire variant selection state)

**Three rendering modes (from old implementation):**

1. **Compact mode** (default in graph) — Node shows current variant as a colored pill/tag. Clicking opens a dropdown or segmented control to switch variants.

2. **Table mode** (in sidebar inspector) — All variants shown in a table with columns: variant name, effect direction icon, magnitude, frequency, odds ratio. Selected variant highlighted.

3. **Bar chart mode** (in sidebar inspector) — Horizontal bars showing relative effect magnitude per variant, color-coded by direction (green=protective, gray=neutral, yellow/red=risk). Reference variant marked.

**Visual cues for variant nodes:**
- Boundary nodes WITH variants get a distinct visual indicator (e.g., a small toggle icon or segmented border)
- The node border color reflects the selected variant's effect direction
- Edge thickness from the node visually scales with the selected magnitude

### Phase 4: Compound Scenarios

Allow saving and loading combinations of variant selections as named scenarios.

**Examples:**
- "High-risk elderly" = APOE4 hom + age 85+ + TREM2 R47H
- "Young protective" = APOE2 + age <65 + TREM2 common
- "Average" = all defaults

This integrates with the existing Preset system in the sidebar.

## Key Components

1. **Data layer**: Excel Variants sheet + generation script + TS/Rust types
2. **Engine layer**: Variant selection state + edge weight overlay in Rust WASM
3. **UI layer**: Compact variant selector on graph nodes + detailed inspector views
4. **Integration layer**: Compound scenarios as presets, interaction with drug pathway analysis

## Acceptance Criteria

- [x] Variant data is sourced from Excel (not hardcoded in TS/Rust)
- [x] Data pipeline: Excel Variants sheet → generate-framework-data.ts → data.ts → export-json.cjs → demo JSON → WASM
- [x] Validation prevents duplicate nodes, orphan edges, and variant/node mismatches
- [x] PMIDs verified against PubMed and corrected
- [x] 7 boundary nodes with 25 variants (expanded from original 3 nodes)
- [x] Default variant identified per node
- [ ] APOE, Aging, TREM2, Sex, FAD, Sleep, Menopause nodes have selectable variants in the graph UI
- [ ] Selecting a variant visibly changes outgoing edge thickness
- [ ] Effect direction is color-coded (green/gray/yellow/red)
- [ ] Default variant is pre-selected on load
- [ ] Node inspector shows variant table with effect magnitudes and evidence
- [ ] Multiple boundary nodes can have different variants selected simultaneously
- [ ] Existing non-variant boundary nodes are unaffected
- [ ] At least one compound scenario preset exists (e.g., "high-risk elderly")

## What Success Looks Like

- A user can click APOE Genotype, switch to e4/e4, and immediately see the downstream pathways strengthen (thicker edges, possibly different layout emphasis)
- The network becomes a "what-if" tool: "What does the disease look like for an 85-year-old APOE4 carrier with TREM2 R47H?"
- The variant data is maintainable via Excel (researchers can add new boundary variants without touching code)
- Visual clarity: it's instantly obvious which boundary nodes have variants and what the current selection is

## Decisions Made

1. **Re-layout on variant change?** — **Visual edge thickness only, no re-layout.** Just update edge stroke width based on effectMagnitude. No Sugiyama re-trigger.

2. **Which boundary nodes get variants?** — **All suitable ones.** Shipped 7 nodes (aging, APOE, TREM2, sex, familial AD, sleep, menopause) with 25 total variants. More can be added via the Excel Variants sheet.

3. **Variant data verification?** — **Verify before shipping.** PMIDs verified and corrected (see Phase 1 citation verification above). 3 of 4 checked PMIDs were wrong and have been fixed.

## Open Questions

1. **Continuous parameters?** Age is naturally continuous. The current implementation discretizes into buckets. A slider UI for continuous boundary nodes could be a future enhancement.

2. **Variant interactions?** APOE4 + TREM2 R47H may have non-additive effects. The simple multiplicative model doesn't capture epistasis. Multiplicative is fine for v1; note the limitation.
