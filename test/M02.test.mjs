// M02 test suite
// Spec coverage: §6.2 (JSON input spec + precision limitation / BIBSS-009), §6.3 (format detection heuristic + override), §7.2 (JSON normalization), §7.3 (integer detection)
import { assert } from './_assert.mjs';
import { detectFormat, isInteger, normalizeJsonValue, parseJson } from '../src/json-normalize.mjs';

// ── §6.3  Format detection heuristic ─────────────────────────────────────────
assert(detectFormat('{"a":1}') === 'json',          '§6.3: { prefix → json');
assert(detectFormat('[1,2,3]') === 'json',           '§6.3: [ prefix → json');
assert(detectFormat('  {"a":1}') === 'json',         '§6.3: leading spaces + { → json');
assert(detectFormat('\n\t[1]') === 'json',           '§6.3: leading whitespace + [ → json');
assert(detectFormat('name,age') === 'csv',           '§6.3: header row → csv');
assert(detectFormat('a,b,c\n1,2,3') === 'csv',      '§6.3: csv body → csv');
assert(detectFormat('hello world') === 'csv',        '§6.3: plain text → csv');
assert(detectFormat('') === 'csv',                   '§6.3: empty string → csv (no { or [)');

// config.format override respected
assert(detectFormat('{"a":1}', 'csv') === 'csv',    '§6.3: override=csv beats { prefix');
assert(detectFormat('a,b,c', 'json') === 'json',    '§6.3: override=json beats non-{ prefix');
assert(detectFormat('[1,2]', 'csv') === 'csv',       '§6.3: override=csv beats [ prefix');
assert(detectFormat('{"x":1}', 'json') === 'json',  '§6.3: override=json + json input → json');
assert(detectFormat('', 'json') === 'json',          '§6.3: override=json + empty → json');

// ── §7.3  Integer detection ───────────────────────────────────────────────────
assert(isInteger(0) === true,          '§7.3: 0 is integer');
assert(isInteger(42) === true,         '§7.3: 42 is integer');
assert(isInteger(-7) === true,         '§7.3: -7 is integer');
assert(isInteger(1.0) === true,        '§7.3: 1.0 (integer-valued float) is integer');
assert(isInteger(Number.MAX_SAFE_INTEGER) === true, '§7.3: MAX_SAFE_INTEGER is integer');
assert(isInteger(3.14) === false,      '§7.3: 3.14 is not integer');
assert(isInteger(NaN) === false,       '§7.3: NaN is not integer');
assert(isInteger(Infinity) === false,  '§7.3: Infinity is not integer');
assert(isInteger(-Infinity) === false, '§7.3: -Infinity is not integer');
assert(isInteger('5') === false,       '§7.3: string "5" is not integer');
assert(isInteger(null) === false,      '§7.3: null is not integer');
assert(isInteger(true) === false,      '§7.3: boolean is not integer');
assert(isInteger(undefined) === false, '§7.3: undefined is not integer');

// ── §7.2  JSON normalization — normalizeJsonValue ────────────────────────────
// Single object → wrapped in array
const singleObj = { a: 1, b: 'hello' };
const wrappedSingle = normalizeJsonValue(singleObj);
assert(Array.isArray(wrappedSingle),          '§7.2: single object → array');
assert(wrappedSingle.length === 1,            '§7.2: single object → length-1 array');
assert(wrappedSingle[0] === singleObj,        '§7.2: single object preserved by reference');

// Array of objects → used directly
const arrOfObjs = [{ x: 1 }, { x: 2 }];
const directArr = normalizeJsonValue(arrOfObjs);
assert(directArr === arrOfObjs,               '§7.2: array of objects → same reference');
assert(directArr.length === 2,                '§7.2: array of objects length unchanged');

// Array of primitives → each wrapped {_value: v}
const primResult = normalizeJsonValue([1, 'a', null, true]);
assert(Array.isArray(primResult),             '§7.2: array of primitives → array');
assert(primResult.length === 4,               '§7.2: primitives array length preserved');
assert(primResult[0]._value === 1,            '§7.2: integer primitive wrapped as _value');
assert(primResult[1]._value === 'a',          '§7.2: string primitive wrapped as _value');
assert(primResult[2]._value === null,         '§7.2: null primitive wrapped as _value');
assert(primResult[3]._value === true,         '§7.2: boolean primitive wrapped as _value');

