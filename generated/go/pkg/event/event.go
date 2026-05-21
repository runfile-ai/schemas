// Code generated from Runfile Zod schemas (do not edit).
// Source: src/event.ts

package event

import (
	"encoding/json"
	"fmt"
	"time"
)

// Runfile event schemas. Source: src/event.ts (Zod). Do not edit by hand.
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

type MerkleInclusion struct {
	LeafIndex   int64  `json:"leaf_index"`
	ManifestURI string `json:"manifest_uri"`
	MerkleRoot  string `json:"merkle_root"`
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

type PayloadEncryption struct {
	Algorithm      Algorithm `json:"algorithm"`
	DataKeyWrapped string    `json:"data_key_wrapped"`
	KmsKeyArn      *string   `json:"kms_key_arn,omitempty"`
}

type PayloadRef struct {
	ContentType      *ContentType      `json:"content_type,omitempty"`
	Encryption       PayloadEncryption `json:"encryption"`
	RedactionApplied *RedactionApplied `json:"redaction_applied,omitempty"`
	S3URI            string            `json:"s3_uri"`
	Sha256           string            `json:"sha256"`
	SizeBytes        int64             `json:"size_bytes"`
}

type RedactionApplied struct {
	ClassifierVersion *string  `json:"classifier_version,omitempty"`
	RedactedClasses   []string `json:"redacted_classes,omitempty"`
	TokenizedClasses  []string `json:"tokenized_classes,omitempty"`
}

type RunfileEvent struct {
	Action                 Action               `json:"action"`
	Actor                  Actor                `json:"actor"`
	AgentRunID             string               `json:"agent_run_id"`
	AnomalyFlags           []AnomalyFlagElement `json:"anomaly_flags,omitempty"`
	CapturedAt             time.Time            `json:"captured_at"`
	Decision               *DecisionClass       `json:"decision,omitempty"`
	Environment            *Environment         `json:"environment,omitempty"`
	EventHash              string               `json:"event_hash"`
	EventID                string               `json:"event_id"`
	Labels                 map[string]string    `json:"labels,omitempty"`
	MerkleInclusion        *MerkleInclusion     `json:"merkle_inclusion,omitempty"`
	ModelRef               *ModelRef            `json:"model_ref,omitempty"`
	ParentEventID          *string              `json:"parent_event_id"`
	PayloadRef             *PayloadRef          `json:"payload_ref,omitempty"`
	PrevHash               string               `json:"prev_hash"`
	ReceivedAt             time.Time            `json:"received_at"`
	RedactionPolicyVersion string               `json:"redaction_policy_version"`
	RegulatoryScopeVersion *string              `json:"regulatory_scope_version,omitempty"`
	SchemaVersion          string               `json:"schema_version"`
	SDK                    SDKMetadata          `json:"sdk"`
	Subject                Subject              `json:"subject"`
	TenantID               string               `json:"tenant_id"`
	WallClockSource        WallClockSource      `json:"wall_clock_source"`
}

type SDKMetadata struct {
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

type Algorithm string

const (
	AES256Gcm Algorithm = "aes-256-gcm"
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

type Environment string

const (
	Development Environment = "development"
	Production  Environment = "production"
	Staging     Environment = "staging"
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

func (r *RunfileEvent) Validate() error {
	if r.Action.Kind == "llm_call" && r.ModelRef == nil {
		return fmt.Errorf("model_ref is required when action.kind=llm_call")
	}
	if r.Action.Kind == "decision" && r.Decision == nil {
		return fmt.Errorf("decision is required when action.kind=decision")
	}
	return nil
}
