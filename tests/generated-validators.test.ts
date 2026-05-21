/**
 * Generated-artifact guard: asserts that the cross-field conditional rules
 * defined in src/*.ts (via `superRefine`) have been injected into the
 * generated Python and Go files. Codegen tools translate per-field
 * constraints but not cross-field rules — scripts/generate.ts injects them
 * in a post-processing step. This test fails loudly if that step is removed
 * or skipped, so the Python/Go consumers can't silently drift back to
 * lax validation.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..');

function py(domain: string): string {
  return readFileSync(resolve(ROOT, 'generated', 'python', 'runfile_schemas', `${domain}.py`), 'utf8');
}
function go(pkg: string): string {
  return readFileSync(resolve(ROOT, 'generated', 'go', 'pkg', pkg, `${pkg}.go`), 'utf8');
}

describe('Python: @model_validator injected for cross-field rules', () => {
  it('event.py: Actor enforces agent_identity / tool_id / tool_version_hash', () => {
    const src = py('event');
    expect(src).toContain('from pydantic import');
    expect(src).toContain('model_validator');
    expect(src).toMatch(/class Actor\(BaseModel\):[\s\S]*?@model_validator\(mode='after'\)[\s\S]*?"agent_identity is required when actor\.type=agent"/);
    expect(src).toContain('"tool_id is required when actor.type=tool"');
    expect(src).toContain('"tool_version_hash is required when actor.type=tool"');
  });

  it('event.py: RunfileEvent enforces model_ref / decision', () => {
    const src = py('event');
    expect(src).toMatch(/class RunfileEvent\(BaseModel\):[\s\S]*?@model_validator\(mode='after'\)[\s\S]*?"model_ref is required when action\.kind=llm_call"/);
    expect(src).toContain('"decision is required when action.kind=decision"');
  });

  it('ingest.py: Actor + EventSubmission both carry their validators', () => {
    const src = py('ingest');
    expect(src).toMatch(/class Actor\(BaseModel\):[\s\S]*?_validate_conditional_required/);
    expect(src).toMatch(/class EventSubmission\(BaseModel\):[\s\S]*?_validate_conditional_required/);
  });

  it('vault.py: LifecycleRequest enforces scheduled_at on tombstone_at', () => {
    const src = py('vault');
    expect(src).toMatch(/class LifecycleRequest\(BaseModel\):[\s\S]*?"scheduled_at is required when action=tombstone_at"/);
  });
});

describe('Go: Validate() method injected for cross-field rules', () => {
  it('event.go: imports fmt and defines Validate() on Actor and RunfileEvent', () => {
    const src = go('event');
    expect(src).toMatch(/import \([\s\S]*?"fmt"[\s\S]*?\)/);
    expect(src).toContain('func (r *Actor) Validate() error');
    expect(src).toContain('func (r *RunfileEvent) Validate() error');
    expect(src).toContain('"agent_identity is required when actor.type=agent"');
    expect(src).toContain('"model_ref is required when action.kind=llm_call"');
  });

  it('ingest.go: Validate() on Actor and EventSubmission', () => {
    const src = go('ingest');
    expect(src).toContain('func (r *Actor) Validate() error');
    expect(src).toContain('func (r *EventSubmission) Validate() error');
  });

  it('vault.go: Validate() on LifecycleRequest', () => {
    const src = go('vault');
    expect(src).toContain('func (r *LifecycleRequest) Validate() error');
    expect(src).toContain('"scheduled_at is required when action=tombstone_at"');
  });
});
