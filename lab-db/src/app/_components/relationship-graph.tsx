"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Background,
  Controls,
  NodeToolbar,
  Panel,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { GraphEdge, GraphNodeKind } from "@/lib/graph";
import type { PositionedNode } from "@/lib/graph-layout";

const KIND_COLORS: Record<GraphNodeKind, { bg: string; border: string; text: string }> = {
  construct: { bg: "#ccfbf1", border: "#0f766e", text: "#134e4a" },
  plasmid: { bg: "#ede9fe", border: "#6d28d9", text: "#4c1d95" },
  experiment: { bg: "#fef3c7", border: "#b45309", text: "#78350f" },
};

const KIND_LABEL: Record<GraphNodeKind, string> = {
  construct: "Construct",
  plasmid: "Plasmid",
  experiment: "Experiment",
};

type Props = {
  nodes: PositionedNode[];
  edges: GraphEdge[];
  mode: "focus" | "explore";
  selectedNodeId?: string | null;
  highlightIds?: string[] | null;
  onSelect?: (nodeId: string) => void;
  onClearSelection?: () => void;
  heightClass?: string;
};

function nodeLabel(node: PositionedNode) {
  return (
    <div className="text-left leading-tight">
      <div className="font-mono text-[11px] font-semibold">{node.label}</div>
      {node.sublabel ? <div className="text-[10px] opacity-80">{node.sublabel}</div> : null}
    </div>
  );
}

export function RelationshipGraph({
  nodes,
  edges,
  mode,
  selectedNodeId,
  highlightIds,
  onSelect,
  onClearSelection,
  heightClass,
}: Props) {
  const router = useRouter();
  const highlight = highlightIds ? new Set(highlightIds) : null;

  // When a node is selected, the set of it + everything one edge away.
  const neighborIds = useMemo(() => {
    if (!selectedNodeId) return null;
    const set = new Set<string>([selectedNodeId]);
    for (const e of edges) {
      if (e.source === selectedNodeId) set.add(e.target);
      if (e.target === selectedNodeId) set.add(e.source);
    }
    return set;
  }, [selectedNodeId, edges]);

  const rfNodes: Node[] = useMemo(
    () =>
      nodes.map((n) => {
        const c = KIND_COLORS[n.kind];
        // A selection focuses its neighborhood; otherwise search drives dimming.
        const dimmed = neighborIds
          ? !neighborIds.has(n.id)
          : highlight
            ? !highlight.has(n.id)
            : false;
        const emphasized = n.isCenter || n.id === selectedNodeId;
        return {
          id: n.id,
          position: n.position,
          data: { label: nodeLabel(n), recordId: n.recordId, kind: n.kind },
          style: {
            background: c.bg,
            color: c.text,
            border: `${emphasized ? 3 : 1}px solid ${c.border}`,
            borderRadius: 8,
            padding: "6px 10px",
            width: 170,
            opacity: dimmed ? 0.25 : 1,
          },
        };
      }),
    // highlight/selected change must re-derive styles
    [nodes, selectedNodeId, highlightIds, neighborIds], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const rfEdges: Edge[] = useMemo(
    () =>
      edges.map((e) => {
        const incident =
          selectedNodeId != null && (e.source === selectedNodeId || e.target === selectedNodeId);
        const faded = selectedNodeId != null && !incident;
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.relation,
          zIndex: incident ? 1 : 0,
          style: {
            stroke: incident ? "#0f766e" : "#94a3b8",
            strokeWidth: incident ? 2.5 : 1,
            strokeDasharray: e.relation === "used-in" ? "4 4" : undefined,
            opacity: faded ? 0.1 : 1,
          },
          labelStyle: {
            fontSize: 10,
            fill: incident ? "#0f766e" : "#64748b",
            fontWeight: incident ? 600 : 400,
            opacity: faded ? 0.15 : 1,
          },
        };
      }),
    [edges, selectedNodeId],
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (mode === "explore") {
        onSelect?.(node.id);
        return;
      }
      const positioned = nodes.find((n) => n.id === node.id);
      if (positioned && !positioned.isCenter) {
        router.push(`/${positioned.kind}s/${positioned.recordId}`);
      }
    },
    [mode, onSelect, nodes, router],
  );

  const selected =
    mode === "explore" && selectedNodeId
      ? nodes.find((n) => n.id === selectedNodeId) ?? null
      : null;

  if (mode === "focus" && nodes.length <= 1) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-600">
        No linked records yet.
      </div>
    );
  }

  const resolvedHeight =
    heightClass ?? (mode === "explore" ? "h-[calc(100vh-15rem)] min-h-[36rem]" : "h-[28rem]");

  return (
    <div className={`${resolvedHeight} w-full overflow-hidden rounded-lg border border-slate-200 bg-white`}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodeClick={onNodeClick}
        onPaneClick={() => onClearSelection?.()}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} color="#f1f5f9" />
        <Controls showInteractive={false} />
        {selected ? (
          <NodeToolbar nodeId={selected.id} isVisible position={Position.Right} offset={14}>
            <div className="w-56 rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
              <p className="font-mono text-sm font-semibold text-slate-950">
                {selected.recordId}
              </p>
              <p className="mt-0.5 text-sm text-slate-700">{selected.label}</p>
              {selected.sublabel ? (
                <p className="text-xs text-slate-500">{selected.sublabel}</p>
              ) : null}
              <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase text-slate-600">
                {selected.kind}
              </span>
              <div className="mt-3">
                <Link
                  href={`/${selected.kind}s/${selected.recordId}`}
                  className="inline-flex rounded-md bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-800"
                >
                  View detail →
                </Link>
              </div>
            </div>
          </NodeToolbar>
        ) : null}
        <Panel position="top-left">
          <div className="flex gap-3 rounded-md border border-slate-200 bg-white/90 px-3 py-1.5 text-xs">
            {(Object.keys(KIND_COLORS) as GraphNodeKind[]).map((kind) => (
              <span key={kind} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: KIND_COLORS[kind].border }}
                />
                {KIND_LABEL[kind]}
              </span>
            ))}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
