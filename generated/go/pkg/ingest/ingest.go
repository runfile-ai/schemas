// Code generated from Runfile Zod schemas (do not edit).
// Source: src/ingest.ts

package ingest

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

// Runfile ingest schemas. Source: src/ingest.ts (Zod). Do not edit by hand.
type AcceptedItem struct {
	AcceptedAt       time.Time         `json:"accepted_at"`
	ID               string            `json:"id"`
	PayloadS3URI     *string           `json:"payload_s3_uri,omitempty"`
	ProcessingStatus *ProcessingStatus `json:"processing_status,omitempty"`
	Type             AcceptedItemType  `json:"type"`
}

type BatchAccepted struct {
	AcceptedCount int64          `json:"accepted_count"`
	AcceptedItems []AcceptedItem `json:"accepted_items"`
	BatchID       string         `json:"batch_id"`
	ReceivedAt    time.Time      `json:"received_at"`
}

type BatchPartial struct {
	AcceptedCount int64          `json:"accepted_count"`
	AcceptedItems []AcceptedItem `json:"accepted_items"`
	BatchID       string         `json:"batch_id"`
	ReceivedAt    time.Time      `json:"received_at"`
	RejectedCount int64          `json:"rejected_count"`
	RejectedItems []RejectedItem `json:"rejected_items"`
}

type RejectedItem struct {
	ErrorCode    RejectedItemErrorCode `json:"error_code"`
	ErrorMessage string                `json:"error_message"`
	FieldPath    *string               `json:"field_path,omitempty"`
	ID           string                `json:"id"`
	Type         AcceptedItemType      `json:"type"`
}

type BatchRejected struct {
	BatchID       string         `json:"batch_id"`
	Error         IngestError    `json:"error"`
	RejectedItems []RejectedItem `json:"rejected_items"`
}

type IngestError struct {
	ErrorCode         IngestErrorErrorCode `json:"error_code"`
	ErrorMessage      string               `json:"error_message"`
	RequestID         *string              `json:"request_id,omitempty"`
	RetryAfterSeconds *int64               `json:"retry_after_seconds,omitempty"`
}

type BatchSubmission struct {
	BatchID string `json:"batch_id"`
	Items   []Item `json:"items"`
}

type Item struct {
	Run                *RunSubmission      `json:"run,omitempty"`
	Type               AcceptedItemType    `json:"type"`
	LifecycleState     *ItemLifecycleState `json:"lifecycle_state,omitempty"`
	RunID              *string             `json:"run_id,omitempty"`
	TriggeredByEventID *string             `json:"triggered_by_event_id,omitempty"`
	EndedAt            *time.Time          `json:"ended_at,omitempty"`
	FinalEventID       *string             `json:"final_event_id,omitempty"`
	Outcome            *ItemOutcome        `json:"outcome,omitempty"`
	Event              *EventSubmission    `json:"event,omitempty"`
}

type EventSubmission struct {
	Action                 Action               `json:"action"`
	Actor                  Actor                `json:"actor"`
	AnomalyFlags           []AnomalyFlagElement `json:"anomaly_flags,omitempty"`
	CapturedAt             time.Time            `json:"captured_at"`
	Decision               *DecisionClass       `json:"decision,omitempty"`
	DelegationDetails      *DelegationDetails   `json:"delegation_details,omitempty"`
	Environment            *Environment         `json:"environment,omitempty"`
	EventID                string               `json:"event_id"`
	HandoffDetails         *HandoffDetails      `json:"handoff_details,omitempty"`
	Labels                 map[string]string    `json:"labels,omitempty"`
	ModelRef               *ModelRef            `json:"model_ref,omitempty"`
	OtelAttributes         *OtelAttributes      `json:"otel_attributes,omitempty"`
	ParallelGroupID        *string              `json:"parallel_group_id,omitempty"`
	ParentEventID          *string              `json:"parent_event_id"`
	PayloadRef             *PayloadSubmission   `json:"payload_ref,omitempty"`
	PrevEventHashIntent    string               `json:"prev_event_hash_intent"`
	RedactionPolicyVersion string               `json:"redaction_policy_version"`
	RegulatoryScopeVersion *string              `json:"regulatory_scope_version,omitempty"`
	ResumeDetails          *ResumeDetails       `json:"resume_details,omitempty"`
	RunID                  string               `json:"run_id"`
	SchemaVersion          string               `json:"schema_version"`
	SDK                    SDK                  `json:"sdk"`
	Subject                *Subject             `json:"subject,omitempty"`
	SuspensionDetails      *SuspensionDetails   `json:"suspension_details,omitempty"`
	WallClockSource        WallClockSource      `json:"wall_clock_source"`
}

