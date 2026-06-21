import { contentTypeForFile, readStoredFileBytes } from "@/lib/files";
import { getExperimentFile, getPlasmidFile } from "@/lib/read-db";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{
    kind: string;
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { kind, id } = await params;
  const numericId = Number(id);

  if (
    !Number.isInteger(numericId) ||
    (kind !== "plasmid" && kind !== "experiment")
  ) {
    return new Response("Not found", { status: 404 });
  }

  const file =
    kind === "plasmid" ? getPlasmidFile(numericId) : getExperimentFile(numericId);
  if (!file) {
    return new Response("Not found", { status: 404 });
  }

  const bytes = await readStoredFileBytes(file.filePath);
  if (!bytes) {
    return new Response("File is missing at the stored path.", { status: 404 });
  }

  const safeName = file.fileName.replace(/["\\\r\n]/g, "");

  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": contentTypeForFile(file.fileName),
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "no-store",
    },
  });
}
