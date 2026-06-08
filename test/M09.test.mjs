// M09 test suite
// Spec coverage: §9.4 (typeDistribution accumulation utilities: classifyForDist, accumulateDist, mergeDist, serializeDist)
// §17.3 item 7 (distribution-completeness invariant: sum of serializeDist values === occurrences)
import { assert, assertEqual } from "./_assert.mjs";
import {
  classifyForDist,
  accumulateDist,
  mergeDist,
  serializeDist,
} from "../src/type-distribution.mjs";

// ── §9.4  classifyForDist: all five primitive kinds ───────────────────────────
assert(classifyForDist(null)        === "null",    "classifyForDist: null → null");
assert(classifyForDist(true)        === "boolean", "classifyForDist: true → boolean");
assert(classifyForDist(false)       === "boolean", "classifyForDist: false → boolean");
assert(classifyForDist(0)           === "integer", "classifyForDist: 0 → integer");
assert(classifyForDist(1)           === "integer", "classifyForDist: 1 → integer");
assert(classifyForDist(-42)         === "integer", "classifyForDist: -42 → integer");
assert(classifyForDist(1.0)         === "integer", "classifyForDist: 1.0 → integer (same as 1)");
assert(classifyForDist(Number.MAX_SAFE_INTEGER) === "integer", "classifyForDist: MAX_SAFE_INTEGER → integer");
assert(classifyForDist(1.5)         === "number",  "classifyForDist: 1.5 → number");
assert(classifyForDist(3.14)        === "number",  "classifyForDist: 3.14 → number");
assert(classifyForDist(-0.5)        === "number",  "classifyForDist: -0.5 → number");
assert(classifyForDist("")          === "string",  "classifyForDist: empty string → string");
assert(classifyForDist("hello")     === "string",  "classifyForDist: 'hello' → string");
assert(classifyForDist("42")        === "string",  "classifyForDist: '42' (string) → string");
assert(classifyForDist("TRUE")      === "string",  "classifyForDist: 'TRUE' → string (not boolean)");

// ── §9.4  accumulateDist: mutation and counting ───────────────────────────────
{
  const dist = {};
  accumulateDist(dist, 10);
  assert(dist.integer === 1, "accumulateDist: first integer → count 1");
  accumulateDist(dist, 20);
  assert(dist.integer === 2, "accumulateDist: second integer → count 2");
  accumulateDist(dist, null);
  assert(dist.null === 1, "accumulateDist: null → count 1");
  accumulateDist(dist, "x");
  assert(dist.string === 1, "accumulateDist: string → count 1");
  accumulateDist(dist, true);
  assert(dist.boolean === 1, "accumulateDist: boolean → count 1");
  accumulateDist(dist, 1.5);
  assert(dist.number === 1, "accumulateDist: float → number count 1");
}

// ── §9.4 CSV case: spec example (95 integer, 3 string, 2 null = 100 total) ────
{
  const dist = {};
  for (let i = 0; i < 95; i++) accumulateDist(dist, i);
  for (let i = 0; i < 3;  i++) accumulateDist(dist, "data_error");
  for (let i = 0; i < 2;  i++) accumulateDist(dist, null);
  const s = serializeDist(dist);
  assertEqual(s, { null: 2, integer: 95, string: 3 }, "§9.4 CSV spec example: 100 rows");
}

// ── §9.4 JSON case: types produced by JSON.parse ─────────────────────────────
{
  const dist = {};
  accumulateDist(dist, JSON.parse("42"));        // integer
  accumulateDist(dist, JSON.parse("3.14"));      // number
  accumulateDist(dist, JSON.parse("true"));      // boolean
  accumulateDist(dist, JSON.parse("null"));      // null
  accumulateDist(dist, JSON.parse('"text"'));    // string
  const s = serializeDist(dist);
  assertEqual(s, { null: 1, boolean: 1, integer: 1, number: 1, string: 1 }, "§9.4 JSON case: one of each type");
}

