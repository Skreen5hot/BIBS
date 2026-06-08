// M07 test suite
// Spec coverage: §8.5.1 (Three-Tier Classification Model), §8.5.2 (Array Inference Rules 1, 2, 4)
// Appendix D: D.1 (all-null), D.2 (homogeneous primitive), D.3 (mixed primitive),
//             D.4 (object array), D.8 (nested arrays), D.9 (empty array)
// §17.2: homogeneous + mixed-primitive array cases
// Rule 3 (§8.5.2): DEFERRED to M08 — verified here only as null-return sentinel

import { assert } from "./_assert.mjs";
import { compositeKind, primitiveKind, inferArrayItemType } from "../src/array-infer.mjs";
import { DIAG } from "../src/types.mjs";

// ── §8.5.1 Tier 1: compositeKind ─────────────────────────────────────────────
assert(compositeKind(null)       === "null",      "§8.5.1 Tier1: null → 'null'");
assert(compositeKind([])         === "array",     "§8.5.1 Tier1: [] → 'array'");
assert(compositeKind([1, 2])     === "array",     "§8.5.1 Tier1: [1,2] → 'array'");
assert(compositeKind({})         === "object",    "§8.5.1 Tier1: {} → 'object'");
assert(compositeKind({ a: 1 })   === "object",    "§8.5.1 Tier1: {a:1} → 'object'");
assert(compositeKind(true)       === "primitive", "§8.5.1 Tier1: true → 'primitive'");
assert(compositeKind(false)      === "primitive", "§8.5.1 Tier1: false → 'primitive'");
assert(compositeKind(42)         === "primitive", "§8.5.1 Tier1: 42 → 'primitive'");
assert(compositeKind(3.14)       === "primitive", "§8.5.1 Tier1: 3.14 → 'primitive'");
assert(compositeKind("hello")    === "primitive", "§8.5.1 Tier1: 'hello' → 'primitive'");
assert(compositeKind("")         === "primitive", "§8.5.1 Tier1: '' → 'primitive'");
assert(compositeKind(0)          === "primitive", "§8.5.1 Tier1: 0 → 'primitive'");

// ── §8.5.1 Tier 2: primitiveKind ─────────────────────────────────────────────
assert(primitiveKind(true)   === "boolean", "§8.5.1 Tier2: true → 'boolean'");
assert(primitiveKind(false)  === "boolean", "§8.5.1 Tier2: false → 'boolean'");
assert(primitiveKind(0)      === "integer", "§8.5.1 Tier2: 0 → 'integer'");
assert(primitiveKind(42)     === "integer", "§8.5.1 Tier2: 42 → 'integer'");
assert(primitiveKind(-5)     === "integer", "§8.5.1 Tier2: -5 → 'integer'");
assert(primitiveKind(1.0)    === "integer", "§8.5.1 Tier2: 1.0 → 'integer' (same as 1)");
assert(primitiveKind(3.14)   === "number",  "§8.5.1 Tier2: 3.14 → 'number'");
assert(primitiveKind(0.1)    === "number",  "§8.5.1 Tier2: 0.1 → 'number'");
assert(primitiveKind("hello") === "string", "§8.5.1 Tier2: 'hello' → 'string'");
assert(primitiveKind("")      === "string", "§8.5.1 Tier2: '' → 'string'");

// ── §8.5.2 Rule 4: empty array → null + BIBSS-007 (Appendix D, D.9) ──────────
{
  const diags = [];
  const result = inferArrayItemType([], "#/items/[]", 1.0, diags);
  assert(result === null,                    "D.9/Rule4: empty → null");
  assert(diags.length === 1,                 "D.9/Rule4: one diagnostic emitted");
  assert(diags[0].code === DIAG.EMPTY_INPUT, "D.9/Rule4: code = BIBSS-007");
}