type Action struct {
	DurationMS *int64         `json:"duration_ms,omitempty"`
	Kind       Kind           `json:"kind"`
	Name       string         `json:"name"`
	Outcome    *ActionOutcome `json:"outcome,omitempty"`
}

type Actor struct {
	// DID-format identifier of the agent. Required when type=agent.          
	AgentIdentity                                                   *string   `json:"agent_identity,omitempty"`
	DelegationChain                                                 []string  `json:"delegation_chain,omitempty"`
	// Vault token identifying the human principal.                           
	HumanPrincipal                                                  *string   `json:"human_principal,omitempty"`
	ToolID                                                          *string   `json:"tool_id,omitempty"`
	ToolVersionHash                                                 *string   `json:"tool_version_hash,omitempty"`
	Type                                                            ActorType `json:"type"`
}

type AnomalyFlagElement struct {
	Code     Code     `json:"code"`
	Detail   *string  `json:"detail,omitempty"`
	Severity Severity `json:"severity"`
}

type DecisionClass struct {
	Confidence              *float64        `json:"confidence,omitempty"`
	HumanInTheLoop          *bool           `json:"human_in_the_loop,omitempty"`
	Outcome                 DecisionOutcome `json:"outcome"`
	OutcomeLabel            *string         `json:"outcome_label,omitempty"`
	PolicyThresholdsCrossed []string        `json:"policy_thresholds_crossed,omitempty"`
	ReversedByEvent         *string         `json:"reversed_by_event,omitempty"`
}

type DelegationDetails struct {
	DelegatedAgentIdentity string                            `json:"delegated_agent_identity"`
	DelegatedRunID         string                            `json:"delegated_run_id"`
	FrameworkSignal        *DelegationDetailsFrameworkSignal `json:"framework_signal,omitempty"`
	WaitForCompletion      *bool                             `json:"wait_for_completion,omitempty"`
}

type HandoffDetails struct {
	FrameworkSignal     *HandoffDetailsFrameworkSignal `json:"framework_signal,omitempty"`
	HandoffReason       *string                        `json:"handoff_reason,omitempty"`
	TargetAgentIdentity string                         `json:"target_agent_identity"`
	TargetRunID         string                         `json:"target_run_id"`
}

type ModelRef struct {
	InputTokens      *int64   `json:"input_tokens,omitempty"`
	ModelID          string   `json:"model_id"`
	ModelVersionHash *string  `json:"model_version_hash,omitempty"`
	OutputTokens     *int64   `json:"output_tokens,omitempty"`
	Provider         Provider `json:"provider"`
	Streaming        *bool    `json:"streaming,omitempty"`
	SystemPromptHash *string  `json:"system_prompt_hash,omitempty"`
	Temperature      *float64 `json:"temperature,omitempty"`
	ToolsHash        *string  `json:"tools_hash,omitempty"`
}

