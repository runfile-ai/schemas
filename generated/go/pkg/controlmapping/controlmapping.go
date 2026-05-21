// Code generated from Runfile Zod schemas (do not edit).
// Source: src/control-mapping.ts

package controlmapping

import "time"

import "encoding/json"

// Runfile control_mapping schemas. Source: src/control-mapping.ts (Zod). Do not edit by
// hand.
type ControlMapping struct {
	Controls         []Control `json:"controls"`
	Framework        string    `json:"framework"`
	FrameworkVersion string    `json:"framework_version"`
	MappingVersion   string    `json:"mapping_version"`
	PublishedAt      time.Time `json:"published_at"`
}

type Control struct {
	ControlID      string      `json:"control_id"`
	Description    string      `json:"description"`
	Predicates     []Predicate `json:"predicates"`
	RegulatoryTags []string    `json:"regulatory_tags"`
	Title          string      `json:"title"`
}

type Predicate struct {
	Expression string   `json:"expression"`
	Kind       Kind     `json:"kind"`
	Threshold  *float64 `json:"threshold,omitempty"`
}

type Kind string

const (
	Aggregate   Kind = "aggregate"
	EventAbsent Kind = "event_absent"
	EventCount  Kind = "event_count"
	EventExists Kind = "event_exists"
)
