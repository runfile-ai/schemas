import canonicalize from 'canonicalize';
import { createHash, type BinaryLike } from 'node:crypto';

/**
 * Canonical JSON serialisation per RFC 8785 (JSON Canonicalization Scheme).
 *
 * Every consumer — TS SDK, TS backend, Python SDK, Go Event Processor, Verifier CLI —
 * must produce byte-identical output for the same logical value, because `event_hash`
 * commits to the canonical serialisation. The schemas package owns the canonical form
 * and re-exports it.
 *
 * Use this for any value whose hash crosses a service boundary. Do NOT use it for
 * general API payloads (those go through plain JSON.stringify) — RFC 8785 is strictly
 * for hash determinism.
 */
export function stringify(value: unknown): string {
  const result = canonicalize(value);
  if (result === undefined) {
    throw new TypeError('canonicalize returned undefined; value is not JSON-serialisable');
  }
  return result;
}

/** @deprecated Alias retained for the documented import name in schemas.md. */
export { stringify as canonicalStringify };

/**
 * Computes SHA-256(stringify(value)) as the lowercase-hex form `sha256:<64 chars>`.
 *
 * This is the exact form that appears in `event.event_hash`, `payload_ref.sha256`,
 * `model_version_hash`, etc.
 */
export function canonicalSha256(value: unknown): string {
  return `sha256:${sha256Hex(stringify(value))}`;
}

function sha256Hex(input: BinaryLike): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Computes the event_hash for a RunfileEvent.
 *
 * Per the canonicalisation spec: the `event_hash` field itself is excluded from
 * canonicalisation — serialise with `event_hash` omitted, compute SHA-256, then set.
 */
export function computeEventHash<T extends { event_hash?: unknown }>(event: T): string {
  const { event_hash: _omit, ...rest } = event;
  return canonicalSha256(rest);
}
