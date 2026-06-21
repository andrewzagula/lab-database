import { all, get, withReadDb } from "@/lib/read-db";

export type GraphNodeKind = "construct" | "plasmid" | "experiment";

export type GraphNode = {
  id: string; // namespaced, e.g. "plasmid:PL000001"
  recordId: string; // bare id, e.g. "PL000001"
  kind: GraphNodeKind;
  label: string;
  sublabel: string | null;
  isCenter: boolean;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  relation: "carries" | "used-in";
};

export type RecordGraph = { nodes: GraphNode[]; edges: GraphEdge[] };

type ConstructRow = { id: string; shortName: string | null; length: number | null };
type PlasmidRow = { id: string; name: string | null; plasmidType: string | null; constructId: string | null };
type ExperimentRow = { id: string; titleAim: string | null; type: string | null };
type LinkRow = { experimentId: string; plasmidId: string };

export function nodeId(kind: GraphNodeKind, recordId: string): string {
  return `${kind}:${recordId}`;
}

function constructNode(r: ConstructRow, isCenter = false): GraphNode {
  return {
    id: nodeId("construct", r.id),
    recordId: r.id,
    kind: "construct",
    label: r.shortName ?? r.id,
    sublabel: r.length != null ? `${r.length} aa` : null,
    isCenter,
  };
}

function plasmidNode(r: PlasmidRow, isCenter = false): GraphNode {
  return {
    id: nodeId("plasmid", r.id),
    recordId: r.id,
    kind: "plasmid",
    label: r.name ?? r.id,
    sublabel: r.plasmidType,
    isCenter,
  };
}

function experimentNode(r: ExperimentRow, isCenter = false): GraphNode {
  return {
    id: nodeId("experiment", r.id),
    recordId: r.id,
    kind: "experiment",
    label: r.titleAim ?? r.id,
    sublabel: r.type,
    isCenter,
  };
}

function carriesEdge(constructId: string, plasmidId: string): GraphEdge {
  const source = nodeId("construct", constructId);
  const target = nodeId("plasmid", plasmidId);
  return { id: `${source}->${target}`, source, target, relation: "carries" };
}

function usedInEdge(plasmidId: string, experimentId: string): GraphEdge {
  const source = nodeId("plasmid", plasmidId);
  const target = nodeId("experiment", experimentId);
  return { id: `${source}->${target}`, source, target, relation: "used-in" };
}

export function getFullGraph(): RecordGraph {
  return withReadDb((db) => {
    const constructs = all<ConstructRow>(db, `SELECT "id","shortName","length" FROM "Construct" ORDER BY "id"`);
    const plasmids = all<PlasmidRow>(db, `SELECT "id","name","plasmidType","constructId" FROM "Plasmid" ORDER BY "id"`);
    const experiments = all<ExperimentRow>(db, `SELECT "id","titleAim","type" FROM "Experiment" ORDER BY "id"`);
    const links = all<LinkRow>(db, `SELECT "experimentId","plasmidId" FROM "ExperimentPlasmid"`);

    const nodes: GraphNode[] = [
      ...constructs.map((r) => constructNode(r)),
      ...plasmids.map((r) => plasmidNode(r)),
      ...experiments.map((r) => experimentNode(r)),
    ];

    const edges: GraphEdge[] = [];
    for (const p of plasmids) {
      if (p.constructId) edges.push(carriesEdge(p.constructId, p.id));
    }
    for (const l of links) {
      edges.push(usedInEdge(l.plasmidId, l.experimentId));
    }

    return { nodes, edges };
  });
}

export function getRecordGraph(kind: GraphNodeKind, id: string): RecordGraph | null {
  return withReadDb((db) => {
    const nodes = new Map<string, GraphNode>();
    const edges = new Map<string, GraphEdge>();
    const addNode = (n: GraphNode) => {
      if (!nodes.has(n.id)) nodes.set(n.id, n);
    };
    const addEdge = (e: GraphEdge) => {
      if (!edges.has(e.id)) edges.set(e.id, e);
    };

    const expsForPlasmid = (plasmidId: string) =>
      all<ExperimentRow>(
        db,
        `SELECT e."id", e."titleAim", e."type" FROM "ExperimentPlasmid" ep INNER JOIN "Experiment" e ON e."id" = ep."experimentId" WHERE ep."plasmidId" = ? ORDER BY e."id"`,
        [plasmidId],
      );
    const constructById = (constructId: string) =>
      get<ConstructRow>(db, `SELECT "id","shortName","length" FROM "Construct" WHERE "id" = ?`, [constructId]);

    if (kind === "construct") {
      const c = constructById(id);
      if (!c) return null;
      addNode(constructNode(c, true));
      const plasmids = all<PlasmidRow>(
        db,
        `SELECT "id","name","plasmidType","constructId" FROM "Plasmid" WHERE "constructId" = ? ORDER BY "id"`,
        [id],
      );
      for (const p of plasmids) {
        addNode(plasmidNode(p));
        addEdge(carriesEdge(id, p.id));
        for (const e of expsForPlasmid(p.id)) {
          addNode(experimentNode(e));
          addEdge(usedInEdge(p.id, e.id));
        }
      }
    } else if (kind === "plasmid") {
      const p = get<PlasmidRow>(db, `SELECT "id","name","plasmidType","constructId" FROM "Plasmid" WHERE "id" = ?`, [id]);
      if (!p) return null;
      addNode(plasmidNode(p, true));
      if (p.constructId) {
        const c = constructById(p.constructId);
        if (c) {
          addNode(constructNode(c));
          addEdge(carriesEdge(c.id, p.id));
        }
      }
      for (const e of expsForPlasmid(id)) {
        addNode(experimentNode(e));
        addEdge(usedInEdge(id, e.id));
      }
    } else {
      const e = get<ExperimentRow>(db, `SELECT "id","titleAim","type" FROM "Experiment" WHERE "id" = ?`, [id]);
      if (!e) return null;
      addNode(experimentNode(e, true));
      const plasmids = all<PlasmidRow>(
        db,
        `SELECT p."id", p."name", p."plasmidType", p."constructId" FROM "ExperimentPlasmid" ep INNER JOIN "Plasmid" p ON p."id" = ep."plasmidId" WHERE ep."experimentId" = ? ORDER BY p."id"`,
        [id],
      );
      for (const p of plasmids) {
        addNode(plasmidNode(p));
        addEdge(usedInEdge(p.id, e.id));
        if (p.constructId) {
          const c = constructById(p.constructId);
          if (c) {
            addNode(constructNode(c));
            addEdge(carriesEdge(c.id, p.id));
          }
        }
      }
    }

    return { nodes: [...nodes.values()], edges: [...edges.values()] };
  });
}

export function countDemoRecords(): number {
  return withReadDb((db) => {
    const one = (sql: string) => get<{ n: number }>(db, sql)?.n ?? 0;
    return (
      one(`SELECT count(*) AS n FROM "Construct" WHERE "id" LIKE 'CON9%'`) +
      one(`SELECT count(*) AS n FROM "Plasmid" WHERE "id" LIKE 'PL9%'`) +
      one(`SELECT count(*) AS n FROM "Experiment" WHERE "id" LIKE 'EXP9%'`)
    );
  });
}
