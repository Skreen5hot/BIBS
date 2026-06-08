// M11 test suite
// Spec coverage: §10.1 (deterministic strided sampling), §10.2 (merge semantics / single flat population), §10.3 (sample indicator)
import { assert } from './_assert.mjs';
import { sampleRecords } from '../src/sampling.mjs';
import { DIAG } from '../src/types.mjs';

const S = 10; // small sampleSize for fast, inspectable tests

function makeRecords(n) {
  return Array.from({ length: n }, (_, i) => ({ id: i }));
}

// ── §10.1  No sampling at exact boundary ─────────────────────────────────────
const exact = makeRecords(S);
const rExact = sampleRecords(exact, { sampleSize: S });
assert(rExact.samplingInfo.applied === false, '§10.1: applied=false when length === sampleSize');
assert(rExact.sampled === exact, '§10.1: sampled is original array reference when not applied');
assert(rExact.sampled.length === S, '§10.1: all records returned at exact boundary');

// §10.1  No sampling below threshold
const below = makeRecords(S - 1);
const rBelow = sampleRecords(below, { sampleSize: S });
assert(rBelow.samplingInfo.applied === false, '§10.1: applied=false when length < sampleSize');
assert(rBelow.sampled === below, '§10.1: original array returned when below threshold');

// ── §10.1  sampleSize+1: sampling triggered ───────────────────────────────────
// S=10: halfSize=5, remainder=[5..10] (6 records), stride=floor(6/5)=1 → tail=all 6 → total=11
const over1 = makeRecords(S + 1);
const rOver1 = sampleRecords(over1, { sampleSize: S });
assert(rOver1.samplingInfo.applied === true, '§10.1: applied=true when length > sampleSize');
assert(rOver1.sampled.length >= S - 1 && rOver1.sampled.length <= S + 1,
  '§10.1: sampleSize+1: sampled count within sampleSize ±1');
// head records are always first
for (let i = 0; i < Math.floor(S / 2); i++) {
  assert(rOver1.sampled[i].id === i, `§10.1: sampleSize+1: head record [${i}] present`);
}

// ── §10.3  Sample indicator fields ───────────────────────────────────────────
assert(rOver1.samplingInfo.inputSize === S + 1, '§10.3: samplingInfo.inputSize matches input length');
assert(rOver1.samplingInfo.sampleSize === S, '§10.3: samplingInfo.sampleSize matches config');
assert(rOver1.samplingInfo.strategy === 'strided', '§10.3: samplingInfo.strategy is strided');
assert('applied' in rOver1.samplingInfo, '§10.3: samplingInfo.applied is present');

// ── §10.1  10x sampleSize: verify exact stride arithmetic ────────────────────
// S=10, 100 records: halfSize=5, remainder=95 records (ids 5..99)
// stride=floor(95/5)=19
// tail indices in remainder: 0,19,38,57,76 → ids 5,24,43,62,81
// total sampled: [0,1,2,3,4, 5,24,43,62,81] = 10 records
const tenX = makeRecords(S * 10);
const rTenX = sampleRecords(tenX, { sampleSize: S });
assert(rTenX.samplingInfo.applied === true, '§10.1: applied=true for 10x input');
assert(rTenX.sampled.length === S, '§10.1: 10x: sampled count equals sampleSize exactly');
const expectedIds = [0, 1, 2, 3, 4, 5, 24, 43, 62, 81];
for (let i = 0; i < expectedIds.length; i++) {
  assert(rTenX.sampled[i].id === expectedIds[i],
    `§10.1: stride selection: sampled[${i}].id === ${expectedIds[i]}`);
}

// ── §10.1  Determinism: identical inputs → identical outputs ─────────────────
const rTenX2 = sampleRecords(makeRecords(S * 10), { sampleSize: S });
assert(
  JSON.stringify(rTenX.sampled) === JSON.stringify(rTenX2.sampled),
  '§10.1: determinism: two calls with identical input produce identical sampled arrays'
);
assert(
  JSON.stringify(rTenX.samplingInfo) === JSON.stringify(rTenX2.samplingInfo),
  '§10.1: determinism: samplingInfo is identical across calls'
);

// ── §10.2  Single flat population: sampled is a flat array ───────────────────
assert(Array.isArray(rTenX.sampled), '§10.2: sampled is an array');
assert(rTenX.sampled.every(r => !Array.isArray(r) && typeof r === 'object'),
  '§10.2: sampled is a flat population of record objects (no nesting)');

// ── §10.3  BIBSS-002 diagnostic code available for caller ────────────────────
assert(DIAG.SAMPLING_APPLIED === 'BIBSS-002',
  '§10.3: DIAG.SAMPLING_APPLIED is BIBSS-002 (caller emits when samplingInfo.applied is true)');
