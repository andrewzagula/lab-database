import Link from "next/link";

export default function ConstructNotFound() {
  return (
    <section className="space-y-6">
      <div>
        <p className="font-mono text-sm font-semibold uppercase text-teal-700">
          Construct not found
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
          No construct matches this ID.
        </h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">
          Check the construct ID or return to the construct list.
        </p>
      </div>
      <Link
        href="/constructs"
        className="inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-700 hover:text-teal-800"
      >
        Back to constructs
      </Link>
    </section>
  );
}
