/**
 * Mechanistic Network Nodes
 *
 * 194+ nodes representing molecular entities, cellular states, and clinical outcomes
 * in the AD pathophysiology network. Organized by module.
 *
 * This index re-exports all module-specific node arrays and combines them into allNodes.
 */

import type { MechanisticNode } from '../types';

// Re-export all module node arrays
export { boundaryNodes } from './boundary';
export { module1Nodes } from './m01-mtor-autophagy';
export { module2Nodes } from './m02-lysosomal';
export { module3Nodes } from './m03-mitochondrial';
export { module4Nodes } from './m04-inflammasome';
export { module5Nodes } from './m05-microglia';
export { module6Nodes } from './m06-amyloid';
export { module7Nodes } from './m07-tau';
export { module8Nodes } from './m08-complement';
export { module9Nodes } from './m09-iron-ferroptosis';
export { module10Nodes } from './m10-apoe4-rest';
export { module11Nodes } from './m11-trem2-dam';
export { module12Nodes } from './m12-bbb-glymphatic';
export { module13Nodes } from './m13-cholinergic';
export { module14Nodes } from './m14-mam-calcium';
export { module15Nodes } from './m15-interventions';
export { module16Nodes } from './m16-sex-ancestry';
export { module17Nodes } from './m17-immunomodulatory';
export { module18Nodes } from './m18-astrocyte-endfoot';
export { module19Nodes } from './m19-post-infectious';
export { module20Nodes } from './m20-hormones';

// Import for combining into allNodes
import { boundaryNodes } from './boundary';
import { module1Nodes } from './m01-mtor-autophagy';
import { module2Nodes } from './m02-lysosomal';
import { module3Nodes } from './m03-mitochondrial';
import { module4Nodes } from './m04-inflammasome';
import { module5Nodes } from './m05-microglia';
import { module6Nodes } from './m06-amyloid';
import { module7Nodes } from './m07-tau';
import { module8Nodes } from './m08-complement';
import { module9Nodes } from './m09-iron-ferroptosis';
import { module10Nodes } from './m10-apoe4-rest';
import { module11Nodes } from './m11-trem2-dam';
import { module12Nodes } from './m12-bbb-glymphatic';
import { module13Nodes } from './m13-cholinergic';
import { module14Nodes } from './m14-mam-calcium';
import { module15Nodes } from './m15-interventions';
import { module16Nodes } from './m16-sex-ancestry';
import { module17Nodes } from './m17-immunomodulatory';
import { module18Nodes } from './m18-astrocyte-endfoot';
import { module19Nodes } from './m19-post-infectious';
import { module20Nodes } from './m20-hormones';

// Combined array of all nodes for network operations
export const allNodes: MechanisticNode[] = [
  ...boundaryNodes,
  ...module1Nodes,
  ...module2Nodes,
  ...module3Nodes,
  ...module4Nodes,
  ...module5Nodes,
  ...module6Nodes,
  ...module7Nodes,
  ...module8Nodes,
  ...module9Nodes,
  ...module10Nodes,
  ...module11Nodes,
  ...module12Nodes,
  ...module13Nodes,
  ...module14Nodes,
  ...module15Nodes,
  ...module16Nodes,
  ...module17Nodes,
  ...module18Nodes,
  ...module19Nodes,
  ...module20Nodes,
];

// Re-export the type for convenience
export type { MechanisticNode };
