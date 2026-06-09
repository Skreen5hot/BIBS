import { rootId, childId, arrayItemId } from './ids.mjs';
import { DEFAULT_CONFIG } from './types.mjs';
import { accumulateDist, serializeDist, classifyForDist } from './type-distribution.mjs';
import { foldResolve } from './primitive-resolve.mjs';
import { compositeKind, inferArrayItemType } from './array-infer.mjs';
import { buildCrossKindUnion } from './cross-kind-union.mjs';
import { mergeObjectArray } from './property-merge.mjs';

function buildInferValue(config, diagnostics) {
  function inferValue(values, nodeId) {
    const nullCount = values.filter(v => v === null).length;
    const nonNulls  = values.filter(v => v !== null);
    const hasNull   = nullCount > 0;
    if (nonNulls.length === 0) {
      const dist = {};
      for (const v of values) accumulateDist(dist, v);
      return { id: nodeId, kind: 'primitive', primitiveType: 'null', nullable: true, occurrences: values.length, typeDistribution: serializeDist(dist) };
    }
    const kindSet = new Set(nonNulls.map(compositeKind));
    if (kindSet.size === 1) {
      const kind = kindSet.values().next().value;
      if (kind === 'primitive') {
        const dist = {};
        for (const v of values) accumulateDist(dist, v);
        const { type: primitiveType, nullable } = foldResolve(values.map(classifyForDist));
        return { id: nodeId, kind: 'primitive', primitiveType, nullable, occurrences: values.length, typeDistribution: serializeDist(dist) };
      }
      if (kind === 'object') {
        const result = mergeObjectArray(nonNulls, nodeId, config.requiredThreshold, inferValue);
        if (hasNull) result.nullable = true;
        return result;
      }
      if (kind === 'array') {
        const inner = nonNulls.reduce((a, arr) => { a.push(...arr); return a; }, []);
        let itemType;
        if (inner.length === 0) {
          inferArrayItemType([], arrayItemId(nodeId), config.requiredThreshold, diagnostics);
          itemType = null;
        } else {
          const node = inferArrayItemType(inner, arrayItemId(nodeId), config.requiredThreshold, diagnostics);
          itemType = node !== null ? node : buildCrossKindUnion(inner, arrayItemId(nodeId), config.requiredThreshold, diagnostics);
        }
        return { id: nodeId, kind: 'array', itemType, nullable: hasNull, occurrences: values.length };
      }
    }
    const allForUnion = hasNull ? [...nonNulls, ...Array(nullCount).fill(null)] : nonNulls;
    return buildCrossKindUnion(allForUnion, nodeId, config.requiredThreshold, diagnostics);
  }
  return inferValue;
}

export function inferSchema(records, config, parentId) {
  config   = config   ?? DEFAULT_CONFIG;
  parentId = parentId ?? rootId();
  const diagnostics = [];
  const inferValue  = buildInferValue(config, diagnostics);
  const N = records.length;
  const allKeys = new Set();
  for (const record of records) for (const key of Object.keys(record)) allKeys.add(key);
  const properties = [];
  for (const key of allKeys) {
    const childNodeId = childId(parentId, key);
    let occurrences = 0;
    const values = [];
    for (const record of records) {
      if (Object.prototype.hasOwnProperty.call(record, key)) { occurrences++; values.push(record[key]); }
    }
    const required = N === 0 ? false : (occurrences / N) >= config.requiredThreshold;
    properties.push({ name: key, occurrences, totalPopulation: N, required, target: inferValue(values, childNodeId) });
  }
  return { id: parentId, kind: 'object', properties, occurrences: N, diagnostics };
}
