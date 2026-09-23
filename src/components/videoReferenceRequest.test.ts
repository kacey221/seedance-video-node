import assert from 'node:assert/strict';
import test from 'node:test';
import type { CanvasLayer } from '../types';
import type { ConnectedReferenceItem } from './referenceConnections';
import { buildVideoGenerationReferencePayload } from './videoReferenceRequest';

const referenceTag = '@\u53c2\u8003\u56fe';
const firstFrameTag = '[\u9996\u5e27]';
const lastFrameTag = '[\u5c3e\u5e27]';

function createLayer(overrides: Partial<CanvasLayer> & Pick<CanvasLayer, 'id' | 'name'>): CanvasLayer {
  return {
    id: overrides.id,
    type: 'image',
    name: overrides.name,
    x: 0,
    y: 0,
    width: 320,
    height: 320,
    src: `data:image/png;base64,${overrides.id}`,
    visible: true,
    locked: false,
    opacity: 1,
    rotate: 0,
    ...overrides,
  };
}

function createReference(labelNumber: number): ConnectedReferenceItem {
  return {
    labelNumber,
    reference: createLayer({
      id: `ref-${labelNumber}`,
      name: `Reference ${labelNumber}`,
      isReference: true,
    }),
  };
}

test('maps connected references and directives into seedance roles', async () => {
  const payload = await buildVideoGenerationReferencePayload({
    prompt: `camera move ${referenceTag}1 ${referenceTag}2${firstFrameTag} ${referenceTag}3${lastFrameTag}`,
    connectedReferences: [createReference(1), createReference(2), createReference(3)],
    mode: 'image-to-video',
  });

  assert.deepEqual(payload.firstFrame, {
    labelNumber: 2,
    src: 'data:image/png;base64,ref-2',
  });
  assert.deepEqual(payload.lastFrame, {
    labelNumber: 3,
    src: 'data:image/png;base64,ref-3',
  });
  assert.deepEqual(payload.generalReferences, [
    {
      labelNumber: 1,
      src: 'data:image/png;base64,ref-1',
    },
  ]);
  assert.match(payload.referenceSummary, /@参考图1/u);
  assert.match(payload.referenceSummary, /@参考图2/u);
  assert.match(payload.referenceSummary, /@参考图3/u);
  assert.match(payload.referenceSummary, /首帧/u);
  assert.match(payload.referenceSummary, /尾帧/u);
});

test(`image-to-video fails when no ${firstFrameTag} exists`, async () => {
  await assert.rejects(
    () =>
      buildVideoGenerationReferencePayload({
        prompt: `camera move ${referenceTag}1 ${referenceTag}2`,
        connectedReferences: [createReference(1), createReference(2)],
        mode: 'image-to-video',
      }),
    {
      message: /首帧/u,
    },
  );
});

test('rejects unconnected @参考图 mentions', async () => {
  await assert.rejects(
    () =>
      buildVideoGenerationReferencePayload({
        prompt: `camera move ${referenceTag}1${firstFrameTag} ${referenceTag}4`,
        connectedReferences: [createReference(1), createReference(2), createReference(3)],
        mode: 'image-to-video',
      }),
    {
      message: /@参考图4/u,
    },
  );
});

test('text-to-video works with general references only', async () => {
  const payload = await buildVideoGenerationReferencePayload({
    prompt: `camera move ${referenceTag}3 ${referenceTag}1`,
    connectedReferences: [createReference(1), createReference(2), createReference(3)],
    mode: 'text-to-video',
  });

  assert.equal(payload.firstFrame, undefined);
  assert.equal(payload.lastFrame, undefined);
  assert.deepEqual(payload.generalReferences, [
    {
      labelNumber: 3,
      src: 'data:image/png;base64,ref-3',
    },
    {
      labelNumber: 1,
      src: 'data:image/png;base64,ref-1',
    },
  ]);
  assert.match(payload.referenceSummary, /@参考图3/u);
  assert.match(payload.referenceSummary, /@参考图1/u);
});
