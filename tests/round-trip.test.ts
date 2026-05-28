/**
 * Round-trip tests — build a value in TS, serialise, parse in TS, assert equality.
 * Also covers Zod's structural validation of the documented conditional rules.
 */
import { describe, expect, it } from 'vitest';
import { RunfileEventSchema, RunfileRunSchema } from '../src/event.js';
import { BatchSubmissionSchema, type BatchSubmission } from '../src/ingest.js';
import { ResolveRequestSchema, TokenizeRequestSchema } from '../src/vault.js';
import { validLlmCallEvent, validRun } from './fixtures.js';

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

  it('rejects run_suspend without suspension_details', () => {
    const bad = {
      ...validLlmCallEvent,
      action: { kind: 'run_suspend', name: 'awaiting_primary_approver' },
      model_ref: undefined,
    };
    delete (bad as { model_ref?: unknown }).model_ref;
    expect(RunfileEventSchema.safeParse(bad).success).toBe(false);
  });
});

describe('RunfileRun round-trip', () => {
  it('parses a valid active run', () => {
    const parsed = RunfileRunSchema.parse(validRun);
    expect(parsed.run_id).toBe(validRun.run_id);
    expect(parsed.lifecycle_state).toBe('active');
  });

  it('rejects an unknown lifecycle_state', () => {
    const bad = { ...validRun, lifecycle_state: 'paused' };
    expect(RunfileRunSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a run_id without the run_ prefix', () => {
    const bad = { ...validRun, run_id: '01HQ3X9N8K7P2M5R4T6V8W0Y00' };
    expect(RunfileRunSchema.safeParse(bad).success).toBe(false);
  });
});

describe('BatchSubmission round-trip', () => {
  const batch: BatchSubmission = {
    batch_id: 'b_01HQ3X9N8K7P2M5R4T6V8W0Y20',
    items: [
      {
        type: 'run_create',
        run: {
          schema_version: '1.0.0',
          run_id: 'run_01HQ3X9N8K7P2M5R4T6V8W0Y00',
          agent_identity: 'did:web:acme.com:agents:loan-triage:v2.1.0',
          conversation_id: 'conv_loan_app_67890',
          lifecycle_state: 'active',
          started_at: '2026-05-21T14:32:15.000Z',
          environment: 'production',
          redaction_policy_version: '1.2.0',
          sdk_at_start: { name: 'runfile-py', version: '0.4.2', framework: 'langgraph' },
        },
      },
      {
        type: 'event',
        event: {
          schema_version: '1.0.0',
          event_id: '01HQ3X9N8K7P2M5R4T6V8W0Y1Z',
          run_id: 'run_01HQ3X9N8K7P2M5R4T6V8W0Y00',
          parent_event_id: null,
          captured_at: '2026-05-21T14:32:15.001Z',
          wall_clock_source: 'aws_time_sync',
          sdk: { name: 'runfile-py', version: '0.4.2', framework: 'langgraph' },
          actor: {
            type: 'agent',
            agent_identity: 'did:web:acme.com:agents:loan-triage:v2.1.0',
            delegation_chain: [],
          },
          action: { kind: 'graph_node_enter', name: 'triage_node' },
          subject: {
            resource_urn: 'urn:acme:customer:12345:loan_application:67890',
            data_classification: 'pii',
            regulatory_tags: ['gdpr_art22'],
          },
          redaction_policy_version: '1.2.0',
          prev_event_hash_intent: `sha256:${'0'.repeat(64)}`,
        },
      },
      {
        type: 'run_update',
        run_id: 'run_01HQ3X9N8K7P2M5R4T6V8W0Y00',
        lifecycle_state: 'awaiting_human',
        triggered_by_event_id: '01HQ3X9N8K7P2M5R4T6V8W0Y2A',
      },
      {
        type: 'run_end',
        run_id: 'run_01HQ3X9N8K7P2M5R4T6V8W0Y00',
        ended_at: '2026-05-23T14:30:15.000Z',
        outcome: 'success',
      },
    ],
  };

  it('parses a mixed-item batch submission', () => {
    const parsed = BatchSubmissionSchema.parse(batch);
    expect(parsed.items).toHaveLength(4);
    expect(parsed.items[0]!.type).toBe('run_create');
  });

  it('rejects an empty batch', () => {
    expect(BatchSubmissionSchema.safeParse({ ...batch, items: [] }).success).toBe(false);
  });

  it('rejects an item with an unknown type', () => {
    const bad = {
      ...batch,
      items: [{ type: 'run_pause', run_id: 'run_01HQ3X9N8K7P2M5R4T6V8W0Y00' }],
    };
    expect(BatchSubmissionSchema.safeParse(bad).success).toBe(false);
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
