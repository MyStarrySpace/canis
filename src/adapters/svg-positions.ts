/**
 * Adapter: Extract node positions from an SVG file.
 *
 * Parses SVG content, finds elements by ID, extracts bounding box center points.
 * Designed for build-time scripts that seed CANIS node x/y from existing SVG diagrams.
 *
 * Note: This works with DOMParser (browser or jsdom). For accurate bounding boxes
 * with nested transforms, use getBBox() in a real DOM environment (jsdom or browser).
 */

export interface SvgNodePosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Extract bounding box positions for named elements in an SVG string.
 *
 * @param svgContent - Raw SVG XML string
 * @param elementIds - Optional list of IDs to extract. If empty, extracts all elements with IDs.
 * @returns Array of position objects with center-point coordinates
 */
export function extractSvgPositions(
  svgContent: string,
  elementIds?: string[],
): SvgNodePosition[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return [];

  const results: SvgNodePosition[] = [];

  // Get elements to extract
  const elements: Element[] = [];
  if (elementIds && elementIds.length > 0) {
    for (const id of elementIds) {
      const el = doc.getElementById(id);
      if (el) elements.push(el);
    }
  } else {
    // Extract all elements with IDs (skip defs, clipPaths, etc.)
    const allWithIds = doc.querySelectorAll('[id]');
    for (const el of Array.from(allWithIds)) {
      const tag = el.tagName.toLowerCase();
      if (['defs', 'clippath', 'lineargradient', 'radialgradient', 'filter', 'pattern', 'mask'].includes(tag)) continue;
      if (el.closest('defs')) continue;
      elements.push(el);
    }
  }

  for (const el of elements) {
    const id = el.getAttribute('id');
    if (!id) continue;

    // Try getBBox for SVG graphics elements (works in browser/jsdom)
    if ('getBBox' in el && typeof (el as SVGGraphicsElement).getBBox === 'function') {
      try {
        const bbox = (el as SVGGraphicsElement).getBBox();
        results.push({
          id,
          x: bbox.x + bbox.width / 2,
          y: bbox.y + bbox.height / 2,
          width: bbox.width,
          height: bbox.height,
        });
        continue;
      } catch {
        // getBBox may fail for hidden elements
      }
    }

    // Fallback: try to extract from transform or position attributes
    const transform = el.getAttribute('transform');
    if (transform) {
      const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
      if (matrixMatch) {
        const values = matrixMatch[1].split(/[\s,]+/).map(Number);
        if (values.length >= 6) {
          results.push({
            id,
            x: values[4],
            y: values[5],
            width: 0,
            height: 0,
          });
          continue;
        }
      }
      const translateMatch = transform.match(/translate\(([^,)]+)[,\s]+([^)]+)\)/);
      if (translateMatch) {
        results.push({
          id,
          x: parseFloat(translateMatch[1]),
          y: parseFloat(translateMatch[2]),
          width: 0,
          height: 0,
        });
        continue;
      }
    }

    // Fallback for basic shapes
    const x = parseFloat(el.getAttribute('x') ?? el.getAttribute('cx') ?? '0');
    const y = parseFloat(el.getAttribute('y') ?? el.getAttribute('cy') ?? '0');
    const w = parseFloat(el.getAttribute('width') ?? '0');
    const h = parseFloat(el.getAttribute('height') ?? '0');
    if (x || y) {
      results.push({ id, x: x + w / 2, y: y + h / 2, width: w, height: h });
    }
  }

  return results;
}
