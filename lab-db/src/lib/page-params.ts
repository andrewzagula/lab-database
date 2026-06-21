export type PageSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export async function readQuery(searchParams: PageSearchParams) {
  const params = await searchParams;
  const raw = params.q;
  const value = Array.isArray(raw) ? raw[0] : raw;

  return value?.trim() ?? "";
}
