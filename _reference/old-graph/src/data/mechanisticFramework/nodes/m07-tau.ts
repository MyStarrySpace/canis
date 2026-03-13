/**
 * Module 7: Tau Pathology
 */

import type { MechanisticNode } from '../types';

export const module7Nodes: MechanisticNode[] = [
  // ============================================================================
  // Hyperactivity-Tau Initiation Cascade (IgLON5 Model - Askin/Wegmann 2024)
  // Key insight: Neuronal hyperactivity INITIATES tau pathology, not just a consequence
  // ============================================================================
  {
    id: 'neuronal_hyperactivity',
    label: 'Neuronal Hyperactivity',
    category: 'STATE',
    subtype: 'BiologicalProcess',
    moduleId: 'M07',
    references: {
      process: 'GO:0019228', // neuronal action potential
      phenotype: 'HP:0011169', // generalized tonic-clonic seizures (related)
    },
    description: 'Increased neuronal firing rate; UPSTREAM trigger for tau pathology',
    mechanism: `IgLON5 disease model demonstrates hyperactivity INITIATES tau pathology:
      Autoantibodies → IgLON5 surface clustering + KCNA2 (Kv1.2) ion channel co-clustering →
      Increased firing frequency → Tau missorting → Tau hyperphosphorylation.
      CRITICAL: Dampening activity with TTX or CNQX PREVENTED tau changes, proving hyperactivity is UPSTREAM.
      In sporadic AD: Early hippocampal hyperactivity on fMRI may be a CAUSE, not consequence, of tau spread.
      Therapeutic implication: Anti-epileptic drugs (levetiracetam) may slow tau propagation.`,
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'tau_missorting',
    label: 'Tau Somatodendritic Missorting',
    category: 'STATE',
    subtype: 'BiologicalProcess',
    moduleId: 'M07',
    references: {
      protein: 'UniProt:P10636', // tau
      process: 'GO:0043025', // neuronal cell body
    },
    description: 'Tau redistributes from axonal to somatodendritic compartment; precedes hyperphosphorylation',
    mechanism: `Normally tau is axonal; hyperactivity causes mislocalization to dendrites/soma.
      Askin/Wegmann 2024: Anti-IgLON5 AABs → neuronal hyperactivity → tau missorting → THEN hyperphosphorylation.
      Missorting exposes tau to kinases (GSK3β, p38-MAPK) concentrated in soma.
      Missorting also disrupts microtubule function in dendrites → synaptic dysfunction.
      Key biomarker: Dendritic tau precedes PHF formation and may be earliest intraneuronal marker.`,
  },
  {
    id: 'iglon5_autoantibodies',
    label: 'Anti-IgLON5 Autoantibodies',
    category: 'STOCK',
    subtype: 'Autoantibody',
    moduleId: 'M07',
    sharedWith: ['BOUNDARY'], // Also relevant as biomarker
    references: {
      protein: 'UniProt:O94865', // IgLON5
    },
    description: 'Autoantibodies against IgLON5 neuronal adhesion molecule; causes autoimmune tauopathy',
    mechanism: `Anti-IgLON5 disease is a rare autoimmune tauopathy providing causal insight:
      1. AABs bind IgLON5 → surface clustering + KCNA2 ion channel co-clustering
      2. Neuronal hyperactivity (Ca imaging, MEA confirmed)
      3. Tau missorting to dendrites/soma
      4. Tau hyperphosphorylation at AT8, PHF-1 epitopes (pSer396/404)
      5. In vivo: 33% astrocytosis, 100% microgliosis, C3/MHC-II/TNF-α/IL-6 all elevated
      HLA association: DRB1*10:01, DQB1*05:01. Short-duration patients lack tau deposits (autoimmunity precedes tau).`,
    roles: ['BIOMARKER'],
  },

  // Original tau nodes continue below
  {
    id: 'tau_misfolded',
    label: 'Tau Misfolded',
    category: 'STATE',
    subtype: 'Phosphorylated',
    moduleId: 'M07',
    references: { protein: 'UniProt:P10636' },
    description: 'Conformationally altered tau exposing aggregation-prone regions',
    mechanism: 'Hyperphosphorylation promotes detachment from microtubules → conformational change',
  },
  {
    id: 'neuronal_dysfunction',
    label: 'Neuronal Dysfunction',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M07',
    references: { cellType: 'CL:0000540' },
    description: 'Impaired neuronal function due to tau/Aβ pathology',
    mechanism: 'Axonal transport disruption, synaptic dysfunction, proteostasis failure',
  },
  {
    id: 'p38_mapk_active',
    label: 'p38 MAPK Active',
    category: 'STOCK', // SBSF v2.0: Was REGULATOR, now STOCK with REGULATOR role
    subtype: 'Kinase',
    moduleId: 'M07',
    references: { protein: 'UniProt:Q16539', process: 'GO:0004707' },
    description: 'IL-1β-activated tau kinase',
    mechanism: 'Phosphorylates tau at Ser199, Ser202, Thr205',
    roles: ['REGULATOR'],
  },
  {
    id: 'pp2a_inhibited',
    label: 'PP2A Inhibited',
    category: 'STATE',
    subtype: 'Phosphorylated',
    moduleId: 'M07',
    references: { protein: 'UniProt:P67775', process: 'GO:0006470' },
    description: 'Major tau phosphatase; >70% of tau dephosphorylation',
    mechanism: 'Activity ↓20-40% in AD brain; inhibited by I1PP2A↑, I2PP2A↑',
  },
  {
    id: 'tau_aggregated_phf',
    label: 'Tau PHF Aggregates',
    category: 'STOCK',
    subtype: 'Aggregate',
    moduleId: 'M07',
    references: { process: 'GO:0097418' },
    description: 'Paired helical filaments',
    mechanism: 'β-sheet-rich aggregates of hyperphosphorylated tau',
  },
  {
    id: 'nft_formation',
    label: 'Neurofibrillary Tangles',
    category: 'STOCK',
    subtype: 'Aggregate',
    moduleId: 'M07',
    references: { phenotype: 'HP:0002185' },
    description: 'Mature neurofibrillary tangles',
    mechanism: 'PHF accumulation → NFT; correlates with cognitive decline',
    roles: ['BIOMARKER'],
  },
  {
    id: 'tau_exosomal_release',
    label: 'Tau Exosomal Release',
    category: 'STATE', // SBSF v2.0: Was PROCESS, now STATE (process activity as categorical state)
    subtype: 'BiologicalProcess',
    moduleId: 'M07',
    references: { process: 'GO:0070481' },
    description: 'Exosome-mediated tau secretion',
    mechanism: 'Neurons and microglia release tau in exosomes',
  },
  {
    id: 'tau_seeding',
    label: 'Tau Seeding',
    category: 'STATE', // SBSF v2.0: Was PROCESS, now STATE (process activity as categorical state)
    subtype: 'BiologicalProcess',
    moduleId: 'M07',
    description: 'Cofactor-dependent templated misfolding (NOT truly prion-like)',
    mechanism: `CRITICAL NUANCE: Tau does NOT self-template without cofactors.
      Requires polyanion COFACTORS: heparan sulfate proteoglycans (HSPGs), RNA, polyanions.

      Fichou 2018 (PNAS): Brain-derived tau seeds are "exhausted after one generation"
      without cofactor supplementation. The seeds depolymerize.

      Cohen 2013: Secondary nucleation (fibril surfaces catalyze new aggregation)
      is the dominant mechanism, not true self-templating.

      Bhatt 2020: Aggregation reproducibility problems across labs suggest
      cofactor availability varies, not intrinsic prion-like behavior.

      IMPLICATION: "Tau spread" may reflect cofactor release from dying cells,
      not autonomous prion propagation. Cellular dysfunction PERMITS aggregation.`,
    roles: ['THERAPEUTIC_TARGET'],
  },

  // ============================================================================
  // COFACTOR-DEPENDENT AGGREGATION
  // Key insight: Aggregation requires permissive environment
  // ============================================================================
  {
    id: 'aggregation_cofactors',
    label: 'Aggregation Cofactors',
    category: 'STOCK',
    subtype: 'MetabolitePool',
    moduleId: 'M07',
    sharedWith: ['M06'], // Also relevant to amyloid aggregation
    description: 'Polyanions (HSPGs, RNA, nucleic acids) required for tau and Aβ aggregation',
    mechanism: `Cofactors essential for pathological aggregation:
      - Heparan sulfate proteoglycans (HSPGs) - on cell surfaces and ECM
      - RNA (released from dying cells)
      - DNA fragments
      - Polyglutamate, polyphosphate

      These polyanions provide the template/scaffold for fibril formation.
      Without them, tau and Aβ fibrils are unstable and depolymerize.

      KEY INSIGHT: Cellular dysfunction releases cofactors, creating
      a permissive environment for aggregation. Aggregation is a
      CONSEQUENCE of cellular damage, not the primary cause.`,
  },
  {
    id: 'permissive_environment',
    label: 'Permissive Environment',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M07',
    description: 'Cellular dysfunction creates conditions allowing aggregation',
    mechanism: `The "permissive environment" hypothesis:
      1. Cellular stress/death releases polyanion cofactors
      2. Cofactors stabilize misfolded protein aggregates
      3. Aggregation propagates through regions with cofactor availability

      This explains why:
      - Plaques/tangles follow patterns of cellular vulnerability
      - Aggregation accelerates once pathology is established
      - Early intervention may prevent permissive environment formation`,
    roles: ['LEVERAGE_POINT'],
  },
  {
    id: 'secondary_nucleation',
    label: 'Secondary Nucleation',
    category: 'STATE',
    subtype: 'BiologicalProcess',
    moduleId: 'M07',
    description: 'Fibril surfaces catalyze new aggregate formation (dominant mechanism)',
    mechanism: `Cohen 2013 showed secondary nucleation is the DOMINANT aggregation mechanism:
      - Existing fibril surfaces catalyze new monomer aggregation
      - NOT true self-templating (prion-like)
      - Requires both fibrils AND monomers AND cofactors

      Therapeutic implication: Clearing existing fibrils may slow secondary
      nucleation, but cofactor removal may be more effective.`,
  },
  // Module 7B: Transsulfuration Pathway
  {
    id: 'homocysteine',
    label: 'Homocysteine',
    category: 'STOCK',
    subtype: 'MetabolitePool',
    moduleId: 'M07',
    references: { drug: 'CHEBI:17230' },
    description: 'From methionine metabolism; elevated in AD risk',
    units: 'μmol/L',
    roles: ['BIOMARKER'],
  },
  {
    id: 'cbs_enzyme',
    label: 'CBS (Cystathionine β-synthase)',
    category: 'STOCK', // SBSF v2.0: Was REGULATOR, now STOCK with REGULATOR role
    subtype: 'Transferase',
    moduleId: 'M07',
    references: { protein: 'UniProt:P35520', process: 'GO:0004122' },
    compartment: { cellType: 'Astrocyte' },
    description: 'Astrocyte-predominant; produces cystathionine',
    mechanism: 'Also produces H₂S from homocysteine',
    roles: ['REGULATOR'],
  },
  {
    id: 'cystathionine',
    label: 'Cystathionine',
    category: 'STOCK',
    subtype: 'MetabolitePool',
    moduleId: 'M07',
    references: { drug: 'CHEBI:17482' },
    description: 'Intermediate; CBS product, CSE substrate',
  },
  {
    id: 'cse_enzyme',
    label: 'CSE (Cystathionine γ-lyase)',
    category: 'STOCK', // SBSF v2.0: Was REGULATOR, now STOCK with REGULATOR role
    subtype: 'Transferase',
    moduleId: 'M07',
    references: { protein: 'UniProt:P32929', process: 'GO:0004123' },
    compartment: { cellType: 'Neuron' },
    description: 'Neuron-predominant; KEY NEUROPROTECTIVE ENZYME',
    mechanism: 'Produces cysteine + H₂S; depleted in AD',
    roles: ['REGULATOR', 'THERAPEUTIC_TARGET', 'LEVERAGE_POINT'],
  },
  {
    id: 'cysteine',
    label: 'Cysteine',
    category: 'STOCK',
    subtype: 'MetabolitePool',
    moduleId: 'M07',
    references: { drug: 'CHEBI:15356' },
    description: 'Rate-limiting for GSH; CSE product',
    mechanism: 'Essential for glutathione synthesis',
  },
  {
    id: 'h2s_production',
    label: 'H₂S Production',
    category: 'STATE', // SBSF v2.0: Was PROCESS, now STATE (process activity as categorical state)
    subtype: 'BiologicalProcess',
    moduleId: 'M07',
    references: { drug: 'CHEBI:16136' },
    description: 'Gasotransmitter; produced by CSE (and CBS)',
    mechanism: 'Sulfhydrates proteins including GSK3β',
  },
  {
    id: 'glutathione_gsh',
    label: 'Glutathione (GSH)',
    category: 'STOCK',
    subtype: 'MetabolitePool',
    moduleId: 'M07',
    references: { drug: 'CHEBI:16856' },
    description: 'Major antioxidant; cysteine-dependent',
    mechanism: 'Neutralizes ROS, maintains redox homeostasis',
    roles: ['BIOMARKER'],
  },
  {
    id: 'sulfhydration',
    label: 'Protein Sulfhydration',
    category: 'STATE', // SBSF v2.0: Was PROCESS, now STATE (process activity as categorical state)
    subtype: 'BiologicalProcess',
    moduleId: 'M07',
    references: { process: 'GO:0018318' },
    description: 'S-sulfhydration/persulfidation; PTM by H₂S',
    mechanism: 'Modifies cysteine thiols (-SH) to persulfides (-SSH)',
  },
  {
    id: 'gsk3beta_sulfhydrated',
    label: 'GSK3β Sulfhydrated (Inactive)',
    category: 'STATE',
    subtype: 'Phosphorylated',
    moduleId: 'M07',
    references: { protein: 'UniProt:P49841' },
    description: 'GSK3β with Cys sulfhydrated → INACTIVE',
    mechanism: 'H₂S-mediated inhibition of tau kinase',
  },
];

// ============================================================================
// MODULE 8: Complement & Synaptic Pruning
