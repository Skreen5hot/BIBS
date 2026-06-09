import { serializeDist } from './type-distribution.mjs';

// Declaration order per §9.1 SchemaNode interface
const NODE_KEYS = ['id', 'kind', 'name', 'occurrences', 'properties', 'itemType', 'primitiveType', 'nullable', 'typeDistribution', 'members'];
// Declaration order per §9.1 SchemaEdge interface
const EDGE_KEYS = ['name', 'target', 'required', 'occurrences', 'totalPopulation'];

function serializeNode(node) {
  if (node === null) return null;
  const out = {};
  for (const key of NODE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
    const v = node[key];
    if (key === 'typeDistribution') {
      out[key] = serializeDist(v);
    } else if (key === 'properties') {
      out[key] = v.map(serializeEdge);
    } else if (key === 'itemType') {
      out[key] = v === null ? null : serializeNode(v);
    } else if (key === 'members') {
      out[key] = v.map(serializeNode);
    } else {
      out[key] = v;
    }
  }
  return out;
}

function serializeEdge(edge) {
  const out = {};
  for (const key of EDGE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(edge, key)) continue;
    out[key] = key === 'target' ? serializeNode(edge[key]) : edge[key];
  }
  return out;
}

export function toCismRaw(cism) {
  return {
    version: cism.version,
    generatedAt: cism.generatedAt,
    config: cism.config,
    root: serializeNode(cism.root),
  };
}
