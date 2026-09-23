import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAgentChatRequest,
  buildStoryboardRequest,
  parseResponseText,
  parseStoryboardResponse,
} from './agentConversation';

const config = {
  apiKey: 'secret',
  baseUrl: 'https://api.example.test/v1',
};

test('agent conversation builds a multi-turn GPT-5.5 Responses request', () => {
  const request = buildAgentChatRequest({
    model: 'gpt-5.5',
    messages: [
      { id: '1', role: 'user', content: '做一组雨夜分镜' },
      { id: '2', role: 'assistant', content: '你希望几张？' },
      { id: '3', role: 'user', content: '三张' },
    ],
  }, config);

  assert.equal(request.url, 'https://api.example.test/v1/responses');
  const body = JSON.parse(String(request.init.body));
  assert.equal(body.model, 'gpt-5.5');
  assert.equal(body.input.length, 3);
  assert.equal(body.input[2].content, '三张');
});

test('agent conversation extracts text from Responses API output', () => {
  const text = parseResponseText({
    output: [{ content: [{ type: 'output_text', text: '建议先明确镜头节奏。' }] }],
  });

  assert.equal(text, '建议先明确镜头节奏。');
});

test('agent conversation builds and parses a strict storyboard response', () => {
  const request = buildStoryboardRequest({
    model: 'gpt-5.5',
    messages: [{ id: '1', role: 'user', content: '生成两张分镜' }],
  }, config);
  const body = JSON.parse(String(request.init.body));

  assert.equal(body.text.format.type, 'json_schema');
  const storyboard = parseStoryboardResponse({
    output: [{
      content: [{
        type: 'output_text',
        text: JSON.stringify({
          title: '雨夜',
          shots: [
            { title: '街口', prompt: 'Rainy street corner.' },
            { title: '纸船', prompt: 'Paper boat floating.' },
          ],
        }),
      }],
    }],
  });
  assert.equal(storyboard.shots.length, 2);
});
