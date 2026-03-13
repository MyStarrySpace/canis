import { describe, it, expect } from 'vitest';
import {
  treatmentLibrary,
  getTreatmentById,
  getTreatmentsTargetingNode,
  getTreatmentsByStatus,
  getTreatmentsByEvidenceLevel,
  getTreatmentsByType,
  getInhibitors,
  getActivators,
  getAllTargetNodeIds,
} from './drugLibrary';
import type { TreatmentLibraryEntry, RegulatoryStatus, TreatmentADEvidence, TreatmentType } from './drugLibrary';

describe('Treatment Library Data Integrity', () => {
  describe('required fields', () => {
    it('all treatments have required fields', () => {
      treatmentLibrary.forEach((treatment: TreatmentLibraryEntry) => {
        // ID validation
        expect(treatment.id).toBeDefined();
        expect(typeof treatment.id).toBe('string');
        expect(treatment.id.length).toBeGreaterThan(0);
        // ID should be lowercase_snake_case
        expect(treatment.id).toMatch(/^[a-z][a-z0-9_]*$/);

        // Name validation
        expect(treatment.name).toBeDefined();
        expect(typeof treatment.name).toBe('string');
        expect(treatment.name.length).toBeGreaterThan(0);

        // Type validation
        expect(treatment.type).toBeDefined();
        const validTypes: TreatmentType[] = [
          'small_molecule', 'antibody', 'biologic', 'supplement',
          'device', 'lifestyle', 'behavioral'
        ];
        expect(validTypes).toContain(treatment.type);

        // FDA status validation
        expect(treatment.fdaStatus).toBeDefined();
        const validStatuses: RegulatoryStatus[] = [
          'approved', 'phase3', 'phase2', 'phase1',
          'preclinical', 'no_pathway', 'lifestyle', 'device_cleared'
        ];
        expect(validStatuses).toContain(treatment.fdaStatus);

        // Primary targets validation
        expect(treatment.primaryTargets).toBeDefined();
        expect(Array.isArray(treatment.primaryTargets)).toBe(true);
        expect(treatment.primaryTargets.length).toBeGreaterThan(0);

        // Mechanism summary validation
        expect(treatment.mechanismSummary).toBeDefined();
        expect(typeof treatment.mechanismSummary).toBe('string');
        expect(treatment.mechanismSummary.length).toBeGreaterThan(0);

        // AD evidence validation
        expect(treatment.adEvidence).toBeDefined();
        expect(treatment.adEvidence.level).toBeDefined();
        expect(['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7']).toContain(treatment.adEvidence.level);
        expect(treatment.adEvidence.summary).toBeDefined();

        // Availability validation
        expect(treatment.availability).toBeDefined();
        const validAvailability = [
          'prescription', 'otc', 'supplement', 'experimental',
          'consumer_device', 'free'
        ];
        expect(validAvailability).toContain(treatment.availability);
      });
    });

    it('no duplicate treatment IDs', () => {
      const ids = treatmentLibrary.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('primary targets', () => {
    it('all targets have required fields', () => {
      treatmentLibrary.forEach(treatment => {
        treatment.primaryTargets.forEach(target => {
          // nodeId validation
          expect(target.nodeId).toBeDefined();
          expect(typeof target.nodeId).toBe('string');
          expect(target.nodeId.length).toBeGreaterThan(0);

          // effect validation
          expect(target.effect).toBeDefined();
          expect(['activates', 'inhibits', 'modulates']).toContain(target.effect);

          // strength validation
          expect(target.strength).toBeDefined();
          expect(['strong', 'moderate', 'weak']).toContain(target.strength);
        });
      });
    });
  });

  describe('evidence levels', () => {
    it('all evidence levels are valid', () => {
      const validLevels: TreatmentADEvidence['level'][] = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];

      treatmentLibrary.forEach(treatment => {
        expect(validLevels).toContain(treatment.adEvidence.level);
      });
    });

    it('PMIDs are properly formatted when present', () => {
      treatmentLibrary.forEach(treatment => {
        if (treatment.adEvidence.pmids) {
          treatment.adEvidence.pmids.forEach(pmid => {
            expect(typeof pmid).toBe('string');
            // PMIDs are numeric strings
            expect(pmid).toMatch(/^\d+$/);
          });
        }
      });
    });
  });

  describe('costs', () => {
    it('annual costs are non-negative when defined', () => {
      treatmentLibrary.forEach(treatment => {
        if (treatment.annualCost !== undefined) {
          expect(treatment.annualCost).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it('free treatments have no annual cost or zero cost', () => {
      const freeTreatments = treatmentLibrary.filter(t => t.availability === 'free');
      freeTreatments.forEach(treatment => {
        expect(treatment.annualCost === undefined || treatment.annualCost === 0).toBe(true);
      });
    });
  });

  describe('variants', () => {
    it('variants have required fields when present', () => {
      treatmentLibrary.forEach(treatment => {
        if (treatment.variants) {
          treatment.variants.forEach(variant => {
            expect(variant.id).toBeDefined();
            expect(typeof variant.id).toBe('string');

            expect(variant.label).toBeDefined();
            expect(typeof variant.label).toBe('string');

            expect(variant.effectModifier).toBeDefined();
            expect(typeof variant.effectModifier).toBe('number');
            expect(variant.effectModifier).toBeGreaterThanOrEqual(0);
          });
        }
      });
    });
  });
});

describe('Utility Functions', () => {
  describe('getTreatmentById', () => {
    it('returns treatment when found', () => {
      const rapamycin = getTreatmentById('rapamycin');
      expect(rapamycin).toBeDefined();
      expect(rapamycin?.name).toContain('Rapamycin');
    });

    it('returns undefined for unknown ID', () => {
      const unknown = getTreatmentById('nonexistent_drug');
      expect(unknown).toBeUndefined();
    });
  });

  describe('getTreatmentsTargetingNode', () => {
    it('returns treatments targeting a specific node', () => {
      const treatments = getTreatmentsTargetingNode('mtorc1_hyperactive');
      expect(treatments.length).toBeGreaterThan(0);
      expect(treatments.some(t => t.id === 'rapamycin')).toBe(true);
    });

    it('returns empty array for unknown node', () => {
      const treatments = getTreatmentsTargetingNode('nonexistent_node');
      expect(treatments).toEqual([]);
    });
  });

  describe('getTreatmentsByStatus', () => {
    it('returns treatments with approved status', () => {
      const approved = getTreatmentsByStatus('approved');
      expect(approved.length).toBeGreaterThan(0);
      approved.forEach(t => {
        expect(t.fdaStatus).toBe('approved');
      });
    });

    it('returns treatments with experimental status', () => {
      const preclinical = getTreatmentsByStatus('preclinical');
      preclinical.forEach(t => {
        expect(t.fdaStatus).toBe('preclinical');
      });
    });
  });

  describe('getTreatmentsByEvidenceLevel', () => {
    it('returns L1 evidence treatments', () => {
      const l1Treatments = getTreatmentsByEvidenceLevel('L1');
      l1Treatments.forEach(t => {
        expect(t.adEvidence.level).toBe('L1');
      });
    });

    it('returns L4 evidence treatments', () => {
      const l4Treatments = getTreatmentsByEvidenceLevel('L4');
      expect(l4Treatments.length).toBeGreaterThan(0);
      l4Treatments.forEach(t => {
        expect(t.adEvidence.level).toBe('L4');
      });
    });
  });

  describe('getTreatmentsByType', () => {
    it('returns small molecule treatments', () => {
      const smallMolecules = getTreatmentsByType('small_molecule');
      expect(smallMolecules.length).toBeGreaterThan(0);
      smallMolecules.forEach(t => {
        expect(t.type).toBe('small_molecule');
      });
    });

    it('returns antibody treatments', () => {
      const antibodies = getTreatmentsByType('antibody');
      expect(antibodies.length).toBeGreaterThan(0);
      antibodies.forEach(t => {
        expect(t.type).toBe('antibody');
      });
    });

    it('returns lifestyle treatments', () => {
      const lifestyle = getTreatmentsByType('lifestyle');
      lifestyle.forEach(t => {
        expect(t.type).toBe('lifestyle');
      });
    });
  });

  describe('getInhibitors', () => {
    it('returns treatments with inhibit effect', () => {
      const inhibitors = getInhibitors();
      expect(inhibitors.length).toBeGreaterThan(0);
      inhibitors.forEach(t => {
        const hasInhibitTarget = t.primaryTargets.some(target => target.effect === 'inhibits');
        expect(hasInhibitTarget).toBe(true);
      });
    });
  });

  describe('getActivators', () => {
    it('returns treatments with activate effect', () => {
      const activators = getActivators();
      expect(activators.length).toBeGreaterThan(0);
      activators.forEach(t => {
        const hasActivateTarget = t.primaryTargets.some(target => target.effect === 'activates');
        expect(hasActivateTarget).toBe(true);
      });
    });
  });

  describe('getAllTargetNodeIds', () => {
    it('returns unique node IDs', () => {
      const nodeIds = getAllTargetNodeIds();
      expect(nodeIds.length).toBeGreaterThan(0);

      // Check uniqueness
      const uniqueIds = new Set(nodeIds);
      expect(uniqueIds.size).toBe(nodeIds.length);
    });

    it('all returned IDs are strings', () => {
      const nodeIds = getAllTargetNodeIds();
      nodeIds.forEach(id => {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      });
    });
  });
});
