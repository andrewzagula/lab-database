import { getFullGraph } from "@/lib/graph";
import { layoutLayered } from "@/lib/graph-layout";
import { ExploreClient } from "@/app/_components/explore-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Explore" };

export default function ExplorePage() {
  const graph = getFullGraph();
  const layout = layoutLayered(graph);

  return (
    <section className="space-y-6">
      <div>
        <p className="font-mono text-sm font-semibold uppercase text-teal-700">
          Explore
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
          Relationship map
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Every construct, plasmid, and experiment and the links between them.
          Pan and zoom to move around, search to find a record, and click a node
          to select it.
        </p>
      </div>
      <ExploreClient nodes={layout.nodes} edges={layout.edges} />
    </section>
  );
}
