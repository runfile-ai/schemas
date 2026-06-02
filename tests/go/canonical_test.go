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

// TestComputeEventHashPayloadRefProjection asserts payload_ref's location /
// transport fields (s3_uri, s3_uri_intent, ciphertext_base64) are NOT hashed,
// so the witness (ciphertext + intent, no s3_uri) and the server (s3_uri, no
// ciphertext) hash a payload-bearing event identically — while the payload
// CONTENT (sha256, …) stays committed. Matches canonical.ts / canonical.py.
func TestComputeEventHashPayloadRefProjection(t *testing.T) {
	content := func() map[string]interface{} {
		return map[string]interface{}{
			"sha256":       "sha256:" + repeat("e", 64),
			"size_bytes":   1234,
			"encryption":   map[string]interface{}{"algorithm": "AES-256-GCM", "data_key_id": "dk_abc"},
			"content_type": "application/vnd.runfile.llm-request+json",
		}
	}
	event := func(ref map[string]interface{}) map[string]interface{} {
		return map[string]interface{}{
			"event_id":        "01HQ3X9N8K7P2M5R4T6V8W0Y1Z",
			"run_id":          "run_01HQ3X9N8K7P2M5R4T6V8W0Y00",
			"captured_at":     "2026-05-21T14:32:17.482Z",
			"prev_event_hash": "sha256:" + repeat("0", 64),
			"action":          map[string]interface{}{"kind": "llm_call", "name": "messages.create"},
			"payload_ref":     ref,
		}
	}

	witnessRef := content()
	witnessRef["s3_uri_intent"] = "s3://hint/x"
	witnessRef["ciphertext_base64"] = "Y2lwaGVydGV4dA=="

	serverRef := content()
	serverRef["s3_uri"] = "s3://runfile-payloads-prod/tnt/run/evt.bin"

	witnessHash, err := canonical.ComputeEventHash(event(witnessRef))
	if err != nil {
		t.Fatalf("witness hash: %v", err)
	}
	serverHash, err := canonical.ComputeEventHash(event(serverRef))
	if err != nil {
		t.Fatalf("server hash: %v", err)
	}
	if witnessHash != serverHash {
		t.Fatalf("witness and server hashes diverge on payload_ref location fields\n witness: %s\n server:  %s", witnessHash, serverHash)
	}

	// Content stays committed: a changed sha256 must change the hash.
	tamperedRef := content()
	tamperedRef["sha256"] = "sha256:" + repeat("f", 64)
	tamperedRef["s3_uri"] = "s3://runfile-payloads-prod/tnt/run/evt.bin"
	tamperedHash, err := canonical.ComputeEventHash(event(tamperedRef))
	if err != nil {
		t.Fatalf("tampered hash: %v", err)
	}
	if tamperedHash == serverHash {
		t.Fatal("changing payload_ref.sha256 (content) must change the event hash")
	}
}

// TestCanonicalNumberRFC8785 asserts integer-valued numbers serialise without a
// fractional part ("2.0" -> "2"), matching canonical.ts / canonical.py and the
// JS-normalised value the Event Processor hashes. Non-integer decimals are kept.
func TestCanonicalNumberRFC8785(t *testing.T) {
	cases := []struct{ in, want string }{
		{`{"x":2.0}`, `{"x":2}`},
		{`{"x":19555.0}`, `{"x":19555}`},
		{`{"x":0.7}`, `{"x":0.7}`},
		{`[1.0,2.5]`, `[1,2.5]`},
		{`{"x":42}`, `{"x":42}`},
		{`{"x":1000.0}`, `{"x":1000}`},
	}
	for _, c := range cases {
		dec := json.NewDecoder(bytes.NewReader([]byte(c.in)))
		dec.UseNumber()
		var v interface{}
		if err := dec.Decode(&v); err != nil {
			t.Fatalf("decode %s: %v", c.in, err)
		}
		got, err := canonical.Marshal(v)
		if err != nil {
			t.Fatalf("marshal %s: %v", c.in, err)
		}
		if string(got) != c.want {
			t.Fatalf("%s -> %q want %q", c.in, string(got), c.want)
		}
	}
}

// TestComputeEventHashIntegerFloatStable asserts an event carrying an
// integer-valued float (e.g. otel cache-token counts) hashes identically to the
// JS-normalised int form — the cross-language divergence that caused chain_break
// on every payload-bearing event before this fix.
func TestComputeEventHashIntegerFloatStable(t *testing.T) {
	base := func(tok interface{}) map[string]interface{} {
		return map[string]interface{}{
			"event_id":        "01HQ3X9N8K7P2M5R4T6V8W0Y1Z",
			"run_id":          "run_01HQ3X9N8K7P2M5R4T6V8W0Y00",
			"captured_at":     "2026-05-21T14:32:17.482Z",
			"prev_event_hash": "sha256:" + repeat("0", 64),
			"action":          map[string]interface{}{"kind": "llm_call", "name": "messages.create"},
			"otel_attributes": map[string]interface{}{"extra": map[string]interface{}{"cache_read_input_tokens": tok}},
		}
	}
	asFloat, _ := canonical.ComputeEventHash(base(json.Number("19555.0")))
	asInt, _ := canonical.ComputeEventHash(base(json.Number("19555")))
	if asFloat != asInt {
		t.Fatalf("integer-valued float must hash like its int form: %s vs %s", asFloat, asInt)
	}
}

func repeat(s string, n int) string {
	out := make([]byte, 0, n)
	for i := 0; i < n; i++ {
		out = append(out, s[0])
	}
	return string(out)
}
