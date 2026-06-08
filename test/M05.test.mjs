// M05 test suite
// Spec coverage: §7.3 (Integer Detection from Parsed Values), §8.3 (Type Widening Lattice)
import { assert } from "./_assert.mjs";
import { resolveTwo, foldResolve, isInteger } from "../src/primitive-resolve.mjs";

// ── §7.3  isInteger ───────────────────────────────────────────────────────────
assert(isInteger(0)                      === true,  "isInteger: 0");
assert(isInteger(1)                      === true,  "isInteger: 1");
assert(isInteger(-5)                     === true,  "isInteger: -5");
assert(isInteger(1.0)                    === true,  "isInteger: 1.0 (same as 1)");
assert(isInteger(Number.MAX_SAFE_INTEGER) === true, "isInteger: MAX_SAFE_INTEGER");
assert(isInteger(1.5)                    === false, "isInteger: 1.5 not integer");
assert(isInteger(NaN)                    === false, "isInteger: NaN not integer");
assert(isInteger(Infinity)               === false, "isInteger: Infinity not integer");
assert(isInteger(-Infinity)              === false, "isInteger: -Infinity not integer");
assert(isInteger("1")                    === false, "isInteger: string '1' not integer");
assert(isInteger(null)                   === false, "isInteger: null not integer");
assert(isInteger(true)                   === false, "isInteger: boolean not integer");
assert(isInteger(undefined)              === false, "isInteger: undefined not integer");

// ── §8.3  Appendix A: all 15 lattice pairs ───────────────────────────────────
// Pair 1: null + null
{ const r = resolveTwo("null", "null");       assert(r.type === "null"    && r.nullable === true,  "pair 1: null+null → null (nullable)"); }
// Pair 2: null + boolean
{ const r = resolveTwo("null", "boolean");    assert(r.type === "boolean" && r.nullable === true,  "pair 2: null+boolean → boolean (nullable)"); }
// Pair 3: null + integer
{ const r = resolveTwo("null", "integer");    assert(r.type === "integer" && r.nullable === true,  "pair 3: null+integer → integer (nullable)"); }
// Pair 4: null + number
{ const r = resolveTwo("null", "number");     assert(r.type === "number"  && r.nullable === true,  "pair 4: null+number → number (nullable)"); }
// Pair 5: null + string
{ const r = resolveTwo("null", "string");     assert(r.type === "string"  && r.nullable === true,  "pair 5: null+string → string (nullable)"); }
// Pair 6: boolean + boolean
{ const r = resolveTwo("boolean", "boolean"); assert(r.type === "boolean" && r.nullable === false, "pair 6: boolean+boolean → boolean"); }
// Pair 7: boolean + integer
{ const r = resolveTwo("boolean", "integer"); assert(r.type === "integer" && r.nullable === false, "pair 7: boolean+integer → integer"); }
// Pair 8: boolean + number
{ const r = resolveTwo("boolean", "number");  assert(r.type === "number"  && r.nullable === false, "pair 8: boolean+number → number"); }
// Pair 9: boolean + string
{ const r = resolveTwo("boolean", "string");  assert(r.type === "string"  && r.nullable === false, "pair 9: boolean+string → string"); }
// Pair 10: integer + integer
{ const r = resolveTwo("integer", "integer"); assert(r.type === "integer" && r.nullable === false, "pair 10: integer+integer → integer"); }
// Pair 11: integer + number
{ const r = resolveTwo("integer", "number");  assert(r.type === "number"  && r.nullable === false, "pair 11: integer+number → number"); }
// Pair 12: integer + string
{ const r = resolveTwo("integer", "string");  assert(r.type === "string"  && r.nullable === false, "pair 12: integer+string → string"); }
// Pair 13: number + number
{ const r = resolveTwo("number", "number");   assert(r.type === "number"  && r.nullable === false, "pair 13: number+number → number"); }
// Pair 14: number + string
{ const r = resolveTwo("number", "string");   assert(r.type === "string"  && r.nullable === false, "pair 14: number+string → string"); }
// Pair 15: string + string
{ const r = resolveTwo("string", "string");   assert(r.type === "string"  && r.nullable === false, "pair 15: string+string → string"); }

