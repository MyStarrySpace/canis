/**
 * Lightweight quadtree for 2D spatial indexing of graph nodes.
 * Used for viewport frustum culling in large graphs.
 */

export interface QTPoint {
  id: string;
  x: number;
  y: number;
}

export interface QTRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MAX_DEPTH = 12;
const MAX_POINTS = 16;

interface QTNode {
  bounds: QTRect;
  points: QTPoint[];
  children: QTNode[] | null;
  depth: number;
}

function contains(rect: QTRect, px: number, py: number): boolean {
  return (
    px >= rect.x &&
    px <= rect.x + rect.width &&
    py >= rect.y &&
    py <= rect.y + rect.height
  );
}

function intersects(a: QTRect, b: QTRect): boolean {
  return !(
    a.x > b.x + b.width ||
    a.x + a.width < b.x ||
    a.y > b.y + b.height ||
    a.y + a.height < b.y
  );
}

function subdivide(node: QTNode): void {
  const { x, y, width, height } = node.bounds;
  const hw = width / 2;
  const hh = height / 2;
  const d = node.depth + 1;
  node.children = [
    { bounds: { x, y, width: hw, height: hh }, points: [], children: null, depth: d },
    { bounds: { x: x + hw, y, width: hw, height: hh }, points: [], children: null, depth: d },
    { bounds: { x, y: y + hh, width: hw, height: hh }, points: [], children: null, depth: d },
    { bounds: { x: x + hw, y: y + hh, width: hw, height: hh }, points: [], children: null, depth: d },
  ];
  for (const p of node.points) {
    for (const child of node.children) {
      if (contains(child.bounds, p.x, p.y)) {
        child.points.push(p);
        break;
      }
    }
  }
  node.points = [];
}

function insert(node: QTNode, point: QTPoint): void {
  if (!contains(node.bounds, point.x, point.y)) return;
  if (node.children) {
    for (const child of node.children) {
      if (contains(child.bounds, point.x, point.y)) {
        insert(child, point);
        return;
      }
    }
    return;
  }
  node.points.push(point);
  if (node.points.length > MAX_POINTS && node.depth < MAX_DEPTH) {
    subdivide(node);
  }
}

function query(node: QTNode, rect: QTRect, results: string[]): void {
  if (!intersects(node.bounds, rect)) return;
  if (node.children) {
    for (const child of node.children) {
      query(child, rect, results);
    }
  } else {
    for (const p of node.points) {
      if (contains(rect, p.x, p.y)) {
        results.push(p.id);
      }
    }
  }
}

export class QuadTree {
  private root: QTNode;

  constructor(bounds: QTRect) {
    this.root = { bounds, points: [], children: null, depth: 0 };
  }

  insert(point: QTPoint): void {
    insert(this.root, point);
  }

  /** Return IDs of all points within the given rectangle. */
  query(rect: QTRect): string[] {
    const results: string[] = [];
    query(this.root, rect, results);
    return results;
  }

  /** Build a QuadTree from an array of positioned points. */
  static fromPoints(points: QTPoint[], padding = 100): QuadTree {
    if (points.length === 0) {
      return new QuadTree({ x: 0, y: 0, width: 1, height: 1 });
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const tree = new QuadTree({
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + 2 * padding,
      height: maxY - minY + 2 * padding,
    });
    for (const p of points) {
      tree.insert(p);
    }
    return tree;
  }
}
