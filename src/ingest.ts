import { z } from 'zod';
import {
  ActionSchema,
  ActorSchema,
  AnomalyFlagSchema,
  DecisionSchema,
  DelegationDetailsSchema,
  EnvironmentEnum,
  HandoffDetailsSchema,
  LabelsSchema,
  ModelRefSchema,
  OtelAttributesSchema,
  PayloadEncryptionSchema,
  RedactionAppliedSchema,
  ResumeDetailsSchema,
  RunOutcomeEnum,
  RunReferenceSchema,
  SdkMetadataSchema,
  SubjectSchema,
  SuspensionDetailsSchema,
  WallClockSourceEnum,
} from './event.js';

const sha256Hex = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const ulid = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
const runId = z.string().regex(/^run_[0-9A-HJKMNP-TV-Z]{26}$/);
const parallelGroupId = z.string().regex(/^pg_[0-9A-HJKMNP-TV-Z]{26}$/);
const did = z.string().regex(/^did:[a-z][a-z0-9]*:[A-Za-z0-9._:-]+$/);
const batchId = z.string().regex(/^b_[0-9A-HJKMNP-TV-Z]{26}$/);
const semver = z.string().regex(/^\d+\.\d+\.\d+$/);

/**
 * PayloadSubmission — the on-the-wire payload bundled into a batch event item.
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
        'application/vnd.runfile.framework-signal+json',
      ])
      .optional(),
    redaction_applied: RedactionAppliedSchema.optional(),
    ciphertext_base64: z.string().max(7_340_032),
  })
  .strict();
export type PayloadSubmission = z.infer<typeof PayloadSubmissionSchema>;

/**
 * RunSubmission — a run as submitted in a `run_create` batch item. Differs from the
 * persisted RunfileRun:
 *   - `tenant_id` omitted (server resolves from API key)
 *   - `active_duration_seconds`, `suspension_intervals`, `ended_at`, `outcome` are
 *     server-managed (set via run_update / run_end items) and omitted at creation
 *   - `lifecycle_state` is always 'active' on creation
 *   - `merkle_inclusions` omitted (set later by Merkle Builder)
 *
 * There is no `prev_run_hash` — run records are not part of the hash chain. Conversation
 * continuity rides on the event chain via `prev_event_hash_intent`.
 */
export const RunSubmissionSchema = z
  .object({
    schema_version: semver,
    run_id: runId,
    agent_identity: did,
    conversation_id: z.string().max(256).optional(),
    lifecycle_state: z.literal('active'),
    started_at: z.string().datetime(),
    delegated_from: RunReferenceSchema.optional(),
    handed_off_from: RunReferenceSchema.optional(),
    scheduled_from: RunReferenceSchema.optional(),
    invoked_by: RunReferenceSchema.optional(),
    continued_from: RunReferenceSchema.optional(),
    environment: EnvironmentEnum.optional(),
    labels: LabelsSchema.optional(),
    redaction_policy_version: semver,
    regulatory_scope_version: semver.optional(),
    sdk_at_start: SdkMetadataSchema.optional(),
    prev_event_hash_intent: sha256Hex.optional(),
  })
  .strict();
export type RunSubmission = z.infer<typeof RunSubmissionSchema>;

/**
 * EventSubmission — an event as submitted by the SDK. Differs from RunfileEvent:
 *   - `tenant_id` omitted (server resolves from API key)
 *   - `received_at` omitted (server stamps on receipt)
 *   - `event_hash` omitted (server computes after chain assembly)
 *   - `prev_event_hash` → `prev_event_hash_intent` (advisory; server validates)
 *   - `payload_ref` → `PayloadSubmission` (inline ciphertext, server assigns URI)
 *   - `merkle_inclusion` omitted (set later by Merkle Builder)
 */
export const EventSubmissionSchema = z
  .object({
    schema_version: semver,
    event_id: ulid,
    run_id: runId,
    parent_event_id: ulid.nullable(),
    parallel_group_id: parallelGroupId.optional(),
    segment_index: z.number().int().nonnegative(),
    local_seq: z.number().int().nonnegative(),
    captured_at: z.string().datetime(),
    wall_clock_source: WallClockSourceEnum,
    sdk: SdkMetadataSchema,
    actor: ActorSchema,
    action: ActionSchema,
    subject: SubjectSchema.optional(),
    model_ref: ModelRefSchema.optional(),
    decision: DecisionSchema.optional(),
    suspension_details: SuspensionDetailsSchema.optional(),
    resume_details: ResumeDetailsSchema.optional(),
    delegation_details: DelegationDetailsSchema.optional(),
    handoff_details: HandoffDetailsSchema.optional(),
    payload_ref: PayloadSubmissionSchema.optional(),
    otel_attributes: OtelAttributesSchema.optional(),
    redaction_policy_version: semver,
    regulatory_scope_version: semver.optional(),
    anomaly_flags: z.array(AnomalyFlagSchema).max(32).optional(),
    environment: EnvironmentEnum.optional(),
    labels: LabelsSchema.optional(),
    prev_event_hash_intent: sha256Hex,
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
    if (data.action.kind === 'run_suspend' && !data.suspension_details) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'suspension_details is required when action.kind=run_suspend',
        path: ['suspension_details'],
      });
    }
    if (data.action.kind === 'run_resume' && !data.resume_details) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'resume_details is required when action.kind=run_resume',
        path: ['resume_details'],
      });
    }
    if (data.action.kind === 'delegate' && !data.delegation_details) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'delegation_details is required when action.kind=delegate',
        path: ['delegation_details'],
      });
    }
    if (data.action.kind === 'handoff' && !data.handoff_details) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'handoff_details is required when action.kind=handoff',
        path: ['handoff_details'],
      });
    }
  });
