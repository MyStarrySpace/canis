import { MoleculeNode } from './MoleculeNode';
import { ProteinNode } from './ProteinNode';
import { OrganelleNode } from './OrganelleNode';
import { ProcessNode } from './ProcessNode';
import { BoundaryNode } from './BoundaryNode';
import { CustomSvgNode } from './CustomSvgNode';
import { DefaultNode } from './DefaultNode';

/**
 * Biology-specific node types for CANIS graphs.
 * Maps node subtype (lowercased) to xyflow component.
 *
 * Usage: pass to CanisGraph `nodeTypes` prop, and set `nodeTypeMap`
 * to route SbsfNode subtypes to these type keys.
 */
export const biologyNodeTypes = {
  default: DefaultNode,
  molecule: MoleculeNode,
  protein: ProteinNode,
  organelle: OrganelleNode,
  process: ProcessNode,
  boundary: BoundaryNode,
  custom: CustomSvgNode,
} as const;

/**
 * Default subtype-to-nodeType mapping for biology graphs.
 * Maps SbsfNode.subtype values to keys in biologyNodeTypes.
 */
export const biologyNodeTypeMap: Record<string, string> = {
  // Subtypes → node type keys
  molecule: 'molecule',
  ion: 'molecule',
  ros: 'molecule',
  protein: 'protein',
  enzyme: 'protein',
  receptor: 'protein',
  transporter: 'protein',
  proteinpool: 'protein',
  organelle: 'organelle',
  mitochondria: 'organelle',
  lysosome: 'organelle',
  endosome: 'organelle',
  biochemicalreaction: 'process',
  reaction: 'process',
  signalingpathway: 'process',
  metabolicstate: 'process',
  membrane: 'boundary',
  barrier: 'boundary',
  boundarycondition: 'boundary',
  geneticfactor: 'default',
  cellularstate: 'default',
  celltype: 'default',
  custom: 'custom',
};
