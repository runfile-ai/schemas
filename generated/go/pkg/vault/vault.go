// Code generated from Runfile Zod schemas (do not edit).
// Source: src/vault.ts

package vault

import (
	"encoding/json"
	"fmt"
	"time"
)

// Runfile vault schemas. Source: src/vault.ts (Zod). Do not edit by hand.
type Justification struct {
	ApproverMemberID *string    `json:"approver_member_id,omitempty"`
	EngagementID     string     `json:"engagement_id"`
	FreeText         string     `json:"free_text"`
	ReasonCode       ReasonCode `json:"reason_code"`
}

type LifecycleRequest struct {
	Action           Action     `json:"action"`
	ApproverMemberID *string    `json:"approver_member_id,omitempty"`
	Reason           string     `json:"reason"`
	ScheduledAt      *time.Time `json:"scheduled_at,omitempty"`
}

type LifecycleResponse struct {
	AuditEventID string     `json:"audit_event_id"`
	NewState     NewState   `json:"new_state"`
	ScheduledAt  *time.Time `json:"scheduled_at,omitempty"`
	Token        string     `json:"token"`
}

type RequesterContext struct {
	IPAddress     *string `json:"ip_address,omitempty"`
	MemberID      string  `json:"member_id"`
	MfaAgeSeconds int64   `json:"mfa_age_seconds"`
	Role          Role    `json:"role"`
	SessionID     string  `json:"session_id"`
	TenantID      string  `json:"tenant_id"`
	UserAgent     *string `json:"user_agent,omitempty"`
}

type ResolveBatchRequest struct {
	Justification Justification    `json:"justification"`
	Requester     RequesterContext `json:"requester"`
	Tokens        []string         `json:"tokens"`
}

type ResolveBatchResponse struct {
	Results []ResolveBatchResult `json:"results"`
}

type ResolveBatchResult struct {
	AuditEventID    *string          `json:"audit_event_id,omitempty"`
	DenialReason    *string          `json:"denial_reason,omitempty"`
	Status          Status           `json:"status"`
	Token           string           `json:"token"`
	TombstoneReason *TombstoneReason `json:"tombstone_reason,omitempty"`
	Value           *string          `json:"value,omitempty"`
}

type ResolveRequest struct {
	Justification Justification    `json:"justification"`
	Requester     RequesterContext `json:"requester"`
	Token         string           `json:"token"`
}

type ResolveResponse struct {
	AuditEventID   string     `json:"audit_event_id"`
	Classification string     `json:"classification"`
	CreatedAt      *time.Time `json:"created_at,omitempty"`
	Token          string     `json:"token"`
	Value          string     `json:"value"`
}

type TokenizeBatchRequest struct {
	Items []TokenizeRequest `json:"items"`
}

type TokenizeRequest struct {
	Classification Classification `json:"classification"`
	Context        *Context       `json:"context,omitempty"`
	Value          string         `json:"value"`
}

type Context struct {
	Normalize *bool `json:"normalize,omitempty"`
}

type TokenizeBatchResponse struct {
	Results []TokenizeResponse `json:"results"`
}

type TokenizeResponse struct {
	Created bool   `json:"created"`
	Token   string `json:"token"`
}

type VaultError struct {
	ErrorCode         ErrorCode `json:"error_code"`
	ErrorMessage      string    `json:"error_message"`
	RequestID         *string   `json:"request_id,omitempty"`
	RetryAfterSeconds *int64    `json:"retry_after_seconds,omitempty"`
}

type ReasonCode string

const (
	EscalationWorkflow   ReasonCode = "escalation_workflow"
	FindingInvestigation ReasonCode = "finding_investigation"
	Other                ReasonCode = "other"
	RegulatoryInquiry    ReasonCode = "regulatory_inquiry"
	RtbfProcessing       ReasonCode = "rtbf_processing"
	SampleReview         ReasonCode = "sample_review"
)

type Action string

const (
	PlaceOnLegalHold     Action = "place_on_legal_hold"
	ReleaseLegalHold     Action = "release_legal_hold"
	TombstoneAt          Action = "tombstone_at"
	TombstoneImmediately Action = "tombstone_immediately"
)

type NewState string

const (
	Active                NewState = "active"
	NewStateTombstoned    NewState = "tombstoned"
	OnLegalHold           NewState = "on_legal_hold"
	ScheduledForTombstone NewState = "scheduled_for_tombstone"
)

type Role string

const (
	ComplianceOfficer Role = "compliance_officer"
	ExternalAuditor   Role = "external_auditor"
	InternalAuditor   Role = "internal_auditor"
	WorkspaceAdmin    Role = "workspace_admin"
	WorkspaceOwner    Role = "workspace_owner"
)

type Status string

const (
	Denied           Status = "denied"
	NotFound         Status = "not_found"
	Resolved         Status = "resolved"
	StatusTombstoned Status = "tombstoned"
)

type TombstoneReason string

const (
	RetentionExpired TombstoneReason = "retention_expired"
	RtbfProcessed    TombstoneReason = "rtbf_processed"
	TenantOffboarded TombstoneReason = "tenant_offboarded"
)

type Classification string

const (
	AccountID       Classification = "account_id"
	Address         Classification = "address"
	Dob             Classification = "dob"
	Email           Classification = "email"
	OtherIdentifier Classification = "other_identifier"
	PersonName      Classification = "person_name"
	Phone           Classification = "phone"
	TaxIDPartial    Classification = "tax_id_partial"
	UserHandle      Classification = "user_handle"
)

type ErrorCode string

const (
	ApprovalInvalid            ErrorCode = "approval_invalid"
	ApprovalRequired           ErrorCode = "approval_required"
	ClassificationNotVaultable ErrorCode = "classification_not_vaultable"
	EngagementNotActive        ErrorCode = "engagement_not_active"
	EngagementScopeViolation   ErrorCode = "engagement_scope_violation"
	Forbidden                  ErrorCode = "forbidden"
	InternalError              ErrorCode = "internal_error"
	InvalidClassification      ErrorCode = "invalid_classification"
	InvalidValue               ErrorCode = "invalid_value"
	LifecycleConflict          ErrorCode = "lifecycle_conflict"
	MfaTooOld                  ErrorCode = "mfa_too_old"
	RateLimited                ErrorCode = "rate_limited"
	TokenNotFound              ErrorCode = "token_not_found"
	TokenTombstoned            ErrorCode = "token_tombstoned"
	Unauthorized               ErrorCode = "unauthorized"
)

func (r *LifecycleRequest) Validate() error {
	if r.Action == "tombstone_at" && r.ScheduledAt == nil {
		return fmt.Errorf("scheduled_at is required when action=tombstone_at")
	}
	return nil
}
