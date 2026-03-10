---
planStatus:
  planId: plan-fix-hallucinated-pmids
  title: Fix Hallucinated PMIDs and Verify Edge Sources
  status: ready-for-development
  planType: bug-fix
  priority: critical
  owner: developer
  stakeholders:
    - developer
  tags:
    - data-quality
    - citations
    - verification
    - pmid
  created: "2026-03-10"
  updated: "2026-03-10T21:30:00.000Z"
  progress: 5
---

# Fix Hallucinated PMIDs and Verify Edge Sources

## Problem

The verify-sources script (`node scripts/verify-sources.cjs --verify`) reveals that **71 unique PMIDs** across **91 edges** point to completely wrong papers. The PMID on the edge doesn't match the claimed author — indicating the PMID was fabricated/hallucinated during data generation. The edge's scientific claim (mechanismDescription, keyInsight) may describe a real finding by the claimed author, but the PMID attached is for an unrelated paper.

Additionally, **248 edges** have PMIDs but no firstAuthor/year, so they haven't been cross-checked at all — some of these are likely also wrong.

### Severity

- **91 edges**: Confirmed wrong PMID (author mismatch)
- **248 edges**: Unchecked (PMID present, no author to compare)
- **1 edge**: Invalid PMID (doesn't exist in PubMed)
- **1 edge**: Accent-only mismatch (false positive, auto-fixable)
- **3,529 edges**: No PMID at all (unverifiable, but lower priority)

## Goals

1. Find the correct PMID for each mismatched edge, or remove the PMID if the claim itself is unsupported
2. Verify that the edge's mechanismDescription/keyInsight matches the actual paper
3. Ensure no hallucinated citations remain in the dataset
4. Enrich the 248 unchecked edges with author/year and verify them

## Approach

Work through mismatches in batches, grouped by module. For each bad PMID:

1. **Search PubMed** for the claimed author + keywords from the edge's mechanism description
2. **If found**: Replace the PMID, verify the claim matches the abstract
3. **If not found**: The claim itself may be hallucinated — flag for manual review or removal
4. **Re-run verification** after each batch to confirm fixes

### Automation opportunity

Write a `--fix-pmids` mode for verify-sources.cjs that:
- Takes each mismatched edge's claimed author + mechanism keywords
- Searches PubMed via esearch API
- Ranks candidate PMIDs by title/abstract similarity to the claim
- Outputs suggested replacements for human review

## Task List

### Phase 0: Tooling & setup

- [ ] **T0.1** Improve author normalization in verify-sources.cjs to handle accents (Jiménez → Jimenez), fixing the 1 false positive
- [ ] **T0.2** Add `--fix-pmids` mode: PubMed esearch by author+keywords → suggest correct PMIDs
- [ ] **T0.3** Add `--enrich-authors` mode: for 248 edges with PMID but no author, auto-fill from PubMed metadata and re-verify

### Phase 1: High-impact multi-edge PMIDs (14 PMIDs → 34 edges)

These wrong PMIDs affect multiple edges each. Fix these first for maximum impact.

- [ ] **T1.1** PMID:22334919 — 5 edges (E14.001–E14.006) — claim="Area-Gomez" actual="Aleksanian TA" — MAM/ER-mitochondria contact sites
- [ ] **T1.2** PMID:22696567 — 3 edges (E_CM.009, E12.002, E12.003) — claim="Bell" actual="Dawson J" — BBB pericyte function
- [ ] **T1.3** PMID:38036770 — 3 edges (E09.008, E09.008b, E09.015) — claim="Maus" actual="Picca A" — mitophagy/PINK1-Parkin
- [ ] **T1.4** PMID:25724781 — 3 edges (E20.001, E20.003, E20.004) — claim="Hara" actual="Lauffenburger JC" — autophagy/mTOR
- [ ] **T1.5** PMID:25190365 — 2 edges (E01.012, E12.027) — claim="Kress" actual="Schulz S" — glymphatic/aging
- [ ] **T1.6** PMID:35139533 — 2 edges (E07.009, E13.042) — claim="Jhelum" actual="Maurits MP" — reactive astrocyte iron
- [ ] **T1.7** PMID:32768567 — 2 edges (FL.001, E09.013) — claim="Ashraf" actual="Utyro O" — ferroptosis/lipid peroxidation
- [ ] **T1.8** PMID:40826401 — 2 edges (MN.004, E18.006) — claim="Leone" actual="Chakouch C" — myelin/neuroinflammation
- [ ] **T1.9** PMID:31497960 — 2 edges (E13.010, E13.019) — claim="Neumann" actual="Phillips NA" — TREM2/microglia
- [ ] **T1.10** PMID:31127821 — 2 edges (E_CM.014, E_CM.015) — claim="Hansson" actual="Creemers SG" — CSF biomarkers
- [ ] **T1.11** PMID:32860352 — 2 edges (E12.030, E12.050) — claim="Montagne" actual="McGranaghan P" — BBB breakdown
- [ ] **T1.12** PMID:30256824 — 2 edges (E13.004, E13.005) — claim="Nasrabady" actual="Qiu X" — white matter/myelin
- [ ] **T1.13** PMID:33757485 — 2 edges (E16.011, E16.012) — claim="Ashraf" actual="Barjaktarevic I" — sex/hormones
- [ ] **T1.14** PMID:35367412 — 2 edges (E18.026, E18.027) — claim="Komatsu" actual="Skopál A" — selective autophagy

### Phase 2: Single-edge PMIDs by module (57 PMIDs → 57 edges)

#### Module M01 — Lysosomal/Endosomal (1 edge)
- [ ] **T2.1** PMID:21205641 — E01.021 — claim="Kim" actual="Egan DF"

#### Module M02 — Autophagy (2 edges)
- [ ] **T2.2** PMID:27723745 — E02.021 — claim="Martina" actual="Sivadasan R"
- [ ] **T2.3** PMID:23670896 — E02.020 — claim="Nguyen" actual="Basdekis-Jozsa R"

#### Module M04 — Neuroinflammation (2 edges)
- [ ] **T2.4** PMID:20516212 — E04.001 — claim="Bell" actual="Chen Y"
- [ ] **T2.5** PMID:25186741 — E04.004 — claim="Seo" actual="Zhang Y"

#### Module M05 — Innate Immune (3 edges)
- [ ] **T2.6** PMID:16675393 — E05.016 — claim="Cardona" actual="Kwon CH"
- [ ] **T2.7** PMID:29576945 — E05.017 — claim="Mills" actual="Kong F"
- [ ] **T2.8** PMID:29190671 — E05.024 — claim="Baligács" actual="malERA…"

#### Module M07 — Tau (1 edge)
- [ ] **T2.9** PMID:28678778 — E07.013 — claim="Fitzpatrick" actual="Ott PA"

#### Module M08 — Synaptic (2 edges)
- [ ] **T2.10** PMID:19571805 — E08.012 — claim="Tanaka" actual="Chiang AP"
- [ ] **T2.11** PMID:16141271 — E08.013 — claim="Shankar" actual="Eskurza I"

#### Module M09 — Mitochondria/Iron (4 edges)
- [ ] **T2.12** PMID:24371304 — E09.009 — claim="Ward" actual="Ory-Magne F"
- [ ] **T2.13** PMID:28611084 — E09.010 — claim="Arosio" actual="Elkind MSV"
- [ ] **T2.14** PMID:23615282 — E09.012 — claim="Rouault" actual="Sugimoto Y"
- [ ] **T2.15** PMID:32768567 — E09.013 — (covered in T1.7)

#### Module M10 — Lipid/ApoE (4 edges)
- [ ] **T2.16** PMID:29566793 — E10.007 — claim="Lin" actual="Nicolas A"
- [ ] **T2.17** PMID:33402403 — E10.008 — claim="Lee" actual="Sazali S"
- [ ] **T2.18** PMID:36613108 — E10.018 — claim="Palavicini" actual="Veronesi M"
- [ ] **T2.19** PMID:16945100 — REC.069 — claim="Mahley" actual="Butterfield DA"

#### Module M11 — TREM2/Microglia (1 edge)
- [ ] **T2.20** PMID:29518356 — E11.003 — claim="Yuan" actual="Zhao Y"

#### Module M12 — Vascular/BBB (6 edges)
- [ ] **T2.21** PMID:32078042 — E12.007 — claim="Montagne" actual="Ide F"
- [ ] **T2.22** PMID:19339620 — E12.022 — claim="Bentsen" actual="Huang H"
- [ ] **T2.23** PMID:31186209 — E12.025 — claim="Xiao" actual="Guo Y"
- [ ] **T2.24** PMID:29088998 — E12.026 — claim="Dash" actual="Zhao J"
- [ ] **T2.25** PMID:21576468 — E12.029 — claim="Castellano" actual="Perry BD"
- [ ] **T2.26** PMID:33068891 — E12.015 — year-only mismatch (2020 vs 2021)

#### Module M13 — Myelin/White Matter (5 edges)
- [ ] **T2.27** PMID:18923512 — E13.024 — claim="Ryu" actual="Südhof TC"
- [ ] **T2.28** PMID:23463366 — E13.040 — claim="Todorich" actual="Low SC"
- [ ] **T2.29** PMID:14993904 — E13.006 — claim="Bartzokis" actual="Kitano H"
- [ ] **T2.30** PMID:6309134 — E13.022 — claim="Coyle" actual="Bermudez-Rattoni F"
- [ ] **T2.31** PMID:15322546 — E13.023 — claim="Kotter" actual="Ferland RJ"
- [ ] **T2.32** PMID:33692547 — E13.045 — claim="Guttenplan" actual="Miyashita T"

#### Module M14 — ER-Mito Contact (1 edge)
- [ ] **T2.33** PMID:33653935 — E14.005 — claim="Bhattacharyya" actual="Allen RJ"

#### Module M16 — Sex/Hormones (4 edges)
- [ ] **T2.34** PMID:15117386 — E16.005 — claim="Moffat" actual="Elstein AS"
- [ ] **T2.35** PMID:21982726 — E16.006 — claim="Rosario" actual="Bizzarri C"
- [ ] **T2.36** PMID:16893461 — E16.009 — claim="Salpeter" actual="Tucker RP"
- [ ] **T2.37** PMID:24524930 — E16.010 — claim="Letra" actual="Mary YS"
- [ ] **T2.38** PMID:35995993 — E16.003 — claim="Xiong" actual="O'Leary K"
- [ ] **T2.39** PMID:32284014 — E16.007 — claim="Davis" actual="Pottinger SE"

#### Module M18 — Selective Autophagy (1 edge)
- [ ] **T2.40** PMID:10471273 — E18.031 — claim="Bhutani" actual="Wu Z"

#### Module M20 — Stress/HPA (2 edges)
- [ ] **T2.41** PMID:36424867 — E20.002 — claim="Saleh" actual="Cicchino AS"
- [ ] **T2.42** PMID:16551324 — E20.009 — claim="Green" actual="Goldenhar LM"
- [ ] **T2.43** PMID:19341762 — E20.010 — claim="Lupien" actual="Mayer CM"

#### THER — Therapeutics (2 edges)
- [ ] **T2.44** PMID:20818845 — E-THER.002 — claim="Jones" actual="Kogan MD"
- [ ] **T2.45** PMID:9298634 — E-THER.005 — claim="Rother" actual="Marcusson J"

#### Cross-module / Clinical (6 edges)
- [ ] **T2.46** PMID:21725313 — E_CM.010 — claim="Castellano" actual="Saito T"
- [ ] **T2.47** PMID:23574434 — E_CM.011 — claim="Todd" actual="Tayeb HO"
- [ ] **T2.48** PMID:30617323 — E_CM.012 — claim="Jack" actual="Gurovich Y"
- [ ] **T2.49** PMID:20399717 — E_CM.013 — claim="Jack" actual="Capdevila Bert R"

#### REC — Recovery/Misc (6 edges)
- [ ] **T2.50** PMID:31036653 — REC.012 — claim="Swanson" actual="Wu XJ"
- [ ] **T2.51** PMID:27801979 — REC.022 — claim="Tannahill" actual="Fish EW"
- [ ] **T2.52** PMID:23898162 — REC.046 — claim="Sanders" actual="Holmes BB"
- [ ] **T2.53** PMID:25065588 — REC.048 — claim="Giovinazzo" actual="Li WJ"
- [ ] **T2.54** PMID:30455430 — REC.049 — claim="Sbodio" actual="He ZT"
- [ ] **T2.55** PMID:39420891 — REC.050 — claim="Chakraborty" actual="Faro FN"
- [ ] **T2.56** PMID:12524457 — REC.051 — claim="Sun" actual="Qi CF"
- [ ] **T2.57** PMID:17148587 — REC.058 — claim="Nemeth" actual="Othman M"

#### Misc module-internal
- [ ] **T2.58** PMID:19812815 — TS.002 — claim="Bourne" actual="Goswami M"
- [ ] **T2.59** PMID:19027017 — ME.003 — claim="Abe" actual="Lukkes JL"

### Phase 3: Verify unchecked edges (248 edges)

- [ ] **T3.1** Run `--enrich-authors` to auto-fill firstAuthor/year on the 248 edges from PubMed
- [ ] **T3.2** Re-run `--verify` to catch any newly visible mismatches
- [ ] **T3.3** Fix any new mismatches found

### Phase 4: Claim-level verification

- [ ] **T4.1** After PMIDs are corrected, run `--claims` on all fixed edges to verify mechanism descriptions match the actual paper abstracts
- [ ] **T4.2** Rewrite or remove claims that don't match
- [ ] **T4.3** Final full `--verify --claims --metrics` pass — target: 0 errors

## Workflow for each fix

For each bad PMID:

```
1. Read the edge's mechanismDescription and keyInsight
2. Search PubMed: author[au] AND keyword AND keyword
3. If correct paper found:
   → Update PMID, firstAuthor, year in data.ts or framework.xlsx
4. If no matching paper exists:
   → The claim is likely hallucinated
   → Remove PMID, flag edge for manual review
5. Re-run verify to confirm fix
```

## Acceptance Criteria

- [ ] `node scripts/verify-sources.cjs --verify` reports 0 errors
- [ ] `node scripts/verify-sources.cjs --claims --limit=50` shows >80% SUPPORTED
- [ ] All edges with PMIDs have matching firstAuthor and year
- [ ] No hallucinated claims remain in mechanismDescription/keyInsight
