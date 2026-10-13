---
"@runfile-ai/schemas": minor
---

Add `sandbox` to `EnvironmentEnum`. Every workspace now has a `sandbox` and a `production` environment, and each API key belongs to exactly one of them. Additive: existing `production` / `staging` / `development` values are unchanged, and the event hash projection is unaffected.
