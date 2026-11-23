import test from 'node:test';
import assert from 'node:assert/strict';
import {createState, queryOwnerSegment, screenOwners, beginRun, advanceRun, retryRun, approveRun, recordOutcome, getMetrics} from '../src/engine.js';

const input = {goal: '上海车主服务关怀', city: '上海', minDrop: 50, scenario: 'normal'};
function prepare(state, overrides = {}) {
  const run = beginRun(state, {...input, ...overrides});
  for (let n = 0; n < 8 && run.status === 'running'; n++) advanceRun(state, run.id);
  return run;
}
function approve(state, run, overrides = {}) {
  return approveRun(state, run.id, {selectedIds: run.eligible.map(x => x.id), message: run.message, ...overrides});
}

test('segment excludes zero baseline, non-declining, other city and no service need', () => {
  const state = {owners: [
    {id:'a',city:'上海',before:10,current:4,need:'保养'},
    {id:'b',city:'上海',before:0,current:0,need:'保养'},
    {id:'c',city:'上海',before:10,current:6,need:'保养'},
    {id:'d',city:'杭州',before:10,current:2,need:'保养'},
    {id:'e',city:'上海',before:10,current:2,need:null}
  ]};
  assert.deepEqual(queryOwnerSegment(state, input).map(x=>x.id), ['a']);
});
test('screening protects consent, complaints, contact data and seven-day frequency', () => {
  const base = {contact:true, optOut:false, complaint:false, lastContactDays:20};
  const result = screenOwners([
    {...base,id:'ok'}, {...base,id:'opt',optOut:true}, {...base,id:'complaint',complaint:true},
    {...base,id:'missing',contact:false}, {...base,id:'recent',lastContactDays:6}, {...base,id:'boundary',lastContactDays:7}
  ]);
  assert.deepEqual(result.eligible.map(x=>x.id), ['ok','boundary']);
  assert.deepEqual(result.excluded.map(x=>x.code), ['opt_out','complaint','missing_contact','frequency']);
});
test('no operations are created until explicit approval', () => {
  const state = createState(); const run = beginRun(state,input);
  assert.throws(()=>approve(state,run));
  for (let i=0;i<4;i++) advanceRun(state,run.id);
  assert.equal(run.status,'awaiting_approval');
  assert.equal(state.operations.length,0);
  assert.ok(run.eligible.length>0);
  assert.equal(run.logs.filter(x=>x.status==='success').length,4);
});
test('approval preserves edited copy and selection, and repeated approval is idempotent', () => {
  const state=createState(); const run=prepare(state);
  const selectedIds=[run.eligible[0].id];
  approve(state,run,{selectedIds,message:'经运营修改的关怀文案'});
  approve(state,run,{selectedIds,message:'第二次点击'});
  assert.equal(state.operations.length,1);
  assert.equal(state.operations[0].ownerId,selectedIds[0]);
  assert.equal(state.operations[0].message,'经运营修改的关怀文案');
  assert.equal(run.edited,true);
});
test('approval rejects invalid selection, blank content and changed eligibility', () => {
  const state=createState(); const run=prepare(state);
  assert.throws(()=>approve(state,run,{selectedIds:[]}));
  assert.throws(()=>approve(state,run,{selectedIds:['non-existent']}));
  assert.throws(()=>approve(state,run,{message:' '}));
  state.owners.find(x=>x.id===run.eligible[0].id).optOut=true;
  assert.throws(()=>approve(state,run));
  assert.equal(state.operations.length,0);
});
test('failed query retries once and preserves an inspectable failure log', () => {
  const state=createState(); const run=prepare(state,{scenario:'tool_failure'});
  assert.equal(run.status,'blocked');
  assert.equal(run.step,0);
  retryRun(state,run.id);
  while(run.status==='running') advanceRun(state,run.id);
  assert.equal(run.status,'awaiting_approval');
  assert.equal(run.logs.filter(x=>x.status==='failed').length,1);
  assert.equal(run.logs.filter(x=>x.name==='queryOwnerSegment'&&x.status==='success').length,1);
});
test('expired policy blocks execution and explicit demo policy update permits recovery', () => {
  const state=createState(); const run=prepare(state,{scenario:'expired_policy'});
  assert.equal(run.status,'blocked');
  assert.equal(run.step,2);
  assert.throws(()=>approve(state,run));
  retryRun(state,run.id);
  while(run.status==='running') advanceRun(state,run.id);
  assert.equal(run.status,'awaiting_approval');
  assert.equal(run.policy.version,'1.1');
  assert.equal(run.logs.filter(x=>x.name==='queryOwnerSegment').length,1);
});
test('feedback drives metrics and refusal excludes the owner from later outreach', () => {
  const state=createState(); const run=prepare(state);
  approve(state,run,{selectedIds:run.eligible.slice(0,2).map(x=>x.id)});
  recordOutcome(state,state.operations[0].id,'responded');
  recordOutcome(state,state.operations[1].id,'declined');
  const metrics=getMetrics(state);
  assert.equal(metrics.operations,2); assert.equal(metrics.responded,1);
  assert.equal(metrics.responseRate,50); assert.equal(metrics.feedbackRate,100);
  assert.equal(run.status,'completed');
  const next=prepare(state);
  assert.ok(next.excluded.some(x=>x.owner.id===state.operations[1].ownerId&&x.code==='opt_out'));
});
test('outcomes reject unknown values and repeated identical feedback does not add logs', () => {
  const state=createState(); const run=prepare(state); approve(state,run);
  const op=state.operations[0];
  assert.throws(()=>recordOutcome(state,op.id,'made_up'));
  recordOutcome(state,op.id,'contacted');
  const count=run.logs.length;
  recordOutcome(state,op.id,'contacted');
  assert.equal(run.logs.length,count);
});
test('empty segments stay reviewable but cannot be approved', () => {
  const state=createState();state.owners=[];
  const run=prepare(state);
  assert.equal(run.status,'awaiting_approval');
  assert.equal(run.eligible.length,0);
  assert.throws(()=>approve(state,run));
});
