// M06 test suite
// Spec coverage: §8.5.3 (Property-Merge Algorithm for Object Arrays), §17.2 (merge invariant)
import { assert } from "./_assert.mjs";
import { mergeObjectArray } from "../src/property-merge.mjs";
import { foldResolve, isInteger } from "../src/primitive-resolve.mjs";

// Minimal inferValue for tests: resolves primitive arrays via the widening lattice.
// Handles null-valued presence (nullable) and non-null primitives (typeDistribution + lattice).
function testInferValue(values, nodeId) {
  const nullCount = values.filter(v => v === null).length;
  const nonNulls  = values.filter(v => v !== null);
  const hasNull   = nullCount > 0;

  if (nonNulls.length === 0) {
    return {
      id: nodeId, kind: "primitive", primitiveType: "null",
      nullable: true, occurrences: values.length,
      typeDistribution: { null: nullCount },
    };
  }

  const typeDistribution = {};
  if (hasNull) typeDistribution["null"] = nullCount;

  const types = nonNulls.map(v => {
    let t;
    if (typeof v === "boolean") t = "boolean";
    else if (typeof v === "number") t = isInteger(v) ? "integer" : "number";
    else t = "string";
    typeDistribution[t] = (typeDistribution[t] || 0) + 1;
    return t;
  });

  const allTypes = hasNull ? [...types, "null"] : types;
  const { type: primitiveType, nullable } = foldResolve(allTypes);

  return {
    id: nodeId, kind: "primitive", primitiveType,
    nullable, occurrences: values.length, typeDistribution,
  };
}

// ── §8.5.3 Worked example ────────────────────────────────────────────────────
// Spec §8.5.3 example input (threshold 1.0):
// [ { id:1, name:"Alice", role:"admin" },
//   { id:2, name:"Bob" },
//   { id:3, name:null, role:"user", dept:"eng" } ]
const elems3 = [
  { id: 1, name: "Alice", role: "admin" },
  { id: 2, name: "Bob" },
  { id: 3, name: null, role: "user", dept: "eng" },
];

const merged3 = mergeObjectArray(elems3, "#/items", 1.0, testInferValue);

assert(merged3.kind === "object",         "§8.5.3: merged node kind = 'object'");
assert(merged3.id   === "#/items",        "§8.5.3: merged node id = '#/items'");
assert(merged3.occurrences === 3,         "§8.5.3: occurrences = N = 3");
assert(Array.isArray(merged3.properties), "§8.5.3: properties is array");
assert(merged3.properties.length === 4,   "§8.5.3: exactly 4 properties (id, name, role, dept)");

function findProp(props, name) { return props.find(p => p.name === name); }

// id: integer, required:true, nullable:false, occurrences:3/3
const idEdge3 = findProp(merged3.properties, "id");
assert(idEdge3 !== undefined,                      "§8.5.3: 'id' present");
assert(idEdge3.occurrences === 3,                  "§8.5.3: id occurrences = 3");
assert(idEdge3.totalPopulation === 3,              "§8.5.3: id totalPopulation = 3");
assert(idEdge3.required === true,                  "§8.5.3: id required (3/3 >= 1.0)");
assert(idEdge3.target.kind === "primitive",        "§8.5.3: id kind = primitive");
assert(idEdge3.target.primitiveType === "integer", "§8.5.3: id type = integer");
assert(idEdge3.target.nullable !== true,           "§8.5.3: id not nullable");
assert(idEdge3.target.id === "#/items/id",         "§8.5.3: id child id = '#/items/id'");
assert(
  idEdge3.target.typeDistribution && idEdge3.target.typeDistribution["integer"] === 3,
  "§8.5.3: id typeDistribution integer=3"
);

// name: string, required:true, nullable:true, occurrences:3/3 (null-valued presence counts)
const nameEdge3 = findProp(merged3.properties, "name");
assert(nameEdge3 !== undefined,                        "§8.5.3: 'name' present");
assert(nameEdge3.occurrences === 3,                    "§8.5.3: name occurrences = 3 (null-valued counts)");
assert(nameEdge3.required === true,                    "§8.5.3: name required (3/3 >= 1.0)");
assert(nameEdge3.target.primitiveType === "string",    "§8.5.3: name type = string");
assert(nameEdge3.target.nullable === true,             "§8.5.3: name nullable (one null value)");
assert(nameEdge3.target.id === "#/items/name",         "§8.5.3: name child id = '#/items/name'");
assert(
  nameEdge3.target.typeDistribution && nameEdge3.target.typeDistribution["string"] === 2,
  "§8.5.3: name typeDistribution string=2"
);
assert(
  nameEdge3.target.typeDistribution && nameEdge3.target.typeDistribution["null"] === 1,
  "§8.5.3: name typeDistribution null=1"
);

// role: string, required:false (absent in element 2), nullable:false, occurrences:2/3
const roleEdge3 = findProp(merged3.properties, "role");
assert(roleEdge3 !== undefined,                      "§8.5.3: 'role' present");
assert(roleEdge3.occurrences === 2,                  "§8.5.3: role occurrences = 2 (absent in elem 2)");
assert(roleEdge3.required === false,                 "§8.5.3: role not required (2/3 < 1.0)");
assert(roleEdge3.target.primitiveType === "string",  "§8.5.3: role type = string");
assert(roleEdge3.target.nullable !== true,           "§8.5.3: role not nullable");
assert(roleEdge3.target.id === "#/items/role",       "§8.5.3: role child id = '#/items/role'");

