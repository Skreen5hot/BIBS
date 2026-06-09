// M14 test suite
// Spec coverage: §11.2 (Raw CISM Adapter — identity adapter, nodeIndex omitted)
//                §9.3 (Serialization — declaration order, typeDistribution lattice order, zero-count omission)
//                §17.1 (Determinism — byte-identical output excluding generatedAt on same input)
import { assert } from './_assert.mjs';
import { toCismRaw } from '../src/adapter-cism-raw.mjs';
import { inferSchema } from '../src/inference-engine.mjs';
import { CISM_VERSION, DEFAULT_CONFIG } from '../src/types.mjs';

function makeCism(records, generatedAt = '2026-02-28T00:00:00.000Z') {
  return {
    version: CISM_VERSION,
    generatedAt,
    config: DEFAULT_CONFIG,
    root: inferSchema(records, DEFAULT_CONFIG),
  };
}

// ── §11.2: identity adapter emits exactly 4 top-level fields ─────────────────
{
  const raw = toCismRaw(makeCism([{ id: 1, name: 'Alice' }]));
  assert(Object.prototype.hasOwnProperty.call(raw, 'version'),     '§11.2: version present');
  assert(Object.prototype.hasOwnProperty.call(raw, 'generatedAt'), '§11.2: generatedAt present');
  assert(Object.prototype.hasOwnProperty.call(raw, 'config'),      '§11.2: config present');
  assert(Object.prototype.hasOwnProperty.call(raw, 'root'),        '§11.2: root present');
  assert(!Object.prototype.hasOwnProperty.call(raw, 'nodeIndex'),  '§11.2: nodeIndex omitted');
  assert(Object.keys(raw).length === 4,                             '§11.2: exactly 4 top-level keys');
}

// ── §11.2 / §9.3: nodeIndex omitted even when present on input cism ───────────
{
  const cism = {
    version: CISM_VERSION, generatedAt: '2026-02-28T00:00:00.000Z',
    config: DEFAULT_CONFIG,
    root: { id: '#', kind: 'object', occurrences: 0, properties: [] },
    nodeIndex: new Map([['#', { id: '#', kind: 'object', occurrences: 0, properties: [] }]]),
  };
  const raw = toCismRaw(cism);
  assert(!Object.prototype.hasOwnProperty.call(raw, 'nodeIndex'), '§9.3: nodeIndex omitted from output');
  assert(Object.keys(raw).length === 4, '§9.3: still exactly 4 keys when nodeIndex in input');
}

// ── §9.3: top-level declaration order: version, generatedAt, config, root ─────
{
  const raw = toCismRaw(makeCism([{ x: 1 }]));
  const keys = Object.keys(raw);
  assert(keys[0] === 'version',     '§9.3: keys[0] = version');
  assert(keys[1] === 'generatedAt', '§9.3: keys[1] = generatedAt');
  assert(keys[2] === 'config',      '§9.3: keys[2] = config');
  assert(keys[3] === 'root',        '§9.3: keys[3] = root');
}

// ── §9.3: version and generatedAt values preserved verbatim ──────────────────
{
  const ts = '2026-02-28T12:34:56.789Z';
  const raw = toCismRaw(makeCism([{ a: 1 }], ts));
  assert(raw.version === CISM_VERSION, '§9.3: version = CISM_VERSION ("1.3")');
  assert(raw.generatedAt === ts,       '§9.3: generatedAt preserved verbatim');
}

// ── §9.3: config reference preserved ─────────────────────────────────────────
{
  const cism = makeCism([{ a: 1 }]);
  const raw = toCismRaw(cism);
  assert(raw.config === DEFAULT_CONFIG, '§9.3: config reference preserved');
}

// ── §9.3: SchemaNode key declaration order — object root node ─────────────────
// id, kind, [name], occurrences, properties
{
  const raw = toCismRaw(makeCism([{ score: 1.5 }]));
  const rootKeys = Object.keys(raw.root);
  const idIdx    = rootKeys.indexOf('id');
  const kindIdx  = rootKeys.indexOf('kind');
  const occIdx   = rootKeys.indexOf('occurrences');
  const propsIdx = rootKeys.indexOf('properties');
  assert(idIdx >= 0,          '§9.3: root node has id');
  assert(kindIdx > idIdx,     '§9.3: kind after id');
  assert(occIdx > kindIdx,    '§9.3: occurrences after kind');
  assert(propsIdx > occIdx,   '§9.3: properties after occurrences');
}

// ── §9.3: SchemaNode key declaration order — primitive node ──────────────────
// id, kind, occurrences, primitiveType, [nullable], [typeDistribution]
{
  const raw = toCismRaw(makeCism([{ n: 1 }, { n: 2 }]));
  const nEdge = raw.root.properties.find(p => p.name === 'n');
  const nk = Object.keys(nEdge.target);
  assert(nk.indexOf('id') < nk.indexOf('kind'),              '§9.3: prim: id before kind');
  assert(nk.indexOf('kind') < nk.indexOf('occurrences'),     '§9.3: prim: kind before occurrences');
  assert(nk.indexOf('occurrences') < nk.indexOf('primitiveType'), '§9.3: prim: occurrences before primitiveType');
}