type OtelAttributes struct {
	Extra                      map[string]*Extra `json:"extra,omitempty"`
	GenAIAgentDescription      *string           `json:"gen_ai_agent_description,omitempty"`
	GenAIAgentID               *string           `json:"gen_ai_agent_id,omitempty"`
	GenAIAgentName             *string           `json:"gen_ai_agent_name,omitempty"`
	GenAIConversationID        *string           `json:"gen_ai_conversation_id,omitempty"`
	GenAIOperationName         *string           `json:"gen_ai_operation_name,omitempty"`
	GenAIProviderName          *string           `json:"gen_ai_provider_name,omitempty"`
	GenAIRequestMaxTokens      *int64            `json:"gen_ai_request_max_tokens,omitempty"`
	GenAIRequestModel          *string           `json:"gen_ai_request_model,omitempty"`
	GenAIRequestTemperature    *float64          `json:"gen_ai_request_temperature,omitempty"`
	GenAIRequestTopP           *float64          `json:"gen_ai_request_top_p,omitempty"`
	GenAIResponseFinishReasons []string          `json:"gen_ai_response_finish_reasons,omitempty"`
	GenAIResponseID            *string           `json:"gen_ai_response_id,omitempty"`
	GenAIResponseModel         *string           `json:"gen_ai_response_model,omitempty"`
	GenAISystem                *string           `json:"gen_ai_system,omitempty"`
	GenAIToolCallID            *string           `json:"gen_ai_tool_call_id,omitempty"`
	GenAIToolName              *string           `json:"gen_ai_tool_name,omitempty"`
	GenAIUsageInputTokens      *int64            `json:"gen_ai_usage_input_tokens,omitempty"`
	GenAIUsageOutputTokens     *int64            `json:"gen_ai_usage_output_tokens,omitempty"`
}

type PayloadSubmission struct {
	CiphertextBase64 string            `json:"ciphertext_base64"`
	ContentType      *ContentType      `json:"content_type,omitempty"`
	Encryption       Encryption        `json:"encryption"`
	RedactionApplied *RedactionApplied `json:"redaction_applied,omitempty"`
	S3URIIntent      *string           `json:"s3_uri_intent,omitempty"`
	Sha256           string            `json:"sha256"`
	SizeBytes        int64             `json:"size_bytes"`
}

type Encryption struct {
	Algorithm      Algorithm `json:"algorithm"`
	DataKeyWrapped string    `json:"data_key_wrapped"`
	KmsKeyArn      *string   `json:"kms_key_arn,omitempty"`
}

type RedactionApplied struct {
	ClassifierVersion *string  `json:"classifier_version,omitempty"`
	RedactedClasses   []string `json:"redacted_classes,omitempty"`
	TokenizedClasses  []string `json:"tokenized_classes,omitempty"`
}

type ResumeDetails struct {
	ResumerPrincipal          *string     `json:"resumer_principal,omitempty"`
	SuspensionDurationSeconds *int64      `json:"suspension_duration_seconds,omitempty"`
	SuspensionStartedEventID  *string     `json:"suspension_started_event_id,omitempty"`
	TriggeredBy               TriggeredBy `json:"triggered_by"`
}

type SDK struct {
	Adapter          *string      `json:"adapter,omitempty"`
	Framework        SDKFramework `json:"framework"`
	FrameworkVersion *string      `json:"framework_version,omitempty"`
	Host             *string      `json:"host,omitempty"`
	Name             Name         `json:"name"`
	Version          string       `json:"version"`
}

type Subject struct {
	DataClassification *DataClassification `json:"data_classification,omitempty"`
	RegulatoryTags     []string            `json:"regulatory_tags,omitempty"`
	ResourceUrn        *string             `json:"resource_urn,omitempty"`
}

type SuspensionDetails struct {
	DetectionSource  *DetectionSource      `json:"detection_source,omitempty"`
	ExpectedResumeBy *time.Time            `json:"expected_resume_by,omitempty"`
	ExpectedResumer  *string               `json:"expected_resumer,omitempty"`
	FrameworkSignal  *FrameworkSignalClass `json:"framework_signal,omitempty"`
	Reason           Reason                `json:"reason"`
}

type FrameworkSignalClass struct {
	Framework         *FrameworkSignalFramework `json:"framework,omitempty"`
	SignalName        *string                   `json:"signal_name,omitempty"`
	SignalPayloadHash *string                   `json:"signal_payload_hash,omitempty"`
}

