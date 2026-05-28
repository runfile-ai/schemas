/**
 * Master generator: Zod source → JSON Schema → Python Pydantic v2 + Go structs.
 *
 *   Step 1: For each domain, emit ONE JSON Schema document with all the
 *           domain's types as properties of a wrapper object (so codegen tools
 *           emit a class/struct per type).
 *   Step 2: Pydantic file per domain via `datamodel-codegen`. Wrapper class
 *           stripped in post-processing.
 *   Step 3: Go file per domain via `quicktype`. Wrapper struct + Marshal/
 *           Unmarshal helpers stripped in post-processing.
 *   Step 4: Hand-written infra files (pyproject.toml, __init__.py, go.mod).
 *
 * Idempotent: running twice produces byte-identical output. CI's check-drift
 * regenerates and fails if `generated/` differs from what's committed.
 *
 * Toolchain required:
 *   - Node 20+ (always)
 *   - Python 3.9+ with `datamodel-code-generator` on PATH (Step 2)
 *   - `quicktype` (installed as devDependency) (Step 3)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z, type ZodTypeAny } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import * as event from '../src/event.js';
import * as ingest from '../src/ingest.js';
import * as vault from '../src/vault.js';
import * as manifest from '../src/manifest.js';
import * as evidence from '../src/evidence.js';
import * as controlMapping from '../src/control-mapping.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SCHEMA_DIR = resolve(ROOT, 'generated', 'json-schema');
const PY_DIR = resolve(ROOT, 'generated', 'python', 'runfile_schemas');
const GO_DIR = resolve(ROOT, 'generated', 'go', 'pkg');

interface DomainBundle {
  domain: string;
  pyModule: string;
  goPackage: string;
  sourceFile: string;
  types: Record<string, ZodTypeAny>;
}

const bundles: DomainBundle[] = [
  {
    domain: 'event',
    pyModule: 'event',
    goPackage: 'event',
    sourceFile: 'event.ts',
    types: {
      RunfileRun: event.RunfileRunSchema,
      RunfileEvent: event.RunfileEventSchema,
      Actor: event.ActorSchema,
      Action: event.ActionSchema,
      Subject: event.SubjectSchema,
      ModelRef: event.ModelRefSchema,
      Decision: event.DecisionSchema,
      SuspensionDetails: event.SuspensionDetailsSchema,
      ResumeDetails: event.ResumeDetailsSchema,
      DelegationDetails: event.DelegationDetailsSchema,
      HandoffDetails: event.HandoffDetailsSchema,
      SuspensionInterval: event.SuspensionIntervalSchema,
      PayloadRef: event.PayloadRefSchema,
      PayloadEncryption: event.PayloadEncryptionSchema,
      RedactionApplied: event.RedactionAppliedSchema,
      OtelAttributes: event.OtelAttributesSchema,
      AnomalyFlag: event.AnomalyFlagSchema,
      SdkMetadata: event.SdkMetadataSchema,
      RunReference: event.RunReferenceSchema,
      MerkleInclusion: event.MerkleInclusionSchema,
    },
  },
  {
    domain: 'ingest',
    pyModule: 'ingest',
    goPackage: 'ingest',
    sourceFile: 'ingest.ts',
    types: {
      BatchSubmission: ingest.BatchSubmissionSchema,
      RunCreateItem: ingest.RunCreateItemSchema,
      RunUpdateItem: ingest.RunUpdateItemSchema,
      RunEndItem: ingest.RunEndItemSchema,
      EventItem: ingest.EventItemSchema,
      RunSubmission: ingest.RunSubmissionSchema,
      EventSubmission: ingest.EventSubmissionSchema,
      PayloadSubmission: ingest.PayloadSubmissionSchema,
      BatchAccepted: ingest.BatchAcceptedSchema,
      BatchPartial: ingest.BatchPartialSchema,
      BatchRejected: ingest.BatchRejectedSchema,
      AcceptedItem: ingest.AcceptedItemSchema,
      RejectedItem: ingest.RejectedItemSchema,
      IngestError: ingest.ErrorSchema,
      RedactionPolicy: ingest.RedactionPolicySchema,
    },
  },
  {
    domain: 'vault',
    pyModule: 'vault',
    goPackage: 'vault',
    sourceFile: 'vault.ts',
    types: {
      TokenizeRequest: vault.TokenizeRequestSchema,
      TokenizeResponse: vault.TokenizeResponseSchema,
      TokenizeBatchRequest: vault.TokenizeBatchRequestSchema,
      TokenizeBatchResponse: vault.TokenizeBatchResponseSchema,
      ResolveRequest: vault.ResolveRequestSchema,
      ResolveResponse: vault.ResolveResponseSchema,
      ResolveBatchRequest: vault.ResolveBatchRequestSchema,
      ResolveBatchResponse: vault.ResolveBatchResponseSchema,
      ResolveBatchResult: vault.ResolveBatchResultSchema,
      LifecycleRequest: vault.LifecycleRequestSchema,
      LifecycleResponse: vault.LifecycleResponseSchema,
      RequesterContext: vault.RequesterContextSchema,
      Justification: vault.JustificationSchema,
      VaultError: vault.VaultErrorSchema,
    },
  },
  {
    domain: 'manifest',
    pyModule: 'manifest',
    goPackage: 'manifest',
    sourceFile: 'manifest.ts',
    types: { MerkleManifest: manifest.MerkleManifestSchema },
  },
  {
    domain: 'evidence',
    pyModule: 'evidence',
    goPackage: 'evidence',
    sourceFile: 'evidence.ts',
    types: { EvidenceBundle: evidence.EvidenceBundleSchema },
  },
  {
    domain: 'control_mapping',
    pyModule: 'control_mapping',
    goPackage: 'controlmapping',
    sourceFile: 'control-mapping.ts',
    types: { ControlMapping: controlMapping.ControlMappingSchema },
  },
];

/** Stable wrapper class name. Both tools generate one struct/class for this; we
 *  strip it in post-processing because it's not part of the public API. */
