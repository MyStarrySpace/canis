/**
 * Biomarker Detection Timeline Tests
 *
 * Tests for the biomarker temporal data, helper functions,
 * and hypothesis presets related to biomarker visualization.
 */

import { describe, it, expect } from 'vitest';
import {
  getBiomarkersByTimeline,
  getBiomarkersByATN,
  getCommercialBiomarkers,
  getPendingBiomarkers,
  getBiomarkersByMethod,
  getBiomarkersDetectableAt,
  allNodes,
  getNodeById,
} from './index';
import { hypothesisPresets, getPresetById } from './presets';
import type { ATNCategory, DetectionMethod, MechanisticNode } from './types';

describe('Biomarker Detection Timeline', () => {
  describe('Data Integrity', () => {
    it('should have biomarker nodes with detectionTimeline', () => {
      const biomarkerNodes = allNodes.filter(n => n.detectionTimeline);
      expect(biomarkerNodes.length).toBeGreaterThan(0);
      // We expect at least the 7 new biomarkers + existing ones
      expect(biomarkerNodes.length).toBeGreaterThanOrEqual(7);
    });

    it('should have valid yearsBeforeSymptoms values', () => {
      const biomarkerNodes = allNodes.filter(n => n.detectionTimeline);
      for (const node of biomarkerNodes) {
        expect(node.detectionTimeline!.yearsBeforeSymptoms).toBeGreaterThanOrEqual(0);
        expect(node.detectionTimeline!.yearsBeforeSymptoms).toBeLessThanOrEqual(50);
      }
    });

    it('should have valid detection methods', () => {
      const validMethods: DetectionMethod[] = ['CSF', 'Plasma', 'PET', 'MRI', 'Retinal', 'EEG'];
      const biomarkerNodes = allNodes.filter(n => n.detectionTimeline);
      for (const node of biomarkerNodes) {
        expect(validMethods).toContain(node.detectionTimeline!.detectionMethod);
      }
    });

    it('should have valid ATN categories when specified', () => {
      const validCategories: ATNCategory[] = ['A', 'T', 'N', 'I', 'V'];
      const biomarkerNodes = allNodes.filter(n => n.detectionTimeline?.atnCategory);
      for (const node of biomarkerNodes) {
        expect(validCategories).toContain(node.detectionTimeline!.atnCategory);
      }
    });

    it('should have performance metrics within valid ranges', () => {
      const biomarkerNodes = allNodes.filter(n => n.detectionTimeline?.performance);
      for (const node of biomarkerNodes) {
        const perf = node.detectionTimeline!.performance!;
        if (perf.sensitivity !== undefined) {
          expect(perf.sensitivity).toBeGreaterThanOrEqual(0);
          expect(perf.sensitivity).toBeLessThanOrEqual(1);
        }
        if (perf.specificity !== undefined) {
          expect(perf.specificity).toBeGreaterThanOrEqual(0);
          expect(perf.specificity).toBeLessThanOrEqual(1);
        }
        if (perf.auc !== undefined) {
          expect(perf.auc).toBeGreaterThanOrEqual(0.5); // AUC should be >= random
          expect(perf.auc).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe('Specific Biomarker Nodes', () => {
    it('should have plasma_spdgfrbeta as earliest biomarker (45 years)', () => {
      const node = getNodeById('plasma_spdgfrbeta');
      expect(node).toBeDefined();
      expect(node?.detectionTimeline?.yearsBeforeSymptoms).toBe(45);
      expect(node?.detectionTimeline?.detectionMethod).toBe('CSF');
      expect(node?.detectionTimeline?.atnCategory).toBe('V');
    });

    it('should have plasma_ptau217 with correct data', () => {
      const node = getNodeById('plasma_ptau217');
      expect(node).toBeDefined();
      expect(node?.detectionTimeline?.yearsBeforeSymptoms).toBe(15);
      expect(node?.detectionTimeline?.detectionMethod).toBe('Plasma');
      expect(node?.detectionTimeline?.atnCategory).toBe('T');
      expect(node?.detectionTimeline?.commercialTest?.name).toBe('PrecivityAD2');
      expect(node?.detectionTimeline?.commercialTest?.fdaStatus).toBe('pending');
    });

    it('should have plasma_ptau181 as FDA-cleared', () => {
      const node = getNodeById('plasma_ptau181');
      expect(node).toBeDefined();
      expect(node?.detectionTimeline?.commercialTest?.fdaStatus).toBe('cleared');
      expect(node?.detectionTimeline?.commercialTest?.manufacturer).toBe('Fujirebio');
    });

    it('should have plasma_abeta42_40_ratio as FDA-cleared', () => {
      const node = getNodeById('plasma_abeta42_40_ratio');
      expect(node).toBeDefined();
      expect(node?.detectionTimeline?.yearsBeforeSymptoms).toBe(18);
      expect(node?.detectionTimeline?.atnCategory).toBe('A');
      expect(node?.detectionTimeline?.commercialTest?.fdaStatus).toBe('cleared');
    });

    it('should have plasma_nfl as latest plasma biomarker (5 years)', () => {
      const node = getNodeById('plasma_nfl');
      expect(node).toBeDefined();
      expect(node?.detectionTimeline?.yearsBeforeSymptoms).toBe(5);
      expect(node?.detectionTimeline?.atnCategory).toBe('N');
    });

    it('should have retinal biomarkers', () => {
      const rnfl = getNodeById('retinal_rnfl');
      const amyloid = getNodeById('retinal_amyloid');

      expect(rnfl).toBeDefined();
      expect(rnfl?.detectionTimeline?.detectionMethod).toBe('Retinal');
      expect(rnfl?.detectionTimeline?.yearsBeforeSymptoms).toBe(7);

      expect(amyloid).toBeDefined();
      expect(amyloid?.detectionTimeline?.detectionMethod).toBe('Retinal');
      expect(amyloid?.detectionTimeline?.yearsBeforeSymptoms).toBe(15);
    });

    it('should have plasma_gfap with inflammation category', () => {
      const node = getNodeById('plasma_gfap');
      expect(node).toBeDefined();
      expect(node?.detectionTimeline?.atnCategory).toBe('I');
      expect(node?.detectionTimeline?.commercialTest?.fdaStatus).toBe('cleared');
    });

    it('should have pvs_enlarged with MRI detection', () => {
      const node = getNodeById('pvs_enlarged');
      expect(node).toBeDefined();
      expect(node?.detectionTimeline?.detectionMethod).toBe('MRI');
      expect(node?.detectionTimeline?.yearsBeforeSymptoms).toBe(18);
    });

    it('should have pericyte_injury with earliest detection', () => {
      const node = getNodeById('pericyte_injury');
      expect(node).toBeDefined();
      expect(node?.detectionTimeline?.yearsBeforeSymptoms).toBe(45);
      expect(node?.detectionTimeline?.atnCategory).toBe('V');
    });

    it('should have lrp1_apoe4_impaired node', () => {
      const node = getNodeById('lrp1_apoe4_impaired');
      expect(node).toBeDefined();
      expect(node?.roles).toContain('THERAPEUTIC_TARGET');
      expect(node?.roles).toContain('LEVERAGE_POINT');
    });
  });

  describe('Helper Functions', () => {
    describe('getBiomarkersByTimeline', () => {
      it('should return biomarkers sorted by years before symptoms (descending)', () => {
        const biomarkers = getBiomarkersByTimeline();
        expect(biomarkers.length).toBeGreaterThan(0);

        // Check descending order
        for (let i = 1; i < biomarkers.length; i++) {
          const prevYears = biomarkers[i - 1].detectionTimeline?.yearsBeforeSymptoms ?? 0;
          const currYears = biomarkers[i].detectionTimeline?.yearsBeforeSymptoms ?? 0;
          expect(prevYears).toBeGreaterThanOrEqual(currYears);
        }
      });

      it('should have earliest biomarker first (45 years)', () => {
        const biomarkers = getBiomarkersByTimeline();
        expect(biomarkers[0].detectionTimeline?.yearsBeforeSymptoms).toBe(45);
      });
    });

    describe('getBiomarkersByATN', () => {
      it('should return amyloid (A) biomarkers', () => {
        const amyloidMarkers = getBiomarkersByATN('A');
        expect(amyloidMarkers.length).toBeGreaterThan(0);
        expect(amyloidMarkers.every(n => n.detectionTimeline?.atnCategory === 'A')).toBe(true);
        // Should include Aβ42/40 ratio and retinal amyloid
        const ids = amyloidMarkers.map(n => n.id);
        expect(ids).toContain('plasma_abeta42_40_ratio');
        expect(ids).toContain('retinal_amyloid');
      });

      it('should return tau (T) biomarkers', () => {
        const tauMarkers = getBiomarkersByATN('T');
        expect(tauMarkers.length).toBeGreaterThan(0);
        const ids = tauMarkers.map(n => n.id);
        expect(ids).toContain('plasma_ptau217');
        expect(ids).toContain('plasma_ptau181');
      });

      it('should return neurodegeneration (N) biomarkers', () => {
        const nMarkers = getBiomarkersByATN('N');
        expect(nMarkers.length).toBeGreaterThan(0);
        const ids = nMarkers.map(n => n.id);
        expect(ids).toContain('plasma_nfl');
        expect(ids).toContain('retinal_rnfl');
      });

      it('should return inflammation (I) biomarkers', () => {
        const iMarkers = getBiomarkersByATN('I');
        expect(iMarkers.length).toBeGreaterThan(0);
        const ids = iMarkers.map(n => n.id);
        expect(ids).toContain('plasma_gfap');
      });

      it('should return vascular (V) biomarkers', () => {
        const vMarkers = getBiomarkersByATN('V');
        expect(vMarkers.length).toBeGreaterThan(0);
        const ids = vMarkers.map(n => n.id);
        expect(ids).toContain('plasma_spdgfrbeta');
        expect(ids).toContain('pvs_enlarged');
        expect(ids).toContain('pericyte_injury');
      });
    });

    describe('getCommercialBiomarkers', () => {
      it('should return only FDA-cleared biomarkers', () => {
        const cleared = getCommercialBiomarkers();
        expect(cleared.length).toBeGreaterThan(0);
        expect(cleared.every(n => n.detectionTimeline?.commercialTest?.fdaStatus === 'cleared')).toBe(true);
      });

      it('should include expected FDA-cleared tests', () => {
        const cleared = getCommercialBiomarkers();
        const ids = cleared.map(n => n.id);
        expect(ids).toContain('plasma_ptau181');
        expect(ids).toContain('plasma_abeta42_40_ratio');
        expect(ids).toContain('plasma_nfl');
        expect(ids).toContain('plasma_gfap');
      });
    });

    describe('getPendingBiomarkers', () => {
      it('should return biomarkers with pending FDA status', () => {
        const pending = getPendingBiomarkers();
        expect(pending.every(n => n.detectionTimeline?.commercialTest?.fdaStatus === 'pending')).toBe(true);
      });

      it('should include pTau217', () => {
        const pending = getPendingBiomarkers();
        const ids = pending.map(n => n.id);
        expect(ids).toContain('plasma_ptau217');
      });
    });

    describe('getBiomarkersByMethod', () => {
      it('should return plasma biomarkers', () => {
        const plasma = getBiomarkersByMethod('Plasma');
        expect(plasma.length).toBeGreaterThan(0);
        expect(plasma.every(n => n.detectionTimeline?.detectionMethod === 'Plasma')).toBe(true);
      });

      it('should return retinal biomarkers', () => {
        const retinal = getBiomarkersByMethod('Retinal');
        expect(retinal.length).toBeGreaterThanOrEqual(2);
        const ids = retinal.map(n => n.id);
        expect(ids).toContain('retinal_rnfl');
        expect(ids).toContain('retinal_amyloid');
      });

      it('should return MRI biomarkers', () => {
        const mri = getBiomarkersByMethod('MRI');
        expect(mri.length).toBeGreaterThan(0);
        const ids = mri.map(n => n.id);
        expect(ids).toContain('pvs_enlarged');
      });
    });

    describe('getBiomarkersDetectableAt', () => {
      it('should return biomarkers detectable 40+ years before symptoms', () => {
        const early = getBiomarkersDetectableAt(40);
        expect(early.length).toBeGreaterThan(0);
        // Should include sPDGFRβ and pericyte_injury (45 years)
        const ids = early.map(n => n.id);
        expect(ids).toContain('plasma_spdgfrbeta');
        expect(ids).toContain('pericyte_injury');
      });

      it('should return more biomarkers at 10 years than 40 years', () => {
        const at10 = getBiomarkersDetectableAt(10);
        const at40 = getBiomarkersDetectableAt(40);
        expect(at10.length).toBeGreaterThan(at40.length);
      });

      it('should return all biomarkers at 0 years', () => {
        const atOnset = getBiomarkersDetectableAt(0);
        const allBiomarkers = allNodes.filter(n => n.detectionTimeline);
        expect(atOnset.length).toBe(allBiomarkers.length);
      });
    });
  });

  describe('Hypothesis Presets', () => {
    describe('Biomarker Timeline Preset', () => {
      it('should exist', () => {
        const preset = getPresetById('biomarker_timeline');
        expect(preset).toBeDefined();
        expect(preset?.category).toBe('hypotheses');
      });

      it('should have nodes ordered from earliest to latest detection', () => {
        const preset = getPresetById('biomarker_timeline');
        expect(preset?.nodeIds).toBeDefined();
        expect(preset!.nodeIds!.length).toBeGreaterThan(0);

        // First should be earliest (pericyte_injury or plasma_spdgfrbeta)
        const firstNodes = preset!.nodeIds!.slice(0, 2);
        expect(firstNodes).toContain('pericyte_injury');
        expect(firstNodes).toContain('plasma_spdgfrbeta');

        // Last should be cognitive_score (symptom onset)
        expect(preset!.nodeIds![preset!.nodeIds!.length - 1]).toBe('cognitive_score');
      });

      it('should include all major biomarkers', () => {
        const preset = getPresetById('biomarker_timeline');
        const ids = preset?.nodeIds ?? [];
        expect(ids).toContain('plasma_ptau217');
        expect(ids).toContain('plasma_gfap');
        expect(ids).toContain('plasma_nfl');
      });
    });

    describe('ATN+ Framework Preset', () => {
      it('should exist', () => {
        const preset = getPresetById('atn_framework_extended');
        expect(preset).toBeDefined();
      });

      it('should include all ATN categories plus I and V extensions', () => {
        const preset = getPresetById('atn_framework_extended');
        const ids = preset?.nodeIds ?? [];

        // A - Amyloid
        expect(ids).toContain('plasma_abeta42_40_ratio');

        // T - Tau
        expect(ids).toContain('plasma_ptau217');
        expect(ids).toContain('plasma_ptau181');

        // N - Neurodegeneration
        expect(ids).toContain('plasma_nfl');
        expect(ids).toContain('retinal_rnfl');

        // I - Inflammation (extension)
        expect(ids).toContain('plasma_gfap');

        // V - Vascular (extension)
        expect(ids).toContain('plasma_spdgfrbeta');
        expect(ids).toContain('pvs_enlarged');
        expect(ids).toContain('pericyte_injury');
      });
    });

    describe('N-first Pathway Preset', () => {
      it('should exist', () => {
        const preset = getPresetById('n_first_pathway');
        expect(preset).toBeDefined();
      });

      it('should represent SNAP pattern (neurodegeneration before amyloid)', () => {
        const preset = getPresetById('n_first_pathway');
        const ids = preset?.nodeIds ?? [];

        // Should include vascular/structural damage early
        expect(ids).toContain('pericyte_injury');
        expect(ids).toContain('bbb_breakdown');
        expect(ids).toContain('lrp1_apoe4_impaired');

        // Should include neurodegeneration markers
        expect(ids).toContain('plasma_nfl');

        // Should include tau independent of amyloid
        expect(ids).toContain('tau_hyperphosphorylation');

        // Amyloid should be in list (accumulates later)
        expect(ids).toContain('abeta_monomers');
        expect(ids).toContain('abeta_plaques');
      });
    });
  });

  describe('Biomarker Timeline Consistency', () => {
    it('should have sPDGFRβ as earliest (vascular precedes all)', () => {
      const biomarkers = getBiomarkersByTimeline();
      const earliest = biomarkers.filter(
        n => n.detectionTimeline?.yearsBeforeSymptoms === 45
      );
      expect(earliest.length).toBeGreaterThan(0);
      // These should be the vascular markers
      const ids = earliest.map(n => n.id);
      expect(ids.some(id => id.includes('spdgfrbeta') || id.includes('pericyte'))).toBe(true);
    });

    it('should have amyloid markers before tau markers in timeline', () => {
      const amyloidMarkers = getBiomarkersByATN('A');
      const tauMarkers = getBiomarkersByATN('T');

      const maxAmyloidYears = Math.max(
        ...amyloidMarkers.map(n => n.detectionTimeline?.yearsBeforeSymptoms ?? 0)
      );
      const maxTauYears = Math.max(
        ...tauMarkers.map(n => n.detectionTimeline?.yearsBeforeSymptoms ?? 0)
      );

      expect(maxAmyloidYears).toBeGreaterThanOrEqual(maxTauYears);
    });

    it('should have NfL as late marker (neuronal loss is downstream)', () => {
      const nfl = getNodeById('plasma_nfl');
      expect(nfl?.detectionTimeline?.yearsBeforeSymptoms).toBeLessThanOrEqual(10);
    });

    it('should have GFAP detectability consistent with astrocyte reactivity timing', () => {
      const gfap = getNodeById('plasma_gfap');
      // GFAP should be detectable in the 10-15 year range (after initial vascular damage, before overt symptoms)
      expect(gfap?.detectionTimeline?.yearsBeforeSymptoms).toBeGreaterThanOrEqual(5);
      expect(gfap?.detectionTimeline?.yearsBeforeSymptoms).toBeLessThanOrEqual(15);
    });
  });
});
