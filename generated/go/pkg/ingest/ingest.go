// Code generated from Runfile Zod schemas (do not edit).
// Source: src/ingest.ts

package ingest

import (
	"encoding/json"
	"fmt"
	"time"
)

// Runfile ingest schemas. Source: src/ingest.ts (Zod). Do not edit by hand.
type AcceptedEvent struct {
	AcceptedAt       time.Time         `json:"accepted_at"`
	EventID          string            `json:"event_id"`
	PayloadS3URI     string            `json:"payload_s3_uri"`
	ProcessingStatus *ProcessingStatus `json:"processing_status,omitempty"`
}

type BatchAccepted struct {
	AcceptedCount  int64           `json:"accepted_count"`
	AcceptedEvents []AcceptedEvent `json:"accepted_events"`
	BatchID        string          `json:"batch_id"`
	ReceivedAt     time.Time       `json:"received_at"`
}

type BatchPartial struct {
	AcceptedCount  int64            `json:"accepted_count"`
	AcceptedEvents []AcceptedEvent  `json:"accepted_events"`
	BatchID        string           `json:"batch_id"`
	ReceivedAt     time.Time        `json:"received_at"`
	RejectedCount  int64            `json:"rejected_count"`
	RejectedEvents []EventRejection `json:"rejected_events"`
}

type EventRejection struct {
	ErrorCode    EventRejectionErrorCode `json:"error_code"`
	ErrorMessage string                  `json:"error_message"`
	EventID      string                  `json:"event_id"`
	FieldPath    *string                 `json:"field_path,omitempty"`
}

type BatchRejected struct {
	BatchID        string           `json:"batch_id"`
	Error          IngestError      `json:"error"`
	RejectedEvents []EventRejection `json:"rejected_events"`
}

type IngestError struct {
	ErrorCode         IngestErrorErrorCode `json:"error_code"`
	ErrorMessage      string               `json:"error_message"`
	RequestID         *string              `json:"request_id,omitempty"`
	RetryAfterSeconds *int64               `json:"retry_after_seconds,omitempty"`
}

type BatchSubmission struct {
	BatchID string            `json:"batch_id"`
	Events  []EventSubmission `json:"events"`
}

