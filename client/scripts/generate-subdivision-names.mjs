// Regenerates public/subdivision-names.generated.json, the subdivision code → name lookup the
// dashboard uses for region labels, from public/subdivisions.json (15 MB of geometry). Run it from
// client/ after replacing subdivisions.json:
//
//   node scripts/generate-subdivision-names.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const subdivisions = JSON.parse(readFileSync(join(publicDir, "subdivisions.json"), "utf8"));

const names = new Map();
for (const { properties } of subdivisions.features) {
  const code = properties.iso_3166_2;
  // Some codes appear on more than one feature; the first one wins, as it did when labels were
  // looked up with features.find().
  if (code && !names.has(code)) names.set(code, properties.name);
}

writeFileSync(join(publicDir, "subdivision-names.generated.json"), `${JSON.stringify(Object.fromEntries(names))}\n`);
console.log(`Wrote ${names.size} subdivision names`);
