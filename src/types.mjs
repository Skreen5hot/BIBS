/**
 * BIBSS type definitions, constants, and defaults.
 * Covers §8.2 (Primitive), §9.1 (CISM structures), §12.1 (diagnostic codes), §13 (InferConfig).
 */

/** @type {"1.3"} CISM version constant (§9.1). */
export const CISM_VERSION = "1.3";

/**
 * Primitive type enumeration (§8.2).
 * Ordered by the widening lattice: null < boolean < integer < number < string.
 * @typedef {"string"|"number"|"integer"|"boolean"|"null"} Primitive
 */
export const PRIMITIVES = /** @type {["null","boolean","integer","number","string"]} */ (
  ["null", "boolean", "integer", "number", "string"]
);

/**
 * InferConfig defaults (§13).
 * @type {InferConfig}
 */
export const DEFAULT_CONFIG = {
  requiredThreshold: 1.0,
  emptyStringAsNull: true,
  sampleSize: 2000,
  maxSizeWarning: 10485760,
  format: undefined,
};

/** Diagnostic code constants (§12.1). */
export const DIAG = Object.freeze({
  SIZE_WARNING:       "BIBSS-001",
  SAMPLING_APPLIED:   "BIBSS-002",
  CSV_ROW_MISMATCH:   "BIBSS-003",
  JSON_PARSE_FAIL:    "BIBSS-004",
  CSV_PARSE_FAIL:     "BIBSS-005",
  KEY_COLLISION:      "BIBSS-006",
  EMPTY_INPUT:        "BIBSS-007",
  HETEROGENEOUS_KEYS: "BIBSS-008",
  PRECISION_LOSS:     "BIBSS-009",
});

/**
 * @typedef {Object} CISMRoot
 * @property {"1.3"} version
 * @property {string} generatedAt  ISO 8601 timestamp
 * @property {InferConfig} config
 * @property {SchemaNode} root
 * @property {Map<string,SchemaNode>} nodeIndex  omitted from serialization
 */

/**
 * @typedef {Object} SchemaNode
 * @property {string} id  RFC 6901 JSON Pointer path
 * @property {"object"|"array"|"primitive"|"union"} kind
 * @property {string} [name]
 * @property {number} occurrences
 * @property {SchemaEdge[]} [properties]  kind=object
 * @property {SchemaNode|null} [itemType]  kind=array
 * @property {Primitive} [primitiveType]  kind=primitive
 * @property {boolean} [nullable]  kind=primitive or union
 * @property {Partial<Record<Primitive,number>>} [typeDistribution]  kind=primitive
 * @property {SchemaNode[]} [members]  kind=union, max 3
 */

/**
 * @typedef {Object} SchemaEdge
 * @property {string} name  unescaped property name
 * @property {SchemaNode} target
 * @property {boolean} required
 * @property {number} occurrences
 * @property {number} totalPopulation
 */

/**
 * @typedef {Object} InferConfig
 * @property {number} requiredThreshold  default 1.0
 * @property {boolean} emptyStringAsNull  default true
 * @property {number} sampleSize  default 2000
 * @property {number} maxSizeWarning  default 10485760
 * @property {"csv"|"json"|undefined} [format]  default undefined
 */

/**
 * @typedef {Object} InferResult
 * @property {CISMRoot|null} cism
 * @property {Diagnostic[]} diagnostics
 */

/**
 * @typedef {Object} Diagnostic
 * @property {"info"|"warning"|"error"} level
 * @property {string} code
 * @property {string} message
 * @property {Record<string,unknown>} [context]
 */

/**
 * @typedef {Object} OutputAdapter
 * @property {string} name
 * @property {function(CISMRoot): unknown} project
 */

/**
 * @typedef {Object} AdapterRegistry
 * @property {function(OutputAdapter): void} register
 * @property {function(string): OutputAdapter|undefined} get
 * @property {function(): string[]} names
 */
