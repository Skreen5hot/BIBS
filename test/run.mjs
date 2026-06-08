// Seeded test runner (do not edit). Imports every test/*.test.mjs (each runs its assert() checks on
// import), then reports + exits non-zero on any failure. `node test/run.mjs` is the test command.
import { readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { report, results } from "./_assert.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const files = (await readdir(here)).filter((f) => f.endsWith(".test.mjs")).sort();
for (const f of files) {
  try {
    await import(pathToFileURL(join(here, f)).href);
  } catch (e) {
    results.failed++;
    results.failures.push(`importing ${f}: ${e && e.message ? e.message : e}`);
  }
}
process.exit(report() ? 0 : 1);