// ── §8.3 / §17.2  Commutativity invariant ───────────────────────────────────
assert(resolveTwo("integer", "boolean").type  === resolveTwo("boolean", "integer").type,  "commutative: integer+boolean");
assert(resolveTwo("number",  "integer").type  === resolveTwo("integer", "number").type,   "commutative: number+integer");
assert(resolveTwo("string",  "number").type   === resolveTwo("number",  "string").type,   "commutative: string+number");
assert(resolveTwo("string",  "null").type     === resolveTwo("null",    "string").type,   "commutative type: string+null");
assert(resolveTwo("string",  "null").nullable === resolveTwo("null",    "string").nullable, "commutative nullable: string+null");
assert(resolveTwo("integer", "null").type     === resolveTwo("null",    "integer").type,  "commutative type: integer+null");
assert(resolveTwo("boolean", "null").nullable === resolveTwo("null",    "boolean").nullable, "commutative nullable: boolean+null");

// ── §8.3 / §17.2  Three-way combinations (foldResolve) ───────────────────────
{ const r = foldResolve(["boolean", "integer", "number"]); assert(r.type === "number"  && r.nullable === false, "3-way: boolean+integer+number → number"); }
{ const r = foldResolve(["integer", "number",  "string"]); assert(r.type === "string"  && r.nullable === false, "3-way: integer+number+string → string"); }
{ const r = foldResolve(["boolean", "integer", "string"]); assert(r.type === "string"  && r.nullable === false, "3-way: boolean+integer+string → string"); }
{ const r = foldResolve(["null",    "integer", "string"]); assert(r.type === "string"  && r.nullable === true,  "3-way: null+integer+string → string (nullable)"); }
{ const r = foldResolve(["boolean", "null",    "integer"]); assert(r.type === "integer" && r.nullable === true,  "3-way: boolean+null+integer → integer (nullable)"); }
{ const r = foldResolve(["null",    "null",    "boolean"]); assert(r.type === "boolean" && r.nullable === true,  "3-way: null+null+boolean → boolean (nullable)"); }
{ const r = foldResolve(["integer", "integer", "integer"]); assert(r.type === "integer" && r.nullable === false, "3-way: integer+integer+integer → integer"); }
{ const r = foldResolve(["null",    "boolean", "string"]); assert(r.type === "string"  && r.nullable === true,  "3-way: null+boolean+string → string (nullable)"); }
{ const r = foldResolve(["number",  "null",    "string"]); assert(r.type === "string"  && r.nullable === true,  "3-way: number+null+string → string (nullable)"); }

// ── §8.3 / §17.2  Invariant: null never widens resolved type ─────────────────
{ const r = foldResolve(["integer", "null"]);  assert(r.type === "integer" && r.nullable === true, "§17.2: integer+null → integer (null does not widen)"); }
{ const r = foldResolve(["string",  "null"]);  assert(r.type === "string"  && r.nullable === true, "§17.2: string+null → string (null does not widen)"); }
{ const r = foldResolve(["number",  "null"]);  assert(r.type === "number"  && r.nullable === true, "§17.2: number+null → number (null does not widen)"); }
{ const r = foldResolve(["boolean", "null"]);  assert(r.type === "boolean" && r.nullable === true, "§17.2: boolean+null → boolean (null does not widen)"); }

// ── §8.3 / §17.2  Invariant: single-element foldResolve ──────────────────────
{ const r = foldResolve(["boolean"]); assert(r.type === "boolean" && r.nullable === false, "single: boolean"); }
{ const r = foldResolve(["integer"]); assert(r.type === "integer" && r.nullable === false, "single: integer"); }
{ const r = foldResolve(["string"]);  assert(r.type === "string"  && r.nullable === false, "single: string"); }
{ const r = foldResolve(["null"]);    assert(r.type === "null"    && r.nullable === true,  "single: null → nullable"); }

// ── §8.3  Lattice applies identically for property-level and element-level ────
// Same resolveTwo/foldResolve governs both contexts per spec §8.3
{ const r = foldResolve(["boolean", "integer"]); assert(r.type === "integer", "property-level equiv: boolean+integer → integer"); }
{ const r = foldResolve(["boolean", "integer"]); assert(r.type === "integer", "element-level equiv: boolean+integer → integer"); }
