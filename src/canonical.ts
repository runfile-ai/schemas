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
 * Fields NOT covered by `event_hash`.
 *
 * The hash commits to the SDK-authored capture fields only — never the
 * server-set ones. This is what makes the chain work end to end:
 *   - the SDK can reproduce the hash, so `prev_event_hash_intent` (the previous
 *     event's `event_hash` as the SDK computed it) is a real integrity claim,
 *     not noise — a mismatch is a genuine `chain_break`;
 *   - fields written AFTER the hash is computed (`merkle_inclusion` by the
 *     Merkle Builder, server-appended `anomaly_flags`) don't retroactively
 *     invalidate it, so the Verifier re-checks the same bytes the server hashed.
 *
 * Exclusion-based (not a whitelist) so additive minor-version fields are
 * hash-protected automatically. This set is the cross-language chain contract —
 * the TS reference here, `canonical.go`, and `canonical.py` MUST agree, and the
 * Verifier CLI must use the same projection. Changing it is chain-breaking:
 * bump the schema major and re-anchor.
 */
export const NON_HASHED_EVENT_FIELDS = [
  'event_hash', //              the hash field itself
  'tenant_id', //               server-resolved from the API key, never SDK-sent
  'received_at', //             server receive stamp
  'anomaly_flags', //           server may append flags after the hash is computed
  'merkle_inclusion', //        populated later by the Merkle Builder
  'prev_event_hash_intent', //  wire-only advisory; the hash commits to prev_event_hash
] as const;

const NON_HASHED = new Set<string>(NON_HASHED_EVENT_FIELDS);

/**
 * Fields NOT covered by `event_hash` WITHIN `payload_ref`.
 *
 * `payload_ref` is hashed — it commits to the payload's content — but its
 * location/transport fields differ between the two authors of the chain: the
 * witness (SDK) submits `{ ciphertext_base64, s3_uri_intent? }` and no `s3_uri`,
 * while the server resolves that to `{ s3_uri }` and strips the ciphertext (the
 * bytes go to S3). Hashing those fields would make the witness's
 * `prev_event_hash_intent` and the server's recomputed `event_hash` disagree on
 * every payload-bearing event — a permanent false `chain_break`. The hash must
 * commit only to the payload CONTENT (`sha256`, `size_bytes`, `encryption`,
 * `content_type`, `redaction_applied`); the bytes are already pinned by
 * `sha256`, so dropping the location/transport fields loses no integrity.
 *
 * Cross-language contract: MUST match canonical.go and canonical.py.
 */
export const NON_HASHED_PAYLOAD_REF_FIELDS = [
  's3_uri', //            server-assigned canonical location
  's3_uri_intent', //     witness hint; server replaces it with s3_uri
  'ciphertext_base64', // inline encrypted bytes; server uploads to S3 and strips
] as const;

const NON_HASHED_PAYLOAD_REF = new Set<string>(NON_HASHED_PAYLOAD_REF_FIELDS);

/** Drops payload_ref's location/transport fields, keeping only content fields. */
function projectPayloadRef(ref: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ref)) {
    if (!NON_HASHED_PAYLOAD_REF.has(k)) out[k] = v;
  }
  return out;
}

/**
 * Projects an event onto the fields covered by `event_hash` — i.e. drops the
 * server-set / transport-only fields in {@link NON_HASHED_EVENT_FIELDS}, and
 * within `payload_ref` drops the location/transport fields in
 * {@link NON_HASHED_PAYLOAD_REF_FIELDS}. Every consumer hashes
 * `canonicalEventForHash(event)`, so witness and server agree regardless of
 * which server-set fields happen to be present on the object.
 */
export function canonicalEventForHash<T extends { event_hash?: unknown }>(
  event: T,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(event as Record<string, unknown>)) {
    if (NON_HASHED.has(key)) continue;
    if (key === 'payload_ref' && value !== null && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = projectPayloadRef(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Computes the `event_hash` for a RunfileEvent: SHA-256 over the canonical JSON
 * of {@link canonicalEventForHash}(event).
 */
export function computeEventHash<T extends { event_hash?: unknown }>(event: T): string {
  return canonicalSha256(canonicalEventForHash(event));
}