const WRAPPER_NAME = '_RunfileBundle';

// ---------------------------------------------------------------------------
// Cross-field conditional rules
// ---------------------------------------------------------------------------
//
// Codegen tools (datamodel-codegen, quicktype) translate per-field constraints
// (regex, enums, required, min/max) but do not translate Zod's `superRefine`
// cross-field rules. We re-inject those rules into Python (as Pydantic
// `@model_validator(mode='after')` methods) and Go (as `Validate()` methods)
// here. Each entry below mirrors one `ctx.addIssue(...)` in `src/*.ts`.
//
// Keep this list in sync with the `.superRefine(...)` blocks in src/.
interface ConditionalRule {
  pyClass: string; // Pydantic class name (and Go struct name when they match)
  goStruct: string; // Go struct name (may differ if quicktype renames)
  domains: string[]; // which generated/{python,go} modules need this rule
  pyCondition: string; // Python expression that triggers the requirement
  pyRequireNone: string; // Python expression that is True when required field is missing
  goCondition: string; // Go expression (receiver `r`) that triggers the requirement
  goRequireNil: string; // Go expression (receiver `r`) that is true when required field is missing
  message: string;
}

const CONDITIONAL_RULES: ConditionalRule[] = [
  // Actor: agent_identity required when type=agent (src/event.ts:30)
  {
    pyClass: 'Actor',
    goStruct: 'Actor',
    domains: ['event', 'ingest'],
    pyCondition: "self.type.value == 'agent'",
    pyRequireNone: 'self.agent_identity is None',
    goCondition: 'r.Type == "agent"',
    goRequireNil: 'r.AgentIdentity == nil',
    message: 'agent_identity is required when actor.type=agent',
  },
  // Actor: tool_id required when type=tool (src/event.ts:38)
  {
    pyClass: 'Actor',
    goStruct: 'Actor',
    domains: ['event', 'ingest'],
    pyCondition: "self.type.value == 'tool'",
    pyRequireNone: 'self.tool_id is None',
    goCondition: 'r.Type == "tool"',
    goRequireNil: 'r.ToolID == nil',
    message: 'tool_id is required when actor.type=tool',
  },
  // Actor: tool_version_hash required when type=tool (src/event.ts:45)
  {
    pyClass: 'Actor',
    goStruct: 'Actor',
    domains: ['event', 'ingest'],
    pyCondition: "self.type.value == 'tool'",
    pyRequireNone: 'self.tool_version_hash is None',
    goCondition: 'r.Type == "tool"',
    goRequireNil: 'r.ToolVersionHash == nil',
    message: 'tool_version_hash is required when actor.type=tool',
  },
  // RunfileEvent: model_ref required when action.kind=llm_call (src/event.ts:311)
  {
    pyClass: 'RunfileEvent',
    goStruct: 'RunfileEvent',
    domains: ['event'],
    pyCondition: "self.action.kind.value == 'llm_call'",
    pyRequireNone: 'self.model_ref is None',
    goCondition: 'r.Action.Kind == "llm_call"',
    goRequireNil: 'r.ModelRef == nil',
    message: 'model_ref is required when action.kind=llm_call',
  },
  // RunfileEvent: decision required when action.kind=decision (src/event.ts:318)
  {
    pyClass: 'RunfileEvent',
    goStruct: 'RunfileEvent',
    domains: ['event'],
    pyCondition: "self.action.kind.value == 'decision'",
    pyRequireNone: 'self.decision is None',
    goCondition: 'r.Action.Kind == "decision"',
    goRequireNil: 'r.Decision == nil',
    message: 'decision is required when action.kind=decision',
  },
  // EventSubmission (ingest envelope): model_ref required when action.kind=llm_call (src/ingest.ts:84)
  {
    pyClass: 'EventSubmission',
    goStruct: 'EventSubmission',
    domains: ['ingest'],
    pyCondition: "self.action.kind.value == 'llm_call'",
    pyRequireNone: 'self.model_ref is None',
    goCondition: 'r.Action.Kind == "llm_call"',
    goRequireNil: 'r.ModelRef == nil',
    message: 'model_ref is required when action.kind=llm_call',
  },
  // EventSubmission: decision required when action.kind=decision (src/ingest.ts)
  {
    pyClass: 'EventSubmission',
    goStruct: 'EventSubmission',
    domains: ['ingest'],
    pyCondition: "self.action.kind.value == 'decision'",
    pyRequireNone: 'self.decision is None',
    goCondition: 'r.Action.Kind == "decision"',
    goRequireNil: 'r.Decision == nil',
    message: 'decision is required when action.kind=decision',
  },
  // Lifecycle/relationship detail requirements (RunfileEvent + EventSubmission).
  // kind=run_suspend → suspension_details
  {
    pyClass: 'RunfileEvent',
    goStruct: 'RunfileEvent',
    domains: ['event'],
    pyCondition: "self.action.kind.value == 'run_suspend'",
    pyRequireNone: 'self.suspension_details is None',
    goCondition: 'r.Action.Kind == "run_suspend"',
    goRequireNil: 'r.SuspensionDetails == nil',
    message: 'suspension_details is required when action.kind=run_suspend',
  },
  {
    pyClass: 'EventSubmission',
    goStruct: 'EventSubmission',
    domains: ['ingest'],
    pyCondition: "self.action.kind.value == 'run_suspend'",
    pyRequireNone: 'self.suspension_details is None',
    goCondition: 'r.Action.Kind == "run_suspend"',
    goRequireNil: 'r.SuspensionDetails == nil',
    message: 'suspension_details is required when action.kind=run_suspend',
  },
  // kind=run_resume → resume_details
  {
    pyClass: 'RunfileEvent',
    goStruct: 'RunfileEvent',
    domains: ['event'],
    pyCondition: "self.action.kind.value == 'run_resume'",
    pyRequireNone: 'self.resume_details is None',
    goCondition: 'r.Action.Kind == "run_resume"',
    goRequireNil: 'r.ResumeDetails == nil',
    message: 'resume_details is required when action.kind=run_resume',
  },
  {
    pyClass: 'EventSubmission',
    goStruct: 'EventSubmission',
    domains: ['ingest'],
    pyCondition: "self.action.kind.value == 'run_resume'",
    pyRequireNone: 'self.resume_details is None',
    goCondition: 'r.Action.Kind == "run_resume"',
    goRequireNil: 'r.ResumeDetails == nil',
    message: 'resume_details is required when action.kind=run_resume',
  },
  // kind=delegate → delegation_details
  {
    pyClass: 'RunfileEvent',
    goStruct: 'RunfileEvent',
    domains: ['event'],
    pyCondition: "self.action.kind.value == 'delegate'",
    pyRequireNone: 'self.delegation_details is None',
    goCondition: 'r.Action.Kind == "delegate"',
    goRequireNil: 'r.DelegationDetails == nil',
    message: 'delegation_details is required when action.kind=delegate',
  },
  {
    pyClass: 'EventSubmission',
    goStruct: 'EventSubmission',
    domains: ['ingest'],
    pyCondition: "self.action.kind.value == 'delegate'",
    pyRequireNone: 'self.delegation_details is None',
    goCondition: 'r.Action.Kind == "delegate"',
    goRequireNil: 'r.DelegationDetails == nil',
    message: 'delegation_details is required when action.kind=delegate',
  },
  // kind=handoff → handoff_details
  {
    pyClass: 'RunfileEvent',
    goStruct: 'RunfileEvent',
    domains: ['event'],
    pyCondition: "self.action.kind.value == 'handoff'",
    pyRequireNone: 'self.handoff_details is None',
    goCondition: 'r.Action.Kind == "handoff"',
    goRequireNil: 'r.HandoffDetails == nil',
    message: 'handoff_details is required when action.kind=handoff',
  },
  {
    pyClass: 'EventSubmission',
    goStruct: 'EventSubmission',
    domains: ['ingest'],
    pyCondition: "self.action.kind.value == 'handoff'",
    pyRequireNone: 'self.handoff_details is None',
    goCondition: 'r.Action.Kind == "handoff"',
    goRequireNil: 'r.HandoffDetails == nil',
    message: 'handoff_details is required when action.kind=handoff',
  },
  // LifecycleRequest: scheduled_at required when action=tombstone_at (src/vault.ts)
  {
    pyClass: 'LifecycleRequest',
    goStruct: 'LifecycleRequest',
    domains: ['vault'],
    pyCondition: "self.action.value == 'tombstone_at'",
    pyRequireNone: 'self.scheduled_at is None',
    goCondition: 'r.Action == "tombstone_at"',
    goRequireNil: 'r.ScheduledAt == nil',
    message: 'scheduled_at is required when action=tombstone_at',
  },
];