type RunSubmission struct {
	AgentIdentity          string                      `json:"agent_identity"`
	ContinuedFrom          *ContinuedFrom              `json:"continued_from,omitempty"`
	ConversationID         *string                     `json:"conversation_id,omitempty"`
	DelegatedFrom          *ContinuedFrom              `json:"delegated_from,omitempty"`
	Environment            *Environment                `json:"environment,omitempty"`
	HandedOffFrom          *ContinuedFrom              `json:"handed_off_from,omitempty"`
	InvokedBy              *ContinuedFrom              `json:"invoked_by,omitempty"`
	Labels                 map[string]string           `json:"labels,omitempty"`
	LifecycleState         RunSubmissionLifecycleState `json:"lifecycle_state"`
	PrevEventHashIntent    *string                     `json:"prev_event_hash_intent,omitempty"`
	RedactionPolicyVersion string                      `json:"redaction_policy_version"`
	RegulatoryScopeVersion *string                     `json:"regulatory_scope_version,omitempty"`
	RunID                  string                      `json:"run_id"`
	ScheduledFrom          *ContinuedFrom              `json:"scheduled_from,omitempty"`
	SchemaVersion          string                      `json:"schema_version"`
	SDKAtStart             *SDK                        `json:"sdk_at_start,omitempty"`
	StartedAt              time.Time                   `json:"started_at"`
}

type ContinuedFrom struct {
	EventID *string `json:"event_id,omitempty"`
	RunID   string  `json:"run_id"`
}

type EventItem struct {
	Event EventSubmission `json:"event"`
	Type  EventItemType   `json:"type"`
}

type RedactionPolicy struct {
	ClassificationRules []ClassificationRule `json:"classification_rules"`
	FetchedAt           time.Time            `json:"fetched_at"`
	PolicyVersion       string               `json:"policy_version"`
	TTLSeconds          *int64               `json:"ttl_seconds,omitempty"`
}

type ClassificationRule struct {
	Classification string                 `json:"classification"`
	Detector       map[string]interface{} `json:"detector,omitempty"`
	Treatment      Treatment              `json:"treatment"`
}

type RunCreateItem struct {
	Run  RunSubmission     `json:"run"`
	Type RunCreateItemType `json:"type"`
}

type RunEndItem struct {
	EndedAt      time.Time      `json:"ended_at"`
	FinalEventID *string        `json:"final_event_id,omitempty"`
	Outcome      ItemOutcome    `json:"outcome"`
	RunID        string         `json:"run_id"`
	Type         RunEndItemType `json:"type"`
}

type RunUpdateItem struct {
	LifecycleState     ItemLifecycleState `json:"lifecycle_state"`
	RunID              string             `json:"run_id"`
	TriggeredByEventID string             `json:"triggered_by_event_id"`
	Type               RunUpdateItemType  `json:"type"`
}

type ProcessingStatus string

const (
	Queued ProcessingStatus = "queued"
)

type AcceptedItemType string

const (
	PurpleEvent     AcceptedItemType = "event"
	PurpleRunCreate AcceptedItemType = "run_create"
	PurpleRunEnd    AcceptedItemType = "run_end"
	PurpleRunUpdate AcceptedItemType = "run_update"
)

type RejectedItemErrorCode string

const (
	ActorScopeViolation                   RejectedItemErrorCode = "actor_scope_violation"
	DuplicateID                           RejectedItemErrorCode = "duplicate_id"
	EnvironmentScopeViolation             RejectedItemErrorCode = "environment_scope_violation"
	ErrorCodeAgentIdentityMismatchWithRun RejectedItemErrorCode = "agent_identity_mismatch_with_run"
	KmsKeyUnauthorized                    RejectedItemErrorCode = "kms_key_unauthorized"
	KmsKeyUnknown                         RejectedItemErrorCode = "kms_key_unknown"
	MissingRequiredConditionalField       RejectedItemErrorCode = "missing_required_conditional_field"
	PayloadSha256Mismatch                 RejectedItemErrorCode = "payload_sha256_mismatch"
	PayloadTooLarge                       RejectedItemErrorCode = "payload_too_large"
	RegionScopeViolation                  RejectedItemErrorCode = "region_scope_violation"
	RunAlreadyEnded                       RejectedItemErrorCode = "run_already_ended"
	RunLifecycleTransitionInvalid         RejectedItemErrorCode = "run_lifecycle_transition_invalid"
	RunNotFound                           RejectedItemErrorCode = "run_not_found"
	SchemaValidationFailed                RejectedItemErrorCode = "schema_validation_failed"
	TimestampOutOfRange                   RejectedItemErrorCode = "timestamp_out_of_range"
)

type IngestErrorErrorCode string

