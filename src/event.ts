import { z } from 'zod';

const sha256Hex = z.string().regex(/^sha256:[a-f0-9]{64}$/, 'sha256:<64 lowercase hex>');
const ulid = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, 'Crockford base32 ULID');
const semver = z.string().regex(/^\d+\.\d+\.\d+$/, 'semver MAJOR.MINOR.PATCH');
const semverWithPre = z.string().regex(/^\d+\.\d+\.\d+(-[a-z0-9.-]+)?$/);

export const ActorSchema = z
  .object({
    type: z.enum(['agent', 'human', 'tool', 'system']),
    agent_identity: z
      .string()
      .regex(/^did:[a-z][a-z0-9]*:[A-Za-z0-9._:-]+$/)
      .optional()
      .describe('DID-format identifier of the agent. Required when type=agent.'),
    human_principal: z
      .string()
      .regex(/^tok_[A-Za-z0-9]{16,64}$/)
      .optional()
      .describe('Vault token identifying the human principal.'),
    delegation_chain: z.array(z.string()).max(16).default([]),
    tool_id: z
      .string()
      .regex(/^tool:[a-z0-9_.-]+:[a-z0-9_.-]+$/)
      .optional(),
    tool_version_hash: sha256Hex.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.type === 'agent' && !data.agent_identity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'agent_identity is required when actor.type=agent',
        path: ['agent_identity'],
      });
    }
    if (data.type === 'tool') {
      if (!data.tool_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'tool_id is required when actor.type=tool',
          path: ['tool_id'],
        });
      }
      if (!data.tool_version_hash) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'tool_version_hash is required when actor.type=tool',
          path: ['tool_version_hash'],
        });
      }
    }
  });
export type Actor = z.infer<typeof ActorSchema>;

export const ActionKindEnum = z.enum([
  'agent_run_start',
  'agent_run_end',
  'graph_node_enter',
  'graph_node_exit',
  'llm_call',
  'tool_call',
  'tool_result',
  'state_read',
  'state_write',
  'decision',
  'handoff',
  'human_approval',
  'human_input',
  'policy_check',
  'anomaly_flag',
  'sdk_diagnostic',
]);
export type ActionKind = z.infer<typeof ActionKindEnum>;

export const ActionOutcomeEnum = z.enum(['success', 'failure', 'partial', 'timeout', 'cancelled']);

export const ActionSchema = z
  .object({
    kind: ActionKindEnum,
    name: z.string().max(256),
    outcome: ActionOutcomeEnum.optional(),
    duration_ms: z.number().int().nonnegative().optional(),
  })
  .strict();
export type Action = z.infer<typeof ActionSchema>;

export const DataClassificationEnum = z.enum([
  'public',
  'internal',
  'confidential',
  'pii',
  'phi',
  'pci',
  'fci',
]);

export const SubjectSchema = z
  .object({
    resource_urn: z
      .string()
      .regex(/^urn:[a-z0-9][a-z0-9-]{0,31}:.+$/)
      .max(512)
      .optional(),
    data_classification: DataClassificationEnum.optional(),
    regulatory_tags: z.array(z.string().regex(/^[a-z0-9_]+$/)).max(32).optional(),
  })
  .strict();
export type Subject = z.infer<typeof SubjectSchema>;

export const ModelProviderEnum = z.enum([
  'anthropic',
  'openai',
  'google',
  'aws_bedrock',
  'azure_openai',
  'ollama',
  'self_hosted',
  'other',
]);

export const ModelRefSchema = z
  .object({
    provider: ModelProviderEnum,
    model_id: z.string().max(128),
    model_version_hash: sha256Hex.optional(),
    system_prompt_hash: sha256Hex.optional(),
    tools_hash: sha256Hex.optional(),
    input_tokens: z.number().int().nonnegative().optional(),
    output_tokens: z.number().int().nonnegative().optional(),
    temperature: z.number().min(0).max(2).optional(),
  })
  .strict();
export type ModelRef = z.infer<typeof ModelRefSchema>;

export const DecisionOutcomeEnum = z.enum([
  'approved',
  'denied',
  'escalated',
  'deferred',
  'no_action',
  'custom',
]);

export const DecisionSchema = z
  .object({
    outcome: DecisionOutcomeEnum,
    outcome_label: z.string().max(64).optional(),
    confidence: z.number().min(0).max(1).optional(),
    human_in_the_loop: z.boolean().optional(),
    policy_thresholds_crossed: z.array(z.string().max(64)).max(16).optional(),
    reversed_by_event: ulid.optional(),
  })
  .strict();
export type Decision = z.infer<typeof DecisionSchema>;

export const ContentTypeEnum = z.enum([
  'application/json',
  'text/plain',
  'application/vnd.runfile.llm-request+json',
  'application/vnd.runfile.llm-response+json',
  'application/vnd.runfile.tool-call+json',
  'application/vnd.runfile.tool-result+json',
  'application/vnd.runfile.state-snapshot+json',
]);

export const RedactionAppliedSchema = z
  .object({
    redacted_classes: z.array(z.string()).max(32).optional(),
    tokenized_classes: z.array(z.string()).max(32).optional(),
    classifier_version: semver.optional(),
  })
  .strict();
export type RedactionApplied = z.infer<typeof RedactionAppliedSchema>;