// ---------------------------------------------------------------------------
// Step 1
// ---------------------------------------------------------------------------

function step1WriteJsonSchema(bundle: DomainBundle): string {
  // Build a wrapper Zod schema whose fields are all the named types.
  // Pass the same types as `definitions` so zod-to-json-schema emits $refs
  // (rather than inlining each schema body twice). The wrapper is the root
  // and gets stripped from the codegen output in steps 2 and 3.
  const wrapper = z.object(bundle.types).strict();
  const out = zodToJsonSchema(wrapper, {
    name: WRAPPER_NAME,
    target: 'jsonSchema2019-09',
    definitions: bundle.types,
  }) as Record<string, unknown>;

  // Decorate the root document with title/description; preserve everything else.
  const document = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: bundle.domain,
    description: `Runfile ${bundle.domain} schemas. Source: src/${bundle.sourceFile} (Zod). Do not edit by hand.`,
    ...out,
  };

  mkdirSync(SCHEMA_DIR, { recursive: true });
  const path = resolve(SCHEMA_DIR, `${bundle.domain}.json`);
  writeFileSync(path, `${JSON.stringify(document, null, 2)}\n`);
  return path;
}

// ---------------------------------------------------------------------------
// Step 2
// ---------------------------------------------------------------------------

function findDatamodelCodegen(): string {
  // Prefer newer Pythons first: datamodel-codegen >=0.46 dropped Python 3.9,
  // so the 3.9 binary on a multi-version host is stuck at 0.45 and produces
  // older (less-correct) Pydantic output. Pick the newest available so local
  // matches CI (which installs the latest under Python 3.11).
  const candidates = [
    `${process.env.HOME}/Library/Python/3.13/bin/datamodel-codegen`,
    `${process.env.HOME}/Library/Python/3.12/bin/datamodel-codegen`,
    `${process.env.HOME}/Library/Python/3.11/bin/datamodel-codegen`,
    `${process.env.HOME}/Library/Python/3.10/bin/datamodel-codegen`,
    `${process.env.HOME}/Library/Python/3.9/bin/datamodel-codegen`,
    '/usr/local/bin/datamodel-codegen',
    'datamodel-codegen',
  ];
  for (const candidate of candidates) {
    try {
      if (candidate.startsWith('/') || candidate.startsWith('~')) {
        if (existsSync(candidate)) return candidate;
      } else {
        execFileSync('which', [candidate], { stdio: 'ignore' });
        return candidate;
      }
    } catch {
      // continue
    }
  }
  throw new Error('datamodel-codegen not found. Install: pip3 install datamodel-code-generator');
}