// ── §8.5.2 Rule 1: all-null array (Appendix D, D.1) ──────────────────────────
{
  const diags = [];
  const result = inferArrayItemType([null, null, null], "#/[]", 1.0, diags);
  assert(result !== null,                         "D.1/Rule1: result not null");
  assert(result.kind === "primitive",             "D.1/Rule1: kind = 'primitive'");
  assert(result.primitiveType === "null",         "D.1/Rule1: primitiveType = 'null'");
  assert(result.nullable === true,                "D.1/Rule1: nullable = true");
  assert(result.occurrences === 3,                "D.1/Rule1: occurrences = 3");
  assert(result.typeDistribution["null"] === 3,   "D.1/Rule1: typeDistribution null=3");
  assert(diags.length === 0,                      "D.1/Rule1: no diagnostics");
}

// Single-element all-null
{
  const diags = [];
  const r = inferArrayItemType([null], "#/[]", 1.0, diags);
  assert(r.primitiveType === "null", "Rule1: single null → null");
  assert(r.nullable === true,        "Rule1: single null → nullable");
  assert(r.typeDistribution["null"] === 1, "Rule1: typeDistribution null=1");
}

// ── §8.5.2 Rule 2 (primitives): homogeneous integer array (D.2 / §17.2) ──────
{
  const diags = [];
  const result = inferArrayItemType([1, 2, 3], "#/[]", 1.0, diags);
  assert(result.kind === "primitive",              "D.2/§17.2: kind = 'primitive'");
  assert(result.primitiveType === "integer",       "D.2/§17.2: primitiveType = 'integer'");
  assert(result.nullable === false,                "D.2/§17.2: nullable = false");
  assert(result.occurrences === 3,                 "D.2/§17.2: occurrences = 3");
  assert(result.typeDistribution["integer"] === 3, "D.2/§17.2: typeDistribution integer=3");
  assert(!result.typeDistribution["null"],         "D.2/§17.2: no null in typeDistribution");
}

// Homogeneous string array (§17.2)
{
  const diags = [];
  const result = inferArrayItemType(["a", "b", "c"], "#/[]", 1.0, diags);
  assert(result.primitiveType === "string",        "§17.2: homogeneous string → 'string'");
  assert(result.nullable === false,                "§17.2: homogeneous string not nullable");
  assert(result.typeDistribution["string"] === 3,  "§17.2: typeDistribution string=3");
}

// Homogeneous boolean array (§17.2)
{
  const diags = [];
  const result = inferArrayItemType([true, false, true], "#/[]", 1.0, diags);
  assert(result.primitiveType === "boolean",         "§17.2: homogeneous boolean → 'boolean'");
  assert(result.nullable === false,                  "§17.2: homogeneous boolean not nullable");
  assert(result.typeDistribution["boolean"] === 3,   "§17.2: typeDistribution boolean=3");
}

// Homogeneous number array (§17.2)
{
  const diags = [];
  const result = inferArrayItemType([1.1, 2.2, 3.3], "#/[]", 1.0, diags);
  assert(result.primitiveType === "number",  "§17.2: homogeneous number → 'number'");
  assert(result.nullable === false,          "§17.2: homogeneous number not nullable");
}

// ── §8.5.2 Rule 2 (primitives): mixed-primitive arrays (D.3 / §17.2) ─────────
// Spec example 1: [true, 1, 2, null] → integer, nullable:true  (§8.5.2)
{
  const diags = [];
  const result = inferArrayItemType([true, 1, 2, null], "#/[]", 1.0, diags);
  assert(result.kind === "primitive",              "D.3/spec-ex1: kind = 'primitive'");
  assert(result.primitiveType === "integer",       "D.3/spec-ex1: boolean+integer+null → integer");
  assert(result.nullable === true,                 "D.3/spec-ex1: nullable = true");
  assert(result.typeDistribution["boolean"] === 1, "D.3/spec-ex1: typeDistribution boolean=1");
  assert(result.typeDistribution["integer"] === 2, "D.3/spec-ex1: typeDistribution integer=2");
  assert(result.typeDistribution["null"]    === 1, "D.3/spec-ex1: typeDistribution null=1");
}