// ── §9.3: nullable appears after primitiveType, typeDistribution after nullable ─
{
  const raw = toCismRaw(makeCism([{ x: 1 }, { x: null }, { x: 2 }]));
  const xEdge = raw.root.properties.find(p => p.name === 'x');
  const nk = Object.keys(xEdge.target);
  const ptIdx       = nk.indexOf('primitiveType');
  const nullableIdx = nk.indexOf('nullable');
  const distIdx     = nk.indexOf('typeDistribution');
  assert(ptIdx >= 0,               '§9.3: primitiveType present on nullable node');
  assert(nullableIdx > ptIdx,      '§9.3: nullable after primitiveType');
  assert(distIdx > nullableIdx,    '§9.3: typeDistribution after nullable');
}

// ── §9.3: SchemaEdge key declaration order ────────────────────────────────────
// name, target, required, occurrences, totalPopulation
{
  const raw = toCismRaw(makeCism([{ id: 1, label: 'x' }]));
  const edge = raw.root.properties[0];
  const keys = Object.keys(edge);
  assert(keys[0] === 'name',            '§9.3: edge key[0] = name');
  assert(keys[1] === 'target',          '§9.3: edge key[1] = target');
  assert(keys[2] === 'required',        '§9.3: edge key[2] = required');
  assert(keys[3] === 'occurrences',     '§9.3: edge key[3] = occurrences');
  assert(keys[4] === 'totalPopulation', '§9.3: edge key[4] = totalPopulation');
}

// ── §9.3 / §9.4 Appendix B: typeDistribution — lattice order, zero-count omitted
// Spec §9.4 reference example: 100-row column: 95 integer, 3 string, 2 null
// Expected: { null:2, integer:95, string:3 } — boolean and number absent
{
  const records = [];
  for (let i = 0; i < 95; i++) records.push({ col: i });
  for (let i = 0; i < 3;  i++) records.push({ col: 'err' });
  for (let i = 0; i < 2;  i++) records.push({ col: null });
  const raw = toCismRaw(makeCism(records));
  const colEdge = raw.root.properties.find(p => p.name === 'col');
  assert(colEdge !== undefined,                     '§9.3/§9.4: col property present');
  const dist = colEdge.target.typeDistribution;
  assert(dist !== undefined,                        '§9.3/§9.4: typeDistribution present');
  const dk = Object.keys(dist);
  assert(dk[0] === 'null',                          '§9.3/§9.4: typeDistribution key[0] = null (lattice order)');
  assert(dk[1] === 'integer',                       '§9.3/§9.4: typeDistribution key[1] = integer');
  assert(dk[2] === 'string',                        '§9.3/§9.4: typeDistribution key[2] = string');
  assert(dk.length === 3,                           '§9.3/§9.4: exactly 3 non-zero keys (boolean, number omitted)');
  assert(dist.null    === 2,                        '§9.3/§9.4: null count = 2');
  assert(dist.integer === 95,                       '§9.3/§9.4: integer count = 95');
  assert(dist.string  === 3,                        '§9.3/§9.4: string count = 3');
  assert(colEdge.target.primitiveType === 'string', '§9.3/§9.4: primitiveType = string (integer+string+null → string)');
  assert(colEdge.target.nullable === true,          '§9.3/§9.4: nullable = true');
}

// ── §9.3: typeDistribution full lattice order when all 5 types present ────────
{
  const node = {
    id: '#/x', kind: 'primitive', occurrences: 5,
    primitiveType: 'string', nullable: true,
    typeDistribution: { string: 1, boolean: 1, integer: 1, number: 1, null: 1 },
  };
  const cism = { version: CISM_VERSION, generatedAt: '2026-02-28T00:00:00.000Z', config: DEFAULT_CONFIG, root: node };
  const raw = toCismRaw(cism);
  const keys = Object.keys(raw.root.typeDistribution);
  assert(keys[0] === 'null',    '§9.3: full lattice order[0] = null');
  assert(keys[1] === 'boolean', '§9.3: full lattice order[1] = boolean');
  assert(keys[2] === 'integer', '§9.3: full lattice order[2] = integer');
  assert(keys[3] === 'number',  '§9.3: full lattice order[3] = number');
  assert(keys[4] === 'string',  '§9.3: full lattice order[4] = string');
}

// ── §9.3: zero-count typeDistribution keys omitted ───────────────────────────
{
  const node = {
    id: '#/x', kind: 'primitive', occurrences: 3,
    primitiveType: 'integer', nullable: false,
    typeDistribution: { integer: 3, boolean: 0, string: 0 },
  };
  const cism = { version: CISM_VERSION, generatedAt: '2026-02-28T00:00:00.000Z', config: DEFAULT_CONFIG, root: node };
  const raw = toCismRaw(cism);
  const dist = raw.root.typeDistribution;
  assert(Object.keys(dist).length === 1, '§9.3: zero-count keys omitted');
  assert(dist.integer === 3,             '§9.3: non-zero count preserved');
  assert(!Object.prototype.hasOwnProperty.call(dist, 'boolean'), '§9.3: zero boolean omitted');
  assert(!Object.prototype.hasOwnProperty.call(dist, 'string'),  '§9.3: zero string omitted');
}

