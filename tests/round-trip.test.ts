/**
 * Round-trip tests — build a value in TS, serialise, parse in TS, assert equality.
 * Also covers Zod's structural validation of the documented conditional rules.
 */
import { describe, expect, it } from 'vitest';
import { RunfileEventSchema } from '../src/event.js';
import { BatchSubmissionSchema, type BatchSubmission } from '../src/ingest.js';
import { ResolveRequestSchema, TokenizeRequestSchema } from '../src/vault.js';
import { validLlmCallEvent } from './fixtures.js';

describe('RunfileEvent round-trip', () => {
  it('parses a valid llm_call event', () => {
    const parsed = RunfileEventSchema.parse(validLlmCallEvent);
    expect(parsed.event_id).toBe(validLlmCallEvent.event_id);
  });

  it('JSON.stringify + RunfileEventSchema.parse is the identity (logically)', () => {
    const wire = JSON.stringify(validLlmCallEvent);
    const parsed = RunfileEventSchema.parse(JSON.parse(wire));
    expect(parsed).toEqual(validLlmCallEvent);
  });

  it('rejects agent actor without agent_identity', () => {
    const bad = structuredClone(validLlmCallEvent);
    delete (bad.actor as { agent_identity?: string }).agent_identity;
    expect(RunfileEventSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects llm_call without model_ref', () => {
    const bad = structuredClone(validLlmCallEvent);
    delete (bad as { model_ref?: unknown }).model_ref;
    expect(RunfileEventSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects unknown action.kind', () => {
    const bad = { ...validLlmCallEvent, action: { ...validLlmCallEvent.action, kind: 'frob' } };
    expect(RunfileEventSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects bad sha256 format', () => {
    const bad = { ...validLlmCallEvent, event_hash: 'sha256:NOT_HEX' };
    expect(RunfileEventSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects extra fields (additionalProperties: false on strict objects)', () => {
    const bad = { ...validLlmCallEvent, surprise: 'field' } as unknown as typeof validLlmCallEvent;
    expect(RunfileEventSchema.safeParse(bad).success).toBe(false);
  });
});

describe('BatchSubmission round-trip', () => {
  const batch: BatchSubmission = {
    batch_id: 'b_01HQ3X9N8K7P2M5R4T6V8W0Y20',
    events: [
      {
        schema_version: '1.0.0',
        event_id: '01HQ3X9N8K7P2M5R4T6V8W0Y1Z',
        agent_run_id: 'run_01HQ3X9N8K7P2M5R4T6V8W0Y00',
        parent_event_id: null,
        captured_at: '2026-05-21T14:32:15.001Z',
        wall_clock_source: 'aws_time_sync',
        sdk: { name: 'runfile-py', version: '0.4.2', framework: 'langgraph' },
        actor: {
          type: 'agent',
          agent_identity: 'did:web:acme.com:agents:loan-triage:v2.1.0',
          delegation_chain: [],
        },
        action: { kind: 'agent_run_start', name: 'loan_triage_v2_run' },
        subject: {
          resource_urn: 'urn:acme:customer:12345:loan_application:67890',
          data_classification: 'pii',
          regulatory_tags: ['gdpr_art22'],
        },
        redaction_policy_version: '1.2.0',
        prev_hash_intent: `sha256:${'0'.repeat(64)}`,
      },
    ],
  };

  it('parses a minimal batch submission', () => {
    const parsed = BatchSubmissionSchema.parse(batch);
    expect(parsed.events).toHaveLength(1);
  });

  it('rejects an empty batch', () => {
    expect(BatchSubmissionSchema.safeParse({ ...batch, events: [] }).success).toBe(false);
  });
});

describe('Vault round-trip', () => {
  it('parses a valid TokenizeRequest', () => {
    const parsed = TokenizeRequestSchema.parse({
      value: 'Sarah Chen',
      classification: 'person_name',
    });
    expect(parsed.classification).toBe('person_name');
  });

  it('rejects a free_text shorter than 8 chars on ResolveRequest', () => {
    const bad = {
      token: 'tok_h7Qn2bZ9kP3Lx8DfM2Vq5XnB',
      requester: {
        tenant_id: 'tnt_h7q3n2bz5kp8',
        member_id: 'mem_1',
        role: 'internal_auditor',
        session_id: 'sess_1',
        mfa_age_seconds: 100,
      },
      justification: {
        engagement_id: 'eng_01HQ3X9N8K7P2M5R4T6V8W0Y1A',
        reason_code: 'sample_review',
        free_text: 'too',
      },
    };
    expect(ResolveRequestSchema.safeParse(bad).success).toBe(false);
  });
});