function step2WritePython(bundle: DomainBundle, schemaPath: string, dmcg: string): void {
  mkdirSync(PY_DIR, { recursive: true });
  const outPath = resolve(PY_DIR, `${bundle.pyModule}.py`);
  execFileSync(
    dmcg,
    [
      '--input',
      schemaPath,
      '--input-file-type',
      'jsonschema',
      '--output',
      outPath,
      '--output-model-type',
      'pydantic_v2.BaseModel',
      '--use-standard-collections',
      '--use-union-operator',
      '--field-constraints',
      '--target-python-version',
      '3.10',
      '--disable-timestamp',
      '--use-schema-description',
      '--class-name',
      WRAPPER_NAME,
    ],
    { stdio: ['ignore', 'inherit', 'inherit'] },
  );

  // Post-process: remove the wrapper class. datamodel-codegen renames
  // `_RunfileBundle` → `FieldRunfileBundle` because Python class names can't
  // begin with `_` in `--class-name` (it prefixes "Field"). Strip any class
  // whose name contains "RunfileBundle" (always our wrapper, never a user type).
  let py = readFileSync(outPath, 'utf8');
  py = py.replace(/\n\n\nclass [A-Za-z]*RunfileBundle\(BaseModel\)[\s\S]*$/, '\n');
  writeFileSync(outPath, py);
}

