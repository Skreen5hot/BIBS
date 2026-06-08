// M08 test suite
// Spec coverage: §8.5.4 (Union Bounds — structural guarantee ≤3 members, one per composite kind)
//                §8.5.2 Rule 3 (Cross-Kind Union Detection)
// Appendix D: D.5 (primitive+object union), D.6 (primitive+array union), D.7 (object+array union)
// §17.2: cross-kind union production cases; primitive group widened, never sub-unioned
// §17.3 item 6: union-bound invariant — at most 3 members regardless of element count
// BIBSS-008: warning when total distinct property keys across object elements > 100

import { assert } from "./_assert.mjs";
import { buildCrossKindUnion } from "../src/cross-kind-union.mjs";
import { DIAG } from "../src/types.mjs";

// ── Appendix D.5: primitive + object union ────────────────────────────────────
// §8.5.2 Rule 3: elements span primitive + object composite kinds
{
  const diags = [];
  const elements = [42, { name: "Alice" }, "hello", { name: "Bob" }];
  const result = buildCrossKindUnion(elements, "#/[]", 1.0, diags);

  assert(result.kind === "union",             "D.5: kind = 'union'");
  assert(result.nullable === false,           "D.5: nullable = false (no nulls)");
  assert(result.occurrences === 4,            "D.5: occurrences = 4");
  assert(Array.isArray(result.members),       "D.5: members is array");
  assert(result.members.length === 2,         "D.5: 2 members (primitive + object)");

  const primMember = result.members[0];
  assert(primMember.kind === "primitive",              "D.5: members[0] = primitive");
  assert(primMember.primitiveType === "string",        "D.5: integer+string → string");
  assert(primMember.typeDistribution["integer"] === 1, "D.5: typeDistribution integer=1");
  assert(primMember.typeDistribution["string"]  === 1, "D.5: typeDistribution string=1");

  const objMember = result.members[1];
  assert(objMember.kind === "object",  "D.5: members[1] = object");
  assert(objMember.occurrences === 2,  "D.5: object occurrences = 2");
  assert(diags.length === 0,           "D.5: no diagnostics");
}

// ── Appendix D.6: primitive + array union ────────────────────────────────────
// §8.5.2 Rule 3: elements span primitive + array composite kinds
{
  const diags = [];
  const elements = [1, [2, 3], "x", [4, 5]];
  const result = buildCrossKindUnion(elements, "#/[]", 1.0, diags);

  assert(result.kind === "union",       "D.6: kind = 'union'");
  assert(result.members.length === 2,   "D.6: 2 members (primitive + array)");

  const primMember = result.members[0];
  assert(primMember.kind === "primitive",       "D.6: members[0] = primitive");
  assert(primMember.primitiveType === "string", "D.6: integer+string → string");

  const arrMember = result.members[1];
  assert(arrMember.kind === "array",                     "D.6: members[1] = array");
  assert(arrMember.occurrences === 2,                    "D.6: array occurrences = 2");
  assert(arrMember.itemType !== null,                    "D.6: inner itemType not null");
  assert(arrMember.itemType.kind === "primitive",        "D.6: inner itemType is primitive");
  assert(arrMember.itemType.primitiveType === "integer", "D.6: inner items → integer");
  assert(diags.length === 0,                             "D.6: no diagnostics");
}

// ── Appendix D.7: object + array union ───────────────────────────────────────
// §8.5.2 Rule 3: elements span object + array composite kinds (no primitive group)
{
  const diags = [];
  const elements = [{ x: 1 }, [2, 3], { x: 2 }];
  const result = buildCrossKindUnion(elements, "#/[]", 1.0, diags);

  assert(result.kind === "union",       "D.7: kind = 'union'");
  assert(result.members.length === 2,   "D.7: 2 members (object + array)");

  const objMember = result.members[0];
  assert(objMember.kind === "object",   "D.7: members[0] = object (no primitive group)");
  assert(objMember.occurrences === 2,   "D.7: object occurrences = 2");

  const arrMember = result.members[1];
  assert(arrMember.kind === "array",    "D.7: members[1] = array");
  assert(arrMember.occurrences === 1,   "D.7: array occurrences = 1");
  assert(diags.length === 0,            "D.7: no diagnostics");
}

