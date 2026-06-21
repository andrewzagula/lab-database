import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Mock files referenced by the database (GenBank files, experiment documents)
 * live at the repository root, one directory above the Next.js app (cwd).
 * Serving is restricted to that root so a stored path can never be used to
 * read arbitrary files elsewhere on disk.
 */
const ALLOWED_BASE = path.resolve(process.cwd(), "..");

export function resolveStoredFilePath(storedPath: string): string | null {
  if (!storedPath) {
    return null;
  }

  const resolved = path.resolve(process.cwd(), storedPath);
  const relative = path.relative(ALLOWED_BASE, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }

  return resolved;
}

export function storedFileExists(storedPath: string): boolean {
  const resolved = resolveStoredFilePath(storedPath);
  return resolved ? existsSync(resolved) : false;
}

export async function readStoredFileText(storedPath: string): Promise<string | null> {
  const resolved = resolveStoredFilePath(storedPath);
  if (!resolved || !existsSync(resolved)) {
    return null;
  }

  return readFile(resolved, "utf8");
}

export async function readStoredFileBytes(storedPath: string): Promise<Buffer | null> {
  const resolved = resolveStoredFilePath(storedPath);
  if (!resolved || !existsSync(resolved)) {
    return null;
  }

  return readFile(resolved);
}

const CONTENT_TYPES: Record<string, string> = {
  ".gb": "text/plain; charset=utf-8",
  ".gbk": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
};

export function contentTypeForFile(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

export function isGenBankFile(fileName: string, fileType: string | null): boolean {
  return fileType === "genbank" || /\.gbk?$/i.test(fileName);
}
