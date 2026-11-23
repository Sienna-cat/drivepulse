import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, beginRun, advanceRun, approveRun, recordOutcome } from '../src/engine.js';
import { buildPulseEvidence } from '../src/evidence.js';

test('buildPulseEvidence returns a stable empty state without runs', () => {
  const evidence = buildPulseEvidence(createState());
  assert.deepEqual(evidence.goal, null);
  assert.deepEqual(evidence.audience, { candidates: 0, eligible: 0, excluded: 0, exclusionReasons: [] });
  assert.deepEqual(evidence.execution, { created: 0, completed: 0, feedbackDenominator: 0, responded: 0, responseRate: null });
  assert.equal(evidence.evidenceBoundary.status, '示例数据 · 浏览器任务记录');
});

test('buildPulseEvidence uses contacted tasks as the feedback denominator', () => {
  const state = createState();
  const run = beginRun(state, { goal: '准备一次上海车主关怀', city: '上海', minDrop: 50, scenario: 'normal' });
  while (run.status === 'running') advanceRun(state, run.id);
  approveRun(state, run.id, { selectedIds: [run.eligible[0].id], message: run.message });
  recordOutcome(state, `${run.id}-${run.eligible[0].id}`, 'responded');
  const evidence = buildPulseEvidence(state);
  assert.equal(evidence.goal.text, run.goal);
  assert.equal(evidence.audience.candidates, run.candidates.length);
  assert.equal(evidence.execution.created, 1);
  assert.equal(evidence.execution.feedbackDenominator, 1);
  assert.equal(evidence.execution.responded, 1);
  assert.equal(evidence.execution.responseRate, 100);
});
