import { z } from 'zod';
import { RunfileEventSchema } from './event.js';
import { MerkleManifestSchema } from './manifest.js';

const semver = z.string().regex(/^\d+\.\d+\.\d+$/);

/**
 * Evidence bundle — the exportable, offline-verifiable package consumed by the
 * Verifier CLI. Combines a slice of events with the manifests that anchor them.
 *
 * Structure roughly follows JSON-LD conventions (the PDF rendering is produced
 * separately by the Evidence Builder service).
 */
export const EvidenceBundleSchema = z
  .object({
    bundle_version: semver,
    bundle_id: z.string().regex(/^bun_[0-9A-HJKMNP-TV-Z]{26}$/),
    generated_at: z.string().datetime(),
    tenant_id: z.string().regex(/^tnt_[0-9a-z]{12}$/),
    engagement_id: z.string().regex(/^eng_[0-9A-HJKMNP-TV-Z]{26}$/).optional(),
    period: z
      .object({
        from: z.string().datetime(),
        to: z.string().datetime(),
      })
      .strict(),
    events: z.array(RunfileEventSchema),
    manifests: z.array(MerkleManifestSchema),
    schema_versions_used: z.array(semver),
    notes: z.string().max(8192).optional(),
  })
  .strict();
export type EvidenceBundle = z.infer<typeof EvidenceBundleSchema>;
