import type { GraphNode, GraphNodeKind, RecordGraph } from "@/lib/graph";

export type PositionedNode = GraphNode & { position: { x: number; y: number } };
export type PositionedGraph = { nodes: PositionedNode[]; edges: RecordGraph["edges"] };

export const COLUMN_X: Record<GraphNodeKind, number> = {
  experiment: 0,
  plasmid: 280,
  construct: 560,
};
export const ROW_GAP = 90;
export const RING_RADIUS = { inner: 220, outer: 420 };

const KIND_ORDER: GraphNodeKind[] = ["experiment", "plasmid", "construct"];

export function layoutLayered(graph: RecordGraph): PositionedGraph {
  const nodes: PositionedNode[] = [];
  for (const kind of KIND_ORDER) {
    const column = graph.nodes
      .filter((n) => n.kind === kind)
      .sort((a, b) => a.recordId.localeCompare(b.recordId));
    column.forEach((n, i) => {
      nodes.push({ ...n, position: { x: COLUMN_X[kind], y: i * ROW_GAP } });
    });
  }
  return { nodes, edges: graph.edges };
}

export function layoutRadial(graph: RecordGraph): PositionedGraph {
  const center = graph.nodes.find((n) => n.isCenter) ?? graph.nodes[0];

  const adjacency = new Map<string, Set<string>>();
  for (const n of graph.nodes) adjacency.set(n.id, new Set());
  for (const e of graph.edges) {
    adjacency.get(e.source)?.add(e.target);
    adjacency.get(e.target)?.add(e.source);
  }

  const distance = new Map<string, number>();
  if (center) {
    distance.set(center.id, 0);
    const queue = [center.id];
    while (queue.length) {
      const current = queue.shift()!;
      const d = distance.get(current)!;
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!distance.has(neighbor)) {
          distance.set(neighbor, d + 1);
          queue.push(neighbor);
        }
      }
    }
  }

  const rings = new Map<number, GraphNode[]>();
  for (const n of graph.nodes) {
    const d = distance.get(n.id) ?? 1;
    if (!rings.has(d)) rings.set(d, []);
    rings.get(d)!.push(n);
  }

  const nodes: PositionedNode[] = [];
  for (const [d, ringNodes] of rings) {
    ringNodes.sort((a, b) => a.recordId.localeCompare(b.recordId));
    if (d === 0) {
      nodes.push({ ...ringNodes[0], position: { x: 0, y: 0 } });
      continue;
    }
    const radius = d === 1 ? RING_RADIUS.inner : RING_RADIUS.outer + (d - 2) * RING_RADIUS.inner;
    ringNodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / ringNodes.length;
      nodes.push({
        ...n,
        position: { x: Math.round(radius * Math.cos(angle)), y: Math.round(radius * Math.sin(angle)) },
      });
    });
  }

  return { nodes, edges: graph.edges };
}
