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
