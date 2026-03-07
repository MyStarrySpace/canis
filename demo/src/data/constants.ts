/**
 * Constants for the CANIS demo graph viewer
 * Module colors, category groupings, and layout constants
 */

import frameworkData from './ad-framework-data.json';

// ── Module metadata from framework data ─────────────────────────────────────

export interface ModuleInfo {
  id: string;
  name: string;
  shortName: string;
  description: string;
  color: string;
}

export const modules: ModuleInfo[] = frameworkData.modules as ModuleInfo[];

export const moduleColors: Record<string, string> = {};
modules.forEach((m) => { moduleColors[m.id] = m.color; });

export const moduleLabels: Record<string, string> = {};
modules.forEach((m) => { moduleLabels[m.id] = m.shortName; });

// ── Module categories for filter grouping ────────────────────────────────────

export type ModuleCategory = 'upstream' | 'core' | 'downstream' | 'boundary' | 'therapeutic';

export const moduleCategoryMap: Record<string, ModuleCategory> = {
  'M01': 'upstream',       // Upstream Triggers
  'M02': 'upstream',       // Lysosomal
  'M03': 'upstream',       // Autophagy
  'M13': 'upstream',       // MAM/Ca²+
  'M05': 'core',           // Iron
  'M07': 'core',           // Glia
  'M08': 'core',           // Viral
  'M09': 'core',           // Complement
  'M04': 'core',           // Neurovascular
  'M06': 'downstream',     // Aggregates
  'M11': 'downstream',     // Insulation/Myelin
  'M12': 'downstream',     // Export/Clearance
  'M10': 'downstream',     // Hormones
  'M17': 'downstream',     // Temporal
  'THER': 'therapeutic',   // Therapeutic
  'M14': 'boundary',       // Clinical boundaries
  'M15': 'boundary',       // Sex/Ancestry
  'M16': 'boundary',       // Gut-Brain
};

export const categoryOrder: ModuleCategory[] = ['upstream', 'core', 'downstream', 'therapeutic', 'boundary'];

export const categoryLabels: Record<ModuleCategory, string> = {
  upstream: 'Upstream',
  core: 'Core Pathology',
  downstream: 'Downstream',
  therapeutic: 'Therapeutic',
  boundary: 'Boundaries & Context',
};

// ── Layout constants ─────────────────────────────────────────────────────────

export const LAYER_HEIGHT = 90;
export const ROW_HEIGHT = 70;
export const NODE_WIDTH_SPACING = 190;
export const MAX_NODES_PER_ROW = 2;
export const NODE_GAP = 10;

// ── Node counts per module (pre-computed) ────────────────────────────────────

export const nodeCountsByModule: Record<string, number> = {};
(frameworkData.nodes as Array<{ moduleId: string }>).forEach((n) => {
  nodeCountsByModule[n.moduleId] = (nodeCountsByModule[n.moduleId] || 0) + 1;
});

// ── Category styles ──────────────────────────────────────────────────────────

export const categoryNodeStyles: Record<string, { borderRadius: string; size: number }> = {
  BOUNDARY: { borderRadius: '2px', size: 40 },
  PROCESS: { borderRadius: '50%', size: 36 },
  STATE: { borderRadius: '6px', size: 32 },
  STOCK: { borderRadius: '4px', size: 32 },
};