const (
	BadRequest               IngestErrorErrorCode = "bad_request"
	BatchTooLarge            IngestErrorErrorCode = "batch_too_large"
	Forbidden                IngestErrorErrorCode = "forbidden"
	IdempotencyConflict      IngestErrorErrorCode = "idempotency_conflict"
	InternalError            IngestErrorErrorCode = "internal_error"
	QuotaExceeded            IngestErrorErrorCode = "quota_exceeded"
	RateLimited              IngestErrorErrorCode = "rate_limited"
	SchemaVersionUnsupported IngestErrorErrorCode = "schema_version_unsupported"
	ServiceUnavailable       IngestErrorErrorCode = "service_unavailable"
	Unauthorized             IngestErrorErrorCode = "unauthorized"
)

type Kind string

const (
	AnomalyFlag           Kind = "anomaly_flag"
	Decision              Kind = "decision"
	Delegate              Kind = "delegate"
	GraphNodeEnter        Kind = "graph_node_enter"
	GraphNodeExit         Kind = "graph_node_exit"
	Handoff               Kind = "handoff"
	HumanApproval         Kind = "human_approval"
	HumanInput            Kind = "human_input"
	KindRunCreate         Kind = "run_create"
	KindRunEnd            Kind = "run_end"
	LlmCall               Kind = "llm_call"
	LlmCallChunk          Kind = "llm_call_chunk"
	ParallelGroupClose    Kind = "parallel_group_close"
	ParallelGroupOpen     Kind = "parallel_group_open"
	PolicyCheck           Kind = "policy_check"
	RunAbandon            Kind = "run_abandon"
	RunResume             Kind = "run_resume"
	RunSuspend            Kind = "run_suspend"
	SDKDiagnostic         Kind = "sdk_diagnostic"
	ScheduleTask          Kind = "schedule_task"
	StateRead             Kind = "state_read"
	StateWrite            Kind = "state_write"
	ToolApprovalDenied    Kind = "tool_approval_denied"
	ToolApprovalGranted   Kind = "tool_approval_granted"
	ToolApprovalRequested Kind = "tool_approval_requested"
	ToolCall              Kind = "tool_call"
	ToolResult            Kind = "tool_result"
)

type ActionOutcome string

const (
	Cancelled     ActionOutcome = "cancelled"
	Partial       ActionOutcome = "partial"
	PurpleFailure ActionOutcome = "failure"
	PurpleSuccess ActionOutcome = "success"
	Timeout       ActionOutcome = "timeout"
)

type ActorType string

const (
	Agent  ActorType = "agent"
	Human  ActorType = "human"
	System ActorType = "system"
	Tool   ActorType = "tool"
)

type Code string

const (
	ActiveDurationExceedsThreshold   Code = "active_duration_exceeds_threshold"
	ApparentCrashDetected            Code = "apparent_crash_detected"
	ChainBreak                       Code = "chain_break"
	CodeAgentIdentityMismatchWithRun Code = "agent_identity_mismatch_with_run"
	DataClassificationMismatch       Code = "data_classification_mismatch"
	DelegationLoopDetected           Code = "delegation_loop_detected"
	FrameworkSignalUnrecognised      Code = "framework_signal_unrecognised"
	MissingAmbientContext            Code = "missing_ambient_context"
	ModelVersionDrift                Code = "model_version_drift"
	OtelAttributeMissing             Code = "otel_attribute_missing"
	OutOfOrderArrival                Code = "out_of_order_arrival"
	PolicyThresholdWithoutHitl       Code = "policy_threshold_without_hitl"
	RedactionPolicyMismatch          Code = "redaction_policy_mismatch"
	SchemaVersionWarning             Code = "schema_version_warning"
	SuspensionSlaExceeded            Code = "suspension_sla_exceeded"
	UnauthorizedToolInvocation       Code = "unauthorized_tool_invocation"
	UnknownAgentIdentity             Code = "unknown_agent_identity"
)

type Severity string

const (
	Critical Severity = "critical"
	Error    Severity = "error"
	Info     Severity = "info"
	Warning  Severity = "warning"
)

type DecisionOutcome string

