import assert from 'node:assert/strict';
import test from 'node:test';

import type { CanvasLayer } from '../types';
import { connectNodeCreatedFromOutput } from './outputNodeCreation';

function createImageNode(overrides: Partial<CanvasLayer> = {}): CanvasLayer {
  return {
    id: 'image-node-1',
    type: 'image',
    name: 'Image Node',
    x: 32,
    y: 48,
    width: 320,
    height: 320,
    visible: true,
    locked: false,
    opacity: 1,
    rotate: 0,
    prompt: '',
    engine: 'rightcodes-image',
    rightCodesModel: 'gpt-image-2',
    aspectRatio: '1:1',
    parentIds: [],
    ...overrides,
  };
}

function createVideoNode(overrides: Partial<CanvasLayer> = {}): CanvasLayer {
  return {
    id: 'video-node-1',
    type: 'video',
    name: 'Video Node',
    x: 96,
    y: 64,
    width: 320,
    height: 180,
    visible: true,
    locked: false,
    opacity: 1,
    rotate: 0,
    prompt: '',
    videoMode: 'text-to-video',
    videoModel: 'seedance-2.0',
    durationSeconds: 5,
    videoSrc: '',
    videoQuality: '720P',
    generateAudio: false,
    parentIds: [],
    aspectRatio: '16:9',
    ...overrides,
  };
}

test('connects a new image child back to the source image node', () => {
  const sourceNode = createImageNode({
    id: 'source-image',
    src: 'data:image/png;base64,source',
  });

  const childNode = connectNodeCreatedFromOutput(sourceNode, createImageNode({ id: 'child-image' }));

  assert.equal(childNode.parentId, 'source-image');
  assert.deepEqual(childNode.parentIds, ['source-image']);
  assert.equal(childNode.src, 'data:image/png;base64,source');
});

test('turns a new video child into image-to-video when the source image has pixels', () => {
  const sourceNode = createImageNode({
    id: 'source-image',
    src: 'data:image/png;base64,source',
  });

  const childNode = connectNodeCreatedFromOutput(sourceNode, createVideoNode({ id: 'child-video' }));

  assert.equal(childNode.parentId, 'source-image');
  assert.deepEqual(childNode.parentIds, ['source-image']);
  assert.equal(childNode.type, 'video');
  assert.equal(childNode.videoMode, 'image-to-video');
  assert.match(childNode.prompt || '', /@参考图1\[首帧\]/u);
});

test('keeps a new video child on text-to-video defaults when the source image has no src', () => {
  const sourceNode = createImageNode({
    id: 'source-image',
    src: '',
  });

  const childNode = connectNodeCreatedFromOutput(sourceNode, createVideoNode({ id: 'child-video' }));

  assert.equal(childNode.parentId, 'source-image');
  assert.deepEqual(childNode.parentIds, ['source-image']);
  assert.equal(childNode.videoMode, 'text-to-video');
  assert.equal(childNode.prompt, '');
});
