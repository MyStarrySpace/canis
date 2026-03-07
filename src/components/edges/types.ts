import type { EdgeProps, Edge } from '@xyflow/react';
import type { CanisEdgeData } from '../../lib/convert-to-xyflow';

/** CANIS edge for xyflow — wraps SbsfEdge data */
export type CanisEdge = Edge<CanisEdgeData>;

/** Props passed to custom CANIS edge components */
export type CanisEdgeProps = EdgeProps<CanisEdge>;
