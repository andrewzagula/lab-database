export type GenBankMetadata = {
  locus: string | null;
  definition: string | null;
  lengthBp: number | null;
  topology: "circular" | "linear" | null;
  moleculeType: string | null;
  featureLabels: string[];
};

/**
 * Parse the lightweight header/feature metadata from a GenBank flat file.
 *
 * This intentionally reads only what a reviewer needs at a glance (locus,
 * definition, length, topology, and feature labels). It is not a full GenBank
 * parser and does not read the ORIGIN sequence block.
 */
export function parseGenBank(text: string): GenBankMetadata {
  const lines = text.split(/\r?\n/);

  const locusLine = lines.find((line) => line.startsWith("LOCUS")) ?? "";
  const locus = locusLine.slice("LOCUS".length).trim().split(/\s+/)[0] || null;

  const lengthMatch = locusLine.match(/(\d+)\s*bp/i);
  const lengthBp = lengthMatch ? Number(lengthMatch[1]) : null;

  const topologyMatch = locusLine.match(/\b(circular|linear)\b/i);
  const topology = topologyMatch
    ? (topologyMatch[1].toLowerCase() as "circular" | "linear")
    : null;

  const moleculeMatch = locusLine.match(/\d+\s*bp\s+(?:ss-|ds-|ms-)?([A-Za-z]+)/);
  const moleculeType = moleculeMatch ? moleculeMatch[1] : null;

  const definition = readMultilineField(lines, "DEFINITION");

  const seen = new Set<string>();
  const featureLabels: string[] = [];
  for (const line of lines) {
    const match = line.match(/\/label=(.*)$/);
    if (!match) {
      continue;
    }

    let label = match[1].trim();
    if (label.startsWith('"')) {
      label = label.slice(1);
      const closing = label.indexOf('"');
      if (closing !== -1) {
        label = label.slice(0, closing);
      }
    }
    label = label.trim();

    if (label && !seen.has(label)) {
      seen.add(label);
      featureLabels.push(label);
    }
  }

  return { locus, definition, lengthBp, topology, moleculeType, featureLabels };
}

/**
 * Read a top-level GenBank field that may continue across indented lines
 * (for example DEFINITION), joining the continuation lines into one string.
 */
function readMultilineField(lines: string[], keyword: string): string | null {
  const startIndex = lines.findIndex((line) => line.startsWith(keyword));
  if (startIndex === -1) {
    return null;
  }

  const parts = [lines[startIndex].slice(keyword.length).trim()];
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s/.test(line) && line.trim() !== "") {
      parts.push(line.trim());
    } else {
      break;
    }
  }

  const value = parts.join(" ").trim();
  return value || null;
}
