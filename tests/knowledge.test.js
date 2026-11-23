import test from 'node:test';
import assert from 'node:assert/strict';
import {CATEGORY_OPTIONS, KNOWLEDGE_BASE, filterKnowledge} from '../src/knowledge.js';

test('knowledge base keeps official facts and inferred audience separate', () => {
  const models = KNOWLEDGE_BASE.filter(item => item.category === '车型');
  assert.ok(models.length >= 5);
  for (const item of models) {
    assert.equal(item.confidence, 'official');
    assert.ok(item.sourceUrl.startsWith('https://www.nio.cn/'));
    assert.ok(item.sourceDate);
    assert.ok(Array.isArray(item.facts) && item.facts.length > 0);
    assert.ok(Array.isArray(item.inferredAudience) && item.inferredAudience.length > 0);
    assert.match(item.verificationNote, /产品定位推断/);
  }
});

test('knowledge search and category filter match facts, audience and services', () => {
  assert.deepEqual(CATEGORY_OPTIONS, ['全部', '车型', '用户场景', '服务', '补能']);
  assert.ok(filterKnowledge(KNOWLEDGE_BASE, {query: '露营'}).some(item => item.id === 'model-et5t'));
  assert.ok(filterKnowledge(KNOWLEDGE_BASE, {category: '补能'}).every(item => item.category === '补能'));
  assert.ok(filterKnowledge(KNOWLEDGE_BASE, {query: 'Service Guardian'}).some(item => item.id === 'service-guardian'));
  assert.equal(filterKnowledge(KNOWLEDGE_BASE, {query: '不存在的车型'}).length, 0);
});

test('knowledge entries record bounded source caveats for changing facts', () => {
  const power = KNOWLEDGE_BASE.find(item => item.id === 'power-network');
  const service = KNOWLEDGE_BASE.find(item => item.id === 'service-network');
  assert.match(power.verificationNote, /截至/);
  assert.match(service.verificationNote, /条款|地区/);
  assert.ok(power.facts.some(fact => fact.includes('4,270')));
});

test('inferred scene cards keep audience hypotheses out of source facts', () => {
  const scenes = KNOWLEDGE_BASE.filter(item => item.category === '用户场景');
  assert.ok(scenes.length >= 4);
  for (const item of scenes) {
    assert.ok(item.facts.every(fact => !fact.includes('用户需求关键词')));
    assert.ok(item.inferredAudience.length > 0);
  }
});
