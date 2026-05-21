// Code generated from Runfile Zod schemas (do not edit).
// Source: src/manifest.ts

package manifest

import "time"

import "encoding/json"

// Runfile manifest schemas. Source: src/manifest.ts (Zod). Do not edit by hand.
type MerkleManifest struct {
	AttestationDocument *string      `json:"attestation_document"`
	BuiltAt             time.Time    `json:"built_at"`
	DayUTC              string       `json:"day_utc"`
	KmsSignature        KmsSignature `json:"kms_signature"`
	LeafCount           int64        `json:"leaf_count"`
	Leaves              []Leaf       `json:"leaves"`
	ManifestVersion     string       `json:"manifest_version"`
	MerkleRoot          string       `json:"merkle_root"`
	PrevManifestRoot    *string      `json:"prev_manifest_root"`
	RekorEntry          *RekorEntry  `json:"rekor_entry,omitempty"`
	SchemaVersion       string       `json:"schema_version"`
	TenantID            string       `json:"tenant_id"`
}

type KmsSignature struct {
	KmsKeyArn        string `json:"kms_key_arn"`
	SignatureBase64  string `json:"signature_base64"`
	SigningAlgorithm string `json:"signing_algorithm"`
}

type Leaf struct {
	EventHash string `json:"event_hash"`
	EventID   string `json:"event_id"`
	LeafIndex int64  `json:"leaf_index"`
}

type RekorEntry struct {
	InclusionProof string `json:"inclusion_proof"`
	LogID          string `json:"log_id"`
	LogIndex       int64  `json:"log_index"`
}
