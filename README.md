# @runfile-ai/schemas

The single source of truth for every data shape that crosses a service boundary in Runfile.

- **Source of truth:** Zod definitions in TypeScript (`src/`)
- **Generated downstream:** JSON Schema 2020-12, Python Pydantic v2, Go structs (`generated/`)
- **Published to:**
  - npm — [`@runfile-ai/schemas`](https://www.npmjs.com/package/@runfile-ai/schemas)
  - PyPI — [`runfile-ai-schemas`](https://pypi.org/project/runfile-ai-schemas/)
  - Go modules — [`github.com/runfile-ai/schemas`](https://pkg.go.dev/github.com/runfile-ai/schemas) (via Git tags, no registry)
- **Versioned:** strict semver. Releases are tagged manually because the blast radius is large.

See [`private/apispecs/schemas.md`](../private/apispecs/schemas.md) (internal) for the full design rationale.

## What's in here

| Path | Contents |
|------|----------|
| `src/event.ts` | `RunfileEventSchema` + sub-shapes (actor, action, subject, model_ref, decision, payload_ref) |
| `src/ingest.ts` | `BatchSubmissionSchema`, `EventSubmissionSchema`, error/response shapes for the Ingest API |
| `src/vault.ts` | Tokenize/Resolve/Lifecycle request and response shapes |
| `src/evidence.ts` | Evidence bundle format (consumed by the Verifier CLI) |
| `src/manifest.ts` | Daily Merkle manifest format |
| `src/control-mapping.ts` | Regulatory control mapping YAML schema |
| `src/canonical.ts` | RFC 8785 JCS canonical JSON helpers |
| `generated/` | JSON Schema, Pydantic, Go structs — never edit by hand (except `canonical.py` / `canonical.go`) |
| `scripts/generate.ts` | Master generator: Zod → JSON Schema → Pydantic + Go |
| `scripts/check-drift.ts` | CI guard: fails if `generated/` is out of date w.r.t. Zod source |
| `scripts/publish-all.ts` | Local fallback for publishing (CI is the normal path) |
| `go.mod` | Go module declaration at repo root — module path `github.com/runfile-ai/schemas` |

## Usage

```bash
pnpm install
pnpm run generate     # regenerate downstream artifacts after editing Zod
pnpm test             # round-trip + canonical JSON + cross-language fixtures
pnpm run check-drift  # verify committed generated/ matches what generate would produce
pnpm run build        # compile TypeScript to dist/
pnpm run publish-all  # local fallback for publishing (CI is the normal path)
```

### Toolchain required for `pnpm run generate`

- **Node 20+** — always
- **Python 3.9+** with `datamodel-code-generator` on PATH (Step 2: Pydantic generation)
  ```bash
  pip3 install --user 'datamodel-code-generator[http]'
  ```
- **quicktype** — installed as a devDependency, invoked via `pnpm exec` (Step 3: Go generation). No separate install needed.

No Go toolchain is required for codegen — `quicktype` is the documented alternative to `go-jsonschema` and produces struct files that compile under any Go 1.22+ consumer.

### What's hand-written vs generated

Everything under `generated/` is produced by `pnpm run generate` EXCEPT:

- `generated/python/runfile_schemas/canonical.py` — RFC 8785 canonical JSON helper for Python (parity with the TS leg)
- `generated/go/pkg/canonical/canonical.go` — RFC 8785 canonical JSON helper for Go

These are part of the published packages but cannot be auto-generated from Zod. They sit alongside the generated files and are preserved across regenerations.

### In a TypeScript consumer

```ts
import { RunfileEventSchema, type RunfileEvent } from '@runfile-ai/schemas/event';
import { BatchSubmissionSchema } from '@runfile-ai/schemas/ingest';

const event: RunfileEvent = RunfileEventSchema.parse(unknownInput);
```

### In a Python consumer

```python
from runfile_schemas.event import RunfileEvent, Actor
from runfile_schemas.ingest import BatchSubmission
from runfile_schemas.canonical import canonical_sha256
```

(The PyPI distribution is `runfile-ai-schemas`; the importable package name is `runfile_schemas`.)

### In a Go consumer

```go
import (
    "github.com/runfile-ai/schemas/generated/go/pkg/event"
    "github.com/runfile-ai/schemas/generated/go/pkg/canonical"
)
```

The `go.mod` at the repo root declares `module github.com/runfile-ai/schemas`, so Go consumers fetch with:

```bash
go get github.com/runfile-ai/schemas@v1.0.0
```

The Git tag IS the Go module version — there's no separate registry.

## Versioning

Strict semver:
- **Major** (`1.x → 2.x`): breaking. Removed fields, changed validation. Forces coordinated SDK upgrades.
- **Minor** (`1.0 → 1.1`): additive only. New optional fields, new enum values.
- **Patch** (`1.0.0 → 1.0.1`): documentation fixes only.

The npm/PyPI/Go package version stays in lockstep — `package.json#version` is the master, and `generate.ts` templates it into `generated/python/pyproject.toml` automatically. The Go consumer-visible version is whatever Git tag you push (`v1.1.0`).

The npm/PyPI/Go package version may differ from the `event.schema_version` field embedded in events; in v1 they are kept in sync.

## Publishing

### Normal path: CI on tagged push

```bash
# Bump version in package.json (1.0.0 → 1.1.0), commit, tag, push.
pnpm version 1.1.0       # bumps package.json + creates git tag v1.1.0
git push && git push --tags
```

The `release.yml` workflow then:
1. Regenerates everything from Zod and verifies no drift
2. Publishes `@runfile-ai/schemas@1.1.0` to npm (uses `NPM_TOKEN` secret)
3. Builds `runfile-ai-schemas==1.1.0` wheel + sdist and publishes to PyPI via [trusted publishing](https://docs.pypi.org/trusted-publishers/) (no secret required — OIDC)
4. The Git tag itself is the Go release; consumers run `go get github.com/runfile-ai/schemas@v1.1.0`

### One-time setup before the first release

| Registry | What to set up |
|---|---|
| **npm** | `NPM_TOKEN` repo secret (an automation token from npmjs.org with `Publish` rights on `@runfile-ai/schemas`) |
| **PyPI** | A trusted publisher on [pypi.org/manage/account/publishing/](https://pypi.org/manage/account/publishing/) pointing at this repo's `release.yml` workflow and `release` GitHub environment. Project `runfile-ai-schemas` must exist (or be reservable as a pending publisher). |
| **Go** | Nothing. The repo must be public (or the consumer's `GOPRIVATE` must include it) and tags must be pushed. |

### Manual fallback: `pnpm run publish-all`

If CI is broken mid-release, you can publish from your laptop:

```bash
pnpm run publish-all              # full publish (npm + PyPI + Git tag verification)
pnpm run publish-all -- --dry-run # print steps without publishing
```

Requires `npm login`, a `~/.pypirc` token (or `PYPI_API_TOKEN` env var), and Python's `build` + `twine` (`pip3 install --user build twine`).

## License

Apache 2.0. See `LICENSE`.
