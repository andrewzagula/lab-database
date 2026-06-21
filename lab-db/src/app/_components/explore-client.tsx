"use client";

import { useEffect, useMemo, useState } from "react";
import { RelationshipGraph } from "@/app/_components/relationship-graph";
import type { GraphEdge } from "@/lib/graph";
import type { PositionedNode } from "@/lib/graph-layout";

type Props = { nodes: PositionedNode[]; edges: GraphEdge[] };

export function ExploreClient({ nodes, edges }: Props) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

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

  // While the enlarged modal is open, lock body scroll and close on Escape.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);

  const searchInput = (
    <input
      type="search"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search by id, name, or type…"
      className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
    />
  );

  const buttonClass =
    "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-700 hover:text-teal-800";

  return (
    <>
      <div className="space-y-3">
        <div className="flex gap-2">
          {searchInput}
          <button type="button" onClick={() => setExpanded(true)} className={buttonClass}>
            <span aria-hidden>⤢</span> Enlarge
          </button>
        </div>
        <RelationshipGraph
          nodes={nodes}
          edges={edges}
          mode="explore"
          selectedNodeId={selectedId}
          highlightIds={highlightIds}
          onSelect={setSelectedId}
          onClearSelection={() => setSelectedId(null)}
        />
      </div>

      {expanded ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/70 p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Relationship map (enlarged)"
        >
          <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-lg bg-white p-3 shadow-2xl">
            <div className="flex items-center gap-2">
              {searchInput}
              <button type="button" onClick={() => setExpanded(false)} className={buttonClass}>
                Close <span aria-hidden>✕</span>
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <RelationshipGraph
                nodes={nodes}
                edges={edges}
                mode="explore"
                selectedNodeId={selectedId}
                highlightIds={highlightIds}
                onSelect={setSelectedId}
                onClearSelection={() => setSelectedId(null)}
                heightClass="h-full"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