// ── §9.4 Array elements case: mixed primitives ───────────────────────────────
{
  const elements = [1, 2, 3, null, "x", null, 4, "y"];
  const dist = {};
  for (const v of elements) accumulateDist(dist, v);
  const s = serializeDist(dist);
  assertEqual(s, { null: 2, integer: 4, string: 2 }, "§9.4 array case: mixed primitives");
}

// ── §9.4  serializeDist: lattice key order ────────────────────────────────────
{
  const dist = { string: 5, number: 4, integer: 3, boolean: 2, null: 1 };
  const s = serializeDist(dist);
  const keys = Object.keys(s);
  assertEqual(keys, ["null", "boolean", "integer", "number", "string"], "serializeDist: full lattice key order");
}

// ── §9.4  serializeDist: omits zero-count keys ────────────────────────────────
{
  const dist = { integer: 10, string: 2, boolean: 0 };
  const s = serializeDist(dist);
  assert(!Object.prototype.hasOwnProperty.call(s, "boolean"), "serializeDist: zero boolean omitted");
  assert(!Object.prototype.hasOwnProperty.call(s, "null"),    "serializeDist: absent null omitted");
  assert(!Object.prototype.hasOwnProperty.call(s, "number"),  "serializeDist: absent number omitted");
  assert(Object.keys(s).length === 2, "serializeDist: exactly two non-zero keys");
  assert(s.integer === 10, "serializeDist: integer count preserved");
  assert(s.string  === 2,  "serializeDist: string count preserved");
}

// ── §9.4  mergeDist: sums corresponding keys ─────────────────────────────────
{
  const d1 = { integer: 10, string: 2 };
  const d2 = { integer: 5, null: 3 };
  const m  = mergeDist(d1, d2);
  assert(m.integer === 15, "mergeDist: integer 10+5=15");
  assert(m.string  === 2,  "mergeDist: string 2+0=2");
  assert(m.null    === 3,  "mergeDist: null 0+3=3");
  assert(!m.boolean, "mergeDist: absent boolean not present");
}

{
  const m = mergeDist({}, { string: 7 });
  assert(m.string === 7,              "mergeDist: empty+string=7");
  assert(Object.keys(m).length === 1, "mergeDist: empty left — no spurious keys");
}

{
  const m = mergeDist({}, {});
  assert(Object.keys(m).length === 0, "mergeDist: two empties → empty");
}

// ── §17.3 item 7  distribution-completeness invariant ─────────────────────────
// Invariant: sum(serializeDist(dist)) === total values accumulated (occurrences)
{
  const values = [1, 2, null, "x", true, 3.14, 5, null, "y"];
  const dist = {};
  for (const v of values) accumulateDist(dist, v);
  const s = serializeDist(dist);
  const sum = Object.values(s).reduce((a, b) => a + b, 0);
  assert(sum === values.length, `§17.3 item 7: mixed values — sum=${sum} === occurrences=${values.length}`);
}

{
  const dist = {};
  for (let i = 0; i < 50; i++) accumulateDist(dist, i);
  const s = serializeDist(dist);
  const sum = Object.values(s).reduce((a, b) => a + b, 0);
  assert(sum === 50, "§17.3 item 7: homogeneous integers — sum=50=occurrences");
}

{
  // §9.4 CSV spec example: invariant holds for 100-row column
  const dist = {};
  for (let i = 0; i < 95; i++) accumulateDist(dist, i);
  for (let i = 0; i < 3;  i++) accumulateDist(dist, "err");
  for (let i = 0; i < 2;  i++) accumulateDist(dist, null);
  const s = serializeDist(dist);
  const sum = Object.values(s).reduce((a, b) => a + b, 0);
  assert(sum === 100, "§17.3 item 7: CSV spec example — sum=100=occurrences");
}

{
  // mergeDist preserves total count (invariant extends to merged distributions)
  const dist1 = {};
  const dist2 = {};
  for (let i = 0; i < 10; i++) accumulateDist(dist1, i);
  for (let i = 0; i < 5;  i++) accumulateDist(dist2, "s" + i);
  const merged = mergeDist(dist1, dist2);
  const sum = Object.values(merged).reduce((a, b) => a + b, 0);
  assert(sum === 15, "§17.3 item 7: mergeDist preserves total count (10+5=15)");
}
