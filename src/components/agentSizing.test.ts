import test from 'node:test';
import assert from 'node:assert/strict';
import { getAgentTextScale, resizeAgentNode } from './agentSizing';

test('agent node resize clamps to usable dimensions', () => {
  const resized = resizeAgentNode(
    { x: 20, y: 30, width: 420, height: 560 },
    { deltaX: -500, deltaY: -500 },
  );

  assert.deepEqual(resized, { x: 20, y: 30, width: 300, height: 360 });
});

test('agent text scale grows smoothly with the panel width', () => {
  assert.equal(getAgentTextScale(300), 1);
  assert.equal(getAgentTextScale(600), 1.2);
});
