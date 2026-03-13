/**
 * Module 19: Post-Infectious / Autoimmune / Neurotoxicant Pathways
 *
 * Captures the ME/CFS-AD connection, GWI-AD connection, GPCR autoantibodies, and trained immunity.
 *
 * Key insight: COVID-19, other infections, AND neurotoxicant exposures trigger cascades that
 * converge on AD pathways through shared mechanisms:
 * - GPCR-AABs and hypoperfusion
 * - Glymphatic dysfunction
 * - Chronic immune activation
 *
 * GWI as "accelerated AD" model:
 * - 14× higher dementia rate (9.8% vs 0.7%) - Chao 2024
 * - MCI prevalence 17% at median age 49
 * - Glymphatic dysfunction measured (Zhang 2026)
 * - Organophosphate → Aβ pathway validated (Cui 2024)
 */

import type { MechanisticNode } from '../types';

export const module19Nodes: MechanisticNode[] = [
  // ============================================================================
  // INFECTIOUS TRIGGERS
  // ============================================================================
  {
    id: 'pathogenic_exposure',
    label: 'Pathogenic Exposure',
    category: 'BOUNDARY',
    subtype: 'EnvironmentalAgent',
    moduleId: 'M19',
    boundaryDirection: 'input',
    description: 'Viral or bacterial infection triggering post-infectious syndrome',
    mechanism: `Includes SARS-CoV-2 (COVID-19), EBV, HSV-1, VZV reactivation, and other pathogens.
      COVID-19 increases AD risk by 69% within one year (Wang 2022).
      Post-infectious autoimmunity may be the common pathway linking diverse pathogens to neurodegeneration.`,
    variants: [
      {
        id: 'covid_19',
        label: 'SARS-CoV-2',
        effectDirection: 'risk',
        effectMagnitude: 1.69,
        effectDescription: '69% increased AD risk within 1 year of infection',
      },
      {
        id: 'ebv',
        label: 'EBV',
        effectDirection: 'risk',
        effectDescription: 'Associated with MS and may contribute to neurodegeneration',
      },
      {
        id: 'vzv_reactivation',
        label: 'VZV Reactivation',
        effectDirection: 'risk',
        effectDescription: 'Shingles increases dementia risk; prevented by vaccination',
      },
    ],
  },

  // ============================================================================
  // NEUROTOXICANT EXPOSURES (GWI → AD PATHWAY)
  // ============================================================================
  {
    id: 'neurotoxicant_exposure',
    label: 'Neurotoxicant Exposure',
    category: 'BOUNDARY',
    subtype: 'EnvironmentalExposure',
    moduleId: 'M19',
    boundaryDirection: 'input',
    description: 'Environmental neurotoxicants as AD risk factors (GWI model)',
    mechanism: `Gulf War Illness provides compelling evidence for neurotoxicant → AD pathway:

      EPIDEMIOLOGY (Chao 2024):
      - **14× higher dementia rate**: 9.8% in GWI vs 0.7% in controls
      - MCI prevalence 17% at median age 49 (vs ~7.6% expected)
      - Olfactory dysfunction in 31% (prodromal AD marker)
      - Hippocampal atrophy and ventricular enlargement on MRI

      MECHANISTIC VALIDATION (Cui 2024):
      - Organophosphate (malathion) exposure → Aβ accumulation in wild-type mice
      - Gut microbiota dysbiosis → kynurenine pathway → neurotoxic metabolites
      - Direct pathway: neurotoxicant → gut dysbiosis → neuroinflammation → AD pathology

      GWI exposures included: nerve agents (sarin/cyclosarin), pyridostigmine bromide,
      pesticides, oil well fire smoke. All converge on shared AD mechanisms.`,
    variants: [
      {
        id: 'organophosphate',
        label: 'Organophosphates',
        effectDirection: 'risk',
        effectDescription: 'Aβ accumulation, gut dysbiosis, neuroinflammation (Cui 2024)',
      },
      {
        id: 'nerve_agent',
        label: 'Nerve Agents (Sarin/Cyclosarin)',
        effectDirection: 'risk',
        effectDescription: 'Gray matter loss, hippocampal atrophy (Chao 2010-2011)',
      },
      {
        id: 'pyridostigmine_bromide',
        label: 'Pyridostigmine Bromide',
        effectDirection: 'risk',
        effectDescription: 'AChE inhibitor given prophylactically; cholinergic dysfunction',
      },
    ],
    roles: ['LEVERAGE_POINT'],
  },
  {
    id: 'gwi_glymphatic_impairment',
    label: 'GWI Glymphatic Impairment',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M19',
    sharedWith: ['M12'], // Links to BBB/Glymphatic module
    description: 'Measured glymphatic dysfunction in Gulf War veterans (Zhang 2026)',
    mechanism: `DIRECT AD CONNECTION (Zhang 2026, AJNR):
      - Significantly reduced glymphatic indices in GWI vs controls (Cohen's d = -0.47)
      - Glymphatic impairment correlated with:
        • Pain intensity (r = -0.17)
        • Sleep disturbances (r = -0.17)
        • Fatigue (r = -0.20)
        • Overall CMI severity (r = -0.17)

      This validates that glymphatic dysfunction (core of clasmatodendrosis hypothesis)
      occurs in GWI and provides a mechanistic bridge to AD.

      CONVERGENCE POINT: GWI, ME/CFS, and AD may share glymphatic dysfunction as
      upstream mechanism. Sleep-dependent clearance system impaired across all three.`,
    roles: ['BIOMARKER', 'THERAPEUTIC_TARGET'],
  },

  // ============================================================================
  // CHRONIC IMMUNE ACTIVATION STATE
  // ============================================================================
  {
    id: 'chronic_immune_activation',
    label: 'Chronic Immune Activation',
    category: 'STATE',
    subtype: 'Neuroinflammation',
    moduleId: 'M19',
    description: 'Persistent immune dysregulation following infection (Long COVID/ME/CFS state)',
    mechanism: `Post-infectious syndromes share a common signature of chronic immune activation.
      Long COVID: persistent symptoms in ~10-30% of cases.
      ME/CFS: decades of evidence showing similar immune signatures.
      Key features: elevated cytokines, T cell exhaustion, mast cell activation.
      Chen 2024 showed IgG transfer from Long COVID patients causes disease in mice,
      proving autoantibodies (not persistent virus) drive pathology.`,
    roles: ['THERAPEUTIC_TARGET'],
  },

  // ============================================================================
  // GPCR AUTOANTIBODIES
  // ============================================================================
  {
    id: 'gpcr_autoantibodies',
    label: 'GPCR Autoantibodies',
    category: 'STOCK',
    subtype: 'Autoantibody',
    moduleId: 'M19',
    description: 'Autoantibodies against G-protein coupled receptors (β-adrenergic, muscarinic, AT1, ETA)',
    mechanism: `GPCR-AABs are found in:
      - 91% of AD patients (vs 33% in Lewy body dementia) - Wallukat 2018
      - ME/CFS patients - Loebel/Scheibenbogen 2015
      - Long COVID patients

      These AABs functionally activate or block receptors, causing:
      - β2-AR AABs → vasoconstriction
      - M3-mAChR AABs → altered autonomic function
      - AT1R AABs → renin-angiotensin dysregulation
      - ETA AABs → endothelin pathway disruption

      CRITICAL INSIGHT: Same AAB signature across ME/CFS, Long COVID, and AD
      suggests common autoimmune mechanism linking post-infectious syndromes to AD.`,
    roles: ['BIOMARKER', 'THERAPEUTIC_TARGET'],
  },
  {
    id: 'plasma_gpcr_aabs',
    label: 'Plasma GPCR-AABs',
    category: 'BOUNDARY',
    subtype: 'Biomarker',
    moduleId: 'M19',
    sharedWith: ['BOUNDARY'],
    boundaryDirection: 'output',
    description: 'Measurable autoantibodies against GPCRs in plasma',
    mechanism: `Diagnostic marker for post-infectious autoimmune AD subtype.
      BC007 (aptamer therapy) targets these AABs - Phase 2 in Long COVID.
      Potential stratification biomarker for clinical trials.`,
    roles: ['BIOMARKER'],
  },

  // ============================================================================
  // VASOREGULATORY DYSFUNCTION CASCADE
  // ============================================================================
  {
    id: 'gpcr_signaling_dysregulated',
    label: 'GPCR Signaling Dysregulated',
    category: 'STATE',
    subtype: 'SignalingPathway',
    moduleId: 'M19',
    description: 'Dysfunctional GPCR signaling due to autoantibody binding',
    mechanism: `GPCR-AABs cause receptor dysfunction through multiple mechanisms:
      - Agonistic AABs: constitutive receptor activation
      - Antagonistic AABs: receptor blockade
      - Allosteric modulation: altered receptor sensitivity

      Results in widespread signaling dysregulation affecting:
      - Vascular tone (β2-AR, AT1R, ETA)
      - Cardiac function (β1-AR, M2-mAChR)
      - Immune regulation (various GPCRs)`,
  },
  {
    id: 'vasoregulatory_dysfunction',
    label: 'Vasoregulatory Dysfunction',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M19',
    description: 'Impaired blood vessel regulation from GPCR-AAB effects',
    mechanism: `Dysregulated vasoconstriction/vasodilation balance.
      β2-AR AABs impair vasodilation.
      AT1R AABs cause inappropriate vasoconstriction.
      ETA AABs disrupt endothelin-mediated vascular control.`,
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'microcirculatory_impairment',
    label: 'Microcirculatory Impairment',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M19',
    description: 'Small vessel dysfunction leading to tissue hypoperfusion',
    mechanism: `Reduced capillary density and function.
      Impaired neurovascular coupling.
      Observable via nail fold capillaroscopy in ME/CFS and Long COVID.`,
  },
  {
    id: 'tissue_hypoperfusion',
    label: 'Tissue Hypoperfusion',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M19',
    sharedWith: ['M12'], // Links to BBB/Glymphatic module
    description: 'Reduced blood flow to tissues including brain',
    mechanism: `Chronic hypoperfusion is a convergence point linking:
      - GPCR-AAB-mediated vasoregulatory dysfunction
      - BBB breakdown (Module 12)
      - LDAM formation (Module 5) via hypoxia-induced lipid accumulation

      Brain hypoperfusion precedes amyloid deposition in many patients.`,
    roles: ['LEVERAGE_POINT'],
  },

  // ============================================================================
  // TRAINED IMMUNITY PATHWAYS
  // ============================================================================
  {
    id: 'trained_immunity_protective',
    label: 'Trained Immunity (Protective)',
    category: 'STATE',
    subtype: 'PhysiologicalState',
    moduleId: 'M19',
    sharedWith: ['M17'], // Links to Immunomodulatory module
    description: 'Beneficial epigenetic reprogramming of innate immunity from vaccination',
    mechanism: `Vaccines induce beneficial trained immunity:
      - Zostavax: 17% dementia reduction (Pomirchy 2026) - NO adjuvant
      - Shingrix: 17-18% reduction
      - BCG: ~45% reduction in bladder cancer patients
      - RSV vaccines (both adjuvanted and unadjuvanted): 29% reduction

      CRITICAL FINDING: Both adjuvanted AND non-adjuvanted vaccines protect equally.
      This rules out adjuvant-specific mechanisms and proves TRAINED IMMUNITY is the
      unifying mechanism.

      Protection extends beyond prevented infections. Mechanism involves epigenetic
      reprogramming of microglia via:
      - H3K4me3/H3K27ac at inflammatory gene loci
      - Metabolic reprogramming (glycolysis, TCA cycle)
      - Enhanced phagocytic capacity
      - Duration: months to years (possibly lifelong via bone marrow progenitors)`,
    roles: ['THERAPEUTIC_TARGET'],
  },
  {
    id: 'trained_immunity_maladaptive',
    label: 'Trained Immunity (Maladaptive)',
    category: 'STATE',
    subtype: 'DiseaseStage',
    moduleId: 'M19',
    description: 'Harmful epigenetic reprogramming from infection leading to chronic inflammation',
    mechanism: `Post-infectious immune dysregulation creates maladaptive trained immunity:
      - Sustained pro-inflammatory phenotype
      - Impaired resolution of inflammation
      - Microglia locked in reactive state

      This may explain why some infections increase AD risk while
      some vaccinations decrease it - the immune programming matters.`,
  },

  // ============================================================================
  // METABOLIC SHUNTS
  // ============================================================================
  {
    id: 'irg1_itaconate_shunt',
    label: 'IRG1/Itaconate Shunt',
    category: 'STATE',
    subtype: 'BiologicalProcess',
    moduleId: 'M19',
    description: 'Metabolic switch producing itaconate from aconitate',
    mechanism: `IRG1 (ACOD1) diverts aconitate from TCA cycle to produce itaconate.
      Active in chronic inflammation and ME/CFS.
      Itaconate:
      - Inhibits SDH (succinate dehydrogenase)
      - Modifies cysteine residues on KEAP1 → activates NRF2
      - Can be immunosuppressive OR pro-inflammatory depending on context

      Creates metabolic inflexibility in chronically activated microglia.`,
  },
  {
    id: 'gaba_shunt_active',
    label: 'GABA Shunt Active',
    category: 'STATE',
    subtype: 'BiologicalProcess',
    moduleId: 'M19',
    sharedWith: ['M18'], // Links to astrocyte/endfoot module
    description: 'Alternative glutamate metabolism pathway active during immune activation',
    mechanism: `Under chronic immune activation, glutamate is shunted through GABA pathway:
      Glutamate → GABA → Succinic semialdehyde → Succinate → TCA cycle

      Side effect: Ammonia accumulation (links to M18 endfoot dysfunction).
      May contribute to brain fog in Long COVID/ME/CFS.
      Ammonia → astrocyte swelling → clasmatodendrosis cascade.`,
  },

  // ============================================================================
  // BIOMARKERS
  // ============================================================================
  {
    id: 'nfl_level',
    label: 'Neurofilament Light (NfL)',
    category: 'BOUNDARY',
    subtype: 'Biomarker',
    moduleId: 'M19',
    boundaryDirection: 'output',
    description: 'Marker of axonal damage elevated in post-infectious neurodegeneration',
    mechanism: `Plasma/CSF NfL is elevated in:
      - Long COVID with neurological symptoms
      - ME/CFS
      - AD progression

      Non-specific but sensitive marker of neuronal injury.
      Useful for monitoring progression and treatment response.`,
    roles: ['BIOMARKER'],
    detectionTimeline: {
      yearsBeforeSymptoms: 5,
      detectionMethod: 'Plasma',
      atnCategory: 'N',
    },
  },
];