// ── §8.5.4 / §17.3 item 6: 3-member union — all composite kinds present ──────
// §8.5.4 structural guarantee: at most 3 members, one per composite kind
{
  const diags = [];
  const elements = [42, { a: 1 }, [1, 2], "x", { b: 2 }];
  const result = buildCrossKindUnion(elements, "#/[]", 1.0, diags);

  assert(result.kind === "union",         "§8.5.4: kind = 'union'");
  assert(result.members.length === 3,     "§8.5.4: exactly 3 members (primitive+object+array)");
  assert(result.members.length <= 3,      "§8.5.4 bound: never more than 3 members");

  assert(result.members[0].kind === "primitive", "§8.5.4: members[0] = primitive");
  assert(result.members[1].kind === "object",    "§8.5.4: members[1] = object");
  assert(result.members[2].kind === "array",     "§8.5.4: members[2] = array");
}

// ── §8.5.4: nullable:true when any null elements present ─────────────────────
{
  const diags = [];
  const elements = [42, { a: 1 }, null];
  const result = buildCrossKindUnion(elements, "#/[]", 1.0, diags);

  assert(result.kind === "union",      "nullable-union: kind = 'union'");
  assert(result.nullable === true,     "nullable-union: nullable = true");
  assert(result.members.length === 2,  "nullable-union: 2 members (null excluded from grouping)");
  assert(result.occurrences === 3,     "nullable-union: occurrences includes null elements");
}

// Multiple nulls
{
  const diags = [];
  const elements = ["str", { x: 1 }, null, null, null];
  const result = buildCrossKindUnion(elements, "#/[]", 1.0, diags);
  assert(result.nullable === true,    "multi-null: nullable = true");
  assert(result.members.length === 2, "multi-null: 2 members");
  assert(result.occurrences === 5,    "multi-null: occurrences = 5");
}

// No nulls → nullable:false on union node
{
  const diags = [];
  const elements = [1, { a: 1 }];
  const result = buildCrossKindUnion(elements, "#/[]", 1.0, diags);
  assert(result.nullable === false, "no-null union: nullable = false");
}

// ── §17.2: cross-kind — primitive member typeDistribution preserved ───────────
// Primitive group with boolean+integer → lattice resolves, typeDistribution accumulated
{
  const diags = [];
  const elements = [true, 42, { k: "v" }];
  const result = buildCrossKindUnion(elements, "#/[]", 1.0, diags);

  assert(result.members.length === 2, "§17.2 prim-obj: 2 members");
  const prim = result.members[0];
  assert(prim.kind === "primitive",              "§17.2 prim-obj: members[0] = primitive");
  assert(prim.primitiveType === "integer",       "§17.2 prim-obj: boolean+integer → integer");
  assert(prim.typeDistribution["boolean"] === 1, "§17.2 prim-obj: typeDistribution boolean=1");
  assert(prim.typeDistribution["integer"] === 1, "§17.2 prim-obj: typeDistribution integer=1");
}

// ── §17.2: primitive group always produces single widened node, never sub-union
// Mixed primitives within the primitive group must be widened by the lattice, not unioned
{
  const diags = [];
  const elements = [true, 42, 3.14, { x: 1 }];
  const result = buildCrossKindUnion(elements, "#/[]", 1.0, diags);

  const prim = result.members[0];
  assert(prim.kind === "primitive",        "§17.2 prim-widen: primitive group → primitive node");
  assert(prim.primitiveType === "number",  "§17.2 prim-widen: boolean+integer+number → number");
  assert(prim.kind !== "union",            "§17.2 prim-widen: primitive group never produces sub-union");
}

// ── §17.3 item 6: union-bound invariant ──────────────────────────────────────
// Even with many elements spanning all 3 composite kinds, union never exceeds 3 members
{
  const diags = [];
  const elements = [
    1, 2, 3, "a", "b",
    { x: 1 }, { y: 2 }, { z: 3 },
    [1, 2], [3, 4], [5, 6],
  ];
  const result = buildCrossKindUnion(elements, "#/[]", 1.0, diags);
  assert(result.members.length <= 3,  "§17.3 item 6: union never exceeds 3 members");
  assert(result.members.length === 3, "§17.3 item 6: 3 composite kinds → 3 members");
}

