'use client';

import { useEffect, useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { usePresentationContext } from './PresentationProvider';

interface FocusOverlayProps {
  /** Padding around focused nodes when fitting view (default: 0.3 = 30%) */
  fitPadding?: number;
  /** Opacity for non-focused nodes (default: 0.12) */
  dimOpacity?: number;
  /** Animation duration in ms (default: 400) */
  duration?: number;
}

/**
 * Dims non-focused nodes/edges and animates the viewport to fit focused nodes.
 * Must be used inside both ReactFlowProvider and PresentationProvider.
 */
export function FocusOverlay({
  fitPadding = 0.3,
  dimOpacity = 0.12,
  duration = 400,
}: FocusOverlayProps) {
  const { activeStepData } = usePresentationContext();
  const { setNodes, setEdges, fitView } = useReactFlow();

  const focusNodeIds = useMemo(
    () => new Set(activeStepData?.focusNodeIds ?? []),
    [activeStepData],
  );

  const focusEdgeIds = useMemo(
    () => new Set(activeStepData?.focusEdgeIds ?? []),
    [activeStepData],
  );

  const isOverview = focusNodeIds.size === 0;

  // Apply dim/focus styles to nodes
  useEffect(() => {
    setNodes((nodes) =>
      nodes.map((node) => ({
        ...node,
        style: {
          ...node.style,
          opacity: isOverview || focusNodeIds.has(node.id) ? 1 : dimOpacity,
          transition: `opacity ${duration}ms ease`,
        },
      })),
    );
  }, [focusNodeIds, isOverview, dimOpacity, duration, setNodes]);

  // Apply dim/focus styles to edges
  useEffect(() => {
    setEdges((edges) =>
      edges.map((edge) => {
        // An edge is focused if explicitly listed, or if both source and target are focused
        const edgeFocused = isOverview ||
          focusEdgeIds.has(edge.id) ||
          (focusNodeIds.has(edge.source) && focusNodeIds.has(edge.target));

        return {
          ...edge,
          style: {
            ...edge.style,
            opacity: edgeFocused ? (edge.style?.opacity ?? 1) : dimOpacity,
            transition: `opacity ${duration}ms ease`,
          },
        };
      }),
    );
  }, [focusNodeIds, focusEdgeIds, isOverview, dimOpacity, duration, setEdges]);

  // Animate viewport to fit focused nodes
  useEffect(() => {
    if (isOverview) {
      fitView({ duration, padding: fitPadding });
    } else {
      fitView({
        duration,
        padding: fitPadding,
        nodes: Array.from(focusNodeIds).map((id) => ({ id })),
      });
    }
  }, [focusNodeIds, isOverview, fitView, fitPadding, duration]);

  return null; // This is a side-effect-only component
}