export const PayloadEncryptionSchema = z
  .object({
    algorithm: z.literal('aes-256-gcm'),
    data_key_wrapped: z.string().max(4096),
    kms_key_arn: z
      .string()
      .regex(/^arn:aws:kms:[a-z0-9-]+:[0-9]+:key\/[a-f0-9-]+$/)
      .optional(),
  })
  .strict();
export type PayloadEncryption = z.infer<typeof PayloadEncryptionSchema>;

export const PayloadRefSchema = z
  .object({
    s3_uri: z
      .string()
      .regex(/^s3:\/\/[a-z0-9.-]{3,63}\/.+$/)
      .max(1024),
    sha256: sha256Hex,
    size_bytes: z.number().int().min(0).max(67_108_864),
    encryption: PayloadEncryptionSchema,
    content_type: ContentTypeEnum.optional(),
    redaction_applied: RedactionAppliedSchema.optional(),
  })
  .strict();
export type PayloadRef = z.infer<typeof PayloadRefSchema>;

export const AnomalyCodeEnum = z.enum([
  'missing_ambient_context',
  'chain_break',
  'out_of_order_arrival',
  'model_version_drift',
  'unknown_agent_identity',
  'data_classification_mismatch',
  'policy_threshold_without_hitl',
  'unauthorized_tool_invocation',
  'redaction_policy_mismatch',
  'schema_version_warning',
]);
export const AnomalySeverityEnum = z.enum(['info', 'warning', 'error', 'critical']);

export const AnomalyFlagSchema = z
  .object({
    code: AnomalyCodeEnum,
    severity: AnomalySeverityEnum,
    detail: z.string().max(1024).optional(),
  })
  .strict();
export type AnomalyFlag = z.infer<typeof AnomalyFlagSchema>;

export const WallClockSourceEnum = z.enum(['aws_time_sync', 'ntp', 'host_system', 'unknown']);

export const SdkNameEnum = z.enum(['runfile-py', '@runfile/sdk']);

export const SdkFrameworkEnum = z.enum([
  'langgraph',
  'langgraph_js',
  'openai_agents',
  'openai_agents_js',
  'anthropic_claude',
  'anthropic_claude_js',
  'mastra',
  'vercel_ai_sdk',
  'mcp_client',
  'otel_generic',
  'manual',
]);

export const SdkMetadataSchema = z
  .object({
    name: SdkNameEnum,
    version: semverWithPre,
    framework: SdkFrameworkEnum,
    framework_version: semverWithPre.optional(),
    host: z.string().max(256).optional(),
  })
  .strict();
export type SdkMetadata = z.infer<typeof SdkMetadataSchema>;

export const EnvironmentEnum = z.enum(['production', 'staging', 'development']);

export const LabelsSchema = z
  .record(z.string().regex(/^[a-z][a-z0-9_]{0,31}$/), z.string().max(128))
  .refine((labels) => Object.keys(labels).length <= 16, {
    message: 'labels: maximum 16 keys',
  });
export type Labels = z.infer<typeof LabelsSchema>;

export const MerkleInclusionSchema = z
  .object({
    manifest_uri: z.string().regex(/^s3:\/\/[a-z0-9.-]{3,63}\/.+$/),
    leaf_index: z.number().int().nonnegative(),
    merkle_root: sha256Hex,
  })
  .strict();
export type MerkleInclusion = z.infer<typeof MerkleInclusionSchema>;

/**
 * RunfileEvent — the canonical event shape every service in the system reads, writes, or
 * reasons about. Hash-chained within `agent_run_id` and committed to a daily Merkle root.
 *
 * Conditional-required fields (enforced via superRefine below):
 *   - kind=llm_call    → model_ref required
 *   - kind=decision    → decision required
 *   - actor.type=agent → actor.agent_identity required (also enforced inside ActorSchema)
 *   - actor.type=tool  → actor.tool_id + actor.tool_version_hash required (also enforced inside ActorSchema)
 */
export const RunfileEventSchema = z
  .object({
    schema_version: semver,
    event_id: ulid,
    tenant_id: z.string().regex(/^tnt_[0-9a-z]{12}$/),
    agent_run_id: z.string().regex(/^run_[0-9A-HJKMNP-TV-Z]{26}$/),
    parent_event_id: ulid.nullable(),
    captured_at: z.string().datetime(),
    received_at: z.string().datetime(),
    wall_clock_source: WallClockSourceEnum,
    sdk: SdkMetadataSchema,
    actor: ActorSchema,
    action: ActionSchema,
    subject: SubjectSchema,
    model_ref: ModelRefSchema.optional(),
    decision: DecisionSchema.optional(),
    payload_ref: PayloadRefSchema.optional(),
    redaction_policy_version: semver,
    regulatory_scope_version: semver.optional(),
    anomaly_flags: z.array(AnomalyFlagSchema).max(32).optional(),
    environment: EnvironmentEnum.optional(),
    labels: LabelsSchema.optional(),
    prev_hash: sha256Hex,
    event_hash: sha256Hex,
    merkle_inclusion: MerkleInclusionSchema.optional(),
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

export type RunfileEvent = z.infer<typeof RunfileEventSchema>;

export const ZERO_PREV_HASH = `sha256:${'0'.repeat(64)}` as const;