// Nested structures preserved for inference engine
const nested = { outer: { inner: [1, 2, 3] } };
const nestedResult = normalizeJsonValue(nested);
assert(nestedResult[0] === nested,            '§7.2: nested structure top object preserved');
assert(nestedResult[0].outer.inner.length === 3, '§7.2: nested inner array preserved');

// Empty array
const emptyResult = normalizeJsonValue([]);
assert(Array.isArray(emptyResult) && emptyResult.length === 0, '§7.2: empty array → empty array');

// Single array of one object
const singletonArr = normalizeJsonValue([{ z: 99 }]);
assert(singletonArr.length === 1 && singletonArr[0].z === 99, '§7.2: singleton object array used directly');

// ── §6.2 + BIBSS-009  Precision pre-scan ─────────────────────────────────────
// 16+ digit integer triggers BIBSS-009, processing continues
const snowflakeRaw = '{"id": 1234567890123456789}';
const r009 = parseJson(snowflakeRaw);
assert(r009.diagnostics.some(d => d.code === 'BIBSS-009'), '§6.2/BIBSS-009: 16-digit int triggers BIBSS-009');
assert(r009.records !== null,                               '§6.2/BIBSS-009: records still returned (continue processing)');
assert(r009.records.length === 1,                          '§6.2/BIBSS-009: wrapped single object present');

// 16 digits exactly triggers BIBSS-009
const exactly16 = '{"id": 1234567890123456}';
const r009b = parseJson(exactly16);
assert(r009b.diagnostics.some(d => d.code === 'BIBSS-009'), '§6.2/BIBSS-009: exactly 16-digit int triggers BIBSS-009');

// 15 digits does NOT trigger BIBSS-009
const safe15 = '{"id": 123456789012345}';
const r015 = parseJson(safe15);
assert(!r015.diagnostics.some(d => d.code === 'BIBSS-009'), '§6.2: 15-digit int does NOT trigger BIBSS-009');
assert(r015.records !== null,                                '§6.2: 15-digit int parses normally');

// ── BIBSS-004  SyntaxError → cism:null path ───────────────────────────────────
const badJson = '{ invalid json }';
const r004 = parseJson(badJson);
assert(r004.records === null,                              'BIBSS-004: SyntaxError → records null');
assert(r004.diagnostics.some(d => d.code === 'BIBSS-004'), 'BIBSS-004: diagnostic code emitted on SyntaxError');
assert(r004.diagnostics.find(d => d.code === 'BIBSS-004').level === 'error', 'BIBSS-004: level is error');

const emptyBad = parseJson('');
assert(emptyBad.records === null,                               'BIBSS-004: empty string → records null');
assert(emptyBad.diagnostics.some(d => d.code === 'BIBSS-004'), 'BIBSS-004: empty string emits BIBSS-004');

// ── §6.2  Full parseJson round-trips ─────────────────────────────────────────
// Single object
const ro1 = parseJson('{"name":"Alice","age":30}');
assert(ro1.records !== null,          '§6.2: single object parse succeeds');
assert(ro1.records.length === 1,      '§6.2: single object → length-1 array');
assert(ro1.records[0].name === 'Alice', '§6.2: single object field preserved');
assert(ro1.records[0].age === 30,     '§6.2: single object numeric field preserved');

// Array of objects
const ro2 = parseJson('[{"a":1},{"a":2}]');
assert(ro2.records.length === 2,      '§6.2: array of objects → 2 records');
assert(ro2.records[0].a === 1,        '§6.2: array of objects record[0] field correct');

// Array of primitives
const ro3 = parseJson('[1,"hello",null]');
assert(ro3.records.length === 3,            '§6.2: array of primitives → 3 wrapped records');
assert(ro3.records[0]._value === 1,         '§6.2: primitive[0] _value = 1');
assert(ro3.records[1]._value === 'hello',   '§6.2: primitive[1] _value = hello');
assert(ro3.records[2]._value === null,      '§6.2: primitive[2] _value = null');

// §7.3 integer detection on parseJson results
const ro4 = parseJson('{"count":5,"ratio":3.14,"flag":true}');
assert(ro4.records !== null,                   '§7.3: parse with mixed types succeeds');
assert(isInteger(ro4.records[0].count),        '§7.3: 5 → integer');
assert(!isInteger(ro4.records[0].ratio),       '§7.3: 3.14 → not integer');
assert(!isInteger(ro4.records[0].flag),        '§7.3: boolean → not integer');
