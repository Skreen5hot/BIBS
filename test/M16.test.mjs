// M16 test suite
// Spec coverage: §11.1 ($id input hash) — SHA-256 known-answer vectors (FIPS 180-4 / NIST)
import { assert } from './_assert.mjs';
import { sha256Hex } from '../src/sha256.mjs';

const enc = (s) => new TextEncoder().encode(s);

assert(sha256Hex(enc('')) === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  '§11.1 sha256: empty input');
assert(sha256Hex(enc('abc')) === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  '§11.1 sha256: "abc"');
assert(sha256Hex(enc('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')) ===
  '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
  '§11.1 sha256: 448-bit message (two-block padding)');
assert(sha256Hex(new Uint8Array(1000000).fill(0x61)) ===
  'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0',
  '§11.1 sha256: one million "a"');
// Lengths around the 55/56/64-byte padding boundaries must not throw and must differ.
{
  const seen = new Set();
  for (const n of [55, 56, 63, 64, 65]) seen.add(sha256Hex(new Uint8Array(n)));
  assert(seen.size === 5, '§11.1 sha256: padding-boundary lengths produce distinct digests');
}
