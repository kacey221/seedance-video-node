import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAgentNode,
  createStoryboardImageNodes,
  normalizeStoryboard,
} from './agentWorkflow';

test('agent workflow creates a GPT-5.5 chat node', () => {
  const node = createAgentNode({ id: 'agent-1', x: 100, y: 200 });

  assert.equal(node.type, 'agent');
  assert.equal(node.agentModel, 'gpt-5.5');
  assert.equal(node.agentStage, 'chat');
  assert.deepEqual(node.agentMessages, []);
  assert.deepEqual(node.storyboards, []);
});

test('agent workflow normalizes one or many editable storyboard items', () => {
  const storyboards = normalizeStoryboard({
    title: 'Paper boat',
    shots: [
      { title: 'Rain', prompt: 'A paper boat in rain.' },
      { title: 'Dawn', prompt: 'The boat reaches dawn.', aspectRatio: '9:16' },
    ],
  });

  assert.equal(storyboards.length, 2);
  assert.equal(storyboards[0].order, 1);
  assert.equal(storyboards[0].aspectRatio, '16:9');
  assert.equal(storyboards[1].aspectRatio, '9:16');
  assert.equal(storyboards[1].selected, true);
});

test('agent workflow creates selected image nodes in storyboard order', () => {
  const agent = createAgentNode({ id: 'agent-1', x: 100, y: 200 });
  agent.storyboards = normalizeStoryboard({
    shots: [
      { title: 'One', prompt: 'First frame.' },
      { title: 'Skip', prompt: 'Skipped frame.', selected: false },
      { title: 'Three', prompt: 'Third frame.', aspectRatio: '1:1' },
    ],
  });

  const nodes = createStoryboardImageNodes(agent, 1_000);

  assert.equal(nodes.length, 2);
  assert.equal(nodes[0].parentId, 'agent-1');
  assert.equal(nodes[0].x, 520);
  assert.equal(nodes[1].x, 900);
  assert.equal(nodes[1].aspectRatio, '1:1');
});
