import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyGeneratedVideoToNode,
  createVideoGenerationNode,
  type VideoGenerationNode,
} from './videoNodeGeneration';

function createVideoNode(
  overrides: Partial<VideoGenerationNode> = {},
): VideoGenerationNode {
  return {
    id: 'video-node-1',
    type: 'video',
    name: 'Video Shot',
    x: 180,
    y: 260,
    width: 320,
    height: 180,
    visible: true,
    locked: false,
    opacity: 1,
    rotate: 0,
    prompt: 'slow dolly in through neon rain',
    parentIds: ['ref-1', 'ref-2'],
    aspectRatio: '16:9',
    videoMode: 'text-to-video',
    videoModel: 'seedance-2.0',
    durationSeconds: 5,
    videoSrc: '',
    ...overrides,
  };
}

test('createVideoGenerationNode creates a Seedance video node with stable frontend defaults', () => {
  const node = createVideoGenerationNode({
    id: 'video-node-2',
    name: 'Seedance Video Node',
    x: 420,
    y: 120,
  });

  assert.equal(node.type, 'video');
  assert.equal(node.videoModel, 'seedance-2.0');
  assert.equal(node.videoMode, 'text-to-video');
  assert.equal(node.aspectRatio, '16:9');
  assert.equal(node.durationSeconds, 5);
  assert.equal(node.prompt, '');
  assert.deepEqual(node.parentIds, []);
});

test('applyGeneratedVideoToNode writes the generated video result back onto the node and preserves identity and prompt', () => {
  const original = createVideoNode();

  const updated = applyGeneratedVideoToNode(original, {
    video: '/generated-videos/task-123.mp4',
    durationSeconds: 5,
    taskId: 'task-123',
  });

  assert.equal(updated.id, original.id);
  assert.equal(updated.type, 'video');
  assert.equal(updated.videoSrc, '/generated-videos/task-123.mp4');
  assert.equal(updated.videoTaskId, 'task-123');
  assert.equal(updated.durationSeconds, 5);
  assert.equal(updated.prompt, original.prompt);
  assert.deepEqual(updated.parentIds, original.parentIds);
  assert.equal(updated.videoModel, original.videoModel);
  assert.equal(updated.videoMode, original.videoMode);
  assert.equal(updated.x, original.x);
  assert.equal(updated.y, original.y);
});

test('applyGeneratedVideoToNode preserves newly supported model aliases on existing video nodes', () => {
  const original = createVideoNode({
    id: 'video-node-pro-fast',
    videoModel: 'seedance-1.0-pro-fast',
  });

  const updated = applyGeneratedVideoToNode(original, {
    video: '/generated-videos/task-999.mp4',
    durationSeconds: 5,
    taskId: 'task-999',
  });

  assert.equal(updated.videoModel, 'seedance-1.0-pro-fast');
  assert.equal(updated.videoSrc, '/generated-videos/task-999.mp4');
  assert.equal(updated.videoTaskId, 'task-999');
});
