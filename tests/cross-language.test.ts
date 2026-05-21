/**
 * Cross-language canonical-JSON parity tests.
 *
 * The vectors in `fixtures/canonical-vectors.json` define inputs whose canonical
 * RFC 8785 form is part of the contract. Every consumer (TS, Python, Go) must
 * reproduce the same `canonical` bytes for each input.
 *
 * The TS leg lives here; the Python leg is `tests/python/test_canonical.py`
 * and the Go leg is `tests/go/canonical_test.go`. All three load the same
 * fixture and run in CI on every push (.github/workflows/ci.yml).
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { canonicalSha256, stringify } from '../src/canonical.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Vector {
  name: string;
  input: unknown;
  canonical: string;
  sha256?: string;
}

const fixture = JSON.parse(
  readFileSync(resolve(__dirname, 'fixtures', 'canonical-vectors.json'), 'utf8'),
) as { vectors: Vector[] };

describe('cross-language canonical vectors (TS leg)', () => {
  for (const vector of fixture.vectors) {
    it(`TS produces canonical bytes for: ${vector.name}`, () => {
      expect(stringify(vector.input)).toBe(vector.canonical);
    });

    if (vector.sha256) {
      it(`TS sha256 matches the cross-language commitment for: ${vector.name}`, () => {
        expect(canonicalSha256(vector.input)).toBe(vector.sha256);
      });
    }
  }
});

