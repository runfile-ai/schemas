import { z } from 'zod';

const sha256Hex = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const semver = z.string().regex(/^\d+\.\d+\.\d+$/);

/**
 * Daily Merkle manifest — produced by the Merkle Builder per tenant per UTC day.
 *
 * The KMS-signed root commits to every event with `received_at` in [day_start, day_end).
 * `attestation_document` is nullable in v1 (KMS-only signing); v1.5 will populate it
 * with a Nitro Enclave attestation. The Verifier CLI handles both modes.
 */
export const MerkleManifestSchema = z
  .object({
    manifest_version: semver,
    schema_version: semver,
    tenant_id: z.string().regex(/^tnt_[0-9a-z]{12}$/),
    day_utc: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    built_at: z.string().datetime(),
    leaf_count: z.number().int().nonnegative(),
    merkle_root: sha256Hex,
    prev_manifest_root: sha256Hex.nullable(),
    leaves: z.array(
      z
        .object({
          event_id: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
          event_hash: sha256Hex,
          leaf_index: z.number().int().nonnegative(),
        })
        .strict(),
    ),
    kms_signature: z
      .object({
        kms_key_arn: z.string(),
        signing_algorithm: z.string(),
        signature_base64: z.string(),
      })
      .strict(),
    attestation_document: z.string().nullable(),
    rekor_entry: z
      .object({
        log_index: z.number().int().nonnegative(),
        log_id: z.string(),
        inclusion_proof: z.string(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type MerkleManifest = z.infer<typeof MerkleManifestSchema>;
