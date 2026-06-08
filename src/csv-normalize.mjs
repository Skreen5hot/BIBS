import Papa from "../vendor/papaparse.mjs";
import { DIAG, DEFAULT_CONFIG } from "./types.mjs";

const BOM = "\uFEFF";

/**
 * Detect input format per §6.3.
 * @param {string} input
 * @returns {"csv"|"json"}
 */
export function detectFormat(input) {
  const first = input.trimStart()[0];
  return first === "{" || first === "[" ? "json" : "csv";
}

/**
 * Normalize a CSV string into uniform records per §7.1.1 and §7.1.2.
 * Emits BIBSS-001 on size excess, BIBSS-003 on row mismatch, BIBSS-005 on parse failure.
 * @param {string} input  raw CSV string (may contain BOM)
 * @param {Partial<import('./types.mjs').InferConfig>} [config]
 * @returns {{ records: Array<Record<string,unknown>>|null, diagnostics: import('./types.mjs').Diagnostic[] }}
 */
export function normalizeCSV(input, config) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  /** @type {import('./types.mjs').Diagnostic[]} */
  const diagnostics = [];

  // BIBSS-001: byte-count warning (§6.1)
  const byteCount = new TextEncoder().encode(input).length;
  if (byteCount > cfg.maxSizeWarning) {
    diagnostics.push({
      level: "warning",
      code: DIAG.SIZE_WARNING,
      message: `Input size ${byteCount} bytes exceeds maxSizeWarning ${cfg.maxSizeWarning}`,
      context: { byteCount, maxSizeWarning: cfg.maxSizeWarning },
    });
  }

  // Strip BOM (§6.1)
  const stripped = input.startsWith(BOM) ? input.slice(1) : input;

  // Parse (§7.1.1)
  let result;
  try {
    result = Papa.parse(stripped, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
    });
  } catch (e) {
    diagnostics.push({
      level: "error",
      code: DIAG.CSV_PARSE_FAIL,
      message: String(e && e.message ? e.message : e),
    });
    return { records: null, diagnostics };
  }

  // BIBSS-005: non-recoverable parse errors → null.
  // FieldMismatch (TooFewFields/TooManyFields) is recoverable via BIBSS-003 row adjustment.
  // Delimiter/UndetectableDelimiter is recoverable: Papa Parse falls back to comma and
  // continues parsing — treating it as fatal would block BIBSS-003 mismatch detection
  // for inputs whose data rows lack commas (all fields in one column).
  const fatalErrors = (result.errors || []).filter(
    (e) => e.type !== "FieldMismatch" && e.type !== "Delimiter"
  );
  if (fatalErrors.length > 0) {
    for (const err of fatalErrors) {
      diagnostics.push({
        level: "error",
        code: DIAG.CSV_PARSE_FAIL,
        message: err.message,
        context: { type: err.type, code: err.code, row: err.row },
      });
    }
    return { records: null, diagnostics };
  }

  const headers = result.meta.fields || [];
  const rows = result.data;

  // Post-parse transforms + BIBSS-003 (§7.1.2)
  let mismatchEmitted = 0;
  const records = rows.map((row, i) => {
    const out = {};
    // Truncated extra fields (__parsed_extra) signals a too-long row
    let mismatch = Object.hasOwn(row, "__parsed_extra");

    for (const key of headers) {
      if (Object.hasOwn(row, key)) {
        let val = row[key];
        // (1) Trim strings
        if (typeof val === "string") val = val.trim();
        // (2) Empty string → null
        if (cfg.emptyStringAsNull && val === "") val = null;
        out[key] = val;
      } else {
        // Missing key → pad with null (BIBSS-003)
        out[key] = null;
        mismatch = true;
      }
    }

    if (mismatch && mismatchEmitted < 10) {
      diagnostics.push({
        level: "warning",
        code: DIAG.CSV_ROW_MISMATCH,
        message: `Row ${i} field count does not match header; adjusted to match`,
        context: { row: i },
      });
      mismatchEmitted++;
    }

    return out;
  });

  return { records, diagnostics };
}
