import { CISM_VERSION, DEFAULT_CONFIG, DIAG } from './types.mjs';
import { detectFormat, parseJson } from './json-normalize.mjs';
import { normalizeCSV } from './csv-normalize.mjs';
import { narrowRecords } from './csv-narrow.mjs';
import { sampleRecords } from './sampling.mjs';
import { inferSchema } from './inference-engine.mjs';
import { createAdapterRegistry } from './adapter-registry.mjs';
import { toJsonSchema } from './adapter-jsonschema.mjs';
import { toCismRaw } from './adapter-cism-raw.mjs';

const adapters = createAdapterRegistry();
adapters.register('jsonschema', toJsonSchema);
adapters.register('cism', toCismRaw);

function infer(input, config) {
  const diagnostics = [];
  try {
    let rawInput = input;
    if (typeof ArrayBuffer !== 'undefined' && input instanceof ArrayBuffer) {
      rawInput = new TextDecoder().decode(input);
    }

    const mergedConfig = { ...DEFAULT_CONFIG, ...(config || {}) };

    if (rawInput === '') {
      diagnostics.push({ level: 'info', code: DIAG.EMPTY_INPUT, message: 'Empty input: zero-length string provided' });
      return { cism: null, diagnostics };
    }

    const format = detectFormat(rawInput, mergedConfig.format);

    const byteCount = typeof rawInput === 'string' ? rawInput.length : rawInput.byteLength;
    if (byteCount > mergedConfig.maxSizeWarning) {
      diagnostics.push({
        level: 'warning',
        code: DIAG.SIZE_WARNING,
        message: `Input size (${byteCount} bytes) exceeds warning threshold (${mergedConfig.maxSizeWarning} bytes)`,
        context: { byteCount, limit: mergedConfig.maxSizeWarning },
      });
    }

    let records;
    let inputSource;

    if (format === 'json') {
      const trimmed = rawInput.trimStart();
      inputSource = trimmed.startsWith('[') ? 'json-array' : 'json-object';
      const jsonResult = parseJson(rawInput);
      for (const d of jsonResult.diagnostics) diagnostics.push(d);
      if (jsonResult.records === null) return { cism: null, diagnostics };
      records = jsonResult.records;
    } else {
      inputSource = 'csv';
      const csvResult = normalizeCSV(rawInput, { ...mergedConfig, maxSizeWarning: Infinity });
      for (const d of csvResult.diagnostics) {
        if (d.code !== DIAG.SIZE_WARNING) diagnostics.push(d);
      }
      if (csvResult.records === null) return { cism: null, diagnostics };
      records = narrowRecords(csvResult.records);
    }

    const { sampled, samplingInfo } = sampleRecords(records, mergedConfig);
    if (samplingInfo.applied) {
      diagnostics.push({
        level: 'info',
        code: DIAG.SAMPLING_APPLIED,
        message: `Sampling applied: ${samplingInfo.inputSize} records reduced to ${samplingInfo.sampleSize}`,
        context: samplingInfo,
      });
    }

    if (sampled.length === 0) {
      diagnostics.push({ level: 'info', code: DIAG.EMPTY_INPUT, message: 'Zero records: input produced no inferrable records' });
    }

    const rootNode = inferSchema(sampled, mergedConfig);
    if (rootNode && Array.isArray(rootNode.diagnostics)) {
      for (const d of rootNode.diagnostics) diagnostics.push(d);
    }

    const cism = {
      version: CISM_VERSION,
      generatedAt: new Date().toISOString(),
      config: mergedConfig,
      sampling: samplingInfo,
      root: rootNode,
      inputSource,
      inputHash: '',
    };

    return { cism, diagnostics };

  } catch (err) {
    diagnostics.push({ level: 'error', code: 'BIBSS-ERROR', message: err && err.message ? err.message : String(err) });
    return { cism: null, diagnostics };
  }
}

function project(cism, adapterName) {
  const adapter = adapters.get(adapterName);
  if (!adapter) throw new TypeError(`Unknown adapter: "${adapterName}"`);
  return adapter(cism);
}

export const BIBSS = { infer, project, adapters };
