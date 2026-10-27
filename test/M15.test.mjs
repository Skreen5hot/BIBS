// M15 test suite
// Spec coverage: §12 (Public API end-to-end), §14 (Error Handling)
// §17.2 end-to-end acceptance: CSV boolean narrowing C-011, no sci-notation C-012, nested JSON, multi-record array
import { assert } from './_assert.mjs';
import { BIBSS } from '../src/bibss.mjs';

// ── §12: Public API shape ─────────────────────────────────────────────────────
assert(typeof BIBSS === 'object',           '§12: BIBSS is an object');
assert(typeof BIBSS.infer === 'function',   '§12: BIBSS.infer is a function');
assert(typeof BIBSS.project === 'function', '§12: BIBSS.project is a function');
assert(typeof BIBSS.adapters === 'object',  '§12: BIBSS.adapters is an object');

// ── §12: adapters initialized with jsonschema and cism ────────────────────────
const adapterNames = BIBSS.adapters.list();
assert(adapterNames.includes('jsonschema'), '§12: adapters has jsonschema (M13)');
assert(adapterNames.includes('cism'),       '§12: adapters has cism (M14)');

// ── §12: infer() InferResult shape ────────────────────────────────────────────
{
  const r = BIBSS.infer('{"x":1}');
  assert(typeof r === 'object',        '§12: infer returns object');
  assert('cism' in r,                  '§12: InferResult.cism present');
  assert('diagnostics' in r,           '§12: InferResult.diagnostics present');
  assert(Array.isArray(r.diagnostics), '§12: diagnostics is array');
}

// ── §12: infer() JSON object → valid CISMRoot ─────────────────────────────────
{
  const r = BIBSS.infer('{"name":"Alice","age":30}');
  assert(r.cism !== null,                        '§12 json-obj: cism non-null');
  assert(r.cism.version === '1.3',               '§12 json-obj: version = 1.3');
  assert(typeof r.cism.generatedAt === 'string', '§12 json-obj: generatedAt is string');
  assert(typeof r.cism.config === 'object',      '§12 json-obj: config present');
  assert(typeof r.cism.sampling === 'object',    '§12 json-obj: sampling present');
  assert(r.cism.root.kind === 'object',          '§12 json-obj: root.kind = object');
  assert(r.cism.root.occurrences === 1,          '§12 json-obj: root.occurrences = 1');
  const np = r.cism.root.properties.find(p => p.name === 'name');
  assert(np !== undefined,                       '§12 json-obj: name property inferred');
  assert(np.target.primitiveType === 'string',   '§12 json-obj: name type = string');
  const ap = r.cism.root.properties.find(p => p.name === 'age');
  assert(ap !== undefined,                       '§12 json-obj: age property inferred');
  assert(ap.target.primitiveType === 'integer',  '§12 json-obj: age type = integer');
}

// ── §12: infer() JSON array → valid CISMRoot ──────────────────────────────────
{
  const r = BIBSS.infer('[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]');
  assert(r.cism !== null,                       '§12 json-arr: cism non-null');
  assert(r.cism.root.kind === 'object',         '§12 json-arr: root.kind = object');
  assert(r.cism.root.occurrences === 2,         '§12 json-arr: root.occurrences = 2');
  const ip = r.cism.root.properties.find(p => p.name === 'id');
  assert(ip !== undefined,                      '§12 json-arr: id property present');
  assert(ip.target.primitiveType === 'integer', '§12 json-arr: id type = integer');
}

// ── §12: infer() CSV → valid CISMRoot ────────────────────────────────────────
{
  const r = BIBSS.infer('name,age\nAlice,30\nBob,25');
  assert(r.cism !== null,                       '§12 csv: cism non-null');
  assert(r.cism.root.kind === 'object',         '§12 csv: root.kind = object');
  assert(r.cism.root.occurrences === 2,         '§12 csv: root.occurrences = 2');
  const np = r.cism.root.properties.find(p => p.name === 'name');
  assert(np !== undefined,                      '§12 csv: name property present');
  assert(np.target.primitiveType === 'string',  '§12 csv: name type = string');
  const ap = r.cism.root.properties.find(p => p.name === 'age');
  assert(ap !== undefined,                      '§12 csv: age property present');
  assert(ap.target.primitiveType === 'integer', '§12 csv: age type = integer (narrowed)');
}

