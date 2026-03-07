'use client';

/**
 * Renders chemical names with proper sub/superscripts.
 * Handles patterns like Fe2+, Fe3+, H2O2, O2-, GPX4, etc.
 */
export function ChemicalFormula({ text, style }: { text: string; style?: React.CSSProperties }) {
  // Parse the text into segments of normal text, subscripts, and superscripts
  const segments: { type: 'normal' | 'sub' | 'sup'; value: string }[] = [];

  // Unicode subscript/superscript characters (already formatted)
  if (/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]/.test(text) || /[₀₁₂₃₄₅₆₇₈₉]/.test(text)) {
    segments.push({ type: 'normal', value: text });
    return (
      <span style={style}>
        {segments.map((s, i) => <span key={i}>{s.value}</span>)}
      </span>
    );
  }

  // Parse ASCII patterns: numbers after letters become subscript, +/- with optional number become superscript
  let remaining = text;
  while (remaining.length > 0) {
    // Superscript: digit followed by +/-, or just +/-
    const supMatch = remaining.match(/^(\d*[+\-])/);
    if (supMatch && segments.length > 0) {
      segments.push({ type: 'sup', value: supMatch[1] });
      remaining = remaining.slice(supMatch[1].length);
      continue;
    }

    // Subscript: digits after a letter
    const subMatch = remaining.match(/^(\d+)/);
    if (subMatch && segments.length > 0 && segments[segments.length - 1].type === 'normal') {
      segments.push({ type: 'sub', value: subMatch[1] });
      remaining = remaining.slice(subMatch[1].length);
      continue;
    }

    // Normal text: consume until a pattern boundary
    const normalMatch = remaining.match(/^([A-Za-z()·\s]+)/);
    if (normalMatch) {
      segments.push({ type: 'normal', value: normalMatch[1] });
      remaining = remaining.slice(normalMatch[1].length);
      continue;
    }

    // Fallback: consume one character
    segments.push({ type: 'normal', value: remaining[0] });
    remaining = remaining.slice(1);
  }

  return (
    <span style={style}>
      {segments.map((s, i) => {
        if (s.type === 'sub') return <sub key={i}>{s.value}</sub>;
        if (s.type === 'sup') return <sup key={i}>{s.value}</sup>;
        return <span key={i}>{s.value}</span>;
      })}
    </span>
  );
}
