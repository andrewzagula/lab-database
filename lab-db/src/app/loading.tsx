export default function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-teal-700"
        />
        Loading…
      </div>
    </div>
  );
}
