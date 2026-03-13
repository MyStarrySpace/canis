/**
 * Module 15: Interventions & Clinical Boundaries
 */

import type { MechanisticNode } from '../types';

export const module15Nodes: MechanisticNode[] = [
  {
    id: 'exercise',
    label: 'Exercise',
    category: 'BOUNDARY',
    subtype: 'Lifestyle',
    moduleId: 'M15',
    boundaryDirection: 'input',
    description: 'Physical activity intervention',
    mechanism: 'Increases BDNF, autophagy, glymphatic clearance; reduces inflammation',
    defaultVariant: 'exercise_moderate',
    variants: [
      {
        id: 'exercise_sedentary',
        label: 'Sedentary',
        effectDirection: 'risk',
        effectMagnitude: 1.4,
        effectDescription: '<150 min/week; no structured exercise',
        color: '#c75146',
        evidence: [{ pmid: '28054939', oddsRatio: 1.4, population: 'Meta-analysis' }],
      },
      {
        id: 'exercise_light',
        label: 'Light Activity',
        effectDirection: 'neutral',
        effectMagnitude: 1.0,
        effectDescription: '150-300 min/week walking; reference group',
        color: '#787473',
        evidence: [{ pmid: '28054939', oddsRatio: 1.0, population: 'Meta-analysis' }],
      },
      {
        id: 'exercise_moderate',
        label: 'Moderate Exercise',
        effectDirection: 'protective',
        effectMagnitude: 0.7,
        effectDescription: '150+ min/week moderate-vigorous; BDNF↑, inflammation↓',
        color: '#34d399',
        evidence: [{ pmid: '28054939', oddsRatio: 0.7, confidenceInterval: [0.6, 0.8], population: 'Meta-analysis' }],
      },
      {
        id: 'exercise_vigorous',
        label: 'Vigorous Exercise',
        effectDirection: 'protective',
        effectMagnitude: 0.5,
        effectDescription: '300+ min/week vigorous; maximal BDNF, autophagy activation',
        color: '#34d399',
        evidence: [{ pmid: '28054939', oddsRatio: 0.5, confidenceInterval: [0.4, 0.7], population: 'Meta-analysis' }],
      },
    ],
  },
  {
    id: 'bbb_penetration',
    label: 'BBB Penetration',
    category: 'STATE',
    subtype: 'CompartmentIntegrity',
    moduleId: 'M15',
    description: 'Drug crosses blood-brain barrier',
    mechanism: 'Failure point 1: insufficient CNS exposure',
  },
  {
    id: 'target_engagement',
    label: 'Target Engagement',
    category: 'STATE',
    subtype: 'Bound',
    moduleId: 'M15',
    description: 'Drug binds target with sufficient occupancy',
    mechanism: 'PET/CSF marker confirms engagement',
  },
  {
    id: 'biomarker_change',
    label: 'Biomarker Change',
    category: 'STOCK',
    subtype: 'MetaboliteSignal',
    moduleId: 'M15',
    description: 'Target engagement → biomarker movement',
    mechanism: 'CSF Aβ, tau, NfL changes',
    roles: ['BIOMARKER'],
  },
  {
    id: 'clinical_benefit',
    label: 'Clinical Benefit',
    category: 'BOUNDARY',
    subtype: 'CognitiveScore',
    moduleId: 'M15',
    boundaryDirection: 'output',
    description: 'Cognitive/functional improvement',
    mechanism: 'Ultimate outcome; requires right timing + mechanism',
  },
];

// ============================================================================
// MODULE 16: Sex & Ancestry Modifiers
