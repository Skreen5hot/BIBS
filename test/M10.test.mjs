// M10 test suite
// Spec coverage: §8.1, §8.4, §8.6
// §17.3 item 4 (no all-object union), §17.3 item 5 (no all-primitive union)
import { assert } from './_assert.mjs';
import { inferSchema } from '../src/inference-engine.mjs';
import { DEFAULT_CONFIG, DIAG } from '../src/types.mjs';

// ── §8.6: N=0 empty records ──────────────────────────────────────────────────
{
  const r = inferSchema([], DEFAULT_CONFIG);
  assert(r.kind === 'object',       '§8.6: N=0 → object node');
  assert(r.id   === '#',            '§8.6: N=0 → id = #');
  assert(r.properties.length === 0, '§8.6: N=0 → no properties');
  assert(r.occurrences === 0,       '§8.6: N=0 → occurrences = 0');
}

// ── §8.6: All-null property ───────────────────────────────────────────────────
{
  const r = inferSchema([{x:null},{x:null},{x:null}], DEFAULT_CONFIG);
  const xP = r.properties.find(p => p.name === 'x');
  assert(xP !== undefined,                         '§8.6: all-null: x present');
  assert(xP.target.kind === 'primitive',           '§8.6: all-null: kind=primitive');
  assert(xP.target.primitiveType === 'null',       '§8.6: all-null: primitiveType=null');
  assert(xP.target.nullable === true,              '§8.6: all-null: nullable=true');
  assert(xP.target.typeDistribution['null'] === 3, '§8.6: all-null: typeDistribution null=3');
  assert(xP.required === true,                     '§8.6: all-null: required (3/3)');
}

// ── §8.6: Single record → all properties required ────────────────────────────
{
  const r = inferSchema([{a:1,b:'x'}], DEFAULT_CONFIG);
  assert(r.occurrences === 1, '§8.6: single record occurrences=1');
  for (const p of r.properties) assert(p.required === true, `§8.6: single record: ${p.name} required`);
}

// ── §8.6: BIBSS-007 — zero-element array property ────────────────────────────
{
  const r = inferSchema([{items:[]}], DEFAULT_CONFIG);
  const iP = r.properties.find(p => p.name === 'items');
  assert(iP !== undefined,                                       '§8.6: BIBSS-007: items present');
  assert(iP.target.kind === 'array',                            '§8.6: BIBSS-007: kind=array');
  assert(iP.target.itemType === null,                           '§8.6: BIBSS-007: itemType=null');
  assert(r.diagnostics.some(d => d.code === DIAG.EMPTY_INPUT),  '§8.6: BIBSS-007: diagnostic emitted');
}

// ── §8.4: N=0 guard — no 0/0 division ────────────────────────────────────────
{
  const r = inferSchema([], DEFAULT_CONFIG);
  assert(r.occurrences === 0,       '§8.4: N=0 guard: occurrences=0');
  assert(r.properties.length === 0, '§8.4: N=0 guard: no properties');
}

// ── §8.4: Required threshold 1.0 — all present ───────────────────────────────
{
  const r = inferSchema([{id:1,name:'A'},{id:2,name:'B'},{id:3,name:'C'}], DEFAULT_CONFIG);
  const idP   = r.properties.find(p => p.name === 'id');
  const nameP = r.properties.find(p => p.name === 'name');
  assert(idP.required === true,    '§8.4: id required (3/3 >= 1.0)');
  assert(nameP.required === true,  '§8.4: name required (3/3 >= 1.0)');
  assert(idP.totalPopulation === 3,'§8.4: totalPopulation=3');
}

// ── §8.4: Optional property — present in subset ──────────────────────────────
{
  const r   = inferSchema([{id:1,opt:'a'},{id:2},{id:3}], DEFAULT_CONFIG);
  const optP = r.properties.find(p => p.name === 'opt');
  assert(optP !== undefined,         '§8.4: optional: opt in result');
  assert(optP.required === false,    '§8.4: optional: not required (1/3 < 1.0)');
  assert(optP.occurrences === 1,     '§8.4: optional: occurrences=1');
  assert(optP.totalPopulation === 3, '§8.4: optional: totalPopulation=3');
}

// ── §8.4: Configurable threshold ─────────────────────────────────────────────
{
  const cfg = {...DEFAULT_CONFIG, requiredThreshold: 0.5};
  const r1  = inferSchema([{id:1,opt:'a'},{id:2,opt:'b'},{id:3}], cfg);
  assert(r1.properties.find(p=>p.name==='opt').required === true,  '§8.4: threshold 0.5: 2/3 → required');
  const r2  = inferSchema([{id:1,opt:'a'},{id:2},{id:3}], cfg);
  assert(r2.properties.find(p=>p.name==='opt').required === false, '§8.4: threshold 0.5: 1/3 → not required');
}

