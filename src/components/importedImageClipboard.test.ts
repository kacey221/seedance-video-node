import assert from 'node:assert/strict';
import test from 'node:test';

import type { CanvasLayer } from '../types';
import { cloneImportedImageWithConnections, isCopyableImportedImage } from './importedImageClipboard';

function image(overrides: Partial<CanvasLayer> = {}): CanvasLayer {
  return {
    id: 'image-1',
    type: 'image',
    name: 'Imported image',
    x: 100,
    y: 120,
    width: 320,
    height: 240,
    src: 'data:image/png;base64,image',
    visible: true,
    locked: false,
    opacity: 1,
    rotate: 0,
    isReference: true,
    parentId: 'parent-1',
    parentIds: ['parent-1'],
    ...overrides,
  };
}

test('only imported reference images are copyable', () => {
  assert.equal(isCopyableImportedImage(image()), true);
  assert.equal(isCopyableImportedImage(image({ isReference: false })), false);
  assert.equal(isCopyableImportedImage(image({ type: 'video' })), false);
});

test('pasting an imported image preserves input and output connections', () => {
  const source = image();
  const child = image({
    id: 'child-1',
    isReference: false,
    parentId: source.id,
    parentIds: [source.id, 'another-parent'],
  });

  const result = cloneImportedImageWithConnections([source, child], source, {
    id: 'image-copy-1',
    offset: 32,
  });

  assert.equal(result.copy.id, 'image-copy-1');
  assert.equal(result.copy.x, 132);
  assert.equal(result.copy.y, 152);
  assert.equal(result.copy.parentId, 'parent-1');
  assert.deepEqual(result.copy.parentIds, ['parent-1']);
  assert.deepEqual(result.childUpdates, [
    {
      ...child,
      parentId: source.id,
      parentIds: [source.id, 'another-parent', 'image-copy-1'],
    },
  ]);
});