// ── §12: infer() config merge ─────────────────────────────────────────────────
{
  const r = BIBSS.infer('{"x":1}', { requiredThreshold: 0.5 });
  assert(r.cism !== null,                         '§12 config: cism non-null');
  assert(r.cism.config.requiredThreshold === 0.5, '§12 config: requiredThreshold merged');
  assert(r.cism.config.sampleSize === 2000,       '§12 config: sampleSize kept at default');
}

// ── §12: project() jsonschema adapter ─────────────────────────────────────────
{
  const r = BIBSS.infer('{"name":"Alice"}');
  const schema = BIBSS.project(r.cism, 'jsonschema');
  assert(typeof schema === 'object', '§12 project jsonschema: returns object');
  assert(schema.$schema === 'https://json-schema.org/draft/2020-12/schema',
    '§12 project jsonschema: $schema is Draft 2020-12');
  assert(typeof schema.$id === 'string', '§12 project jsonschema: $id is string');
  assert(schema.title === 'Inferred Schema', '§12 project jsonschema: title present');
}

// ── §12: project() cism adapter ──────────────────────────────────────────────
{
  const r = BIBSS.infer('{"x":42}');
  const raw = BIBSS.project(r.cism, 'cism');
  assert(typeof raw === 'object', '§12 project cism: returns object');
  assert(raw.version === '1.3',   '§12 project cism: version = 1.3');
  assert('root' in raw,           '§12 project cism: root present');
  assert('config' in raw,         '§12 project cism: config present');
}

// ── §12: project() unknown adapter throws TypeError ───────────────────────────
{
  const r = BIBSS.infer('{"x":1}');
  let threw = false;
  let isTypeError = false;
  try { BIBSS.project(r.cism, 'no-such-adapter'); }
  catch (e) { threw = true; isTypeError = e instanceof TypeError; }
  assert(threw,       '§12: project unknown adapter throws');
  assert(isTypeError, '§12: project unknown adapter throws TypeError');
}

// ── §14: Empty string → cism:null + BIBSS-007 info ────────────────────────────
{
  const r = BIBSS.infer('');
  assert(r.cism === null,                              '§14 empty: cism = null');
  assert(r.diagnostics.some(d => d.code === 'BIBSS-007'), '§14 empty: BIBSS-007 emitted');
  const d = r.diagnostics.find(d => d.code === 'BIBSS-007');
  assert(d.level === 'info',                           '§14 empty: BIBSS-007 level = info');
}

// ── §14: Malformed JSON → cism:null + BIBSS-004 error ─────────────────────────
{
  const r = BIBSS.infer('{ invalid json }');
  assert(r.cism === null,                              '§14 bad-json: cism = null');
  assert(r.diagnostics.some(d => d.code === 'BIBSS-004'), '§14 bad-json: BIBSS-004 emitted');
  const d = r.diagnostics.find(d => d.code === 'BIBSS-004');
  assert(d.level === 'error',                          '§14 bad-json: level = error');
}

// ── §14: Malformed CSV → cism:null + BIBSS-005 error ─────────────────────────
{
  const r = BIBSS.infer('a,b\n"unclosed,1');
  assert(r.cism === null,                              '§14 bad-csv: cism = null');
  assert(r.diagnostics.some(d => d.code === 'BIBSS-005'), '§14 bad-csv: BIBSS-005 emitted');
  const d = r.diagnostics.find(d => d.code === 'BIBSS-005');
  assert(d.level === 'error',                          '§14 bad-csv: level = error');
}

