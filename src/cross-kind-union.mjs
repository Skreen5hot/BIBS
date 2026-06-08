/**
 * Cross-kind union detection and construction (§8.5.4, Rule 3).
 * Invoked when non-null array elements span >=2 composite kinds.
 */

import { foldResolve } from "./primitive-resolve.mjs";
import { mergeObjectArray } from "./property-merge.mjs";
import { inferArrayItemType, compositeKind, primitiveKind } from "./array-infer.mjs";
import { unionMemberId, arrayItemId } from "./ids.mjs";
import { DIAG } from "./types.mjs";

/**
 * Build a union SchemaNode for elements spanning multiple composite kinds (§8.5.4, Rule 3).
 * Null elements are excluded from kind-grouping; their presence sets nullable:true on the union.
 *
 * @param {unknown[]} elements  all array elements (may include nulls)
 * @param {string}    nodeId   RFC 6901 pointer for this union node
 * @param {number}    requiredThreshold  passed through to property-merge (§8.4)
 * @param {import("./types.mjs").Diagnostic[]} diagnostics
 * @returns {import("./types.mjs").SchemaNode}  union node: { kind:"union", members[], nullable }
 */
export function buildCrossKindUnion(elements, nodeId, requiredThreshold, diagnostics) {
  const nonNulls = elements.filter(v => v !== null);
  const hasNulls = nonNulls.length < elements.length;

  // Group non-null elements by composite kind (§8.5.1 Tier 1)
  const primitiveGroup = [];
  const objectGroup = [];
  const arrayGroup = [];
  for (const v of nonNulls) {
    const ck = compositeKind(v);
    if (ck === "primitive") primitiveGroup.push(v);
    else if (ck === "object") objectGroup.push(v);
    else arrayGroup.push(v);
  }

  const members = [];
  let idx = 0;

  // Primitive group → foldResolve lattice + typeDistribution accumulation (M05)
  if (primitiveGroup.length > 0) {
    const typeDistribution = {};
    const primTypes = primitiveGroup.map(v => {
      const pk = primitiveKind(v);
      typeDistribution[pk] = (typeDistribution[pk] || 0) + 1;
      return pk;
    });
    const { type: primitiveType, nullable } = foldResolve(primTypes);
    members.push({
      id: unionMemberId(nodeId, idx++),
      kind: "primitive",
      primitiveType,
      nullable,
      occurrences: primitiveGroup.length,
      typeDistribution,
    });
  }

  // Object group → property-merge (M06), with BIBSS-008 guard
  if (objectGroup.length > 0) {
    const allKeys = new Set();
    for (const obj of objectGroup) {
      for (const k of Object.keys(obj)) allKeys.add(k);
    }
    if (allKeys.size > 100) {
      diagnostics.push({
        level: "warning",
        code: DIAG.HETEROGENEOUS_KEYS,
        message: `Total distinct property keys across object elements (${allKeys.size}) exceeds 100.`,
        context: { nodeId, keyCount: allKeys.size },
      });
    }

    const objMemberId = unionMemberId(nodeId, idx);
    const inferValue = (values, childNodeId) => {
      const node = inferArrayItemType(values, childNodeId, requiredThreshold, diagnostics);
      if (node !== null) return node;
      return buildCrossKindUnion(values, childNodeId, requiredThreshold, diagnostics);
    };
    const merged = mergeObjectArray(objectGroup, objMemberId, requiredThreshold, inferValue);
    members.push(merged);
    idx++;
  }

  // Array group → collect inner elements across sub-arrays, infer via M07 (§8.5.2 Rule 2 arrays)
  if (arrayGroup.length > 0) {
    const arrMemberId = unionMemberId(nodeId, idx);
    const innerElements = arrayGroup.flatMap(sub => sub);
    const innerItemNodeId = arrayItemId(arrMemberId);
    let innerItemType = inferArrayItemType(innerElements, innerItemNodeId, requiredThreshold, diagnostics);
    if (innerItemType === null && innerElements.length > 0) {
      // Rule 3 in inner context — recurse
      innerItemType = buildCrossKindUnion(innerElements, innerItemNodeId, requiredThreshold, diagnostics);
    }
    members.push({
      id: arrMemberId,
      kind: "array",
      itemType: innerItemType,
      nullable: false,
      occurrences: arrayGroup.length,
    });
    idx++;
  }

  return {
    id: nodeId,
    kind: "union",
    members,
    nullable: hasNulls,
    occurrences: elements.length,
  };
}
