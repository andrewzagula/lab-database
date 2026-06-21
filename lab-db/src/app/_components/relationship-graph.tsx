"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Background,
  Controls,
  MiniMap,
  Panel,
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
  onSelect?: (recordId: string, kind: GraphNodeKind) => void;
  selectedNodeId?: string | null;
  highlightIds?: string[] | null;
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
  onSelect,
  selectedNodeId,
  highlightIds,
}: Props) {
  const router = useRouter();
  const highlight = highlightIds ? new Set(highlightIds) : null;

  const rfNodes: Node[] = useMemo(
    () =>
      nodes.map((n) => {
        const c = KIND_COLORS[n.kind];
        const dimmed = highlight ? !highlight.has(n.id) : false;
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
    [nodes, selectedNodeId, highlightIds], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const rfEdges: Edge[] = useMemo(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.relation,
        style: {
          stroke: "#94a3b8",
          strokeDasharray: e.relation === "used-in" ? "4 4" : undefined,
        },
        labelStyle: { fontSize: 10, fill: "#64748b" },
      })),
    [edges],
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const recordId = node.data?.recordId as string;
      const kind = node.data?.kind as GraphNodeKind;
      if (mode === "explore") {
        onSelect?.(recordId, kind);
        return;
      }
      const positioned = nodes.find((n) => n.id === node.id);
      if (positioned && !positioned.isCenter) {
        router.push(`/${kind}s/${recordId}`);
      }
    },
    [mode, onSelect, nodes, router],
  );

  if (mode === "focus" && nodes.length <= 1) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-600">
        No linked records yet.
      </div>
    );
  }

  return (
    <div className="h-[28rem] w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodeClick={onNodeClick}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} color="#f1f5f9" />
        <Controls showInteractive={false} />
        {mode === "explore" ? <MiniMap pannable zoomable /> : null}
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
