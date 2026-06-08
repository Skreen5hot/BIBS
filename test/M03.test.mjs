// M03 test suite
// Spec coverage: §6.1, §6.3, §7.1.1, §7.1.2
// Diagnostic codes exercised: BIBSS-001, BIBSS-003, BIBSS-005
import { assert } from "./_assert.mjs";
import { normalizeCSV, detectFormat } from "../src/csv-normalize.mjs";

// ── §6.3  Format detection ───────────────────────────────────────────────────
assert(detectFormat("name,age\nAlice,30") === "csv",  "§6.3: plain CSV → csv");
assert(detectFormat('{"a":1}')            === "json", "§6.3: JSON object → json");
assert(detectFormat("[1,2,3]")           === "json", "§6.3: JSON array → json");
assert(detectFormat("  \n{}")            === "json", "§6.3: leading whitespace ignored before detection");
assert(detectFormat("\t[")               === "json", "§6.3: tab before [ → json");
assert(detectFormat("a,b\n1,2")          === "csv",  "§6.3: alpha-first → csv");

// ── §6.1 + §7.1.1  BOM stripping (U+FEFF) ───────────────────────────────────
const bomCsv = "\uFEFFname,age\nAlice,30\nBob,25";
const { records: bomRecs, diagnostics: bomDiag } = normalizeCSV(bomCsv, {});
assert(bomRecs !== null,                   "§6.1: BOM CSV parsed without fatal error");
assert(bomRecs.length === 2,               "§6.1: BOM CSV yields 2 data rows");
assert(Object.hasOwn(bomRecs[0], "name"), "§6.1: BOM stripped; header key 'name' correct");
assert(bomRecs[0].name === "Alice",        "§6.1: BOM stripped; first row name=Alice");
assert(!bomDiag.some(d => d.code === "BIBSS-005"), "§6.1: BOM CSV produces no parse error");

// Non-BOM CSV unaffected
const noBomCsv = "x,y\n1,2";
const { records: noBomRecs } = normalizeCSV(noBomCsv, {});
assert(noBomRecs !== null,                "§6.1: non-BOM CSV parses normally");
assert(Object.hasOwn(noBomRecs[0], "x"), "§6.1: non-BOM header 'x' present");

// ── §7.1.1  dynamicTyping:false — all values arrive as strings ───────────────
const dtCsv = "id,flag,price\n42,true,3.14";
const { records: dtRecs } = normalizeCSV(dtCsv, {});
assert(dtRecs[0].id    === "42",   "§7.1.1: dynamicTyping=false; integer stays string");
assert(dtRecs[0].flag  === "true", "§7.1.1: dynamicTyping=false; boolean stays string");
assert(dtRecs[0].price === "3.14", "§7.1.1: dynamicTyping=false; float stays string");

// ── §7.1.1  transformHeader: headers are trimmed ─────────────────────────────
const spacedHdr = " name , age \nAlice,30";
const { records: spacedRecs } = normalizeCSV(spacedHdr, {});
assert(spacedRecs !== null,                      "§7.1.1: spaced-header CSV parses");
assert(Object.hasOwn(spacedRecs[0], "name"),     "§7.1.1: header trimmed to 'name'");
assert(Object.hasOwn(spacedRecs[0], "age"),      "§7.1.1: header trimmed to 'age'");
assert(!Object.hasOwn(spacedRecs[0], " name "), "§7.1.1: untrimmed key absent from record");

// ── §7.1.1  skipEmptyLines:'greedy' ─────────────────────────────────────────
const blanksCsv = "a,b\n1,2\n\n   \n3,4";
const { records: blanksRecs } = normalizeCSV(blanksCsv, {});
assert(blanksRecs !== null,     "§7.1.1: blank-line CSV parses");
assert(blanksRecs.length === 2, "§7.1.1: greedy skip removes blank and whitespace-only rows");

// ── §7.1.2(1)  Trim all string values ───────────────────────────────────────
const paddedCsv = "name,city\n  Alice  , New York \n Bob ,  Paris ";
const { records: trimRecs } = normalizeCSV(paddedCsv, {});
assert(trimRecs[0].name === "Alice",    "§7.1.2(1): leading/trailing spaces trimmed");
assert(trimRecs[0].city === "New York", "§7.1.2(1): internal space preserved");
assert(trimRecs[1].name === "Bob",      "§7.1.2(1): row 2 name trimmed");
assert(trimRecs[1].city === "Paris",    "§7.1.2(1): row 2 city trimmed");

// ── §7.1.2(2)  Empty string → null when emptyStringAsNull=true ──────────────
const emptyValCsv = "a,b,c\n1,,3";
const { records: nullRecs } = normalizeCSV(emptyValCsv, { emptyStringAsNull: true });
assert(nullRecs[0].a === "1",  "§7.1.2(2): non-empty value preserved");
assert(nullRecs[0].b === null, "§7.1.2(2): empty string → null when emptyStringAsNull=true");
assert(nullRecs[0].c === "3",  "§7.1.2(2): trailing non-empty preserved");

const { records: keepEmptyRecs } = normalizeCSV(emptyValCsv, { emptyStringAsNull: false });
assert(keepEmptyRecs[0].b === "", "§7.1.2(2): empty string kept when emptyStringAsNull=false");

