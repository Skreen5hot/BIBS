// M12 test suite
// Spec coverage: §11.3 (AdapterRegistry: register, get, list)
import { assert } from './_assert.mjs';
import { createAdapterRegistry } from '../src/adapter-registry.mjs';

// §11.3 — get on empty registry returns undefined
const reg = createAdapterRegistry();
assert(reg.get('missing') === undefined, '§11.3 get: missing name returns undefined');

// §11.3 — list on empty registry returns empty array
const emptyList = reg.list();
assert(Array.isArray(emptyList), '§11.3 list: returns an array');
assert(emptyList.length === 0, '§11.3 list: empty registry returns []');

// §11.3 — register then get
const adapterA = (cism) => cism;
reg.register('cism', adapterA);
assert(reg.get('cism') === adapterA, '§11.3 get: returns registered adapter by name');

// §11.3 — list after one registration
const list1 = reg.list();
assert(list1.length === 1, '§11.3 list: one entry after first registration');
assert(list1.includes('cism'), '§11.3 list: includes registered name');

// §11.3 — register second adapter
const adapterB = (cism) => ({ schema: true });
reg.register('jsonschema', adapterB);
assert(reg.get('jsonschema') === adapterB, '§11.3 get: second adapter retrievable');

// §11.3 — list after two registrations
const list2 = reg.list();
assert(list2.length === 2, '§11.3 list: two entries after second registration');
assert(list2.includes('cism'), '§11.3 list: cism present');
assert(list2.includes('jsonschema'), '§11.3 list: jsonschema present');

// §11.3 — overwrite registration replaces adapter, does not duplicate name
const adapterA2 = (cism) => ({ replaced: true });
reg.register('cism', adapterA2);
assert(reg.get('cism') === adapterA2, '§11.3 register: overwrites existing entry');
const list3 = reg.list();
assert(list3.length === 2, '§11.3 list: overwrite does not increase count');

// §11.3 — registered adapter is callable and returns its value
const mockCism = { version: '1.3', root: { id: '#', kind: 'primitive', occurrences: 1 } };
const identityFn = (cism) => cism;
reg.register('identity', identityFn);
assert(reg.get('identity')(mockCism) === mockCism, '§11.3 adapter is invocable as pure function');

// §11.3 — registry is adapter-agnostic: accepts any function signature
const customFn = (cism) => Object.keys(cism);
reg.register('custom', customFn);
assert(reg.get('custom') !== undefined, '§11.3 registry accepts arbitrary adapter functions');

// §11.3 — multiple independent registries do not share state
const reg2 = createAdapterRegistry();
assert(reg2.list().length === 0, '§11.3 new registry starts empty, independent of other instances');
reg2.register('local', () => null);
assert(reg2.list().length === 1, '§11.3 reg2 tracks its own registrations');
assert(reg.list().length === 4, '§11.3 reg1 unaffected by reg2 operations');

// §11.3 — get returns undefined for unregistered name after others registered
assert(reg.get('nonexistent') === undefined, '§11.3 get: unregistered name still returns undefined after other names added');