// ── §9.3: array node — itemType serialized recursively ───────────────────────
{
  const raw = toCismRaw(makeCism([{ tags: ['a', 'b'] }]));
  const tagsEdge = raw.root.properties.find(p => p.name === 'tags');
  assert(tagsEdge !== undefined,                                  '§9.3: tags edge present');
  assert(tagsEdge.target.kind === 'array',                        '§9.3: tags kind = array');
  assert(tagsEdge.target.itemType !== null,                       '§9.3: tags itemType not null');
  assert(tagsEdge.target.itemType.kind === 'primitive',           '§9.3: tags itemType.kind = primitive');
  assert(tagsEdge.target.itemType.primitiveType === 'string',     '§9.3: tags itemType.primitiveType = string');
  // itemType key order
  const itKeys = Object.keys(tagsEdge.target.itemType);
  assert(itKeys.indexOf('id') < itKeys.indexOf('kind'),           '§9.3: itemType: id before kind');
  assert(itKeys.indexOf('kind') < itKeys.indexOf('occurrences'),  '§9.3: itemType: kind before occurrences');
}

// ── §9.3: empty array — itemType=null preserved ──────────────────────────────
{
  const raw = toCismRaw(makeCism([{ items: [] }]));
  const itemsEdge = raw.root.properties.find(p => p.name === 'items');
  assert(itemsEdge !== undefined,               '§9.3: items edge present');
  assert(itemsEdge.target.kind === 'array',     '§9.3: items kind = array');
  assert(itemsEdge.target.itemType === null,    '§9.3: empty array itemType = null');
}

// ── §9.3: nested object — recursively serialized with correct key order ───────
{
  const raw = toCismRaw(makeCism([{ address: { city: 'NYC', zip: '10001' } }]));
  const addrEdge = raw.root.properties.find(p => p.name === 'address');
  assert(addrEdge !== undefined,            '§9.3: address edge present');
  assert(addrEdge.target.kind === 'object', '§9.3: address kind = object');
  const ak = Object.keys(addrEdge.target);
  assert(ak[0] === 'id',   '§9.3: nested id first');
  assert(ak[1] === 'kind', '§9.3: nested kind second');
  const cityEdge = addrEdge.target.properties.find(p => p.name === 'city');
  assert(cityEdge !== undefined,                    '§9.3: city property present in nested object');
  assert(cityEdge.target.id === '#/address/city',   '§9.3: nested id path correct');
}

// ── §11.2: toCismRaw does not mutate input cism ───────────────────────────────
{
  const cism = makeCism([{ x: 1 }]);
  const rootRef = cism.root;
  const versionBefore = cism.version;
  toCismRaw(cism);
  assert(cism.version === versionBefore, '§11.2: cism.version not mutated');
  assert(cism.root === rootRef,          '§11.2: cism.root reference not mutated');
}

// ── §17.1: Determinism — same input twice → byte-identical excluding generatedAt
{
  const records = [
    { id: 1, name: 'Alice', active: true },
    { id: 2, name: 'Bob',   active: false },
  ];
  const cism1 = { version: CISM_VERSION, generatedAt: '2026-01-01T00:00:00.000Z', config: DEFAULT_CONFIG, root: inferSchema(records, DEFAULT_CONFIG) };
  const cism2 = { version: CISM_VERSION, generatedAt: '2026-06-08T12:30:00.000Z', config: DEFAULT_CONFIG, root: inferSchema(records, DEFAULT_CONFIG) };
  const raw1 = toCismRaw(cism1);
  const raw2 = toCismRaw(cism2);
  const { generatedAt: _t1, ...rest1 } = raw1;
  const { generatedAt: _t2, ...rest2 } = raw2;
  assert(
    JSON.stringify(rest1) === JSON.stringify(rest2),
    '§17.1: determinism: byte-identical output excluding generatedAt on same input'
  );
}

// ── §17.1: Determinism — complex input (arrays, nullable, typeDistribution) ───
{
  const records = [
    { id: 1, tags: ['a', 'b'], score: 9.5 },
    { id: 2, tags: ['c'],      score: null },
    { id: 3,                   score: 7.0 },
  ];
  const cism1 = { version: CISM_VERSION, generatedAt: '2026-01-01T00:00:00.000Z', config: DEFAULT_CONFIG, root: inferSchema(records, DEFAULT_CONFIG) };
  const cism2 = { version: CISM_VERSION, generatedAt: '2026-12-31T23:59:59.999Z', config: DEFAULT_CONFIG, root: inferSchema(records, DEFAULT_CONFIG) };
  const raw1 = toCismRaw(cism1);
  const raw2 = toCismRaw(cism2);
  const { generatedAt: _t1, ...rest1 } = raw1;
  const { generatedAt: _t2, ...rest2 } = raw2;
  assert(
    JSON.stringify(rest1) === JSON.stringify(rest2),
    '§17.1: determinism: complex input (arrays, nullable, typeDistribution) byte-identical excluding generatedAt'
  );
}
