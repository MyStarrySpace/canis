/**
 * Module 12: BBB & Glymphatic
 */

import type { MechanisticNode } from '../types';

export const module12Nodes: MechanisticNode[] = [
  {
    id: 'bbb_breakdown',
    label: 'BBB Breakdown',
    category: 'STATE',
    subtype: 'CompartmentIntegrity',
    moduleId: 'M12',
    description: 'Blood-brain barrier dysfunction',
    mechanism: 'APOE4 → CypA↑ → MMP9↑ → tight junction degradation',
    roles: ['BIOMARKER'],
  },
  {
    id: 'cypa_elevated',
    label: 'Cyclophilin A Elevated',
    category: 'STOCK',
    subtype: 'ProteinPool',
    moduleId: 'M12',
    references: { protein: 'UniProt:P62937' },
    description: 'APOE4-induced in pericytes',
    mechanism: 'CypA → NF-κB → MMP9 transcription',
  },
  {
    id: 'mmp9_elevated',
    label: 'MMP-9 Elevated',
    category: 'STOCK',
    subtype: 'ActiveProteinPool',
    moduleId: 'M12',
    references: { protein: 'UniProt:P14780' },
    description: 'Matrix metalloproteinase degrades tight junctions',
    mechanism: 'Cleaves claudin-5, occludin, ZO-1',
  },
  {
    id: 'pericyte_injury',
    label: 'Pericyte Injury',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M12',
    description: 'sPDGFRβ in CSF = pericyte injury biomarker - EARLIEST detectable AD pathology',
    mechanism: 'Pericyte degeneration releases sPDGFRβ into CSF. Montagne 2020: detectable at age ~20 in APOE4 carriers, 45 years before symptom onset. Predicts cognitive decline independent of Aβ/tau. Links vascular to neurodegeneration.',
    roles: ['BIOMARKER'],
    detectionTimeline: {
      yearsBeforeSymptoms: 45,
      detectionMethod: 'CSF',
      atnCategory: 'V',
      performance: {
        auc: 0.85,
        citation: '32860352', // Montagne 2020 Nature Medicine
      },
    },
  },
  {
    id: 'lrp1_apoe4_impaired',
    label: 'LRP1-ApoE4 Impairment',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M12',
    references: {
      protein: 'UniProt:Q07954', // LRP1
      process: 'GO:0006898', // receptor-mediated endocytosis
    },
    description: 'ApoE4 impairs LRP1-mediated Aβ clearance at BBB',
    mechanism: 'LRP1 (low-density lipoprotein receptor-related protein 1) is the primary Aβ transporter at BBB. ApoE4 binds LRP1 with lower affinity than ApoE3, reducing Aβ transcytosis by ~50%. Additionally, ApoE4 promotes LRP1 internalization, further reducing clearance capacity. This establishes BBB dysfunction as UPSTREAM of amyloid accumulation.',
    roles: ['THERAPEUTIC_TARGET', 'LEVERAGE_POINT'],
  },
  {
    id: 'glymphatic_clearance',
    label: 'Glymphatic Clearance',
    category: 'STATE', // SBSF v2.0: Was PROCESS, now STATE (process activity as categorical state)
    subtype: 'BiologicalProcess',
    moduleId: 'M12',
    description: 'Sleep-dependent Aβ clearance',
    mechanism: 'Sleep → 60% ISF expansion → 2x Aβ clearance rate',
  },
  {
    id: 'meningeal_lymphatics',
    label: 'Meningeal Lymphatics',
    category: 'STOCK',
    subtype: 'OrganellePool',
    moduleId: 'M12',
    description: 'CNS lymphatic drainage; declines with aging',
    mechanism: 'VEGF-C can restore function',
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'isf_abeta_clearance',
    label: 'ISF Aβ Clearance',
    category: 'STATE', // SBSF v2.0: Was PROCESS, now STATE (process activity as categorical state)
    subtype: 'BiologicalProcess',
    moduleId: 'M12',
    description: 'Interstitial fluid Aβ drainage',
    mechanism: 'Para-arterial influx → para-venous efflux',
  },
  {
    id: 'bbb_integrity',
    label: 'BBB Integrity',
    category: 'STATE',
    subtype: 'Homeostatic',
    moduleId: 'M12',
    description: 'Blood-brain barrier structural and functional integrity',
    mechanism: 'Maintained by tight junctions (claudin-5, occludin, ZO-1), pericyte coverage, OPC-derived TGF-β1. Intact BBB prevents peripheral factors from entering CNS',
    sharedWith: ['M13'], // OPC-BBB axis
    roles: ['BIOMARKER'],
  },
  {
    id: 'pericyte_function',
    label: 'Pericyte Function',
    category: 'STATE',
    subtype: 'Homeostatic',
    moduleId: 'M12',
    references: {
      cellType: 'CL:0000669', // pericyte
    },
    description: 'Pericyte-mediated BBB support and capillary dilation',
    mechanism: 'Pericytes regulate BBB permeability, capillary blood flow, and respond to OPC Ca²⁺ signals. Receive TGF-β1 from OPCs for tight junction maintenance',
    sharedWith: ['M13'], // OPC-vascular coupling
  },
  // AQP4 and glymphatic machinery (added 2026-01-17)
  {
    id: 'aqp4_polarization',
    label: 'AQP4 Polarization',
    category: 'STATE',
    subtype: 'Homeostatic',
    moduleId: 'M12',
    references: {
      protein: 'UniProt:P55087', // AQP4
      process: 'GO:0015250', // water channel activity
    },
    description: 'AQP4 concentrated at astrocyte endfeet (healthy state)',
    mechanism:
      'AQP4 anchored to endfeet by dystrophin-associated protein complex (DAPC): Laminin → α/β-Dystroglycan → Dystrophin → α1-Syntrophin → AQP4. Enables efficient CSF-ISF exchange for waste clearance',
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'aqp4_depolarization',
    label: 'AQP4 Depolarization',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M12',
    references: {
      protein: 'UniProt:P55087', // AQP4
    },
    description: 'AQP4 redistributed away from endfeet (pathological)',
    mechanism:
      'DAPC disruption → AQP4 mislocalized to parenchymal membrane. DTNB (AD risk gene) encodes β-dystrobrevin component of DAPC. AQP4 SNPs (rs151244, rs3763040) associated with faster cognitive decline. Reduces glymphatic efficiency 80-90%',
    roles: ['BIOMARKER', 'THERAPEUTIC_TARGET'],
  },
  {
    id: 'arterial_pulsatility',
    label: 'Arterial Pulsatility',
    category: 'STATE',
    subtype: 'Homeostatic',
    moduleId: 'M12',
    description: 'Vasomotion amplitude that drives perivascular CSF flow',
    mechanism:
      'Arterial pulsatility drives CSF influx along periarterial spaces. Increased by exercise (cardiac output) and 40Hz gamma stimulation (VIP-mediated). Stiffening with age reduces flow',
  },
  {
    id: 'csf_isf_exchange',
    label: 'CSF-ISF Exchange',
    category: 'STATE',
    subtype: 'BiologicalProcess',
    moduleId: 'M12',
    description: 'Bidirectional fluid exchange in brain parenchyma',
    mechanism:
      'CSF enters via periarterial spaces → AQP4-mediated exchange with ISF → waste-laden ISF exits via perivenous spaces → meningeal lymphatics. Rate enhanced by sleep, exercise, 40Hz stimulation',
  },
  // Astrocyte Endfeet (added 2026-01-17)
  {
    id: 'astrocyte_endfeet',
    label: 'Astrocyte Endfeet Integrity',
    category: 'STOCK',
    subtype: 'CompartmentState',
    moduleId: 'M12',
    references: {
      cellType: 'CL:0000127', // astrocyte
      anatomy: 'GO:0097450', // astrocyte end-foot
    },
    description: 'Structural integrity of astrocyte endfeet ensheathing blood vessels',
    mechanism:
      'Astrocyte endfeet form a critical interface wrapping ~99% of cerebral blood vessels. They: (1) Anchor AQP4 water channels via DAPC complex for glymphatic function; (2) Support BBB integrity via laminin/dystroglycan; (3) Enable neurovascular coupling; (4) Contain lysosomes that process perivascular debris; (5) Express α7 nAChRs responsive to cholinergic signaling. A1 astrocyte conversion damages endfoot structure.',
    sharedWith: ['M05', 'M02', 'M13'], // Connects astrocytes, lysosomes, cholinergic
    roles: ['LEVERAGE_POINT', 'THERAPEUTIC_TARGET'],
  },

  // ============================================================================
  // ANTIBODY CLEARANCE MECHANISMS (added 2026-01-19)
  // These explain why anti-Aβ antibodies have limited brain efficacy
  // ============================================================================
  {
    id: 'fcrn_transport',
    label: 'FcRn Transport (BBB)',
    category: 'STATE',
    subtype: 'BiologicalProcess',
    moduleId: 'M12',
    references: {
      protein: 'UniProt:P55899', // FCGRT (FcRn heavy chain)
      process: 'GO:0006898', // receptor-mediated endocytosis
    },
    description: 'Neonatal Fc receptor-mediated antibody transcytosis across BBB',
    mechanism:
      'FcRn binds IgG at pH 6.0 (endosome) and releases at pH 7.4 (extracellular). Brain endothelial FcRn primarily effluxes IgG OUT of brain (brain→blood direction). Anti-Aβ antibodies achieve only ~0.1% brain uptake because FcRn actively pumps them back out. This explains why massive plasma antibody concentrations are needed for minimal brain effect.',
    roles: ['RATE_LIMITER'],
  },
  {
    id: 'fcrn_recycling',
    label: 'FcRn Recycling (Periphery)',
    category: 'STATE',
    subtype: 'BiologicalProcess',
    moduleId: 'M12',
    references: {
      protein: 'UniProt:P55899',
    },
    description: 'FcRn salvage pathway extends IgG half-life in blood',
    mechanism:
      'FcRn in endothelial cells and monocytes rescues IgG from lysosomal degradation, extending half-life to ~21 days. This recycling maintains high peripheral antibody concentrations but does not improve brain penetration. Antibody Fc engineering can modulate FcRn binding for different PK profiles.',
  },
  {
    id: 'peripheral_sink_hypothesis',
    label: 'Peripheral Sink Hypothesis',
    category: 'STATE',
    subtype: 'BiologicalProcess',
    moduleId: 'M12',
    description: 'Theory that peripheral Aβ removal shifts brain→blood equilibrium',
    mechanism:
      'Hypothesis: Reducing plasma Aβ via peripheral antibodies or dialysis creates concentration gradient that pulls Aβ from brain. Evidence: Mixed. DeMattos 2001 showed m266 antibody raised plasma Aβ without entering brain. However, brain Aβ reduction was modest. The equilibrium between brain and blood Aβ is slow (half-life ~weeks) and limited by receptor-mediated transport, not simple diffusion.',
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'intramural_periarterial_drainage',
    label: 'Intramural Periarterial Drainage (IPAD)',
    category: 'STATE',
    subtype: 'BiologicalProcess',
    moduleId: 'M12',
    description: 'Aβ drains along basement membranes of cerebral arteries',
    mechanism:
      'Soluble Aβ drains from brain parenchyma along basement membranes within artery walls (OPPOSITE direction to blood flow). Impaired in CAA (cerebral amyloid angiopathy) where Aβ deposits in vessel walls. APOE4 worsens IPAD efficiency. Arterial stiffening with age reduces the pulsatile motive force for IPAD.',
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'cervical_lymph_nodes',
    label: 'Cervical Lymph Node Drainage',
    category: 'STOCK',
    subtype: 'CompartmentState',
    moduleId: 'M12',
    description: 'CNS antigens drain to deep cervical lymph nodes',
    mechanism:
      'Meningeal lymphatics → deep cervical lymph nodes → systemic circulation. This is where brain-derived Aβ first contacts the peripheral immune system. Antibody-Aβ immune complexes formed here can be cleared by splenic/hepatic macrophages.',
  },
  {
    id: 'splenic_clearance',
    label: 'Splenic Aβ Clearance',
    category: 'STATE',
    subtype: 'BiologicalProcess',
    moduleId: 'M12',
    description: 'Spleen filters Aβ-antibody immune complexes from blood',
    mechanism:
      'Splenic macrophages express Fc receptors that bind antibody-Aβ complexes for phagocytic clearance. The spleen is the primary site for removing opsonized particles from circulation. Splenectomy may reduce efficacy of peripheral Aβ immunotherapy. Importantly, this represents the ACTUAL clearance mechanism for anti-Aβ antibodies - they work in periphery, not brain.',
    roles: ['LEVERAGE_POINT'],
  },
  {
    id: 'hepatic_clearance',
    label: 'Hepatic Aβ Clearance',
    category: 'STATE',
    subtype: 'BiologicalProcess',
    moduleId: 'M12',
    description: 'Liver Kupffer cells clear Aβ from blood',
    mechanism:
      'Kupffer cells (liver macrophages) and liver sinusoidal endothelial cells can bind and clear Aβ and Aβ-antibody complexes. LRP1 on hepatocytes also mediates Aβ uptake. The liver may be responsible for 40-60% of peripheral Aβ clearance. This pathway works in parallel with splenic clearance.',
  },
  {
    id: 'aria_edema',
    label: 'ARIA-E (Edema)',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M12',
    description: 'Amyloid-related imaging abnormality - edema/effusion',
    mechanism:
      'Anti-Aβ antibodies cause vasogenic edema, likely from: (1) Complement activation at vessel walls where CAA is present; (2) Transient BBB disruption during immune complex formation; (3) Inflammatory response to Aβ clearance. ARIA-E occurs in 20-35% of patients on anti-Aβ antibodies, higher in APOE4 carriers. NOT the primary clearance mechanism - it is an adverse effect.',
    roles: ['BIOMARKER'],
  },
  {
    id: 'aria_hemorrhage',
    label: 'ARIA-H (Hemorrhage)',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M12',
    description: 'Amyloid-related imaging abnormality - microhemorrhage',
    mechanism:
      'Microbleeds and superficial siderosis from vessel wall weakening during amyloid removal. Associated with pre-existing CAA burden. Severe ARIA-H can cause symptomatic brain bleeds. Risk factors: APOE4/4 genotype, high baseline CAA, anticoagulant use.',
    roles: ['BIOMARKER'],
  },
];

// ============================================================================
// MODULE 13: Cholinergic & White Matter
