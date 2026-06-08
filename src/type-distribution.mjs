/**
 * Type distribution accumulation utilities for §9.4 (typeDistribution).
 */

import { isInteger } from "./primitive-resolve.mjs";
import { PRIMITIVES } from "./types.mjs";

/**
 * Classify a value into a primitive type string for distribution tracking (§9.4).
 * @param {unknown} v
 * @returns {"null"|"boolean"|"integer"|"number"|"string"}
 */
export function classifyForDist(v) {
  if (v === null) return "null";
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "number") return isInteger(v) ? "integer" : "number";
  return "string";
}

/**
 * Increment dist[classifyForDist(v)] by 1. Mutates dist in place.
 * @param {Partial<Record<string,number>>} dist
 * @param {unknown} v
 */
export function accumulateDist(dist, v) {
  const key = classifyForDist(v);
  dist[key] = (dist[key] || 0) + 1;
}

/**
 * Merge two distributions by summing corresponding keys. Returns a new object.
 * @param {Partial<Record<string,number>>} d1
 * @param {Partial<Record<string,number>>} d2
 * @returns {Partial<Record<string,number>>}
 */
export function mergeDist(d1, d2) {
  const result = {};
  for (const key of PRIMITIVES) {
    const v = (d1[key] || 0) + (d2[key] || 0);
    if (v > 0) result[key] = v;
  }
  return result;
}

/**
 * Serialize distribution: only non-zero counts in lattice key order (§9.4).
 * @param {Partial<Record<string,number>>} dist
 * @returns {Partial<Record<string,number>>}
 */
export function serializeDist(dist) {
  const result = {};
  for (const key of PRIMITIVES) {
    if (dist[key] > 0) result[key] = dist[key];
  }
  return result;
}
