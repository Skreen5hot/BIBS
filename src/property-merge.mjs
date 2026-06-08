/**
 * Property-merge algorithm for object arrays (§8.5.3).
 */

import { childId } from "./ids.mjs";

/**
 * Merge an array of N non-null object elements into a single SchemaNode (§8.5.3).
 *
 * Key-absence is distinguished from null-valued presence:
 *   - absent key: no contribution to occurrences(k)
 *   - present with value null: counts toward occurrences(k) AND sets nullable:true
 *
 * @param {object[]} elements          non-null object elements
 * @param {string}   nodeId            RFC 6901 JSON Pointer ID for this merged node
 * @param {number}   requiredThreshold fraction >= this → required:true (§8.4)
 * @param {(values: unknown[], parentId: string) => import("./types.mjs").SchemaNode} inferValue
 *   Callback into the inference engine for nested objects/arrays and primitive arrays.
 *   Breaks the circular dependency between property-merge and the inference engine.
 * @returns {import("./types.mjs").SchemaNode}
 */
export function mergeObjectArray(elements, nodeId, requiredThreshold, inferValue) {
  const N = elements.length;

  // Step 1: union of all own keys across all N elements
  const allKeys = new Set();
  for (const elem of elements) {
    for (const k of Object.keys(elem)) {
      allKeys.add(k);
    }
  }

  const properties = [];

  for (const k of allKeys) {
    // Step 2a/d: collect values from elements where the key IS present.
    // Absence (Object.hasOwn returns false) does not contribute to occurrences.
    // Null-valued presence counts toward occurrences and marks the key nullable.
    const presentValues = [];
    let nullable = false;

    for (const elem of elements) {
      if (Object.hasOwn(elem, k)) {
        presentValues.push(elem[k]);
        if (elem[k] === null) nullable = true;
      }
    }

    const occurrences = presentValues.length;

    // Step 2f / §8.4: required-field threshold (N=0 guard prevents 0/0)
    const required = N === 0 ? false : (occurrences / N) >= requiredThreshold;

    // Step 2b: infer type via callback (all present values, including nulls, are passed)
    const target = inferValue(presentValues, childId(nodeId, k));

    // Step 2e: ensure nullable is set when any null value was observed for this key
    if (nullable) {
      target.nullable = true;
    }

    properties.push({
      name: k,
      target,
      required,
      occurrences,
      totalPopulation: N,
    });
  }

  return {
    id: nodeId,
    kind: "object",
    occurrences: N,
    properties,
  };
}