// dept: string, required:false, nullable:false, occurrences:1/3
const deptEdge3 = findProp(merged3.properties, "dept");
assert(deptEdge3 !== undefined,                      "§8.5.3: 'dept' present");
assert(deptEdge3.occurrences === 1,                  "§8.5.3: dept occurrences = 1");
assert(deptEdge3.required === false,                 "§8.5.3: dept not required (1/3 < 1.0)");
assert(deptEdge3.target.primitiveType === "string",  "§8.5.3: dept type = string");
assert(deptEdge3.target.id === "#/items/dept",       "§8.5.3: dept child id = '#/items/dept'");

// ── §8.5.3: N=0 guard ────────────────────────────────────────────────────────
const mergedEmpty = mergeObjectArray([], "#/empty", 1.0, testInferValue);
assert(mergedEmpty.kind === "object",       "§8.5.3: N=0 → object node");
assert(mergedEmpty.properties.length === 0, "§8.5.3: N=0 → no properties");
assert(mergedEmpty.occurrences === 0,       "§8.5.3: N=0 → occurrences = 0");

// ── §8.5.3: absent vs null-valued key distinction ────────────────────────────
// elem[0] lacks 'x'; elem[1] has x:null — occurrences must be 1, not 2
const mergedAbsNull = mergeObjectArray(
  [{ a: 1 }, { a: 2, x: null }], "#/t", 1.0, testInferValue
);
const xEdge = findProp(mergedAbsNull.properties, "x");
assert(xEdge !== undefined,            "§8.5.3: absent-vs-null: x in result");
assert(xEdge.occurrences === 1,        "§8.5.3: absent-vs-null: x occurrences=1 (absent not counted)");
assert(xEdge.required === false,       "§8.5.3: absent-vs-null: x not required (1/2 < 1.0)");
assert(xEdge.target.nullable === true, "§8.5.3: absent-vs-null: x nullable (null-valued present)");

// ── §8.5.3: configurable required threshold ───────────────────────────────────
// 2/3 ≈ 0.667 >= 0.5 → required
const mergedTh = mergeObjectArray(
  [{ id: 1, opt: "a" }, { id: 2, opt: "b" }, { id: 3 }], "#/th", 0.5, testInferValue
);
assert(findProp(mergedTh.properties, "opt").required === true,
       "§8.5.3: threshold 0.5, opt 2/3 → required");

// 1/3 ≈ 0.333 < 0.5 → not required
const mergedTh2 = mergeObjectArray(
  [{ id: 1, opt: "a" }, { id: 2 }, { id: 3 }], "#/th2", 0.5, testInferValue
);
assert(findProp(mergedTh2.properties, "opt").required === false,
       "§8.5.3: threshold 0.5, opt 1/3 → not required");

// ── §17.2: 100 elements, 5 optional props → 1 merged object (not union) ──────
// Invariant: property-merge always produces a single object node regardless of
// how many elements carry each optional key; no union explosion.
const elems100 = Array.from({ length: 100 }, (_, i) => {
  const obj = { id: i + 1 };
  if (i % 2  === 0) obj.propA = "a";  // 50 elements
  if (i % 3  === 0) obj.propB = "b";  // 34 elements
  if (i % 5  === 0) obj.propC = "c";  // 20 elements
  if (i % 7  === 0) obj.propD = "d";  // 15 elements
  if (i % 11 === 0) obj.propE = "e";  // 10 elements
  return obj;
});

const merged100 = mergeObjectArray(elems100, "#/items", 1.0, testInferValue);

assert(merged100.kind === "object", "§17.2: 100 elements → single merged object node (not union)");
assert(merged100.properties.length === 6, "§17.2: merged object has all 6 keys (id + propA..propE)");
assert(merged100.occurrences === 100, "§17.2: occurrences = 100");

const idEdge100 = findProp(merged100.properties, "id");
assert(idEdge100.required === true,   "§17.2: id required (100/100 >= 1.0)");
assert(idEdge100.occurrences === 100, "§17.2: id occurrences = 100");

const propAEdge = findProp(merged100.properties, "propA");
assert(propAEdge !== undefined,       "§17.2: propA in merged result");
assert(propAEdge.required === false,  "§17.2: propA not required (50/100 < 1.0)");
assert(propAEdge.occurrences === 50,  "§17.2: propA occurrences = 50");

// All 5 optional props present in the single merged object with correct types
for (const nm of ["propA", "propB", "propC", "propD", "propE"]) {
  const e = findProp(merged100.properties, nm);
  assert(e !== undefined,                    `§17.2: ${nm} present in merged object`);
  assert(e.target.kind === "primitive",      `§17.2: ${nm} target is primitive`);
  assert(e.target.primitiveType === "string",`§17.2: ${nm} type = string`);
  assert(e.required === false,               `§17.2: ${nm} not required at threshold 1.0`);
}
