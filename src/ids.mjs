/**
 * RFC 6901 JSON Pointer ID utilities for CISM node identity (§9.2).
 */

/**
 * Escape a single JSON Pointer path segment per RFC 6901 §3.
 * Replacement order: ~ first (→ ~0), then / (→ ~1), preventing double-escaping.
 * @param {string} s  raw (unescaped) segment
 * @returns {string}
 */
export function escape(s) {
  return s.replace(/~/g, "~0").replace(/\//g, "~1");
}

/**
 * Return the root node ID.
 * @returns {"#"}
 */
export function rootId() {
  return "#";
}

/**
 * Return the ID for an object child property node.
 * @param {string} parent  parent node ID
 * @param {string} name    unescaped property name
 * @returns {string}
 */
export function childId(parent, name) {
  return parent + "/" + escape(name);
}

/**
 * Return the ID for an array item-type node.
 * @param {string} parent  parent array node ID
 * @returns {string}
 */
export function arrayItemId(parent) {
  return parent + "/[]";
}

/**
 * Return the ID for a union member node.
 * @param {string} parent  parent node ID
 * @param {number} i       zero-based member index
 * @returns {string}
 */
export function unionMemberId(parent, i) {
  return parent + "/|" + i;
}