const (
	Approved  DecisionOutcome = "approved"
	Custom    DecisionOutcome = "custom"
	Deferred  DecisionOutcome = "deferred"
	Denied    DecisionOutcome = "denied"
	Escalated DecisionOutcome = "escalated"
	NoAction  DecisionOutcome = "no_action"
)

type DelegationDetailsFrameworkSignal string

const (
	ClaudeAgentSDKSubagent DelegationDetailsFrameworkSignal = "claude_agent_sdk_subagent"
	LanggraphSubgraph      DelegationDetailsFrameworkSignal = "langgraph_subgraph"
	OpenaiAgentsAsTool     DelegationDetailsFrameworkSignal = "openai_agents_as_tool"
	PurpleManual           DelegationDetailsFrameworkSignal = "manual"
	PurpleOther            DelegationDetailsFrameworkSignal = "other"
)

type Environment string

const (
	Development Environment = "development"
	Production  Environment = "production"
	Staging     Environment = "staging"
)

type HandoffDetailsFrameworkSignal string

const (
	FluffyManual        HandoffDetailsFrameworkSignal = "manual"
	FluffyOther         HandoffDetailsFrameworkSignal = "other"
	LanggraphExplicit   HandoffDetailsFrameworkSignal = "langgraph_explicit"
	OpenaiAgentsHandoff HandoffDetailsFrameworkSignal = "openai_agents_handoff"
)

type Provider string

const (
	Anthropic     Provider = "anthropic"
	AwsBedrock    Provider = "aws_bedrock"
	AzureOpenai   Provider = "azure_openai"
	Google        Provider = "google"
	Ollama        Provider = "ollama"
	Openai        Provider = "openai"
	ProviderOther Provider = "other"
	SelfHosted    Provider = "self_hosted"
)

type ContentType string

const (
	ApplicationJSON                          ContentType = "application/json"
	ApplicationVndRunfileFrameworkSignalJSON ContentType = "application/vnd.runfile.framework-signal+json"
	ApplicationVndRunfileLlmRequestJSON      ContentType = "application/vnd.runfile.llm-request+json"
	ApplicationVndRunfileLlmResponseJSON     ContentType = "application/vnd.runfile.llm-response+json"
	ApplicationVndRunfileStateSnapshotJSON   ContentType = "application/vnd.runfile.state-snapshot+json"
	ApplicationVndRunfileToolCallJSON        ContentType = "application/vnd.runfile.tool-call+json"
	ApplicationVndRunfileToolResultJSON      ContentType = "application/vnd.runfile.tool-result+json"
	TextPlain                                ContentType = "text/plain"
)

type Algorithm string

const (
	AES256Gcm Algorithm = "aes-256-gcm"
)

type TriggeredBy string

const (
	ExternalSystemResponse TriggeredBy = "external_system_response"
	HumanApprovalGranted   TriggeredBy = "human_approval_granted"
	HumanInputReceived     TriggeredBy = "human_input_received"
	ManualResume           TriggeredBy = "manual_resume"
	ScheduleFired          TriggeredBy = "schedule_fired"
	SubagentCompleted      TriggeredBy = "subagent_completed"
	TriggeredByOther       TriggeredBy = "other"
	WebhookReceived        TriggeredBy = "webhook_received"
)

type SDKFramework string

const (
	AnthropicClaude      SDKFramework = "anthropic_claude"
	AnthropicClaudeJS    SDKFramework = "anthropic_claude_js"
	Crewai               SDKFramework = "crewai"
	LanggraphJS          SDKFramework = "langgraph_js"
	MCPClient            SDKFramework = "mcp_client"
	Mastra               SDKFramework = "mastra"
	OpenaiAgentsJS       SDKFramework = "openai_agents_js"
	OtelGeneric          SDKFramework = "otel_generic"
	PurpleClaudeAgentSDK SDKFramework = "claude_agent_sdk"
	PurpleLanggraph      SDKFramework = "langgraph"
	PurpleOpenaiAgents   SDKFramework = "openai_agents"
	PurpleVercelAISDK    SDKFramework = "vercel_ai_sdk"
	PydanticAI           SDKFramework = "pydantic_ai"
	TentacledManual      SDKFramework = "manual"
)

type Name string

const (
	RunfilePy  Name = "runfile-py"
	RunfileSDK Name = "@runfile/sdk"
)