// Spec example 2: [1, 3.14, "hello"] → string, nullable:false  (§8.5.2)
{
  const diags = [];
  const result = inferArrayItemType([1, 3.14, "hello"], "#/[]", 1.0, diags);
  assert(result.kind === "primitive",              "§17.2/spec-ex2: kind = 'primitive'");
  assert(result.primitiveType === "string",        "§17.2/spec-ex2: integer+number+string → string");
  assert(result.nullable === false,                "§17.2/spec-ex2: nullable = false");
  assert(result.typeDistribution["integer"] === 1, "§17.2/spec-ex2: typeDistribution integer=1");
  assert(result.typeDistribution["number"]  === 1, "§17.2/spec-ex2: typeDistribution number=1");
  assert(result.typeDistribution["string"]  === 1, "§17.2/spec-ex2: typeDistribution string=1");
}

// Mixed boolean+string (§17.2)
{
  const diags = [];
  const r = inferArrayItemType([true, "x", false], "#/[]", 1.0, diags);
  assert(r.primitiveType === "string", "§17.2: boolean+string → 'string'");
  assert(r.nullable === false,         "§17.2: boolean+string not nullable");
}

// Mixed integer+number (§17.2)
{
  const diags = [];
  const r = inferArrayItemType([1, 2.5, 3], "#/[]", 1.0, diags);
  assert(r.primitiveType === "number", "§17.2: integer+number → 'number'");
}

// §8.5.1 invariant: mixed-primitive arrays MUST produce single primitive node, never union
{
  const diags = [];
  const r = inferArrayItemType([true, "x", 42], "#/[]", 1.0, diags);
  assert(r.kind === "primitive",       "§8.5.1 mixed-prim: kind = 'primitive', not 'union'");
  assert(r.primitiveType === "string", "§8.5.1 mixed-prim: boolean+string+integer → string");
}

// Primitive array with nulls: nullable via foldResolve
{
  const diags = [];
  const r = inferArrayItemType([1, null, 2], "#/[]", 1.0, diags);
  assert(r.primitiveType === "integer",       "prim+null: integer+null → integer");
  assert(r.nullable === true,                 "prim+null: nullable = true");
  assert(r.typeDistribution["null"]    === 1, "prim+null: typeDistribution null=1");
  assert(r.typeDistribution["integer"] === 2, "prim+null: typeDistribution integer=2");
}

// ── §8.5.2 Rule 2 (objects): object array → property merge (Appendix D, D.4) ─
{
  const diags = [];
  const elements = [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
  ];
  const result = inferArrayItemType(elements, "#/items/[]", 1.0, diags);
  assert(result.kind === "object",                  "D.4: object array → object node");
  assert(result.occurrences === 2,                  "D.4: occurrences = 2");
  assert(Array.isArray(result.properties),          "D.4: properties is array");
  assert(result.properties.length === 2,            "D.4: 2 properties (id, name)");
  const idProp = result.properties.find(p => p.name === "id");
  assert(idProp !== undefined,                      "D.4: 'id' property present");
  assert(idProp.target.primitiveType === "integer", "D.4: id type = integer");
  assert(idProp.required === true,                  "D.4: id required (2/2 >= 1.0)");
  const nameProp = result.properties.find(p => p.name === "name");
  assert(nameProp.target.primitiveType === "string", "D.4: name type = string");
  assert(diags.length === 0,                        "D.4: no diagnostics");
}

// Object array with §8.5.3 worked example
{
  const diags = [];
  const elements = [
    { id: 1, name: "Alice", role: "admin" },
    { id: 2, name: "Bob" },
    { id: 3, name: null, role: "user", dept: "eng" },
  ];
  const result = inferArrayItemType(elements, "#/items/[]", 1.0, diags);
  assert(result.kind === "object",       "§8.5.3 ex: merged object");
  assert(result.properties.length === 4, "§8.5.3 ex: 4 properties");
  const roleP = result.properties.find(p => p.name === "role");
  assert(roleP.required === false,       "§8.5.3 ex: role not required");
  const deptP = result.properties.find(p => p.name === "dept");
  assert(deptP.required === false,       "§8.5.3 ex: dept not required");
  const nameP = result.properties.find(p => p.name === "name");
  assert(nameP.target.nullable === true, "§8.5.3 ex: name nullable");
}

