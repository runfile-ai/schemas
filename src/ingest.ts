import { z } from 'zod';
import {
  ActionSchema,
  ActorSchema,
  AnomalyFlagSchema,
  DecisionSchema,
  EnvironmentEnum,
  LabelsSchema,
  ModelRefSchema,
  PayloadEncryptionSchema,
  RedactionAppliedSchema,
  SdkMetadataSchema,
  SubjectSchema,
  WallClockSourceEnum,
} from './event.js';

const sha256Hex = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const ulid = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
const semver = z.string().regex(/^\d+\.\d+\.\d+$/);

/**
 * PayloadSubmission — the on-the-wire payload bundled into a BatchSubmission.
 *
 * Differs from the persisted `payload_ref` (in event-schema.json) as follows:
 *   - `s3_uri` is replaced by `s3_uri_intent` (hint; server assigns canonical URI)
 *   - `ciphertext_base64` carries the encrypted bytes inline (server uploads to S3)
 */
export const PayloadSubmissionSchema = z
  .object({
    s3_uri_intent: z.string().max(1024).optional(),
    sha256: sha256Hex,
    size_bytes: z.number().int().min(0).max(67_108_864),
    encryption: PayloadEncryptionSchema,
    content_type: z
      .enum([
        'application/json',
        'text/plain',
        'application/vnd.runfile.llm-request+json',
        'application/vnd.runfile.llm-response+json',
        'application/vnd.runfile.tool-call+json',
        'application/vnd.runfile.tool-result+json',
        'application/vnd.runfile.state-snapshot+json',
      ])
      .optional(),
    redaction_applied: RedactionAppliedSchema.optional(),
    ciphertext_base64: z.string().max(7_340_032),
  })
  .strict();
export type PayloadSubmission = z.infer<typeof PayloadSubmissionSchema>;

/**
 * EventSubmission — an event as submitted by the SDK. Differs from RunfileEvent:
 *   - `tenant_id` omitted (server resolves from API key)
 *   - `received_at` omitted (server stamps on receipt)
 *   - `event_hash` omitted (server computes after chain assembly)
 *   - `prev_hash` → `prev_hash_intent` (advisory; server validates)
 *   - `payload_ref` → `PayloadSubmission` (inline ciphertext, server assigns URI)
 *   - `merkle_inclusion` omitted (set later by Merkle Builder)
 */
export const EventSubmissionSchema = z
  .object({
    schema_version: semver,
    event_id: ulid,
    agent_run_id: z.string().regex(/^run_[0-9A-HJKMNP-TV-Z]{26}$/),
    parent_event_id: ulid.nullable(),
    captured_at: z.string().datetime(),
    wall_clock_source: WallClockSourceEnum,
    sdk: SdkMetadataSchema,
    actor: ActorSchema,
    action: ActionSchema,
    subject: SubjectSchema,
    model_ref: ModelRefSchema.optional(),
    decision: DecisionSchema.optional(),
    payload_ref: PayloadSubmissionSchema.optional(),
    redaction_policy_version: semver,
    regulatory_scope_version: semver.optional(),
    anomaly_flags: z.array(AnomalyFlagSchema).max(32).optional(),
    environment: EnvironmentEnum.optional(),
    labels: LabelsSchema.optional(),
    prev_hash_intent: sha256Hex,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.action.kind === 'llm_call' && !data.model_ref) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'model_ref is required when action.kind=llm_call',
        path: ['model_ref'],
      });
    }
    if (data.action.kind === 'decision' && !data.decision) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'decision is required when action.kind=decision',
        path: ['decision'],
      });
    }
  });
export type EventSubmission = z.infer<typeof EventSubmissionSchema>;

export const BatchSubmissionSchema = z
  .object({
    batch_id: z.string().regex(/^b_[0-9A-HJKMNP-TV-Z]{26}$/),
    events: z.array(EventSubmissionSchema).min(1).max(100),
  })
  .strict();
export type BatchSubmission = z.infer<typeof BatchSubmissionSchema>;

export const AcceptedEventSchema = z
  .object({
    event_id: ulid,
    accepted_at: z.string().datetime(),
    payload_s3_uri: z.string(),
    processing_status: z.literal('queued').optional(),
  })
  .strict();
export type AcceptedEvent = z.infer<typeof AcceptedEventSchema>;

export const BatchAcceptedSchema = z
  .object({
    batch_id: z.string().regex(/^b_[0-9A-HJKMNP-TV-Z]{26}$/),
    accepted_count: z.number().int().min(1),
    accepted_events: z.array(AcceptedEventSchema),
    received_at: z.string().datetime(),
  })
  .strict();
export type BatchAccepted = z.infer<typeof BatchAcceptedSchema>;

export const EventRejectionCodeEnum = z.enum([
  'schema_validation_failed',
  'duplicate_event_id',
  'payload_too_large',
  'payload_sha256_mismatch',
  'kms_key_unknown',
  'kms_key_unauthorized',
  'actor_scope_violation',
  'environment_scope_violation',
  'region_scope_violation',
  'timestamp_out_of_range',
  'missing_required_conditional_field',
]);

export const EventRejectionSchema = z
  .object({
    event_id: z.string(),
    error_code: EventRejectionCodeEnum,
    error_message: z.string().max(1024),
    field_path: z.string().optional(),
  })
  .strict();
export type EventRejection = z.infer<typeof EventRejectionSchema>;

export const BatchPartialSchema = z
  .object({
    batch_id: z.string().regex(/^b_[0-9A-HJKMNP-TV-Z]{26}$/),
    accepted_count: z.number().int().min(0),
    rejected_count: z.number().int().min(1),
    accepted_events: z.array(AcceptedEventSchema),
    rejected_events: z.array(EventRejectionSchema),
    received_at: z.string().datetime(),
  })
  .strict();
export type BatchPartial = z.infer<typeof BatchPartialSchema>;

export const ErrorCodeEnum = z.enum([
  'unauthorized',
  'forbidden',
  'bad_request',
  'schema_version_unsupported',
  'batch_too_large',
  'rate_limited',
  'quota_exceeded',
  'service_unavailable',
  'internal_error',
  'idempotency_conflict',
]);

export const ErrorSchema = z
  .object({
    error_code: ErrorCodeEnum,
    error_message: z.string().max(1024),
    retry_after_seconds: z.number().int().nonnegative().optional(),
    request_id: z.string().optional(),
  })
  .strict();
export type IngestError = z.infer<typeof ErrorSchema>;

export const BatchRejectedSchema = z
  .object({
    batch_id: z.string().regex(/^b_[0-9A-HJKMNP-TV-Z]{26}$/),
    error: ErrorSchema,
    rejected_events: z.array(EventRejectionSchema),
  })
  .strict();
export type BatchRejected = z.infer<typeof BatchRejectedSchema>;

export const RedactionTreatmentEnum = z.enum(['redact', 'tokenize', 'encrypt']);

export const RedactionPolicySchema = z
  .object({
    policy_version: semver,
    classification_rules: z.array(
      z
        .object({
          classification: z.string(),
          treatment: RedactionTreatmentEnum,
          detector: z.record(z.string(), z.unknown()).optional(),
        })
        .strict(),
    ),
    fetched_at: z.string().datetime(),
    ttl_seconds: z.number().int().positive().default(300),
  })
  .strict();
export type RedactionPolicy = z.infer<typeof RedactionPolicySchema>;
