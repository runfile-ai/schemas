// Cross-language canonical-JSON parity — Go leg.
//
// Loads the shared fixture at tests/fixtures/canonical-vectors.json and asserts
// that the Go canonical.Marshal implementation produces byte-identical output
// to the `canonical` field of each vector. When a vector carries an `sha256`
// field, also asserts that canonical.SHA256Hex matches.
//
// This file is the Go counterpart of tests/cross-language.test.ts; together
// they enforce the "all three languages reproduce exactly" guarantee from the
// schemas spec.
package crosslang

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/runfile-ai/schemas/generated/go/pkg/canonical"
)

type vector struct {
	Name      string          `json:"name"`
	Input     json.RawMessage `json:"input"`
	Canonical string          `json:"canonical"`
	SHA256    string          `json:"sha256,omitempty"`
}

type fixture struct {
	Vectors []vector `json:"vectors"`
}

func loadVectors(t *testing.T) []vector {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("could not locate test source path")
	}
	path := filepath.Join(filepath.Dir(file), "..", "fixtures", "canonical-vectors.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}
	var f fixture
	if err := json.Unmarshal(raw, &f); err != nil {
		t.Fatalf("parse fixture: %v", err)
	}
	return f.Vectors
}

func decodeInput(t *testing.T, raw json.RawMessage) interface{} {
	t.Helper()
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	var v interface{}
	if err := dec.Decode(&v); err != nil {
		t.Fatalf("decode input: %v", err)
	}
	return v
}

func TestCanonicalBytesMatch(t *testing.T) {
	for _, vec := range loadVectors(t) {
		vec := vec
		t.Run(vec.Name, func(t *testing.T) {
			input := decodeInput(t, vec.Input)
			got, err := canonical.Marshal(input)
			if err != nil {
				t.Fatalf("Marshal: %v", err)
			}
			if string(got) != vec.Canonical {
				t.Fatalf("canonical bytes diverge\n got:  %q\n want: %q", string(got), vec.Canonical)
			}
		})
	}
}

func TestCanonicalSHA256Matches(t *testing.T) {
	for _, vec := range loadVectors(t) {
		vec := vec
		if vec.SHA256 == "" {
			continue
		}
		t.Run(vec.Name, func(t *testing.T) {
			input := decodeInput(t, vec.Input)
			got, err := canonical.SHA256Hex(input)
			if err != nil {
				t.Fatalf("SHA256Hex: %v", err)
			}
			if got != vec.SHA256 {
				t.Fatalf("sha256 diverges\n got:  %s\n want: %s", got, vec.SHA256)
			}
		})
	}
}

// TestComputeEventHashFieldContract asserts the Go leg honours the same hashed
// field set as canonical.ts / canonical.py: server-set fields don't change the
// hash, the authoritative prev_event_hash does. This keeps prev_event_hash_intent
// a real chain_break signal across languages.
func TestComputeEventHashFieldContract(t *testing.T) {
	base := func() map[string]interface{} {
		return map[string]interface{}{
			"event_id":        "01HQ3X9N8K7P2M5R4T6V8W0Y1Z",
			"run_id":          "run_01HQ3X9N8K7P2M5R4T6V8W0Y00",
			"captured_at":     "2026-05-21T14:32:17.482Z",
			"prev_event_hash": "sha256:" + repeat("0", 64),
			"action":          map[string]interface{}{"kind": "llm_call", "name": "messages.create"},
		}
	}

	want, err := canonical.ComputeEventHash(base())
	if err != nil {
		t.Fatalf("ComputeEventHash: %v", err)
	}

	for _, f := range []string{"event_hash", "tenant_id", "received_at", "anomaly_flags", "merkle_inclusion", "prev_event_hash_intent"} {
		ev := base()
		ev[f] = "server-set-value-should-not-matter"
		got, err := canonical.ComputeEventHash(ev)
		if err != nil {
			t.Fatalf("ComputeEventHash(%s): %v", f, err)
		}
		if got != want {
			t.Fatalf("server-set field %q changed the event hash (got %s want %s)", f, got, want)
		}
	}

	ev := base()
	ev["prev_event_hash"] = "sha256:" + repeat("d", 64)
	got, err := canonical.ComputeEventHash(ev)
	if err != nil {
		t.Fatalf("ComputeEventHash(prev): %v", err)
	}
	if got == want {
		t.Fatal("changing the authoritative prev_event_hash must change the event hash")
	}
}

func repeat(s string, n int) string {
	out := make([]byte, 0, n)
	for i := 0; i < n; i++ {
		out = append(out, s[0])
	}
	return string(out)
}