// ── §14: BIBSS-009 large integer — processing continues, cism non-null ────────
{
  const r = BIBSS.infer('{"id": 1234567890123456789}');
  assert(r.cism !== null,                              '§14 BIBSS-009: cism non-null (continues)');
  assert(r.diagnostics.some(d => d.code === 'BIBSS-009'), '§14 BIBSS-009: warning emitted');
  const d = r.diagnostics.find(d => d.code === 'BIBSS-009');
  assert(d.level === 'warning',                        '§14 BIBSS-009: level = warning');
}

// ── §14: BIBSS-001 large input — warning only, cism non-null ─────────────────
{
  const bigInput = 'a,b\n' + 'x,y\n'.repeat(50);
  const r = BIBSS.infer(bigInput, { maxSizeWarning: 1 });
  assert(r.cism !== null,                              '§14 BIBSS-001: cism non-null (continues)');
  assert(r.diagnostics.some(d => d.code === 'BIBSS-001'), '§14 BIBSS-001: warning emitted');
  const d = r.diagnostics.find(d => d.code === 'BIBSS-001');
  assert(d.level === 'warning',                        '§14 BIBSS-001: level = warning');
}

// ── §12.1 BIBSS-001: threshold counts UTF-8 bytes, not UTF-16 code units ──────
{
  const input = '{"s":"' + 'é'.repeat(10) + '"}'; // 18 code units, 28 UTF-8 bytes
  const under = BIBSS.infer(input, { maxSizeWarning: 20 });
  assert(under.diagnostics.some(d => d.code === 'BIBSS-001'), '§12.1 BIBSS-001: multi-byte chars counted as bytes');
  const d = under.diagnostics.find(d => d.code === 'BIBSS-001');
  assert(d.context.byteCount === 28, '§12.1 BIBSS-001: context.byteCount is UTF-8 length');
  const fits = BIBSS.infer(input, { maxSizeWarning: 28 });
  assert(!fits.diagnostics.some(d => d.code === 'BIBSS-001'), '§12.1 BIBSS-001: exactly-at-limit does not warn');
}

// ── §12: binary input — ArrayBuffer and typed-array views ────────────────────
{
  const text = '[{"a":1},{"a":2}]';
  const fromString = BIBSS.infer(text).cism;
  const u8 = new TextEncoder().encode(text);
  const fromU8 = BIBSS.infer(u8).cism;
  const fromBuf = BIBSS.infer(u8.buffer.slice(0)).cism;
  // Subarray view with a non-zero offset into a larger buffer.
  const padded = new Uint8Array(u8.length + 4);
  padded.set(u8, 2);
  const fromView = BIBSS.infer(padded.subarray(2, 2 + u8.length)).cism;
  for (const [label, c] of [['Uint8Array', fromU8], ['ArrayBuffer', fromBuf], ['offset view', fromView]]) {
    assert(c !== null, `§12 binary ${label}: cism non-null`);
    assert(JSON.stringify(c.root) === JSON.stringify(fromString.root), `§12 binary ${label}: root matches string input`);
    assert(c.inputHash === fromString.inputHash, `§12 binary ${label}: inputHash matches string input`);
  }
}

// ── §11.1: $id is urn:bibss:inferred:<sha256 of first 1024 input bytes> ───────
{
  const r = BIBSS.infer('abc,def\n1,2');
  assert(/^[0-9a-f]{64}$/.test(r.cism.inputHash), '§11.1 $id: inputHash is 64 hex chars');
  const schema = BIBSS.project(r.cism, 'jsonschema');
  assert(schema.$id === `urn:bibss:inferred:${r.cism.inputHash}`, '§11.1 $id: uses inputHash');
  const other = BIBSS.infer('abc,def\n1,3');
  assert(other.cism.inputHash !== r.cism.inputHash, '§11.1 $id: different input → different hash');
  // Only the first 1024 bytes are hashed.
  const head = 'x\n' + '1\n'.repeat(511); // exactly 1024 bytes
  const a = BIBSS.infer(head + '2\n').cism.inputHash;
  const b = BIBSS.infer(head + '3\n').cism.inputHash;
  assert(a === b, '§11.1 $id: bytes beyond 1024 do not affect hash');
}

