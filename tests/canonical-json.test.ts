/**
 * RFC 8785 JCS canonical serialisation tests.
 *
 * The `event_hash` field commits to the canonical serialisation, so every consumer
 * (TS, Python, Go) must produce byte-identical output for the same logical value.
 * This file tests the TS-side properties; `cross-language.test.ts` proves the
 * fixtures match what Python and Go produce.
 */
import { describe, expect, it } from 'vitest';
import {
  canonicalSha256,
  canonicalStringify,
  computeEventHash,
  stringify,
} from '../src/canonical.js';
import { validLlmCallEvent } from './fixtures.js';

describe('canonical stringify (RFC 8785)', () => {
  it('sorts object keys lexicographically', () => {
    expect(stringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it('omits insignificant whitespace', () => {
    expect(stringify({ a: 1, b: [2, 3] })).toBe('{"a":1,"b":[2,3]}');
  });

  it('preserves array order (arrays are ordered, not sorted)', () => {
    expect(stringify([3, 1, 2])).toBe('[3,1,2]');
  });

  it('handles nested objects deterministically', () => {
    const a = { outer: { c: 3, a: 1, b: 2 } };
    const b = { outer: { a: 1, b: 2, c: 3 } };
    expect(stringify(a)).toBe(stringify(b));
  });

  it('canonicalStringify is a documented alias for stringify', () => {
    expect(canonicalStringify({ x: 1 })).toBe(stringify({ x: 1 }));
  });
});

describe('canonicalSha256', () => {
  it('is stable for logically-equal objects', () => {
    const a = canonicalSha256({ x: 1, y: [2, 3] });
    const b = canonicalSha256({ y: [2, 3], x: 1 });
    expect(a).toBe(b);
  });

  it('returns the documented `sha256:<64 hex>` form', () => {
    expect(canonicalSha256({ x: 1 })).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('differs for different logical values', () => {
    expect(canonicalSha256({ x: 1 })).not.toBe(canonicalSha256({ x: 2 }));
  });
});

describe('computeEventHash', () => {
  it('excludes event_hash from the hash input', () => {
    const a = { event_id: '01H', payload: 'p', event_hash: 'sha256:zzz' };
    const b = { event_id: '01H', payload: 'p', event_hash: 'sha256:totally-different' };
    expect(computeEventHash(a)).toBe(computeEventHash(b));
  });

  it('produces the documented sha256:<hex> form for a real event', () => {
    expect(computeEventHash(validLlmCallEvent)).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('changes when any non-event_hash field changes', () => {
    const before = computeEventHash(validLlmCallEvent);
    const after = computeEventHash({ ...validLlmCallEvent, captured_at: '2026-05-21T14:32:17.483Z' });
    expect(before).not.toBe(after);
  });
});
