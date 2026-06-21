"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RelationshipGraph } from "@/app/_components/relationship-graph";
import type { GraphEdge, GraphNodeKind } from "@/lib/graph";
import type { PositionedNode } from "@/lib/graph-layout";

type Props = { nodes: PositionedNode[]; edges: GraphEdge[] };

type Selection = { recordId: string; kind: GraphNodeKind } | null;

export function ExploreClient({ nodes, edges }: Props) {
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<Selection>(null);

  const highlightIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return nodes
      .filter(
        (n) =>
          n.recordId.toLowerCase().includes(q) ||
          n.label.toLowerCase().includes(q) ||
          (n.sublabel ?? "").toLowerCase().includes(q),
      )
      .map((n) => n.id);
  }, [query, nodes]);

  const selectedNode = selection
    ? nodes.find((n) => n.recordId === selection.recordId && n.kind === selection.kind) ?? null
    : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <div className="space-y-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by id, name, or type…"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
        />
        <RelationshipGraph
          nodes={nodes}
          edges={edges}
          mode="explore"
          onSelect={(recordId, kind) => setSelection({ recordId, kind })}
          selectedNodeId={selectedNode?.id ?? null}
          highlightIds={highlightIds}
        />
      </div>

      <aside className="rounded-lg border border-slate-200 bg-white p-5">
        <p className="font-mono text-xs font-semibold uppercase text-teal-700">
          Selection
        </p>
        {selectedNode ? (
          <div className="mt-3 space-y-3">
            <div>
              <p className="font-mono text-sm font-semibold text-slate-950">
                {selectedNode.recordId}
              </p>
              <p className="text-sm text-slate-700">{selectedNode.label}</p>
              {selectedNode.sublabel ? (
                <p className="text-xs text-slate-500">{selectedNode.sublabel}</p>
              ) : null}
              <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase text-slate-600">
                {selectedNode.kind}
              </span>
            </div>
            <Link
              href={`/${selectedNode.kind}s/${selectedNode.recordId}`}
              className="inline-flex rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              View detail & focus map
            </Link>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            Click a node to see its details and a link to its page.
          </p>
        )}
      </aside>
    </div>
  );
}