type DataClassification string

const (
	AuditOfAudit DataClassification = "audit_of_audit"
	Confidential DataClassification = "confidential"
	Fci          DataClassification = "fci"
	Internal     DataClassification = "internal"
	PCI          DataClassification = "pci"
	Phi          DataClassification = "phi"
	Pii          DataClassification = "pii"
	Public       DataClassification = "public"
)

type DetectionSource string

const (
	CustomerExplicit  DetectionSource = "customer_explicit"
	Derived           DetectionSource = "derived"
	FrameworkInferred DetectionSource = "framework_inferred"
)

type FrameworkSignalFramework string

const (
	FluffyClaudeAgentSDK FrameworkSignalFramework = "claude_agent_sdk"
	FluffyLanggraph      FrameworkSignalFramework = "langgraph"
	FluffyOpenaiAgents   FrameworkSignalFramework = "openai_agents"
	FluffyVercelAISDK    FrameworkSignalFramework = "vercel_ai_sdk"
	MCP                  FrameworkSignalFramework = "mcp"
	Otel                 FrameworkSignalFramework = "otel"
	StickyManual         FrameworkSignalFramework = "manual"
)

type Reason string

const (
	AwaitingExternalSystem Reason = "awaiting_external_system"
	AwaitingHumanApproval  Reason = "awaiting_human_approval"
	AwaitingHumanInput     Reason = "awaiting_human_input"
	AwaitingSubagent       Reason = "awaiting_subagent"
	ReasonAwaitingSchedule Reason = "awaiting_schedule"
	ReasonAwaitingWebhook  Reason = "awaiting_webhook"
	ReasonOther            Reason = "other"
)

type WallClockSource string

const (
	AwsTimeSync WallClockSource = "aws_time_sync"
	HostSystem  WallClockSource = "host_system"
	NTP         WallClockSource = "ntp"
	Unknown     WallClockSource = "unknown"
)

type ItemLifecycleState string

const (
	AwaitingHuman                  ItemLifecycleState = "awaiting_human"
	Ended                          ItemLifecycleState = "ended"
	LifecycleStateAwaitingSchedule ItemLifecycleState = "awaiting_schedule"
	LifecycleStateAwaitingWebhook  ItemLifecycleState = "awaiting_webhook"
	PurpleActive                   ItemLifecycleState = "active"
)

type ItemOutcome string

const (
	Abandoned     ItemOutcome = "abandoned"
	FluffyFailure ItemOutcome = "failure"
	FluffySuccess ItemOutcome = "success"
	Incomplete    ItemOutcome = "incomplete"
)

type RunSubmissionLifecycleState string

const (
	FluffyActive RunSubmissionLifecycleState = "active"
)

type EventItemType string

const (
	FluffyEvent EventItemType = "event"
)

type Treatment string

const (
	Drop                 Treatment = "drop"
	Hash                 Treatment = "hash"
	PassThrough          Treatment = "pass_through"
	Tokenize             Treatment = "tokenize"
	TokenizeWithFallback Treatment = "tokenize_with_fallback"
)

type RunCreateItemType string

const (
	FluffyRunCreate RunCreateItemType = "run_create"
)

type RunEndItemType string

const (
	FluffyRunEnd RunEndItemType = "run_end"
)

type RunUpdateItemType string

const (
	FluffyRunUpdate RunUpdateItemType = "run_update"
)

type Extra struct {
	Bool   *bool
	Double *float64
	String *string
}

func (x *Extra) UnmarshalJSON(data []byte) error {
	object, err := unmarshalUnion(data, nil, &x.Double, &x.Bool, &x.String, false, nil, false, nil, false, nil, false, nil, false)
	if err != nil {
		return err
	}
	if object {
	}
	return nil
}

func (x *Extra) MarshalJSON() ([]byte, error) {
	return marshalUnion(nil, x.Double, x.Bool, x.String, false, nil, false, nil, false, nil, false, nil, false)
}

