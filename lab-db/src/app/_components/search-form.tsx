import Link from "next/link";

type SearchFormProps = {
  action: string;
  query: string;
  placeholder: string;
};

export function SearchForm({ action, query, placeholder }: SearchFormProps) {
  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row"
    >
      <label className="sr-only" htmlFor="q">
        Search
      </label>
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={query}
        placeholder={placeholder}
        className="min-h-11 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="min-h-11 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
        >
          Search
        </button>
        {query ? (
          <Link
            href={action}
            className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-700 hover:text-teal-800"
          >
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
