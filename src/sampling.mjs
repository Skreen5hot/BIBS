/**
 * Deterministic strided sampling for BIBSS (§10.1, §10.2, §10.3).
 */

/**
 * Sample records deterministically using strided selection.
 * @param {Array<Record<string,unknown>>} records
 * @param {{sampleSize: number}} config
 * @returns {{sampled: Array<Record<string,unknown>>, samplingInfo: object}}
 */
export function sampleRecords(records, config) {
  const { sampleSize } = config;

  if (records.length <= sampleSize) {
    return { sampled: records, samplingInfo: { applied: false } };
  }

  const halfSize = Math.floor(sampleSize / 2);
  const head = records.slice(0, halfSize);
  const remainder = records.slice(halfSize);
  const stride = Math.floor(remainder.length / (sampleSize / 2));

  const tail = [];
  for (let i = 0; i < remainder.length; i += stride) {
    tail.push(remainder[i]);
  }

  return {
    sampled: [...head, ...tail],
    samplingInfo: {
      applied: true,
      inputSize: records.length,
      sampleSize,
      strategy: 'strided',
    },
  };
}
