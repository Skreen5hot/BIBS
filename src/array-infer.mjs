/**
 * Array inference module (§8.5.1, §8.5.2).
 * Three-tier element classification + inference Rules 1, 2, 4.
 * Rule 3 (union / multiple composite kinds) is delegated to M08.
 */

import { foldResolve, isInteger } from "./primitive-resolve.mjs";
import { mergeObjectArray } from "./property-merge.mjs";
import { arrayItemId } from "./ids.mjs";
import { DIAG } from "./types.mjs";

/**
 * Tier 1 composite kind classification (§8.5.1).
 * @param {unknown} v
 * @returns {"null"|"array"|"object"|"primitive"}
 */
export function compositeKind(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "object") return "object";
  return "primitive";
}

/**
 * Tier 2 primitive kind within composite kind "primitive" (§8.5.1).
 * @param {unknown} v  must be a primitive (non-null, non-object, non-array)
 * @returns {"boolean"|"integer"|"number"|"string"}
 */
export function primitiveKind(v) {
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "number") return isInteger(v) ? "integer" : "number";
  return "string";
}

/**
 * Infer the itemType SchemaNode for an array's elements (§8.5.2).
 * Rules 1, 2, 4 are handled here.
 * Rule 3 (non-null elements span multiple composite kinds) returns null;
 * the caller (M08) is responsible for building the union node.
 *
 * @param {unknown[]} elements
 * @param {string}    nodeId            RFC 6901 pointer for the produced node
 * @param {number}    requiredThreshold passed through to property-merge (§8.4)
 * @param {import("./types.mjs").Diagnostic[]} diagnostics
 * @returns {import("./types.mjs").SchemaNode|null}  null = Rule 3 or empty-array (Rule 4)
 */
export function inferArrayItemType(elements, nodeId, requiredThreshold, diagnostics) {
  // Rule 4: empty array → null itemType + BIBSS-007
  if (elements.length === 0) {
    diagnostics.push({
      level: "warning",
      code: DIAG.EMPTY_INPUT,
      message: "Array has zero elements; itemType cannot be inferred.",
      context: { nodeId },
    });
    return null;
  }

  const nulls    = elements.filter(v => v === null);
  const nonNulls = elements.filter(v => v !== null);
  const hasNulls = nulls.length > 0;

  // Rule 1: all elements are null
  if (nonNulls.length === 0) {
    return {
      id: nodeId,
      kind: "primitive",
      primitiveType: "null",
      nullable: true,
      occurrences: elements.length,
      typeDistribution: { null: nulls.length },
    };
  }

  // Determine composite kinds of non-null elements
  const kindsPresent = new Set(nonNulls.map(compositeKind));

  // Rule 3: multiple composite kinds → delegate to M08
  if (kindsPresent.size > 1) {
    return null;
  }

  // Rule 2: single composite kind (+ optional nulls)
  const [kind] = kindsPresent;

  if (kind === "primitive") {
    const typeDistribution = {};
    if (hasNulls) typeDistribution["null"] = nulls.length;

    const primTypes = nonNulls.map(v => {
      const pk = primitiveKind(v);
      typeDistribution[pk] = (typeDistribution[pk] || 0) + 1;
      return pk;
    });

    const allTypes = hasNulls ? [...primTypes, "null"] : primTypes;
    const { type: primitiveType, nullable } = foldResolve(allTypes);

    return {
      id: nodeId,
      kind: "primitive",
      primitiveType,
      nullable,
      occurrences: elements.length,
      typeDistribution,
    };
  }

  if (kind === "object") {
    const inferValue = (values, childNodeId) => {
      const node = inferArrayItemType(values, childNodeId, requiredThreshold, diagnostics);
      if (node !== null) return node;
      // Rule 3 in nested context: M08 not yet available; return null-type placeholder
      return {
        id: childNodeId,
        kind: "primitive",
        primitiveType: "null",
        nullable: true,
        occurrences: values.length,
        typeDistribution: {},
      };
    };

    const merged = mergeObjectArray(nonNulls, nodeId, requiredThreshold, inferValue);
    if (hasNulls) merged.nullable = true;
    return merged;
  }

  // kind === "array": recurse, collecting inner elements across all sub-arrays (§8.5.2 Rule 2)
  const innerElements = nonNulls.flatMap(sub => sub);
  const itemId = arrayItemId(nodeId);
  const innerItemType = inferArrayItemType(innerElements, itemId, requiredThreshold, diagnostics);

  return {
    id: nodeId,
    kind: "array",
    itemType: innerItemType,
    nullable: hasNulls,
    occurrences: elements.length,
  };
}
