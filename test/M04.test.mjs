// M04 test suite
// Spec coverage: §7.1.3 (CSV type-narrowing pass), C-011 (case-insensitive booleans), C-012 (no scientific notation narrowing)
import { assert } from "./_assert.mjs";
import { narrowValue, narrowRecords } from "../src/csv-narrow.mjs";

// ── §7.1.3 Rule 1: Null ──────────────────────────────────────────────────────
assert(narrowValue(null) === null, "§7.1.3 null → null");

// ── §7.1.3 Rule 2: Boolean — C-011 case-insensitive ─────────────────────────
assert(narrowValue("true")  === true,  "§7.1.3 C-011 bool: 'true' → true");
assert(narrowValue("false") === false, "§7.1.3 C-011 bool: 'false' → false");
assert(narrowValue("True")  === true,  "§7.1.3 C-011 bool: 'True' → true");
assert(narrowValue("False") === false, "§7.1.3 C-011 bool: 'False' → false");
assert(narrowValue("TRUE")  === true,  "§7.1.3 C-011 bool: 'TRUE' → true (Excel/Sheets export)");
assert(narrowValue("FALSE") === false, "§7.1.3 C-011 bool: 'FALSE' → false (Excel/Sheets export)");
// Categorical strings are NOT narrowed to boolean
assert(narrowValue("yes") === "yes", "§7.1.3 bool: 'yes' remains string");
assert(narrowValue("no")  === "no",  "§7.1.3 bool: 'no' remains string");

// ── §7.1.3 Rule 3: Integer ───────────────────────────────────────────────────
assert(narrowValue("0")   === 0,   "§7.1.3 int: '0' → 0");
assert(narrowValue("1")   === 1,   "§7.1.3 int: '1' → 1");
assert(narrowValue("-1")  === -1,  "§7.1.3 int: '-1' → -1");
assert(narrowValue("123") === 123, "§7.1.3 int: '123' → 123");
assert(narrowValue("9007199254740991") === 9007199254740991, "§7.1.3 int: MAX_SAFE_INTEGER → integer");
// '1' and '0' are integers, not booleans (boolean rule does not match them)
assert(typeof narrowValue("1") === "number", "§7.1.3 int: '1' narrows to number not boolean");
assert(typeof narrowValue("0") === "number", "§7.1.3 int: '0' narrows to number not boolean");
// Leading zeros disqualify integer narrowing
assert(narrowValue("00123") === "00123", "§7.1.3 int: '00123' remains string (leading zeros)");
assert(narrowValue("01")    === "01",    "§7.1.3 int: '01' remains string (leading zero)");
// Integers exceeding MAX_SAFE_INTEGER remain strings
assert(narrowValue("9007199254740992") === "9007199254740992", "§7.1.3 int: MAX_SAFE_INTEGER+1 remains string");
assert(narrowValue("99999999999999999") === "99999999999999999", "§7.1.3 int: large integer remains string");

// ── §7.1.3 Rule 4: Number (plain decimal) ────────────────────────────────────
assert(narrowValue("3.14")  === 3.14,  "§7.1.3 num: '3.14' → 3.14");
assert(narrowValue("-0.5")  === -0.5,  "§7.1.3 num: '-0.5' → -0.5");
assert(narrowValue("0.0")   === 0.0,   "§7.1.3 num: '0.0' → 0");
assert(narrowValue("1.5")   === 1.5,   "§7.1.3 num: '1.5' → 1.5");

// ── §7.1.3 Rule 5: String — not narrowed ─────────────────────────────────────
// Scientific notation remains string (C-012; §17.2 no-scientific-notation)
assert(narrowValue("1e5")    === "1e5",    "§7.1.3 C-012 §17.2: '1e5' remains string");
assert(narrowValue("1E5")    === "1E5",    "§7.1.3 C-012 §17.2: '1E5' remains string");
assert(narrowValue("2.5E+3") === "2.5E+3", "§7.1.3 C-012 §17.2: '2.5E+3' remains string");
assert(narrowValue("1.5e-3") === "1.5e-3", "§7.1.3 C-012: '1.5e-3' remains string");
assert(narrowValue("1e0")    === "1e0",    "§7.1.3 C-012: '1e0' remains string");
// NaN / Infinity are not narrowed
assert(narrowValue("NaN")       === "NaN",       "§7.1.3 str: 'NaN' remains string");
assert(narrowValue("Infinity")   === "Infinity",   "§7.1.3 str: 'Infinity' remains string");
assert(narrowValue("-Infinity")  === "-Infinity",  "§7.1.3 str: '-Infinity' remains string");
// Generic strings
assert(narrowValue("hello") === "hello", "§7.1.3 str: arbitrary string remains string");
assert(narrowValue("")      === "",      "§7.1.3 str: empty string remains string");

// ── §7.1.3 narrowRecords: applies narrowValue to every field ─────────────────
const rec = narrowRecords([
  { a: "TRUE", b: "42", c: "3.14", d: null, e: "hello", f: "1E5", g: "00123" },
]);
assert(rec[0].a === true,    "narrowRecords: 'TRUE' → true (C-011)");
assert(rec[0].b === 42,      "narrowRecords: '42' → 42 (integer)");
assert(rec[0].c === 3.14,    "narrowRecords: '3.14' → 3.14 (number)");
assert(rec[0].d === null,    "narrowRecords: null → null");
assert(rec[0].e === "hello", "narrowRecords: 'hello' → 'hello' (string)");
assert(rec[0].f === "1E5",   "narrowRecords: '1E5' remains string (C-012)");
assert(rec[0].g === "00123", "narrowRecords: '00123' remains string (leading zeros)");
// Multiple records
const recs = narrowRecords([
  { x: "false" },
  { x: "false", },
]);
assert(recs[0].x === false, "narrowRecords multi-record: row 0 x → false");
assert(recs[1].x === false, "narrowRecords multi-record: row 1 x → false");
// narrowRecords does not mutate original
const orig = [{ v: "1" }];
narrowRecords(orig);
assert(orig[0].v === "1", "narrowRecords: does not mutate source records");

// ── §17.2 CSV boolean case-insensitivity (section 17.2) ──────────────────────
assert(narrowValue("TRUE")  === true,  "§17.2 bool: 'TRUE' Excel export → true");
assert(narrowValue("FALSE") === false, "§17.2 bool: 'FALSE' Excel export → false");
assert(narrowValue("True")  === true,  "§17.2 bool: 'True' mixed-case → true");
assert(narrowValue("False") === false, "§17.2 bool: 'False' mixed-case → false");