// ---------------------------------------------------------------------------
// Step 3
// ---------------------------------------------------------------------------

function step3WriteGo(bundle: DomainBundle, schemaPath: string): void {
  const outDir = resolve(GO_DIR, bundle.goPackage);
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, `${bundle.goPackage}.go`);
  execFileSync(
    'pnpm',
    [
      'exec',
      'quicktype',
      '--lang',
      'go',
      '--package',
      bundle.goPackage,
      '--src-lang',
      'schema',
      '--src',
      schemaPath,
      '--top-level',
      WRAPPER_NAME,
      '--out',
      outPath,
    ],
    { stdio: ['ignore', 'inherit', 'inherit'], cwd: ROOT },
  );

  // Post-process: remove the wrapper struct and its Marshal/Unmarshal helpers.
  // quicktype names the wrapper after --top-level, stripping leading underscore:
  // `_RunfileBundle` → `RunfileBundle`.
  const wrapperGoName = WRAPPER_NAME.replace(/^_/, '');
  let go = readFileSync(outPath, 'utf8');

  // Strip the header comment block (it references the wrapper by name).
  go = go.replace(/^\/\/[\s\S]*?\npackage /, 'package ');

  // Strip the wrapper's Unmarshal/Marshal function block.
  const fnBlockPattern = new RegExp(
    `func Unmarshal${wrapperGoName}\\([\\s\\S]*?^\\}\\n\\nfunc \\(r \\*${wrapperGoName}\\) Marshal\\([\\s\\S]*?^\\}\\n\\n`,
    'm',
  );
  go = go.replace(fnBlockPattern, '');

  // Strip the wrapper struct definition.
  const structPattern = new RegExp(`type ${wrapperGoName} struct \\{[\\s\\S]*?^\\}\\n\\n`, 'm');
  go = go.replace(structPattern, '');

  // Re-add a single-line header.
  go = `// Code generated from Runfile Zod schemas (do not edit).\n// Source: src/${bundle.sourceFile}\n\n${go}`;

  writeFileSync(outPath, go);
}

// ---------------------------------------------------------------------------
// Step 3.5: inject cross-field validators into Python and Go generated files
// ---------------------------------------------------------------------------

function pyValidatorMethod(pyClass: string, rules: ConditionalRule[]): string {
  const lines: string[] = [];
  lines.push(`    @model_validator(mode='after')`);
  lines.push(`    def _validate_conditional_required(self) -> '${pyClass}':`);
  for (const r of rules) {
    lines.push(`        if ${r.pyCondition} and ${r.pyRequireNone}:`);
    lines.push(`            raise ValueError(${JSON.stringify(r.message)})`);
  }
  lines.push(`        return self`);
  return lines.join('\n');
}

