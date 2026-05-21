# @runfile-ai/schemas

The single source of truth for every data shape that crosses a service boundary in Runfile.

- **Source of truth:** Zod definitions in TypeScript (`src/`)
- **Generated downstream:** JSON Schema 2020-12, Python Pydantic v2, Go structs (`generated/`)
- **Published to:**
  - npm — [`@runfile-ai/schemas`](https://www.npmjs.com/package/@runfile-ai/schemas)
  - PyPI — [`runfile-ai-schemas`](https://pypi.org/project/runfile-ai-schemas/)
  - Go modules — [`github.com/runfile-ai/schemas`](https://pkg.go.dev/github.com/runfile-ai/schemas) (via Git tags, no registry)
- **Versioned:** strict semver, managed by [Changesets](https://github.com/changesets/changesets). Every release PR is reviewable before it ships.

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
- **Python 3.10+** with `datamodel-code-generator >= 0.57` on PATH (Step 2: Pydantic generation). Python 3.9 caps at `datamodel-code-generator 0.45`, which produces an older form that CI rejects via the drift check.
  ```bash
  python3.11 -m pip install --user 'datamodel-code-generator[http]>=0.57,<1.0'
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

The npm/Go package version stays in lockstep — `package.json#version` is the master, and `generate.ts` templates it into `generated/python/pyproject.toml` automatically. The Go consumer-visible version is whatever Git tag is pushed (`v1.1.0`).

The package version may differ from the `event.schema_version` field embedded in events; in v1 they are kept in sync.

## Publishing

Releases are driven by [Changesets](https://github.com/changesets/changesets). Every change that should ship to consumers gets a changeset file describing the bump (`patch` / `minor` / `major`) and a one-line summary. Changesets accumulate on `main` until they're released as a batch.

### Day-to-day: include a changeset with your PR

```bash
pnpm changeset
# Pick patch/minor/major, write a 1–2 sentence summary.
# A markdown file lands in .changeset/; commit it alongside your code.
```

If your PR doesn't change anything consumer-visible (CI tweaks, docs, internal refactor), skip this — no changeset needed.

### Cutting a release

You don't tag manually. The flow is:

1. Merge PRs to `main` with their changesets.
2. The `Changesets` workflow opens a `chore(release): version packages` PR. It bumps `package.json`, writes `CHANGELOG.md`, and updates `generated/python/pyproject.toml` (via `pnpm run generate`).
3. Review that PR. When merged:
   - The same workflow runs again, calls `changeset publish`, which:
     - Publishes `@runfile-ai/schemas@X.Y.Z` to npm
     - Pushes the `vX.Y.Z` git tag
   - The tag push triggers `release.yml`, which announces the Go module path (and will publish to PyPI once the runfile-ai PyPI org is set up).

You can preview what the next release will look like locally:

```bash
pnpm changeset status --verbose
```

### One-time setup before the first release

| Registry | What to set up |
|---|---|
| **npm** | `NPM_TOKEN` repo secret (an automation token from npmjs.org with `Publish` rights on `@runfile-ai/schemas`) |
| **PyPI** | *Deferred to GA.* A trusted publisher on [pypi.org/manage/account/publishing/](https://pypi.org/manage/account/publishing/) pointing at this repo's `release.yml` workflow and `release` GitHub environment. Until then the PyPI step in `release.yml` is commented out. |
| **Go** | Nothing. The repo must be public (or the consumer's `GOPRIVATE` must include it) and tags must be pushed — Changesets pushes them for you. |

### Manual fallback: `pnpm run publish-all`

If CI is broken mid-release, you can publish from your laptop:

```bash
pnpm run publish-all              # full publish (npm + PyPI + Git tag verification)
pnpm run publish-all -- --dry-run # print steps without publishing
```

Requires `npm login`, a `~/.pypirc` token (or `PYPI_API_TOKEN` env var), and Python's `build` + `twine` (`pip3 install --user build twine`).

## License

Apache 2.0. See `LICENSE`.
