'use client';

import { memo } from 'react';
import type { CanisNodeProps } from './types';
import { NodeHandle } from './shared/NodeHandle';
import { getTheme } from './shared/theme';

export const DefaultNode = memo(function DefaultNode({ data, selected }: CanisNodeProps) {
  const { sbsfNode, moduleColor, displayOptions, highlighted, dimmed, drugRole, selectedVariantId } = data;
  const t = getTheme(displayOptions.theme);
  const isLight = displayOptions.theme === 'light';
  const category = sbsfNode.category;
  const roles = sbsfNode.roles ?? [];
  const variants = sbsfNode.variants;
  const hasVariants = variants && variants.length > 0;

  // Find selected variant for display
  const activeVariant = hasVariants
    ? variants.find((v) => v.id === selectedVariantId) ?? variants.find((v) => v.isDefault) ?? variants[0]
    : null;

  const isTherapeuticTarget = roles.includes('THERAPEUTIC_TARGET');
  const isBiomarker = roles.includes('BIOMARKER');

  // Category-based shapes (SBSF v2.0)
  const borderRadius =
    category === 'STOCK' ? '50%' :
    category === 'BOUNDARY' ? 4 :
    category === 'PROCESS' ? 12 : 8;

  const borderStyle = category === 'BOUNDARY' ? 'dashed' : 'solid';
  const borderWidth = highlighted || selected || drugRole ? 2.5 : category === 'STOCK' ? 3 : 2;

  // Drug pathway coloring (light theme only)
  const drugBorderColor = drugRole === 'target' ? '#e36216' : drugRole === 'upstream' ? '#486393' : drugRole === 'downstream' ? '#5a8a6e' : null;
  const drugBgColor = isLight
    ? (drugRole === 'target' ? '#fef3ee' : drugRole === 'upstream' ? '#eef2f7' : drugRole === 'downstream' ? '#eef5f1' : null)
    : (drugRole ? `${drugBorderColor}15` : null);

  const borderColor = drugBorderColor ?? (highlighted || selected ? moduleColor : `${moduleColor}99`);
  const bgColor = drugBgColor ?? (highlighted ? `${moduleColor}20` : selected ? `${moduleColor}15` : t.bg);

  const opacity = dimmed ? 0.25 : 1;

  return (
    <div
      style={{
        opacity,
        width: 180,
        borderRadius,
        border: `${borderWidth}px ${borderStyle} ${borderColor}`,
        backgroundColor: bgColor,
        padding: '8px 12px',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        textAlign: 'center',
        boxShadow: drugRole === 'target' ? '0 0 0 3px #e3621630' : selected ? `0 0 0 2px ${moduleColor}40` : 'none',
      }}
      title={sbsfNode.label}
    >
      {/* Role indicator: therapeutic target (top-right orange dot) */}
      {isTherapeuticTarget && !drugRole && (
        <div style={{ position: 'absolute', top: -4, right: -4, width: 10, height: 10, borderRadius: '50%', backgroundColor: '#e36216', border: `1.5px solid ${isLight ? 'white' : '#1a0f0a'}` }} />
      )}

      {/* Role indicator: biomarker (bottom-right blue dot) */}
      {isBiomarker && !drugRole && (
        <div style={{ position: 'absolute', bottom: -4, right: -4, width: 10, height: 10, borderRadius: '50%', backgroundColor: '#486393', border: `1.5px solid ${isLight ? 'white' : '#1a0f0a'}` }} />
      )}

      {/* Drug target bullseye icon */}
      {drugRole === 'target' && (
        <div style={{ position: 'absolute', top: -6, right: -6, width: 14, height: 14, borderRadius: '50%', backgroundColor: '#e36216', border: `2px solid ${isLight ? 'white' : '#1a0f0a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="8" height="8" viewBox="0 0 12 12"><circle cx="6" cy="6" r="2" fill="white" /><circle cx="6" cy="6" r="5" stroke="white" strokeWidth="1" fill="none" /></svg>
        </div>
      )}

      <div
        style={{
          fontSize: 11,
          lineHeight: '14px',
          color: dimmed ? (isLight ? '#bbb' : '#555') : highlighted || selected ? t.text : t.textSecondary,
          fontWeight: highlighted || selected ? 600 : 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {sbsfNode.label}
      </div>

      {/* Variant indicator pill for boundary nodes with variants */}
      {hasVariants && activeVariant && !dimmed && (
        <div
          style={{
            marginTop: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: activeVariant.color ?? '#787473',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 9,
              color: isLight ? '#4a4a4a' : '#aaa',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 130,
            }}
          >
            {activeVariant.label}
          </span>
        </div>
      )}

      <NodeHandle type="target" color={moduleColor} direction={displayOptions.direction} visible={false} />
      <NodeHandle type="source" color={moduleColor} direction={displayOptions.direction} visible={false} />
    </div>
  );
});