// Object array with null elements → nullable on merged node
{
  const diags = [];
  const elements = [{ x: 1 }, null, { x: 2 }];
  const result = inferArrayItemType(elements, "#/[]", 1.0, diags);
  assert(result.kind === "object",   "obj+null: kind = 'object'");
  assert(result.nullable === true,   "obj+null: nullable = true (null present)");
  assert(result.occurrences === 2,   "obj+null: occurrences = non-null count");
}

// ── §8.5.2 Rule 2 (arrays): nested array recursion (Appendix D, D.8) ──────────
{
  const diags = [];
  const elements = [[1, 2], [3, 4]];
  const result = inferArrayItemType(elements, "#/[]", 1.0, diags);
  assert(result.kind === "array",                     "D.8: array-of-arrays → array node");
  assert(result.itemType !== null,                    "D.8: itemType is not null");
  assert(result.itemType.kind === "primitive",        "D.8: inner itemType = primitive");
  assert(result.itemType.primitiveType === "integer", "D.8: inner primitiveType = integer");
  assert(result.nullable === false,                   "D.8: nullable = false");
  assert(result.occurrences === 2,                    "D.8: outer occurrences = 2");
}

// Nested arrays — inner elements collected across sub-arrays (§8.5.2 Rule 2 arrays)
{
  const diags = [];
  const elements = [[1, 2], [3.5]];
  const result = inferArrayItemType(elements, "#/[]", 1.0, diags);
  assert(result.kind === "array",                    "nested-mixed-inner: array node");
  assert(result.itemType.primitiveType === "number", "nested-mixed-inner: int+float → number");
}

// Nested arrays with null outer elements → nullable:true
{
  const diags = [];
  const elements = [[1, 2], null, [3]];
  const result = inferArrayItemType(elements, "#/[]", 1.0, diags);
  assert(result.kind === "array",                     "nested+null: array node");
  assert(result.nullable === true,                    "nested+null: nullable = true");
  assert(result.itemType.primitiveType === "integer", "nested+null: inner = integer");
}

// Nested empty sub-arrays → inner BIBSS-007 emitted
{
  const diags = [];
  const elements = [[], []];
  const result = inferArrayItemType(elements, "#/[]", 1.0, diags);
  assert(result.kind === "array",                       "nested-empty: array node");
  assert(result.itemType === null,                      "nested-empty: inner itemType = null");
  assert(diags.some(d => d.code === DIAG.EMPTY_INPUT),  "nested-empty: BIBSS-007 for inner");
}

// ── §8.5.2 Rule 3 returns null — delegation sentinel for M08 ─────────────────
{
  const diags = [];
  assert(inferArrayItemType([1, { x: 2 }], "#/[]", 1.0, diags) === null,
    "Rule3 delegated: primitive+object → null");
}
{
  const diags = [];
  assert(inferArrayItemType(["a", [1]], "#/[]", 1.0, diags) === null,
    "Rule3 delegated: primitive+array → null");
}
{
  const diags = [];
  assert(inferArrayItemType([{ a: 1 }, [1, 2]], "#/[]", 1.0, diags) === null,
    "Rule3 delegated: object+array → null");
}

// ── §8.5.2 nodeId propagation ────────────────────────────────────────────────
{
  const diags = [];
  const result = inferArrayItemType([42], "#/data/[]", 1.0, diags);
  assert(result.id === "#/data/[]", "nodeId: id propagated correctly");
}

// Single non-null element, no nullable
{
  const diags = [];
  const r = inferArrayItemType([42], "#/[]", 1.0, diags);
  assert(r.typeDistribution["integer"] === 1, "typeDistrib: single integer=1");
  assert(r.nullable === false,                "single integer not nullable");
}