// ── §8.1: Core primitive type inference ──────────────────────────────────────
{
  const r = inferSchema([
    {id:1, name:'Alice', active:true,  score:3.14},
    {id:2, name:'Bob',   active:false, score:2.71},
  ], DEFAULT_CONFIG);
  assert(r.kind === 'object', '§8.1: kind=object');
  assert(r.id   === '#',      '§8.1: id=#');
  assert(r.occurrences === 2, '§8.1: occurrences=2');
  const idP     = r.properties.find(p=>p.name==='id');
  const nameP   = r.properties.find(p=>p.name==='name');
  const activeP = r.properties.find(p=>p.name==='active');
  const scoreP  = r.properties.find(p=>p.name==='score');
  assert(idP.target.primitiveType     === 'integer', '§8.1: id→integer');
  assert(idP.target.id                === '#/id',    '§8.1: id child id=#/id');
  assert(nameP.target.primitiveType   === 'string',  '§8.1: name→string');
  assert(activeP.target.primitiveType === 'boolean', '§8.1: active→boolean');
  assert(scoreP.target.primitiveType  === 'number',  '§8.1: score→number');
}

// ── §8.1: typeDistribution accumulation ──────────────────────────────────────
{
  const r  = inferSchema([{x:1},{x:2},{x:'oops'}], DEFAULT_CONFIG);
  const xP = r.properties.find(p=>p.name==='x');
  assert(xP.target.primitiveType               === 'string', '§8.1: typeDistrib: 2int+1str→string');
  assert(xP.target.typeDistribution['integer'] === 2,        '§8.1: typeDistrib: integer=2');
  assert(xP.target.typeDistribution['string']  === 1,        '§8.1: typeDistrib: string=1');
}

// ── §8.1: Nullable property ───────────────────────────────────────────────────
{
  const r  = inferSchema([{x:1},{x:null},{x:3}], DEFAULT_CONFIG);
  const xP = r.properties.find(p=>p.name==='x');
  assert(xP.target.primitiveType               === 'integer','§8.1: nullable: int+null→integer');
  assert(xP.target.nullable                    === true,     '§8.1: nullable: nullable=true');
  assert(xP.target.typeDistribution['null']    === 1,        '§8.1: nullable: null=1');
  assert(xP.target.typeDistribution['integer'] === 2,        '§8.1: nullable: integer=2');
}

// ── §8.1: RFC 6901 — slash in property name ───────────────────────────────────
{
  const r = inferSchema([{'user/name':'alice'}], DEFAULT_CONFIG);
  const p = r.properties.find(p=>p.name==='user/name');
  assert(p !== undefined,                '§8.1: RFC6901: slash-key present');
  assert(p.target.id === '#/user~1name', '§8.1: RFC6901: slash→~1');
}

// ── §8.1: Nested objects — recursive descent ──────────────────────────────────
{
  const r = inferSchema([
    {id:1, address:{city:'NYC', zip:'10001'}},
    {id:2, address:{city:'LA',  zip:'90001'}},
  ], DEFAULT_CONFIG);
  const addrP = r.properties.find(p=>p.name==='address');
  assert(addrP !== undefined,              '§8.1: nested: address present');
  assert(addrP.target.kind === 'object',   '§8.1: nested: address kind=object');
  assert(addrP.target.id   === '#/address','§8.1: nested: address id=#/address');
  const cityP = addrP.target.properties.find(p=>p.name==='city');
  assert(cityP !== undefined,                     '§8.1: nested: city present');
  assert(cityP.target.primitiveType === 'string', '§8.1: nested: city→string');
  assert(cityP.target.id === '#/address/city',    '§8.1: nested: city id=#/address/city');
}

// ── §8.1: Array property inference ───────────────────────────────────────────
{
  const r     = inferSchema([{tags:['a','b']},{tags:['c']}], DEFAULT_CONFIG);
  const tagsP = r.properties.find(p=>p.name==='tags');
  assert(tagsP !== undefined,                              '§8.1: array: tags present');
  assert(tagsP.target.kind === 'array',                   '§8.1: array: kind=array');
  assert(tagsP.target.itemType !== null,                  '§8.1: array: itemType not null');
  assert(tagsP.target.itemType.primitiveType === 'string','§8.1: array: items→string');
}

// ── §8.1: parentId parameter ─────────────────────────────────────────────────
{
  const r     = inferSchema([{name:'Alice'}], DEFAULT_CONFIG, '#/parent');
  const nameP = r.properties.find(p=>p.name==='name');
  assert(r.id === '#/parent',                 '§8.1: parentId: result id=#/parent');
  assert(nameP.target.id === '#/parent/name', '§8.1: parentId: name id=#/parent/name');
}

// ── §17.3 item 5: no all-primitive union — mixed primitives use lattice ───────
{
  const r  = inferSchema([{x:1},{x:'hello'},{x:true}], DEFAULT_CONFIG);
  const xP = r.properties.find(p=>p.name==='x');
  assert(xP.target.kind === 'primitive',       '§17.3 item5: mixed primitives→primitive (not union)');
  assert(xP.target.primitiveType === 'string', '§17.3 item5: boolean+integer+string→string');
}

// ── §17.3 item 4: no all-object union — array of objects → property-merge ────
{
  const r = inferSchema([
    {users:[{id:1},{id:2}]},
    {users:[{id:3,name:'Alice'}]},
  ], DEFAULT_CONFIG);
  const usersP = r.properties.find(p=>p.name==='users');
  assert(usersP !== undefined,                     '§17.3 item4: users present');
  assert(usersP.target.kind === 'array',           '§17.3 item4: kind=array');
  assert(usersP.target.itemType !== null,          '§17.3 item4: itemType not null');
  assert(usersP.target.itemType.kind === 'object', '§17.3 item4: all-object array→merged object (not union)');
}
