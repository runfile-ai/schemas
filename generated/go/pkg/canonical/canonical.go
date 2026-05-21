// Package canonical provides RFC 8785 JCS canonical JSON helpers — the Go leg.
//
// Every consumer (TS, Python, Go) must produce byte-identical canonical bytes
// for the same logical value, because the event_hash field commits to the
// canonical serialisation. The TS leg in `@runfile/schemas/canonical` is the
// reference implementation; this Go implementation matches it byte-for-byte
// on every fixture in tests/fixtures/canonical-vectors.json.
//
// This package is hand-written (not generated). It lives alongside the
// generated Go structs because it is part of the same module.
package canonical

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
)

// Marshal returns the canonical JSON serialisation of v per RFC 8785 (JCS).
//
// Use this for any value whose hash crosses a service boundary. Do NOT use
// it for general API payloads (those go through plain json.Marshal) — RFC 8785
// is strictly for hash determinism.
func Marshal(v interface{}) ([]byte, error) {
	// Round-trip via the standard encoder to normalise the value into the
	// JSON data model (map[string]interface{}, []interface{}, ...), then
	// re-serialise with deterministic ordering.
	raw, err := json.Marshal(v)
	if err != nil {
		return nil, fmt.Errorf("canonical: marshal: %w", err)
	}
	var generic interface{}
	dec := json.NewDecoder(strings.NewReader(string(raw)))
	dec.UseNumber()
	if err := dec.Decode(&generic); err != nil {
		return nil, fmt.Errorf("canonical: decode: %w", err)
	}
	var buf strings.Builder
	if err := write(&buf, generic); err != nil {
		return nil, err
	}
	return []byte(buf.String()), nil
}

// SHA256Hex returns SHA-256(Marshal(v)) formatted as "sha256:<64 hex>".
func SHA256Hex(v interface{}) (string, error) {
	canonical, err := Marshal(v)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(canonical)
	return "sha256:" + hex.EncodeToString(sum[:]), nil
}

// ComputeEventHash returns the canonical SHA-256 of an event with the
// event_hash field omitted from the input. The result is the value that
// belongs in the event's event_hash field.
func ComputeEventHash(event map[string]interface{}) (string, error) {
	rest := make(map[string]interface{}, len(event))
	for k, v := range event {
		if k == "event_hash" {
			continue
		}
		rest[k] = v
	}
	return SHA256Hex(rest)
}

func write(buf *strings.Builder, v interface{}) error {
	switch t := v.(type) {
	case nil:
		buf.WriteString("null")
	case bool:
		if t {
			buf.WriteString("true")
		} else {
			buf.WriteString("false")
		}
	case string:
		raw, err := json.Marshal(t)
		if err != nil {
			return err
		}
		buf.Write(raw)
	case json.Number:
		buf.WriteString(string(t))
	case []interface{}:
		buf.WriteByte('[')
		for i, item := range t {
			if i > 0 {
				buf.WriteByte(',')
			}
			if err := write(buf, item); err != nil {
				return err
			}
		}
		buf.WriteByte(']')
	case map[string]interface{}:
		keys := make([]string, 0, len(t))
		for k := range t {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		buf.WriteByte('{')
		for i, k := range keys {
			if i > 0 {
				buf.WriteByte(',')
			}
			kb, err := json.Marshal(k)
			if err != nil {
				return err
			}
			buf.Write(kb)
			buf.WriteByte(':')
			if err := write(buf, t[k]); err != nil {
				return err
			}
		}
		buf.WriteByte('}')
	default:
		return fmt.Errorf("canonical: unsupported value type %T", v)
	}
	return nil
}
