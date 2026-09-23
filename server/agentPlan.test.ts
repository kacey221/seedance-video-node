import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAgentAnalysisRequest,
  normalizeAgentPlan,
  type AgentPlan,
} from './agentPlan';

test('normalizes a minimal agent plan with executable defaults', () => {
  const plan = normalizeAgentPlan({
    image: { prompt: 'A red paper boat on a rainy street.' },
    video: { prompt: 'The camera slowly follows the boat.' },
  });

  assert.equal(plan.image.model, 'gpt-image-2');
  assert.equal(plan.image.aspectRatio, '16:9');
  assert.equal(plan.video.modelAlias, 'seedance-2.0');
  assert.equal(plan.video.mode, 'image-to-video');
  assert.equal(plan.video.durationSeconds, 5);
  assert.equal(plan.video.videoQuality, '720P');
  assert.equal(plan.video.generateAudio, false);
});

test('rejects plans without both generation prompts', () => {
  assert.throws(
    () => normalizeAgentPlan({ image: { prompt: '' }, video: { prompt: 'move' } }),
    /image\.prompt/,
  );
});

test('builds a JSON-constrained OpenAI-compatible request', () => {
  const request = buildAgentAnalysisRequest('A cinematic launch film', {
    apiKey: 'secret',
    model: 'gpt-4o-mini',
    baseUrl: 'https://example.test/v1',
  });

  assert.equal(request.url, 'https://example.test/v1/chat/completions');
  assert.equal(request.init.method, 'POST');
  assert.equal(request.init.headers.Authorization, 'Bearer secret');
  const body = JSON.parse(String(request.init.body));
  assert.equal(body.model, 'gpt-4o-mini');
  assert.equal(body.response_format.type, 'json_schema');
  assert.match(body.messages[1].content, /A cinematic launch film/);
});
