---
"@runfile-ai/schemas": minor
---

`environment` is now an environment *name* (a lowercase slug, max 32 chars) instead of the fixed `production | staging | development` list, and `EnvironmentEnum` is replaced by `EnvironmentNameSchema`. Environments belong to the workspace — every workspace starts with `sandbox` and `production` — so adding one no longer needs a schema release. SDKs seal the environment class their key's marker proves — `production` (rf_live_) or `non-production` (rf_test_) — unless the developer sets an exact name; ingest rejects values that contradict the key's environment and labels the run with the exact name. All previous values remain valid, and the event hash projection is unaffected.
