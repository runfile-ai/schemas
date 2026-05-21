import type { RunfileEvent } from '../src/event.js';
import { ZERO_PREV_HASH } from '../src/event.js';

/** A valid llm_call event used across multiple test files. */
export const validLlmCallEvent: RunfileEvent = {
  schema_version: '1.0.0',
  event_id: '01HQ3X9N8K7P2M5R4T6V8W0Y1Z',
  tenant_id: 'tnt_h7q3n2bz5kp8',
  agent_run_id: 'run_01HQ3X9N8K7P2M5R4T6V8W0Y00',
  parent_event_id: '01HQ3X9N8K7P2M5R4T6V8W0Y0Y',
  captured_at: '2026-05-21T14:32:17.482Z',
  received_at: '2026-05-21T14:32:18.103Z',
  wall_clock_source: 'aws_time_sync',
  sdk: {
    name: 'runfile-py',
    version: '0.4.2',
    framework: 'langgraph',
    framework_version: '0.2.31',
  },
  actor: {
    type: 'agent',
    agent_identity: 'did:web:acme.com:agents:loan-triage:v2.1.0',
    delegation_chain: [],
  },
  action: {
    kind: 'llm_call',
    name: 'anthropic.messages.create',
    outcome: 'success',
    duration_ms: 1847,
  },
  subject: {
    resource_urn: 'urn:acme:customer:12345:loan_application:67890',
    data_classification: 'pii',
    regulatory_tags: ['gdpr_art22', 'eu_ai_act_high_risk'],
  },
  model_ref: {
    provider: 'anthropic',
    model_id: 'claude-opus-4-7',
    input_tokens: 2847,
    output_tokens: 423,
    temperature: 0,
  },
  redaction_policy_version: '1.2.0',
  prev_hash: ZERO_PREV_HASH,
  event_hash: `sha256:${'a'.repeat(64)}`,
};
