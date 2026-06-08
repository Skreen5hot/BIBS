import { DIAG } from './types.mjs';

/**
 * Detect input format from raw string and optional config override (§6.3).
 * @param {string} raw
 * @param {"csv"|"json"|undefined} [formatOverride]
 * @returns {"json"|"csv"}
 */
export function detectFormat(raw, formatOverride) {
  if (formatOverride === 'json' || formatOverride === 'csv') return formatOverride;
  const first = raw.trimStart()[0];
  return (first === '{' || first === '[') ? 'json' : 'csv';
}

/**
 * Classify a numeric value as integer per §7.3.
 * typeof v === 'number' && Number.isFinite(v) && Number.isInteger(v)
 * @param {unknown} v
 * @returns {boolean}
 */
export function isInteger(v) {
  return typeof v === 'number' && Number.isFinite(v) && Number.isInteger(v);
}

/**
 * Normalize a parsed JSON value to Array<Record<string, unknown>> per §7.2.
 * - Single object → [object]
 * - Array of objects → used directly
 * - Array of primitives → each wrapped {_value: v}
 * - Nested structures preserved for inference engine
 * @param {unknown} parsed
 * @returns {Array<Record<string, unknown>>}
 */
export function normalizeJsonValue(parsed) {
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return [];
    const allPlainObjects = parsed.every(
      el => el !== null && typeof el === 'object' && !Array.isArray(el)
    );
    if (allPlainObjects) return parsed;
    return parsed.map(el =>
      (el !== null && typeof el === 'object' && !Array.isArray(el))
        ? el
        : { _value: el }
    );
  }
  if (parsed !== null && typeof parsed === 'object') return [parsed];
  return [{ _value: parsed }];
}

/**
 * Parse and normalize a JSON input string.
 * Runs BIBSS-009 pre-scan before JSON.parse; on SyntaxError emits BIBSS-004 and returns records:null.
 * @param {string} raw
 * @returns {{ records: Array<Record<string, unknown>>|null, diagnostics: import('./types.mjs').Diagnostic[] }}
 */
export function parseJson(raw) {
  const diagnostics = [];
  if (/[0-9]{16,}/.test(raw)) {
    diagnostics.push({
      level: 'warning',
      code: DIAG.PRECISION_LOSS,
      message: 'Input contains integer sequences of 16+ digits; precision may be lost during JSON.parse.',
    });
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    diagnostics.push({
      level: 'error',
      code: DIAG.JSON_PARSE_FAIL,
      message: e instanceof Error ? e.message : String(e),
    });
    return { records: null, diagnostics };
  }
  return { records: normalizeJsonValue(parsed), diagnostics };
}