// ── §7.1.1  Quoted field with embedded comma ─────────────────────────────────
const quotedCsv = 'name,desc\n"Smith, Jr.","Has \"\"quotes\"\""\n"Jones",plain';
const { records: quotedRecs } = normalizeCSV(quotedCsv, {});
assert(quotedRecs !== null,                   "§7.1.1: quoted-field CSV parses");
assert(quotedRecs[0].name === "Smith, Jr.",   "§7.1.1: embedded comma in quoted field preserved");
assert(quotedRecs[0].desc === 'Has "quotes"', "§7.1.1: doubled-quote escape unescaped");
assert(quotedRecs[1].name === "Jones",         "§7.1.1: row 2 plain field correct");

// ── §7.1.1  Quoted field with embedded newline ───────────────────────────────
const newlineCsv = 'id,note\n1,"line one\nline two"\n2,plain';
const { records: nlRecs } = normalizeCSV(newlineCsv, {});
assert(nlRecs !== null,                          "§7.1.1: embedded-newline CSV parses");
assert(nlRecs.length === 2,                      "§7.1.1: embedded newline = 2 logical rows");
assert(nlRecs[0].note === "line one\nline two", "§7.1.1: embedded newline preserved in value");
assert(nlRecs[1].id   === "2",                   "§7.1.1: subsequent row id correct");

// ── §7.1.2(3) + BIBSS-003  Short row: pad missing keys with null ─────────────
const shortRowCsv = "a,b,c\n1,2,3\n4,5";
const { records: shortRecs, diagnostics: shortDiag } = normalizeCSV(shortRowCsv, {});
assert(shortRecs !== null,                   "BIBSS-003: short-row CSV parse succeeds");
assert(shortRecs.length === 2,               "BIBSS-003: 2 records after short-row handling");
assert(shortRecs[1].a === "4",               "BIBSS-003: short row col a correct");
assert(shortRecs[1].b === "5",               "BIBSS-003: short row col b correct");
assert(Object.hasOwn(shortRecs[1], "c"),    "§7.1.2(3): missing key 'c' inserted into record");
assert(shortRecs[1].c === null,              "BIBSS-003: padded missing key has null value");
assert(shortDiag.some(d => d.code === "BIBSS-003"), "BIBSS-003: mismatch diagnostic emitted for short row");

// ── BIBSS-003  Long row: truncate extra fields ───────────────────────────────
const longRowCsv = "a,b\n1,2\n3,4,5,6";
const { records: longRecs, diagnostics: longDiag } = normalizeCSV(longRowCsv, {});
assert(longRecs !== null,                               "BIBSS-003: long-row CSV parse succeeds");
assert(!Object.hasOwn(longRecs[1], "__parsed_extra"), "BIBSS-003: __parsed_extra absent from output");
assert(Object.keys(longRecs[1]).length === 2,           "BIBSS-003: long row trimmed to header key count");
assert(longRecs[1].a === "3",                           "BIBSS-003: long row col a correct");
assert(longDiag.some(d => d.code === "BIBSS-003"),      "BIBSS-003: mismatch diagnostic for long row");

// ── BIBSS-003  Mismatch diagnostic cap at 10 ─────────────────────────────────
const manyMismatch = ["a,b,c", ...Array.from({ length: 15 }, (_, i) => String(i))].join("\n");
const { diagnostics: manyDiag } = normalizeCSV(manyMismatch, {});
const bibss003Count = manyDiag.filter(d => d.code === "BIBSS-003").length;
assert(bibss003Count > 0,   "BIBSS-003: at least one mismatch diagnostic emitted");
assert(bibss003Count <= 10, "BIBSS-003: mismatch diagnostics capped at 10");

// ── BIBSS-001  Size warning ───────────────────────────────────────────────────
const smallCsv = "a,b\n1,2";
const { diagnostics: sizeDiag } = normalizeCSV(smallCsv, { maxSizeWarning: 1 });
assert(sizeDiag.some(d => d.code === "BIBSS-001"),                      "BIBSS-001: warning emitted when byteCount > maxSizeWarning");
assert(sizeDiag.find(d => d.code === "BIBSS-001").level === "warning", "BIBSS-001: level is 'warning'");

const { diagnostics: noSizeDiag } = normalizeCSV(smallCsv, { maxSizeWarning: 10485760 });
assert(!noSizeDiag.some(d => d.code === "BIBSS-001"), "BIBSS-001: no warning when under limit");

// ── BIBSS-005  Malformed quote → null records ────────────────────────────────
// Unterminated quoted field causes Papa Parse to emit a Quotes-type error (not FieldMismatch).
// M03 treats non-FieldMismatch errors as fatal: returns records:null + BIBSS-005 diagnostic.
const malformedCsv = "a,b\n\"unclosed,1";
const { records: badRecs, diagnostics: badDiag } = normalizeCSV(malformedCsv, {});
assert(badRecs === null,                               "BIBSS-005: malformed quote → null records");
assert(badDiag.some(d => d.code === "BIBSS-005"),     "BIBSS-005: diagnostic emitted on parse error");
assert(badDiag.find(d => d.code === "BIBSS-005").level === "error", "BIBSS-005: level is 'error'");
