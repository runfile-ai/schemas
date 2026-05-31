import { z } from 'zod';

const sha256Hex = z.string().regex(/^sha256:[a-f0-9]{64}$/, 'sha256:<64 lowercase hex>');
const ulid = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, 'Crockford base32 ULID');
const runId = z.string().regex(/^run_[0-9A-HJKMNP-TV-Z]{26}$/, 'run_<26-char ULID>');
const parallelGroupId = z.string().regex(/^pg_[0-9A-HJKMNP-TV-Z]{26}$/, 'pg_<26-char ULID>');
const tenantId = z.string().regex(/^tnt_[0-9a-z]{12}$/);
const did = z.string().regex(/^did:[a-z][a-z0-9]*:[A-Za-z0-9._:-]+$/);
const vaultToken = z.string().regex(/^tok_[A-Za-z0-9]{16,64}$/);
const semver = z.string().regex(/^\d+\.\d+\.\d+$/, 'semver MAJOR.MINOR.PATCH');
const semverWithPre = z.string().regex(/^\d+\.\d+\.\d+(-[a-z0-9.-]+)?$/);

export const ActorSchema = z
  .object({
    type: z.enum(['agent', 'human', 'tool', 'system']),
    agent_identity: did
      .optional()
      .describe('DID-format identifier of the agent. Required when type=agent.'),
    human_principal: vaultToken
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
  'graph_node_enter',
  'graph_node_exit',
  'llm_call',
  'llm_call_chunk',
  'tool_call',
  'tool_result',
  'tool_approval_requested',
  'tool_approval_granted',
  'tool_approval_denied',
  'state_read',
  'state_write',
  'decision',
  'run_create',
  'run_end',
  'run_suspend',
  'run_resume',
  'run_abandon',
  'delegate',
  'handoff',
  'schedule_task',
  'parallel_group_open',
  'parallel_group_close',
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
  'audit_of_audit',
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
    streaming: z.boolean().optional(),
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

// ---------------------------------------------------------------------------
// Lifecycle and inter-run relationship details (event-level)
// ---------------------------------------------------------------------------

export const SuspensionReasonEnum = z.enum([
  'awaiting_human_approval',
  'awaiting_human_input',
  'awaiting_webhook',
  'awaiting_schedule',
  'awaiting_external_system',
  'awaiting_subagent',
  'other',
]);

export const FrameworkEnum = z.enum([
  'langgraph',
  'openai_agents',
  'claude_agent_sdk',
  'vercel_ai_sdk',
  'mcp',
  'manual',
  'otel',
]);

export const FrameworkSignalSchema = z
  .object({
    framework: FrameworkEnum.optional(),
    signal_name: z.string().max(128).optional(),
    signal_payload_hash: sha256Hex.optional(),
  })
  .strict();
export type FrameworkSignal = z.infer<typeof FrameworkSignalSchema>;

export const DetectionSourceEnum = z.enum(['framework_inferred', 'customer_explicit', 'derived']);

export const SuspensionDetailsSchema = z
  .object({
    reason: SuspensionReasonEnum,
    expected_resumer: z.string().optional(),
    expected_resume_by: z.string().datetime().optional(),
    detection_source: DetectionSourceEnum.optional(),
    framework_signal: FrameworkSignalSchema.optional(),
  })
  .strict();
export type SuspensionDetails = z.infer<typeof SuspensionDetailsSchema>;

export const ResumeTriggerEnum = z.enum([
  'human_approval_granted',
  'human_input_received',
  'webhook_received',
  'schedule_fired',
  'external_system_response',
  'subagent_completed',
  'manual_resume',
  'other',
]);

export const ResumeDetailsSchema = z
  .object({
    triggered_by: ResumeTriggerEnum,
    resumer_principal: vaultToken.optional(),
    suspension_duration_seconds: z.number().int().nonnegative().optional(),
    suspension_started_event_id: ulid.optional(),
  })
  .strict();
export type ResumeDetails = z.infer<typeof ResumeDetailsSchema>;

export const DelegationFrameworkSignalEnum = z.enum([
  'langgraph_subgraph',
  'openai_agents_as_tool',
  'claude_agent_sdk_subagent',
  'manual',
  'other',
]);

export const DelegationDetailsSchema = z
  .object({
    delegated_run_id: runId,
    delegated_agent_identity: did,
    wait_for_completion: z.boolean().optional(),
    framework_signal: DelegationFrameworkSignalEnum.optional(),
  })
  .strict();
export type DelegationDetails = z.infer<typeof DelegationDetailsSchema>;

export const HandoffFrameworkSignalEnum = z.enum([
  'openai_agents_handoff',
  'langgraph_explicit',
  'manual',
  'other',
]);

export const HandoffDetailsSchema = z
  .object({
    target_run_id: runId,
    target_agent_identity: did,
    handoff_reason: z.string().max(256).optional(),
    framework_signal: HandoffFrameworkSignalEnum.optional(),
  })
  .strict();
export type HandoffDetails = z.infer<typeof HandoffDetailsSchema>;

export const ContentTypeEnum = z.enum([
  'application/json',
  'text/plain',
  'application/vnd.runfile.llm-request+json',
  'application/vnd.runfile.llm-response+json',
  'application/vnd.runfile.tool-call+json',
  'application/vnd.runfile.tool-result+json',
  'application/vnd.runfile.state-snapshot+json',
  'application/vnd.runfile.framework-signal+json',
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
    key_id: z.string().max(256).optional(),
    nonce: z.string().max(64),
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

// ---------------------------------------------------------------------------
// OpenTelemetry GenAI attribute passthrough
// ---------------------------------------------------------------------------

export const OtelAttributesSchema = z
  .object({
    gen_ai_system: z.string().optional(),
    gen_ai_operation_name: z.string().optional(),
    gen_ai_provider_name: z.string().optional(),
    gen_ai_request_model: z.string().optional(),
    gen_ai_response_model: z.string().optional(),
    gen_ai_request_temperature: z.number().optional(),
    gen_ai_request_top_p: z.number().optional(),
    gen_ai_request_max_tokens: z.number().int().optional(),
    gen_ai_response_id: z.string().optional(),
    gen_ai_response_finish_reasons: z.array(z.string()).optional(),
    gen_ai_usage_input_tokens: z.number().int().optional(),
    gen_ai_usage_output_tokens: z.number().int().optional(),
    gen_ai_tool_name: z.string().optional(),
    gen_ai_tool_call_id: z.string().optional(),
    gen_ai_agent_id: z.string().optional(),
    gen_ai_agent_name: z.string().optional(),
    gen_ai_agent_description: z.string().optional(),
    gen_ai_conversation_id: z.string().optional(),
    extra: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  })
  .strict();
export type OtelAttributes = z.infer<typeof OtelAttributesSchema>;

export const AnomalyCodeEnum = z.enum([
  'missing_ambient_context',
  'chain_break',
  'sequence_gap',
  'causality_violation',
  'out_of_order_arrival',
  'model_version_drift',
  'unknown_agent_identity',
  'data_classification_mismatch',
  'policy_threshold_without_hitl',
  'unauthorized_tool_invocation',
  'redaction_policy_mismatch',
  'schema_version_warning',
  'agent_identity_mismatch_with_run',
  'suspension_sla_exceeded',
  'apparent_crash_detected',
  'active_duration_exceeds_threshold',
  'framework_signal_unrecognised',
  'otel_attribute_missing',
  'delegation_loop_detected',
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

export const SdkNameEnum = z.enum(['runfile-py', '@runfile/sdk', 'runfile-ai', '@runfile-ai/sdk']);

export const SdkFrameworkEnum = z.enum([
  'langgraph',
  'langgraph_js',
  'openai_agents',
  'openai_agents_js',
  'anthropic_claude',
  'anthropic_claude_js',
  'claude_agent_sdk',
  'mastra',
  'vercel_ai_sdk',
  'pydantic_ai',
  'crewai',
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
    adapter: z.string().max(64).optional(),
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

/** A typed pointer to a specific event in another run, used for inter-run links. */
export const RunReferenceSchema = z
  .object({
    run_id: runId,
    event_id: ulid.optional(),
  })
  .strict();
export type RunReference = z.infer<typeof RunReferenceSchema>;

// ---------------------------------------------------------------------------
// RunfileRun — the bounded operation of one agent identity.
// Materialised in Postgres from events; not part of the hash chain itself.
// ---------------------------------------------------------------------------

export const RunLifecycleStateEnum = z.enum([
  'active',
  'awaiting_human',
  'awaiting_webhook',
  'awaiting_schedule',
  'ended',
]);
export type RunLifecycleState = z.infer<typeof RunLifecycleStateEnum>;

export const RunOutcomeEnum = z.enum(['success', 'failure', 'incomplete', 'abandoned']);
export type RunOutcome = z.infer<typeof RunOutcomeEnum>;

export const SuspensionIntervalSchema = z
  .object({
    started: z.string().datetime(),
    ended: z.string().datetime().nullable().optional(),
    reason: SuspensionReasonEnum,
    trigger_event_id: ulid,
    resume_event_id: ulid.optional(),
  })
  .strict();
export type SuspensionInterval = z.infer<typeof SuspensionIntervalSchema>;

/**
 * RunfileRun — a bounded operation owned by exactly one agent identity. Contains many
 * events, may suspend/resume, and may be linked to other runs via delegation, handoff,
 * scheduling, or conversation membership. The run record is a queryable materialisation
 * built by the Event Processor from lifecycle events; it carries no hash fields and is
 * not anchored in the Merkle tree (the run's *events* are).
 */
export const RunfileRunSchema = z
  .object({
    schema_version: semver,
    run_id: runId,
    tenant_id: tenantId,
    agent_identity: did,
    conversation_id: z.string().max(256).optional(),
    lifecycle_state: RunLifecycleStateEnum,
    started_at: z.string().datetime(),
    ended_at: z.string().datetime().nullable().optional(),
    outcome: RunOutcomeEnum.nullable().optional(),
    delegated_from: RunReferenceSchema.optional(),
    handed_off_from: RunReferenceSchema.optional(),
    scheduled_from: RunReferenceSchema.optional(),
    invoked_by: RunReferenceSchema.optional(),
    continued_from: RunReferenceSchema.optional(),
    active_duration_seconds: z.number().int().nonnegative().optional(),
    suspension_intervals: z.array(SuspensionIntervalSchema).max(100).optional(),
    environment: EnvironmentEnum.optional(),
    labels: LabelsSchema.optional(),
    redaction_policy_version: semver,
    regulatory_scope_version: semver.optional(),
    sdk_at_start: SdkMetadataSchema.optional(),
    merkle_inclusions: z.array(MerkleInclusionSchema).optional(),
  })
  .strict();
export type RunfileRun = z.infer<typeof RunfileRunSchema>;

/**
 * RunfileEvent — a single action captured within a Run. Ordered within a process segment
 * by `local_seq` (a monotonic capture counter the SDK assigns) and hash-chained in that
 * order via `prev_event_hash` → `event_hash`; the total order within a segment is
 * `(run_id, segment_index, local_seq)`. Causally linked via `parent_event_id` (the
 * execution DAG); concurrent operations grouped via `parallel_group_id`. Segments
 * (separated by suspend/resume) are stitched by the `run_resume` event's `prev_event_hash`
 * referencing the `run_suspend` event. Committed to a daily Merkle root.
 *
 * Conditional-required fields (enforced via superRefine below):
 *   - kind=llm_call    → model_ref required
 *   - kind=decision    → decision required
 *   - kind=run_suspend → suspension_details required
 *   - kind=run_resume  → resume_details required
 *   - kind=delegate    → delegation_details required
 *   - kind=handoff     → handoff_details required
 *   - actor.type=agent → actor.agent_identity required (also enforced inside ActorSchema)
 *   - actor.type=tool  → actor.tool_id + actor.tool_version_hash required (also enforced inside ActorSchema)
 */
export const RunfileEventSchema = z
  .object({
    schema_version: semver,
    event_id: ulid,
    tenant_id: tenantId,
    run_id: runId,
    parent_event_id: ulid.nullable(),
    parallel_group_id: parallelGroupId.optional(),
    segment_index: z
      .number()
      .int()
      .nonnegative()
      .describe(
        'Which execution segment of the run this event belongs to. 0 for the initial segment; incremented each time the run resumes after a suspension. With local_seq this gives a total order within a segment: (run_id, segment_index, local_seq).',
      ),
    local_seq: z
      .number()
      .int()
      .nonnegative()
      .describe(
        'Monotonic capture counter assigned by the SDK within a single process segment, starting at 0. Authoritative ordering for the hash chain within a segment; resets to 0 at the start of each segment. A gap (e.g. 0,1,3) means an event was lost (sequence_gap anomaly).',
      ),
    captured_at: z.string().datetime(),
    received_at: z.string().datetime(),
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
    payload_ref: PayloadRefSchema.optional(),
    otel_attributes: OtelAttributesSchema.optional(),
    redaction_policy_version: semver,
    regulatory_scope_version: semver.optional(),
    anomaly_flags: z.array(AnomalyFlagSchema).max(32).optional(),
    environment: EnvironmentEnum.optional(),
    labels: LabelsSchema.optional(),
    prev_event_hash: sha256Hex,
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

export type RunfileEvent = z.infer<typeof RunfileEventSchema>;

export const ZERO_PREV_HASH = `sha256:${'0'.repeat(64)}` as const;