function injectPythonValidator(src: string, pyClass: string, method: string): string {
  const header = `class ${pyClass}(BaseModel):`;
  const start = src.indexOf(header);
  if (start === -1) throw new Error(`Python class ${pyClass} not found`);
  // Locate the start of the next top-level declaration after this class header.
  // datamodel-codegen emits classes separated by `\n\n\nclass ` (two blank lines).
  let end = src.indexOf('\nclass ', start + header.length);
  if (end === -1) end = src.length;
  // Strip trailing blank lines that belong to the separator; we'll re-add them.
  let trimmed = end;
  while (trimmed > start && src[trimmed - 1] === '\n') trimmed--;
  const trailing = src.slice(trimmed, end); // typically "\n\n\n"
  // `trailing` already supplies the newline that terminates `return self`,
  // so we don't add an extra one between `method` and `trailing`.
  return `${src.slice(0, trimmed)}\n\n${method}${trailing}${src.slice(end)}`;
}

function ensurePydanticImport(src: string, name: string): string {
  // Match the (possibly multi-line) `from pydantic import (...)` or single-line form.
  const singleLine = /from pydantic import ([^\n()]+)/;
  const m = src.match(singleLine);
  if (!m) throw new Error('pydantic import line not found');
  const names = m[1].split(',').map((s) => s.trim()).filter(Boolean);
  if (names.includes(name)) return src;
  names.push(name);
  names.sort(); // ASCII sort: capitalized names first, then lowercase
  return src.replace(singleLine, `from pydantic import ${names.join(', ')}`);
}

function step3_5InjectPythonValidators(): void {
  const byDomainAndClass = new Map<string, Map<string, ConditionalRule[]>>();
  for (const rule of CONDITIONAL_RULES) {
    for (const domain of rule.domains) {
      if (!byDomainAndClass.has(domain)) byDomainAndClass.set(domain, new Map());
      const m = byDomainAndClass.get(domain)!;
      if (!m.has(rule.pyClass)) m.set(rule.pyClass, []);
      m.get(rule.pyClass)!.push(rule);
    }
  }

  for (const bundle of bundles) {
    const classRules = byDomainAndClass.get(bundle.domain);
    if (!classRules) continue;
    const path = resolve(PY_DIR, `${bundle.pyModule}.py`);
    let src = readFileSync(path, 'utf8');
    src = ensurePydanticImport(src, 'model_validator');
    for (const [pyClass, rules] of classRules) {
      const method = pyValidatorMethod(pyClass, rules);
      src = injectPythonValidator(src, pyClass, method);
    }
    writeFileSync(path, src);
    console.log(`  injected validators into generated/python/runfile_schemas/${bundle.pyModule}.py`);
  }
}

function goValidatorMethod(goStruct: string, rules: ConditionalRule[]): string {
  const lines: string[] = [];
  lines.push(`func (r *${goStruct}) Validate() error {`);
  for (const r of rules) {
    lines.push(`\tif ${r.goCondition} && ${r.goRequireNil} {`);
    lines.push(`\t\treturn fmt.Errorf(${JSON.stringify(r.message)})`);
    lines.push(`\t}`);
  }
  lines.push(`\treturn nil`);
  lines.push(`}`);
  return lines.join('\n');
}

function normalizeGoImports(src: string, extraPackages: string[]): string {
  const imports = new Set<string>();
  // Collect single-line imports: `import "..."`
  src = src.replace(/^import "([^"]+)"\n+/gm, (_, p: string) => {
    imports.add(p);
    return '';
  });
  // Collect grouped imports: `import ( ... )`
  src = src.replace(/^import \(([\s\S]*?)\)\n+/gm, (_, body: string) => {
    for (const match of body.matchAll(/"([^"]+)"/g)) imports.add(match[1]);
    return '';
  });
  for (const p of extraPackages) imports.add(p);
  if (imports.size === 0) return src;

  const sorted = [...imports].sort();
  const block = `import (\n${sorted.map((p) => `\t"${p}"`).join('\n')}\n)\n\n`;
  // Insert immediately after the package declaration. Collapse any blank lines
  // between `package` and the next content so output is deterministic.
  return src.replace(/^(package \S+)\n+/m, `$1\n\n${block}`);
}

