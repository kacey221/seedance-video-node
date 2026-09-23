import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import type { CanvasLayer, GenerationHistoryItem } from './types';

test('shared CanvasLayer types accept video node fields needed by the upcoming UI wiring', () => {
  const videoLayer = {
    id: 'video-layer-1',
    type: 'video',
    name: 'Seedance Clip',
    x: 180,
    y: 260,
    width: 320,
    height: 180,
    visible: true,
    locked: false,
    opacity: 1,
    rotate: 0,
    prompt: 'slow dolly in through neon rain',
    aspectRatio: '16:9',
    videoMode: 'text-to-video',
    videoModel: 'seedance-2.0',
    durationSeconds: 5,
    videoSrc: '/generated-videos/task-123.mp4',
    videoTaskId: 'task-123',
  } satisfies CanvasLayer;

  assert.equal(videoLayer.type, 'video');
  assert.equal(videoLayer.videoMode, 'text-to-video');
  assert.equal(videoLayer.videoModel, 'seedance-2.0');
  assert.equal(videoLayer.durationSeconds, 5);
  assert.equal(videoLayer.videoSrc, '/generated-videos/task-123.mp4');
  assert.equal(videoLayer.videoTaskId, 'task-123');
});

test('shared CanvasLayer types accept all newly supported seedance video aliases', () => {
  const miniLayer = {
    id: 'video-layer-mini',
    type: 'video',
    name: 'Seedance Mini Clip',
    x: 220,
    y: 300,
    width: 320,
    height: 180,
    visible: true,
    locked: false,
    opacity: 1,
    rotate: 0,
    prompt: 'gentle orbit around a product pedestal',
    aspectRatio: '16:9',
    videoMode: 'text-to-video',
    videoModel: 'seedance-2.0-mini',
    durationSeconds: 5,
  } satisfies CanvasLayer;

  const proLayer = {
    ...miniLayer,
    id: 'video-layer-pro',
    name: 'Seedance 1.5 Pro Clip',
    videoModel: 'seedance-1.5-pro',
  } satisfies CanvasLayer;

  const proFastLayer = {
    ...miniLayer,
    id: 'video-layer-pro-fast',
    name: 'Seedance 1.0 Pro Fast Clip',
    videoModel: 'seedance-1.0-pro-fast',
  } satisfies CanvasLayer;

  assert.equal(miniLayer.videoModel, 'seedance-2.0-mini');
  assert.equal(proLayer.videoModel, 'seedance-1.5-pro');
  assert.equal(proFastLayer.videoModel, 'seedance-1.0-pro-fast');
});

test('shared generation history types accept video results and optional task metadata', () => {
  const videoHistoryItem = {
    id: 'history-video-1',
    prompt: 'slow dolly in through neon rain',
    negativePrompt: 'blurry, low quality',
    aspectRatio: '16:9',
    engine: 'seedance-2.0',
    modelName: 'seedance-2.0',
    seed: 0,
    timestamp: '2026-06-24T10:00:00.000Z',
    mediaType: 'video',
    videoSrc: '/generated-videos/task-123.mp4',
    videoTaskId: 'task-123',
    durationSeconds: 5,
  } satisfies GenerationHistoryItem;

  assert.equal(videoHistoryItem.mediaType, 'video');
  assert.equal(videoHistoryItem.videoSrc, '/generated-videos/task-123.mp4');
  assert.equal(videoHistoryItem.videoTaskId, 'task-123');
  assert.equal(videoHistoryItem.durationSeconds, 5);
});

test('shared generation history types reject invalid media-specific shapes at compile time', () => {
  // @ts-expect-error image history items must include images
  const invalidImageHistoryItem: GenerationHistoryItem = {
    id: 'history-image-invalid-1',
    prompt: 'portrait of a city fox detective',
    negativePrompt: 'blurry, low quality',
    aspectRatio: '1:1',
    engine: 'rightcodes-image',
    modelName: 'gpt-image-2',
    seed: 7,
    timestamp: '2026-06-24T10:05:00.000Z',
    mediaType: 'image',
  };

  // @ts-expect-error video history items must include videoSrc
  const invalidVideoHistoryItem: GenerationHistoryItem = {
    id: 'history-video-invalid-1',
    prompt: 'slow dolly in through neon rain',
    negativePrompt: 'blurry, low quality',
    aspectRatio: '16:9',
    engine: 'seedance-2.0',
    modelName: 'seedance-2.0',
    seed: 0,
    timestamp: '2026-06-24T10:06:00.000Z',
    mediaType: 'video',
    durationSeconds: 5,
  };

  assert.equal(invalidImageHistoryItem.mediaType, 'image');
  assert.equal(invalidVideoHistoryItem.mediaType, 'video');
});
