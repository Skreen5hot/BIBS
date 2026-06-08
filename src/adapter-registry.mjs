/**
 * Output Adapter Registry (§11.3).
 * Backed by Map<string, OutputAdapter>; adapter-agnostic.
 * Default adapters ('jsonschema', 'cism') are registered by M15 after M13/M14 are imported.
 */

/**
 * Create a new AdapterRegistry instance.
 * @returns {{ register(name: string, adapter: function): void, get(name: string): function|undefined, list(): string[] }}
 */
export function createAdapterRegistry() {
  const _map = new Map();

  return {
    /** @param {string} name @param {function} adapter */
    register(name, adapter) {
      _map.set(name, adapter);
    },
    /** @param {string} name @returns {function|undefined} */
    get(name) {
      return _map.get(name);
    },
    /** @returns {string[]} */
    list() {
      return Array.from(_map.keys());
    },
  };
}