function step3_5InjectGoValidators(): void {
  const byDomainAndStruct = new Map<string, Map<string, ConditionalRule[]>>();
  for (const rule of CONDITIONAL_RULES) {
    for (const domain of rule.domains) {
      if (!byDomainAndStruct.has(domain)) byDomainAndStruct.set(domain, new Map());
      const m = byDomainAndStruct.get(domain)!;
      if (!m.has(rule.goStruct)) m.set(rule.goStruct, []);
      m.get(rule.goStruct)!.push(rule);
    }
  }

  for (const bundle of bundles) {
    const structRules = byDomainAndStruct.get(bundle.domain);
    if (!structRules) continue;
    const path = resolve(GO_DIR, bundle.goPackage, `${bundle.goPackage}.go`);
    let src = readFileSync(path, 'utf8');
    src = normalizeGoImports(src, ['fmt']);
    const methods: string[] = [];
    for (const [goStruct, rules] of structRules) {
      methods.push(goValidatorMethod(goStruct, rules));
    }
    // Ensure file ends with exactly one trailing newline before appending.
    src = src.replace(/\n+$/, '\n');
    src += `\n${methods.join('\n\n')}\n`;
    writeFileSync(path, src);
    console.log(`  injected Validate() into generated/go/pkg/${bundle.goPackage}/${bundle.goPackage}.go`);
  }
}

// ---------------------------------------------------------------------------
// Step 4
// ---------------------------------------------------------------------------

function writeStaticInfra(): void {
  mkdirSync(PY_DIR, { recursive: true });
  const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as {
    version: string;
  };
  writeFileSync(
    resolve(ROOT, 'generated', 'python', 'pyproject.toml'),
    `[build-system]
requires = ["setuptools>=61"]
build-backend = "setuptools.build_meta"

[project]
name = "runfile-ai-schemas"
version = "${pkg.version}"
description = "Runfile event schemas for the Runfile audit platform. Generated from @runfile-ai/schemas Zod source."
license = { text = "Apache-2.0" }
requires-python = ">=3.10"
dependencies = ["pydantic>=2.5"]

[tool.setuptools.packages.find]
where = ["."]
include = ["runfile_schemas*"]
`,
  );

  const modules = bundles.map((b) => b.pyModule);
  // Include the hand-written `canonical` module alongside the generated ones.
  const allModules = [...modules, 'canonical'];
  writeFileSync(
    resolve(PY_DIR, '__init__.py'),
    [
      '"""Runfile schemas (Python Pydantic v2). Generated from @runfile-ai/schemas Zod source."""',
      '',
      `from . import ${allModules.join(', ')}`,
      '',
      `__all__ = [${allModules.map((m) => `"${m}"`).join(', ')}]`,
      '',
    ].join('\n'),
  );

  // go.mod lives at the REPO ROOT (Option A): Go consumers import
  //   github.com/runfile-ai/schemas/generated/go/pkg/event
  // The module path matches the repo URL; Git tags are plain v1.2.3 (no path prefix).
  writeFileSync(
    resolve(ROOT, 'go.mod'),
    `module github.com/runfile-ai/schemas

go 1.22
`,
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// Clean JSON Schema dir only. Python and Go dirs hold hand-written canonical
// helpers (canonical.py, pkg/canonical/canonical.go) that must be preserved;
// the generator overwrites only the per-domain files it owns.
rmSync(SCHEMA_DIR, { recursive: true, force: true });

console.log('Step 1: Zod → JSON Schema');
const schemaPaths: Record<string, string> = {};
for (const bundle of bundles) {
  schemaPaths[bundle.domain] = step1WriteJsonSchema(bundle);
  console.log(`  wrote generated/json-schema/${bundle.domain}.json`);
}

console.log('\nStep 2: JSON Schema → Python Pydantic');
const dmcg = findDatamodelCodegen();
for (const bundle of bundles) {
  step2WritePython(bundle, schemaPaths[bundle.domain]!, dmcg);
  console.log(`  wrote generated/python/runfile_schemas/${bundle.pyModule}.py`);
}

console.log('\nStep 3: JSON Schema → Go structs');
for (const bundle of bundles) {
  step3WriteGo(bundle, schemaPaths[bundle.domain]!);
  console.log(`  wrote generated/go/pkg/${bundle.goPackage}/${bundle.goPackage}.go`);
}

console.log('\nStep 3.5: inject cross-field validators (Python + Go)');
step3_5InjectPythonValidators();
step3_5InjectGoValidators();

console.log('\nStep 4: static infrastructure');
writeStaticInfra();
console.log('  wrote generated/python/{pyproject.toml, runfile_schemas/__init__.py}');
console.log('  wrote go.mod (repo root, module github.com/runfile-ai/schemas)');

const totalTypes = bundles.reduce((acc, b) => acc + Object.keys(b.types).length, 0);
console.log(`\nDone. ${bundles.length} domain(s), ${totalTypes} type(s) → JSON Schema + Python + Go.`);
