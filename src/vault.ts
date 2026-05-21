import { z } from 'zod';

const ulid = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
const vaultToken = z.string().regex(/^tok_[A-Za-z0-9]{24}$/);

export const ClassificationEnum = z.enum([
  'person_name',
  'email',
  'phone',
  'address',
  'dob',
  'tax_id_partial',
  'account_id',
  'user_handle',
  'other_identifier',
]);
export type Classification = z.infer<typeof ClassificationEnum>;

export const TokenizeRequestSchema = z
  .object({
    value: z.string().min(1).max(4096),
    classification: ClassificationEnum,
    context: z
      .object({
        normalize: z.boolean().default(true),
      })
      .strict()
      .optional(),
  })
  .strict();
export type TokenizeRequest = z.infer<typeof TokenizeRequestSchema>;

export const TokenizeResponseSchema = z
  .object({
    token: vaultToken,
    created: z.boolean(),
  })
  .strict();
export type TokenizeResponse = z.infer<typeof TokenizeResponseSchema>;

export const TokenizeBatchRequestSchema = z
  .object({
    items: z.array(TokenizeRequestSchema).min(1).max(100),
  })
  .strict();
export type TokenizeBatchRequest = z.infer<typeof TokenizeBatchRequestSchema>;

export const TokenizeBatchResponseSchema = z
  .object({
    results: z.array(TokenizeResponseSchema),
  })
  .strict();
export type TokenizeBatchResponse = z.infer<typeof TokenizeBatchResponseSchema>;

export const RequesterRoleEnum = z.enum([
  'compliance_officer',
  'internal_auditor',
  'external_auditor',
  'workspace_admin',
  'workspace_owner',
]);

export const RequesterContextSchema = z
  .object({
    tenant_id: z.string().regex(/^tnt_[0-9a-z]{12}$/),
    member_id: z.string(),
    role: RequesterRoleEnum,
    session_id: z.string(),
    mfa_age_seconds: z.number().int().nonnegative(),
    ip_address: z.string().optional(),
    user_agent: z.string().max(512).optional(),
  })
  .strict();
export type RequesterContext = z.infer<typeof RequesterContextSchema>;

export const ReasonCodeEnum = z.enum([
  'sample_review',
  'finding_investigation',
  'escalation_workflow',
  'rtbf_processing',
  'regulatory_inquiry',
  'other',
]);

export const JustificationSchema = z
  .object({
    engagement_id: z.string().regex(/^eng_[0-9A-HJKMNP-TV-Z]{26}$/),
    reason_code: ReasonCodeEnum,
    free_text: z.string().min(8).max(1024),
    approver_member_id: z.string().optional(),
  })
  .strict();
export type Justification = z.infer<typeof JustificationSchema>;

export const ResolveRequestSchema = z
  .object({
    token: vaultToken,
    requester: RequesterContextSchema,
    justification: JustificationSchema,
  })
  .strict();
export type ResolveRequest = z.infer<typeof ResolveRequestSchema>;

export const ResolveResponseSchema = z
  .object({
    token: vaultToken,
    value: z.string(),
    classification: z.string(),
    created_at: z.string().datetime().optional(),
    audit_event_id: ulid,
  })
  .strict();
export type ResolveResponse = z.infer<typeof ResolveResponseSchema>;

export const ResolveBatchRequestSchema = z
  .object({
    tokens: z.array(vaultToken).min(1).max(100),
    requester: RequesterContextSchema,
    justification: JustificationSchema,
  })
  .strict();
export type ResolveBatchRequest = z.infer<typeof ResolveBatchRequestSchema>;

export const ResolveBatchResultStatusEnum = z.enum([
  'resolved',
  'not_found',
  'tombstoned',
  'denied',
]);
export const TombstoneReasonEnum = z.enum([
  'retention_expired',
  'rtbf_processed',
  'tenant_offboarded',
]);

export const ResolveBatchResultSchema = z
  .object({
    token: vaultToken,
    status: ResolveBatchResultStatusEnum,
    value: z.string().optional(),
    tombstone_reason: TombstoneReasonEnum.optional(),
    denial_reason: z.string().optional(),
    audit_event_id: ulid.optional(),
  })
  .strict();
export type ResolveBatchResult = z.infer<typeof ResolveBatchResultSchema>;

export const ResolveBatchResponseSchema = z
  .object({
    results: z.array(ResolveBatchResultSchema),
  })
  .strict();
export type ResolveBatchResponse = z.infer<typeof ResolveBatchResponseSchema>;

export const LifecycleActionEnum = z.enum([
  'tombstone_immediately',
  'tombstone_at',
  'place_on_legal_hold',
  'release_legal_hold',
]);

export const LifecycleRequestSchema = z
  .object({
    action: LifecycleActionEnum,
    scheduled_at: z.string().datetime().optional(),
    reason: z.string().min(8).max(1024),
    approver_member_id: z.string().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.action === 'tombstone_at' && !data.scheduled_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'scheduled_at is required when action=tombstone_at',
        path: ['scheduled_at'],
      });
    }
  });
export type LifecycleRequest = z.infer<typeof LifecycleRequestSchema>;

export const TokenStateEnum = z.enum([
  'active',
  'scheduled_for_tombstone',
  'tombstoned',
  'on_legal_hold',
]);

export const LifecycleResponseSchema = z
  .object({
    token: vaultToken,
    new_state: TokenStateEnum,
    scheduled_at: z.string().datetime().optional(),
    audit_event_id: ulid,
  })
  .strict();
export type LifecycleResponse = z.infer<typeof LifecycleResponseSchema>;

export const VaultErrorCodeEnum = z.enum([
  'unauthorized',
  'forbidden',
  'classification_not_vaultable',
  'invalid_value',
  'invalid_classification',
  'rate_limited',
  'mfa_too_old',
  'engagement_not_active',
  'engagement_scope_violation',
  'approval_required',
  'approval_invalid',
  'token_not_found',
  'token_tombstoned',
  'lifecycle_conflict',
  'internal_error',
]);

export const VaultErrorSchema = z
  .object({
    error_code: VaultErrorCodeEnum,
    error_message: z.string().max(1024),
    request_id: z.string().optional(),
    retry_after_seconds: z.number().int().nonnegative().optional(),
  })
  .strict();
export type VaultError = z.infer<typeof VaultErrorSchema>;
