---
"@runfile-ai/schemas": minor
---

canonical: RFC 8785 number formatting — integer-valued floats serialise without ".0"

The canonical projection now renders an integer-valued number with no fractional
part (`2.0` → `2`, `19555.0` → `19555`) in the Go and Python legs, matching the
TS leg (`canonicalize`) and RFC 8785 (ECMAScript `Number::toString`). Non-integer
decimals are unchanged.

Python's `json.dumps` kept the `.0` on a float (`2.0` → `"2.0"`) and the Go leg
passed the JSON token through verbatim — both diverged from the value the Event
Processor actually hashes, because the ingest layer's `JSON.parse`/`stringify`
(JS has no int/float distinction) collapses `2.0` → `2`. Any event carrying an
integer-valued float — e.g. `otel_attributes.extra.cache_read_input_tokens:
19555.0` from per-turn cache-token accounting — therefore hashed differently on
the witness (SDK) than on the server, producing a false `chain_break` on every
such event.

Verified: an event with integer-valued-float otel attributes now hashes
identically to its int form across all three legs, and a shared fixture vector
locks the cross-language agreement.

Re-anchor (canonical projection change): SDK + EP + Verifier must adopt this
version together. Pre-release: no migration.
