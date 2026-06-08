/**
 * CSV type-narrowing pass per §7.1.3.
 * First-match-wins over every non-null string value in post-parse records.
 */

const BOOL_RE = /^(true|false)$/i;
const INT_RE = /^-?(?:0|[1-9][0-9]*)$/;
const NUM_RE = /^-?[0-9]+\.[0-9]+$/;

/**
 * Narrow a single post-parse value per §7.1.3 first-match-wins rules.
 * @param {string|null} value
 * @returns {null|boolean|number|string}
 */
export function narrowValue(value) {
  // Rule 1: Null
  if (value === null) return null;
  // Rule 2: Boolean — case-insensitive (C-011)
  if (BOOL_RE.test(value)) return value.toLowerCase() === "true";
  // Rule 3: Integer — no leading zeros, within MAX_SAFE_INTEGER
  if (INT_RE.test(value)) {
    const n = Number(value);
    if (n <= Number.MAX_SAFE_INTEGER) return n;
    return value;
  }
  // Rule 4: Number — plain decimal only (no scientific notation per C-012)
  if (NUM_RE.test(value)) {
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  }
  // Rule 5: String — all other values
  return value;
}

/**
 * Apply §7.1.3 type-narrowing to all values in post-parse records.
 * @param {Array<Record<string, string|null>>} records
 * @returns {Array<Record<string, unknown>>}
 */
export function narrowRecords(records) {
  return records.map((record) => {
    const out = {};
    for (const key of Object.keys(record)) {
      out[key] = narrowValue(record[key]);
    }
    return out;
  });
}
