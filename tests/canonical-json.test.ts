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
  NON_HASHED_EVENT_FIELDS,
  canonicalEventForHash,
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

describe('canonicalEventForHash — the chain field contract', () => {
  it('drops every server-set / transport-only field', () => {
    const projected = canonicalEventForHash(validLlmCallEvent);
    for (const f of NON_HASHED_EVENT_FIELDS) {
      expect(projected).not.toHaveProperty(f);
    }
    // …but keeps SDK-authored fields.
    expect(projected).toHaveProperty('event_id');
    expect(projected).toHaveProperty('captured_at');
    expect(projected).toHaveProperty('prev_event_hash');
  });

  it('hash is invariant to server-set fields (so prev_event_hash_intent stays a real signal)', () => {
    const base = computeEventHash(validLlmCallEvent);
    expect(computeEventHash({ ...validLlmCallEvent, received_at: '2099-01-01T00:00:00.000Z' })).toBe(base);
    expect(computeEventHash({ ...validLlmCallEvent, tenant_id: 'tnt_000000000000' })).toBe(base);
    expect(computeEventHash({ ...validLlmCallEvent, anomaly_flags: [{ code: 'chain_break', severity: 'error' }] })).toBe(base);
    expect(
      computeEventHash({
        ...validLlmCallEvent,
        merkle_inclusion: { manifest_uri: 's3://m/x', leaf_index: 3, merkle_root: `sha256:${'b'.repeat(64)}` },
      }),
    ).toBe(base);
    expect(computeEventHash({ ...validLlmCallEvent, prev_event_hash_intent: `sha256:${'c'.repeat(64)}` })).toBe(base);
  });

  it('hash DOES change when the authoritative prev_event_hash changes', () => {
    const base = computeEventHash(validLlmCallEvent);
    expect(computeEventHash({ ...validLlmCallEvent, prev_event_hash: `sha256:${'d'.repeat(64)}` })).not.toBe(base);
  });
});

describe('canonicalEventForHash — payload_ref commits to content, not location/transport', () => {
  // The two authors of the chain see payload_ref in different forms:
  const contentFields = {
    sha256: `sha256:${'e'.repeat(64)}`,
    size_bytes: 1234,
    encryption: { algorithm: 'AES-256-GCM', data_key_id: 'dk_abc', nonce_base64: 'AAAAAAAAAAAAAAAA' },
    content_type: 'application/vnd.runfile.llm-request+json',
  };
  // Witness (SDK): inline ciphertext + URI hint, no resolved s3_uri.
  const witnessEvent: Record<string, unknown> = {
    ...validLlmCallEvent,
    payload_ref: { ...contentFields, s3_uri_intent: 's3://hint/x', ciphertext_base64: 'Y2lwaGVydGV4dA==' },
  };
  // Server: ciphertext uploaded and stripped, canonical s3_uri written.
  const serverEvent: Record<string, unknown> = {
    ...validLlmCallEvent,
    payload_ref: { ...contentFields, s3_uri: 's3://runfile-payloads-prod/tnt/run/evt.bin' },
  };

  it('witness and server hash the same payload-bearing event identically', () => {
    expect(computeEventHash(witnessEvent)).toBe(computeEventHash(serverEvent));
  });

  it('projects payload_ref to content fields, dropping s3_uri / s3_uri_intent / ciphertext_base64', () => {
    const server = canonicalEventForHash(serverEvent).payload_ref as Record<string, unknown>;
    expect(server).toMatchObject({ sha256: contentFields.sha256, size_bytes: 1234 });
    expect(server).toHaveProperty('encryption');
    expect(server).not.toHaveProperty('s3_uri');
    const witness = canonicalEventForHash(witnessEvent).payload_ref as Record<string, unknown>;
    expect(witness).not.toHaveProperty('ciphertext_base64');
    expect(witness).not.toHaveProperty('s3_uri_intent');
  });

  it('still commits to payload CONTENT — a changed sha256 changes the hash', () => {
    const base = computeEventHash(serverEvent);
    const tampered: Record<string, unknown> = {
      ...validLlmCallEvent,
      payload_ref: { ...contentFields, sha256: `sha256:${'f'.repeat(64)}`, s3_uri: 's3://runfile-payloads-prod/tnt/run/evt.bin' },
    };
    expect(computeEventHash(tampered)).not.toBe(base);
  });
});