export type EventSubmission = z.infer<typeof EventSubmissionSchema>;

// ---------------------------------------------------------------------------
// Batch items: tagged union of run_create / run_update / run_end / event
// ---------------------------------------------------------------------------

export const RunCreateItemSchema = z
  .object({
    type: z.literal('run_create'),
    run: RunSubmissionSchema,
  })
  .strict();
export type RunCreateItem = z.infer<typeof RunCreateItemSchema>;

export const RunUpdateItemSchema = z
  .object({
    type: z.literal('run_update'),
    run_id: runId,
    lifecycle_state: z.enum([
      'active',
      'awaiting_human',
      'awaiting_webhook',
      'awaiting_schedule',
      'ended',
    ]),
    triggered_by_event_id: ulid,
  })
  .strict();
export type RunUpdateItem = z.infer<typeof RunUpdateItemSchema>;

export const RunEndItemSchema = z
  .object({
    type: z.literal('run_end'),
    run_id: runId,
    ended_at: z.string().datetime(),
    outcome: RunOutcomeEnum,
    final_event_id: ulid.optional(),
  })
  .strict();
export type RunEndItem = z.infer<typeof RunEndItemSchema>;

export const EventItemSchema = z
  .object({
    type: z.literal('event'),
    event: EventSubmissionSchema,
  })
  .strict();
export type EventItem = z.infer<typeof EventItemSchema>;

export const BatchItemSchema = z.discriminatedUnion('type', [
  RunCreateItemSchema,
  RunUpdateItemSchema,
  RunEndItemSchema,
  EventItemSchema,
]);
export type BatchItem = z.infer<typeof BatchItemSchema>;

export const BatchSubmissionSchema = z
  .object({
    batch_id: batchId,
    items: z.array(BatchItemSchema).min(1).max(100),
  })
  .strict();
export type BatchSubmission = z.infer<typeof BatchSubmissionSchema>;

export const ItemTypeEnum = z.enum(['run_create', 'run_update', 'run_end', 'event']);

export const AcceptedItemSchema = z
  .object({
    type: ItemTypeEnum,
    id: z.string(),
    accepted_at: z.string().datetime(),
    payload_s3_uri: z.string().optional(),
    processing_status: z.literal('queued').optional(),
  })
  .strict();
export type AcceptedItem = z.infer<typeof AcceptedItemSchema>;

export const BatchAcceptedSchema = z
  .object({
    batch_id: batchId,
    accepted_count: z.number().int().min(1),
    accepted_items: z.array(AcceptedItemSchema),
    received_at: z.string().datetime(),
  })
  .strict();
export type BatchAccepted = z.infer<typeof BatchAcceptedSchema>;

export const ItemRejectionCodeEnum = z.enum([
  'schema_validation_failed',
  'duplicate_id',
  'run_not_found',
  'run_already_ended',
  'run_lifecycle_transition_invalid',
  'agent_identity_mismatch_with_run',
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

export const RejectedItemSchema = z
  .object({
    type: ItemTypeEnum,
    id: z.string(),
    error_code: ItemRejectionCodeEnum,
    error_message: z.string().max(1024),
    field_path: z.string().optional(),
  })
  .strict();
export type RejectedItem = z.infer<typeof RejectedItemSchema>;

export const BatchPartialSchema = z
  .object({
    batch_id: batchId,
    accepted_count: z.number().int().min(0),
    rejected_count: z.number().int().min(1),
    accepted_items: z.array(AcceptedItemSchema),
    rejected_items: z.array(RejectedItemSchema),
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
    batch_id: batchId,
    error: ErrorSchema,
    rejected_items: z.array(RejectedItemSchema),
  })
  .strict();
export type BatchRejected = z.infer<typeof BatchRejectedSchema>;

export const RedactionTreatmentEnum = z.enum([
  'drop',
  'tokenize',
  'hash',
  'pass_through',
  'tokenize_with_fallback',
]);

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