// ── §17.1: determinism — serialized CISM identical apart from generatedAt ─────
{
  const strip = (c) => JSON.stringify({ ...c, generatedAt: undefined });
  for (const input of ['[{"a":1,"b":[1,"x",null]},{"a":null}]', 'h1,h2\nTRUE,1.5\nfalse,']) {
    const a = BIBSS.infer(input).cism;
    const b = BIBSS.infer(input).cism;
    assert(strip(a) === strip(b), '§17.1 determinism: CISM byte-identical excluding generatedAt');
    const pa = { ...BIBSS.project(a, 'cism'), generatedAt: undefined };
    const pb = { ...BIBSS.project(b, 'cism'), generatedAt: undefined };
    assert(JSON.stringify(pa) === JSON.stringify(pb), '§17.1 determinism: cism adapter output identical');
    assert(JSON.stringify(BIBSS.project(a, 'jsonschema')) === JSON.stringify(BIBSS.project(b, 'jsonschema')),
      '§17.1 determinism: jsonschema output fully identical');
  }
}

// ── §14: exception-free contract ─────────────────────────────────────────────
{
  let threw = false;
  try {
    const r = BIBSS.infer(null);
    assert(Array.isArray(r.diagnostics), '§14 null-input: diagnostics array returned');
  } catch (e) { threw = true; }
  assert(!threw, '§14 exception-free: infer(null) never propagates exception');
}

// ── §17.2: CSV boolean narrowing C-011 end-to-end ────────────────────────────
{
  const r = BIBSS.infer('flag\nTRUE\nFALSE\ntrue\nfalse');
  assert(r.cism !== null,                           '§17.2 C-011: cism non-null');
  const fp = r.cism.root.properties.find(p => p.name === 'flag');
  assert(fp !== undefined,                          '§17.2 C-011: flag property present');
  assert(fp.target.primitiveType === 'boolean',     '§17.2 C-011: flag narrowed to boolean');
}

// ── §17.2: CSV no scientific notation C-012 end-to-end ───────────────────────
{
  const r = BIBSS.infer('val\n1E5\n2E3\n3E2');
  assert(r.cism !== null,                           '§17.2 C-012: cism non-null');
  const vp = r.cism.root.properties.find(p => p.name === 'val');
  assert(vp !== undefined,                          '§17.2 C-012: val property present');
  assert(vp.target.primitiveType === 'string',      '§17.2 C-012: scientific notation remains string');
}

// ── §17.2: JSON nested object end-to-end ─────────────────────────────────────
{
  const r = BIBSS.infer('{"user":{"name":"Alice","age":30}}');
  assert(r.cism !== null,                           '§17.2 nested: cism non-null');
  const up = r.cism.root.properties.find(p => p.name === 'user');
  assert(up !== undefined,                          '§17.2 nested: user property present');
  assert(up.target.kind === 'object',               '§17.2 nested: user is object');
  const ap = up.target.properties.find(p => p.name === 'age');
  assert(ap !== undefined,                          '§17.2 nested: nested age property present');
  assert(ap.target.primitiveType === 'integer',     '§17.2 nested: age type = integer');
}

// ── §17.2: JSON array multi-record end-to-end ────────────────────────────────
{
  const r = BIBSS.infer('[{"id":1,"active":true},{"id":2,"active":false},{"id":3}]');
  assert(r.cism !== null,                           '§17.2 multi: cism non-null');
  assert(r.cism.root.occurrences === 3,             '§17.2 multi: 3 records');
  const ap = r.cism.root.properties.find(p => p.name === 'active');
  assert(ap !== undefined,                          '§17.2 multi: active property present');
  assert(ap.target.primitiveType === 'boolean',     '§17.2 multi: active type = boolean');
  assert(ap.required === false,                     '§17.2 multi: active not required (2/3)');
}
