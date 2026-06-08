// M01 test suite
// Spec coverage: §8.2 (Primitive enum), §9.1 (CISM structures/version), §9.2 (RFC 6901 IDs), §12.1 (diagnostic codes), §13 (InferConfig defaults)
import { assert } from "./_assert.mjs";
import { escape, rootId, childId, arrayItemId, unionMemberId } from "../src/ids.mjs";
import { CISM_VERSION, DEFAULT_CONFIG, DIAG, PRIMITIVES } from "../src/types.mjs";

// ── §9.2.1  RFC 6901 escaping ────────────────────────────────────────────────
assert(escape("hello") === "hello",    "escape: plain string unchanged");
assert(escape("~")     === "~0",       "escape: sole tilde → ~0");
assert(escape("/")     === "~1",       "escape: sole slash → ~1");
assert(escape("a~b")   === "a~0b",    "escape: embedded tilde");
assert(escape("a/b")   === "a~1b",    "escape: embedded slash");
assert(escape("~/")    === "~0~1",    "escape: tilde then slash");
assert(escape("/~")    === "~1~0",    "escape: slash then tilde");
// RFC 6901 requires ~ replaced before / to avoid double-escaping
assert(escape("a~1b")  === "a~01b",   "escape: literal ~1 in input → ~01 (tilde processed first)");
assert(escape("a~0b")  === "a~00b",   "escape: literal ~0 in input → ~00");
assert(escape("~~/")   === "~0~0~1",  "escape: two tildes and a slash");

// ── §9.2.2  rootId ───────────────────────────────────────────────────────────
assert(rootId() === "#", "rootId() returns '#'");

// ── §9.2.2  childId ─────────────────────────────────────────────────────────
assert(childId("#", "customer")        === "#/customer",         "childId: simple name");
assert(childId("#/customer", "address") === "#/customer/address", "childId: nested");
assert(childId("#", "user.name")        === "#/user.name",        "childId: dot is NOT a separator");
assert(childId("#", "a/b")             === "#/a~1b",             "childId: slash in name escaped");
assert(childId("#", "a~b")             === "#/a~0b",             "childId: tilde in name escaped");

// ── §9.2.4  Collision proof ──────────────────────────────────────────────────
// Literal key "user.name" vs nested path user → name
const dotKey    = childId("#", "user.name");
const nestedKey = childId(childId("#", "user"), "name");
assert(dotKey    === "#/user.name",  "collision: literal 'user.name' → #/user.name");
assert(nestedKey === "#/user/name",  "collision: nested user→name → #/user/name");
assert(dotKey !== nestedKey,         "collision proof: dot-key and nested path are distinct");

// Literal key "a/b" vs nested path a → b
const slashKey    = childId("#", "a/b");
const nestedSlash = childId(childId("#", "a"), "b");
assert(slashKey    === "#/a~1b", "collision: literal 'a/b' → #/a~1b");
assert(nestedSlash === "#/a/b",  "collision: nested a→b → #/a/b");
assert(slashKey !== nestedSlash, "collision proof: slash-key and nested path are distinct");

// ── §9.2.2  arrayItemId ──────────────────────────────────────────────────────
assert(arrayItemId("#/orders") === "#/orders/[]", "arrayItemId: standard");
assert(arrayItemId("#")        === "#/[]",         "arrayItemId: on root");

// ── §9.2.2  unionMemberId ────────────────────────────────────────────────────
assert(unionMemberId("#/orders/[]", 0) === "#/orders/[]/|0", "unionMemberId index 0");
assert(unionMemberId("#/orders/[]", 1) === "#/orders/[]/|1", "unionMemberId index 1");
assert(unionMemberId("#/orders/[]", 2) === "#/orders/[]/|2", "unionMemberId index 2");

// ── §9.2.3  Spec table examples ──────────────────────────────────────────────
assert(childId("#", "customer")                   === "#/customer",      "spec ex: #/customer");
assert(childId("#/customer", "address")            === "#/customer/address", "spec ex: #/customer/address");
assert(arrayItemId("#/orders")                     === "#/orders/[]",     "spec ex: #/orders/[]");
assert(unionMemberId(arrayItemId("#/orders"), 0)   === "#/orders/[]/|0",  "spec ex: #/orders/[]/|0");
assert(childId("#", "user.name")                   === "#/user.name",     "spec ex: literal dot key");
assert(childId("#", "a/b")                         === "#/a~1b",          "spec ex: slash in key");
assert(childId("#", "a~b")                         === "#/a~0b",          "spec ex: tilde in key");

// ── §8.2  Primitive type enumeration ─────────────────────────────────────────
assert(PRIMITIVES.includes("string"),  "primitive: string present");
assert(PRIMITIVES.includes("number"),  "primitive: number present");
assert(PRIMITIVES.includes("integer"), "primitive: integer present");
assert(PRIMITIVES.includes("boolean"), "primitive: boolean present");
assert(PRIMITIVES.includes("null"),    "primitive: null present");
assert(PRIMITIVES.length === 5,        "exactly 5 primitive types");
// Lattice order: null < boolean < integer < number < string
assert(PRIMITIVES[0] === "null",    "lattice order[0] = null");
assert(PRIMITIVES[1] === "boolean", "lattice order[1] = boolean");
assert(PRIMITIVES[2] === "integer", "lattice order[2] = integer");
assert(PRIMITIVES[3] === "number",  "lattice order[3] = number");
assert(PRIMITIVES[4] === "string",  "lattice order[4] = string");

// ── §9.1  CISM version constant ──────────────────────────────────────────────
assert(CISM_VERSION === "1.3", "CISM_VERSION is '1.3'");

// ── §13  InferConfig defaults ────────────────────────────────────────────────
assert(DEFAULT_CONFIG.requiredThreshold === 1.0,      "default requiredThreshold = 1.0");
assert(DEFAULT_CONFIG.emptyStringAsNull === true,     "default emptyStringAsNull = true");
assert(DEFAULT_CONFIG.sampleSize        === 2000,     "default sampleSize = 2000");
assert(DEFAULT_CONFIG.maxSizeWarning    === 10485760, "default maxSizeWarning = 10485760");
assert(DEFAULT_CONFIG.format            === undefined, "default format = undefined");

// ── §12.1  Diagnostic code constants ─────────────────────────────────────────
assert(DIAG.SIZE_WARNING       === "BIBSS-001", "BIBSS-001 SIZE_WARNING");
assert(DIAG.SAMPLING_APPLIED   === "BIBSS-002", "BIBSS-002 SAMPLING_APPLIED");
assert(DIAG.CSV_ROW_MISMATCH   === "BIBSS-003", "BIBSS-003 CSV_ROW_MISMATCH");
assert(DIAG.JSON_PARSE_FAIL    === "BIBSS-004", "BIBSS-004 JSON_PARSE_FAIL");
assert(DIAG.CSV_PARSE_FAIL     === "BIBSS-005", "BIBSS-005 CSV_PARSE_FAIL");
assert(DIAG.KEY_COLLISION      === "BIBSS-006", "BIBSS-006 KEY_COLLISION");
assert(DIAG.EMPTY_INPUT        === "BIBSS-007", "BIBSS-007 EMPTY_INPUT");
assert(DIAG.HETEROGENEOUS_KEYS === "BIBSS-008", "BIBSS-008 HETEROGENEOUS_KEYS");
assert(DIAG.PRECISION_LOSS     === "BIBSS-009", "BIBSS-009 PRECISION_LOSS");
// All 9 codes present
assert(Object.values(DIAG).length === 9, "exactly 9 diagnostic codes");
