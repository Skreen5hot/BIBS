/**
 * Type widening lattice for BIBSS primitive type resolution (§7.3, §8.3).
 */

/** Rank map: null=0, boolean=1, integer=2, number=3, string=4 */
const RANK = { null: 0, boolean: 1, integer: 2, number: 3, string: 4 };

/**
 * Resolve two primitive types using the widening lattice (§8.3).
 * null on either side sets the nullable side-channel and returns the other type.
 * @param {string} a
 * @param {string} b
 * @returns {{ type: string, nullable: boolean }}
 */
export function resolveTwo(a, b) {
  if (a === "null" && b === "null") return { type: "null", nullable: true };
  if (a === "null") return { type: b, nullable: true };
  if (b === "null") return { type: a, nullable: true };
  return { type: RANK[a] >= RANK[b] ? a : b, nullable: false };
}

/**
 * Left-fold resolveTwo over an array of primitive types, accumulating the nullable flag (§8.3).
 * @param {string[]} types  non-empty array of primitive type strings
 * @returns {{ type: string, nullable: boolean }}
 */
export function foldResolve(types) {
  let nullable = false;
  let type = types[0];
  if (type === "null") nullable = true;
  for (let i = 1; i < types.length; i++) {
    const r = resolveTwo(type, types[i]);
    if (r.nullable) nullable = true;
    type = r.type;
  }
  return { type, nullable };
}

/**
 * Integer detection per §7.3.
 * @param {unknown} v
 * @returns {boolean}
 */
export function isInteger(v) {
  return typeof v === "number" && Number.isFinite(v) && Number.isInteger(v);
}