type EventSubmission struct {
	Action                 Action               `json:"action"`
	Actor                  Actor                `json:"actor"`
	AgentRunID             string               `json:"agent_run_id"`
	AnomalyFlags           []AnomalyFlagElement `json:"anomaly_flags,omitempty"`
	CapturedAt             time.Time            `json:"captured_at"`
	Decision               *DecisionClass       `json:"decision,omitempty"`
	Environment            *Environment         `json:"environment,omitempty"`
	EventID                string               `json:"event_id"`
	Labels                 map[string]string    `json:"labels,omitempty"`
	ModelRef               *ModelRef            `json:"model_ref,omitempty"`
	ParentEventID          *string              `json:"parent_event_id"`
	PayloadRef             *PayloadSubmission   `json:"payload_ref,omitempty"`
	PrevHashIntent         string               `json:"prev_hash_intent"`
	RedactionPolicyVersion string               `json:"redaction_policy_version"`
	RegulatoryScopeVersion *string              `json:"regulatory_scope_version,omitempty"`
	SchemaVersion          string               `json:"schema_version"`
	SDK                    SDK                  `json:"sdk"`
	Subject                Subject              `json:"subject"`
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
	AgentIdentity                                                   *string  `json:"agent_identity,omitempty"`
	DelegationChain                                                 []string `json:"delegation_chain,omitempty"`
	// Vault token identifying the human principal.                          
	HumanPrincipal                                                  *string  `json:"human_principal,omitempty"`
	ToolID                                                          *string  `json:"tool_id,omitempty"`
	ToolVersionHash                                                 *string  `json:"tool_version_hash,omitempty"`
	Type                                                            Type     `json:"type"`
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

type ModelRef struct {
	InputTokens      *int64   `json:"input_tokens,omitempty"`
	ModelID          string   `json:"model_id"`
	ModelVersionHash *string  `json:"model_version_hash,omitempty"`
	OutputTokens     *int64   `json:"output_tokens,omitempty"`
	Provider         Provider `json:"provider"`
	SystemPromptHash *string  `json:"system_prompt_hash,omitempty"`
	Temperature      *float64 `json:"temperature,omitempty"`
	ToolsHash        *string  `json:"tools_hash,omitempty"`
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

type SDK struct {
	Framework        Framework `json:"framework"`
	FrameworkVersion *string   `json:"framework_version,omitempty"`
	Host             *string   `json:"host,omitempty"`
	Name             Name      `json:"name"`
	Version          string    `json:"version"`
}

type Subject struct {
	DataClassification *DataClassification `json:"data_classification,omitempty"`
	RegulatoryTags     []string            `json:"regulatory_tags,omitempty"`
	ResourceUrn        *string             `json:"resource_urn,omitempty"`
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

type ProcessingStatus string

const (
	Queued ProcessingStatus = "queued"
)

type EventRejectionErrorCode string

const (
	ActorScopeViolation             EventRejectionErrorCode = "actor_scope_violation"
	DuplicateEventID                EventRejectionErrorCode = "duplicate_event_id"
	EnvironmentScopeViolation       EventRejectionErrorCode = "environment_scope_violation"
	KmsKeyUnauthorized              EventRejectionErrorCode = "kms_key_unauthorized"
	KmsKeyUnknown                   EventRejectionErrorCode = "kms_key_unknown"
	MissingRequiredConditionalField EventRejectionErrorCode = "missing_required_conditional_field"
	PayloadSha256Mismatch           EventRejectionErrorCode = "payload_sha256_mismatch"
	PayloadTooLarge                 EventRejectionErrorCode = "payload_too_large"
	RegionScopeViolation            EventRejectionErrorCode = "region_scope_violation"
	SchemaValidationFailed          EventRejectionErrorCode = "schema_validation_failed"
	TimestampOutOfRange             EventRejectionErrorCode = "timestamp_out_of_range"
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
	AgentRunEnd    Kind = "agent_run_end"
	AgentRunStart  Kind = "agent_run_start"
	AnomalyFlag    Kind = "anomaly_flag"
	Decision       Kind = "decision"
	GraphNodeEnter Kind = "graph_node_enter"
	GraphNodeExit  Kind = "graph_node_exit"
	Handoff        Kind = "handoff"
	HumanApproval  Kind = "human_approval"
	HumanInput     Kind = "human_input"
	LlmCall        Kind = "llm_call"
	PolicyCheck    Kind = "policy_check"
	SDKDiagnostic  Kind = "sdk_diagnostic"
	StateRead      Kind = "state_read"
	StateWrite     Kind = "state_write"
	ToolCall       Kind = "tool_call"
	ToolResult     Kind = "tool_result"
)

type ActionOutcome string

const (
	Cancelled ActionOutcome = "cancelled"
	Failure   ActionOutcome = "failure"
	Partial   ActionOutcome = "partial"
	Success   ActionOutcome = "success"
	Timeout   ActionOutcome = "timeout"
)

type Type string

const (
	Agent  Type = "agent"
	Human  Type = "human"
	System Type = "system"
	Tool   Type = "tool"
)

type Code string

const (
	ChainBreak                 Code = "chain_break"
	DataClassificationMismatch Code = "data_classification_mismatch"
	MissingAmbientContext      Code = "missing_ambient_context"
	ModelVersionDrift          Code = "model_version_drift"
	OutOfOrderArrival          Code = "out_of_order_arrival"
	PolicyThresholdWithoutHitl Code = "policy_threshold_without_hitl"
	RedactionPolicyMismatch    Code = "redaction_policy_mismatch"
	SchemaVersionWarning       Code = "schema_version_warning"
	UnauthorizedToolInvocation Code = "unauthorized_tool_invocation"
	UnknownAgentIdentity       Code = "unknown_agent_identity"
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

type Environment string

const (
	Development Environment = "development"
	Production  Environment = "production"
	Staging     Environment = "staging"
)

type Provider string

const (
	Anthropic   Provider = "anthropic"
	AwsBedrock  Provider = "aws_bedrock"
	AzureOpenai Provider = "azure_openai"
	Google      Provider = "google"
	Ollama      Provider = "ollama"
	Openai      Provider = "openai"
	Other       Provider = "other"
	SelfHosted  Provider = "self_hosted"
)

type ContentType string

const (
	ApplicationJSON                        ContentType = "application/json"
	ApplicationVndRunfileLlmRequestJSON    ContentType = "application/vnd.runfile.llm-request+json"
	ApplicationVndRunfileLlmResponseJSON   ContentType = "application/vnd.runfile.llm-response+json"
	ApplicationVndRunfileStateSnapshotJSON ContentType = "application/vnd.runfile.state-snapshot+json"
	ApplicationVndRunfileToolCallJSON      ContentType = "application/vnd.runfile.tool-call+json"
	ApplicationVndRunfileToolResultJSON    ContentType = "application/vnd.runfile.tool-result+json"
	TextPlain                              ContentType = "text/plain"
)

type Algorithm string

const (
	AES256Gcm Algorithm = "aes-256-gcm"
)

type Framework string

const (
	AnthropicClaude   Framework = "anthropic_claude"
	AnthropicClaudeJS Framework = "anthropic_claude_js"
	Langgraph         Framework = "langgraph"
	LanggraphJS       Framework = "langgraph_js"
	MCPClient         Framework = "mcp_client"
	Manual            Framework = "manual"
	Mastra            Framework = "mastra"
	OpenaiAgents      Framework = "openai_agents"
	OpenaiAgentsJS    Framework = "openai_agents_js"
	OtelGeneric       Framework = "otel_generic"
	VercelAISDK       Framework = "vercel_ai_sdk"
)

type Name string

const (
	RunfilePy  Name = "runfile-py"
	RunfileSDK Name = "@runfile/sdk"
)

type DataClassification string

const (
	Confidential DataClassification = "confidential"
	Fci          DataClassification = "fci"
	Internal     DataClassification = "internal"
	PCI          DataClassification = "pci"
	Phi          DataClassification = "phi"
	Pii          DataClassification = "pii"
	Public       DataClassification = "public"
)

type WallClockSource string

const (
	AwsTimeSync WallClockSource = "aws_time_sync"
	HostSystem  WallClockSource = "host_system"
	NTP         WallClockSource = "ntp"
	Unknown     WallClockSource = "unknown"
)

type Treatment string

const (
	Encrypt  Treatment = "encrypt"
	Redact   Treatment = "redact"
	Tokenize Treatment = "tokenize"
)

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
	return nil
}
