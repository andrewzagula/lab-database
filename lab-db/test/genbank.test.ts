import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parseGenBank } from "@/lib/genbank";

const SAMPLE = `LOCUS       pTEST123                3500 bp    DNA     linear   SYN 01-JAN-2024
DEFINITION  A small test plasmid
            spanning two lines.
ACCESSION   .
FEATURES             Location/Qualifiers
     CDS             1..100
                     /label=GeneA
                     /note="something"
     CDS             200..300
                     /label="Quoted Label"
     misc_feature    400..500
                     /label=GeneA
//`;

test("parses locus, length, topology, and molecule type", () => {
  const md = parseGenBank(SAMPLE);
  assert.equal(md.locus, "pTEST123");
  assert.equal(md.lengthBp, 3500);
  assert.equal(md.topology, "linear");
  assert.equal(md.moleculeType, "DNA");
});

test("joins a multi-line definition", () => {
  const md = parseGenBank(SAMPLE);
  assert.equal(md.definition, "A small test plasmid spanning two lines.");
});

test("extracts de-duplicated feature labels and strips quotes", () => {
  const md = parseGenBank(SAMPLE);
  assert.deepEqual(md.featureLabels, ["GeneA", "Quoted Label"]);
});

test("returns nulls for content without a GenBank header", () => {
  const md = parseGenBank("this is not a genbank file");
  assert.equal(md.locus, null);
  assert.equal(md.lengthBp, null);
  assert.equal(md.topology, null);
  assert.equal(md.definition, null);
  assert.deepEqual(md.featureLabels, []);
});

test("parses the bundled Example_PL000001.gb", () => {
  const file = path.resolve(
    process.cwd(),
    "..",
    "Plasmid Files",
    "Example_PL000001.gb",
  );
  const md = parseGenBank(readFileSync(file, "utf8"));

  assert.equal(md.locus, "pSpCas9(BB)-2A-G");
  assert.equal(md.lengthBp, 9288);
  assert.equal(md.topology, "circular");
  for (const label of ["Cas9", "EGFP", "AmpR", "U6 promoter", "gRNA scaffold"]) {
    assert.ok(
      md.featureLabels.includes(label),
      `expected feature label ${label}`,
    );
  }
});
