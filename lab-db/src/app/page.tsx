import Link from "next/link";

const setupItems = [
  "Next.js App Router with TypeScript",
  "Tailwind CSS and ESLint scaffold",
  "Prisma initialized with SQLite",
  "Mock spreadsheets and source files preserved at repository root",
];

const domainAreas = [
  {
    label: "Constructs",
    href: "/constructs",
    description: "Protein designs represented by amino-acid sequences.",
  },
  {
    label: "Plasmids",
    href: "/plasmids",
    description: "DNA vehicles that carry constructs and link to GenBank files.",
  },
  {
    label: "Experiments",
    href: "/experiments",
    description: "Lab records that use one or more plasmids.",
  },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="border-b border-slate-200 pb-8">
        <p className="font-mono text-sm font-semibold uppercase text-teal-700">
          Local database app
        </p>
        <div className="mt-3 max-w-3xl space-y-3">
          <h2 className="text-4xl font-semibold tracking-normal text-slate-950">
            Scaffold ready for lab relationship tracing.
          </h2>
          <p className="text-lg leading-8 text-slate-600">
            This Phase 0 shell is prepared for constructs, plasmids, experiments,
            GenBank files, and experiment notes. Data modeling and import work
            begin in the next phase.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {domainAreas.map((area) => (
          <Link
            key={area.href}
            href={area.href}
            className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-teal-700 hover:shadow-sm"
          >
            <h3 className="text-lg font-semibold text-slate-950">
              {area.label}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {area.description}
            </p>
          </Link>
        ))}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="text-xl font-semibold text-slate-950">
          Phase 0 verification targets
        </h3>
        <ul className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          {setupItems.map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-teal-700" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