// ── BIBSS-008: total distinct property keys > 100 ─────────────────────────────
{
  const diags = [];
  const obj1 = {};
  const obj2 = {};
  for (let i = 0; i < 51; i++) obj1[`key${i}`] = i;
  for (let i = 51; i <= 101; i++) obj2[`key${i}`] = i;

  const elements = [42, obj1, obj2];
  buildCrossKindUnion(elements, "#/[]", 1.0, diags);

  assert(
    diags.some(d => d.code === DIAG.HETEROGENEOUS_KEYS),
    "BIBSS-008: emitted when total distinct keys > 100"
  );
  const diag = diags.find(d => d.code === DIAG.HETEROGENEOUS_KEYS);
  assert(diag.level === "warning",       "BIBSS-008: level = 'warning'");
  assert(diag.context.keyCount > 100,    "BIBSS-008: context.keyCount > 100");
  assert(diag.context.nodeId === "#/[]", "BIBSS-008: context.nodeId correct");
}

// ── BIBSS-008: exactly 100 keys → NOT emitted ────────────────────────────────
{
  const diags = [];
  const obj = {};
  for (let i = 0; i < 100; i++) obj[`key${i}`] = i;

  const elements = [42, obj];
  buildCrossKindUnion(elements, "#/[]", 1.0, diags);

  assert(
    !diags.some(d => d.code === DIAG.HETEROGENEOUS_KEYS),
    "BIBSS-008: NOT emitted at exactly 100 keys"
  );
}

// ── §8.5.4 structural guarantee: member count ≤ 3 ────────────────────────────
{
  const diags = [];
  const elements = [1, { a: 1 }, [2, 3]];
  const result = buildCrossKindUnion(elements, "#/[]", 1.0, diags);
  assert(result.members.length <= 3,  "§8.5.4: member count ≤ 3 (structural guarantee)");
  assert(result.members.length === 3, "§8.5.4: 3 distinct composite kinds → 3 members");
}

// ── Union node and member IDs follow RFC 6901 / unionMemberId pattern ──────────
{
  const diags = [];
  const elements = [42, { a: 1 }];
  const result = buildCrossKindUnion(elements, "#/items/[]", 1.0, diags);

  assert(result.id === "#/items/[]",               "union-id: node id = nodeId");
  assert(result.members[0].id === "#/items/[]/|0", "union-id: members[0].id = |0");
  assert(result.members[1].id === "#/items/[]/|1", "union-id: members[1].id = |1");
}

// ── Object group uses property-merge (single merged node, not union explosion) ─
{
  const diags = [];
  const elements = [
    1, 2,
    { id: 1, opt: "a" }, { id: 2 }, { id: 3, opt: "b" },
  ];
  const result = buildCrossKindUnion(elements, "#/[]", 1.0, diags);

  assert(result.members.length === 2, "obj-merge: 2 members (primitive + object)");
  const objMember = result.members[1];
  assert(objMember.kind === "object",       "obj-merge: members[1] = object");
  assert(objMember.properties.length === 2, "obj-merge: single merged object with 2 props");
}

// ── Array group: inner elements collected across sub-arrays ───────────────────
{
  const diags = [];
  const elements = [42, [1, 2, 3], [4, 5]];
  const result = buildCrossKindUnion(elements, "#/[]", 1.0, diags);

  assert(result.members.length === 2, "arr-group: 2 members");
  const arrMember = result.members[1];
  assert(arrMember.kind === "array",                    "arr-group: members[1] = array");
  assert(arrMember.occurrences === 2,                   "arr-group: 2 sub-arrays");
  assert(arrMember.itemType.primitiveType === "integer", "arr-group: inner elements → integer");
}

// ── Primitive member occurrences reflect non-null primitive element count ──────
{
  const diags = [];
  const elements = [1, 2, 3, { x: 1 }];
  const result = buildCrossKindUnion(elements, "#/[]", 1.0, diags);
  const prim = result.members[0];
  assert(prim.occurrences === 3,                  "prim-occurrences: 3 primitive elements");
  assert(prim.typeDistribution["integer"] === 3,  "prim-occurrences: typeDistribution integer=3");
}

// ── Required threshold passes through to property-merge ───────────────────────
{
  const diags = [];
  const elements = [
    "hello",
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
    { id: 3 },
  ];
  const result = buildCrossKindUnion(elements, "#/[]", 1.0, diags);
  const objMember = result.members[1];
  const idProp   = objMember.properties.find(p => p.name === "id");
  const nameProp = objMember.properties.find(p => p.name === "name");
  assert(idProp.required === true,    "threshold: id required (3/3 >= 1.0)");
  assert(nameProp.required === false, "threshold: name not required (2/3 < 1.0)");
}