func unmarshalUnion(data []byte, pi **int64, pf **float64, pb **bool, ps **string, haveArray bool, pa interface{}, haveObject bool, pc interface{}, haveMap bool, pm interface{}, haveEnum bool, pe interface{}, nullable bool) (bool, error) {
	if pi != nil {
			*pi = nil
	}
	if pf != nil {
			*pf = nil
	}
	if pb != nil {
			*pb = nil
	}
	if ps != nil {
			*ps = nil
	}

	dec := json.NewDecoder(bytes.NewReader(data))
	dec.UseNumber()
	tok, err := dec.Token()
	if err != nil {
			return false, err
	}

	switch v := tok.(type) {
	case json.Number:
			if pi != nil {
					i, err := v.Int64()
					if err == nil {
							*pi = &i
							return false, nil
					}
			}
			if pf != nil {
					f, err := v.Float64()
					if err == nil {
							*pf = &f
							return false, nil
					}
					return false, errors.New("Unparsable number")
			}
			return false, errors.New("Union does not contain number")
	case float64:
			return false, errors.New("Decoder should not return float64")
	case bool:
			if pb != nil {
					*pb = &v
					return false, nil
			}
			return false, errors.New("Union does not contain bool")
	case string:
			if haveEnum {
					return false, json.Unmarshal(data, pe)
			}
			if ps != nil {
					*ps = &v
					return false, nil
			}
			return false, errors.New("Union does not contain string")
	case nil:
			if nullable {
					return false, nil
			}
			return false, errors.New("Union does not contain null")
	case json.Delim:
			if v == '{' {
					if haveObject {
							return true, json.Unmarshal(data, pc)
					}
					if haveMap {
							return false, json.Unmarshal(data, pm)
					}
					return false, errors.New("Union does not contain object")
			}
			if v == '[' {
					if haveArray {
							return false, json.Unmarshal(data, pa)
					}
					return false, errors.New("Union does not contain array")
			}
			return false, errors.New("Cannot handle delimiter")
	}
	return false, errors.New("Cannot unmarshal union")
}

func marshalUnion(pi *int64, pf *float64, pb *bool, ps *string, haveArray bool, pa interface{}, haveObject bool, pc interface{}, haveMap bool, pm interface{}, haveEnum bool, pe interface{}, nullable bool) ([]byte, error) {
	if pi != nil {
			return json.Marshal(*pi)
	}
	if pf != nil {
			return json.Marshal(*pf)
	}
	if pb != nil {
			return json.Marshal(*pb)
	}
	if ps != nil {
			return json.Marshal(*ps)
	}
	if haveArray {
			return json.Marshal(pa)
	}
	if haveObject {
			return json.Marshal(pc)
	}
	if haveMap {
			return json.Marshal(pm)
	}
	if haveEnum {
			return json.Marshal(pe)
	}
	if nullable {
			return json.Marshal(nil)
	}
	return nil, errors.New("Union must not be null")
}

func (r *Actor) Validate() error {
	if r.Type == "agent" && r.AgentIdentity == nil {
		return fmt.Errorf("agent_identity is required when actor.type=agent")
	}
	if r.Type == "tool" && r.ToolID == nil {
		return fmt.Errorf("tool_id is required when actor.type=tool")
	}
	if r.Type == "tool" && r.ToolVersionHash == nil {
		return fmt.Errorf("tool_version_hash is required when actor.type=tool")
	}
	return nil
}

func (r *EventSubmission) Validate() error {
	if r.Action.Kind == "llm_call" && r.ModelRef == nil {
		return fmt.Errorf("model_ref is required when action.kind=llm_call")
	}
	if r.Action.Kind == "decision" && r.Decision == nil {
		return fmt.Errorf("decision is required when action.kind=decision")
	}
	if r.Action.Kind == "run_suspend" && r.SuspensionDetails == nil {
		return fmt.Errorf("suspension_details is required when action.kind=run_suspend")
	}
	if r.Action.Kind == "run_resume" && r.ResumeDetails == nil {
		return fmt.Errorf("resume_details is required when action.kind=run_resume")
	}
	if r.Action.Kind == "delegate" && r.DelegationDetails == nil {
		return fmt.Errorf("delegation_details is required when action.kind=delegate")
	}
	if r.Action.Kind == "handoff" && r.HandoffDetails == nil {
		return fmt.Errorf("handoff_details is required when action.kind=handoff")
	}
	return nil
}
