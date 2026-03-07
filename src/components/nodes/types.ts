import type { NodeProps, Node } from '@xyflow/react';
import type { CanisNodeData } from '../../lib/convert-to-xyflow';

/** CANIS node for xyflow — wraps SbsfNode data with module color and display options */
export type CanisNode = Node<CanisNodeData>;

/** Props passed to custom CANIS node components */
export type CanisNodeProps = NodeProps<CanisNode>;
