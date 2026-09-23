import type { CanvasLayer } from '../types';

export function isCopyableImportedImage(layer: CanvasLayer | undefined): layer is CanvasLayer {
  return Boolean(layer && layer.type === 'image' && layer.isReference);
}

export function cloneImportedImageWithConnections(
  layers: CanvasLayer[],
  source: CanvasLayer,
  options: { id: string; offset: number },
): { copy: CanvasLayer; childUpdates: CanvasLayer[] } {
  const copy: CanvasLayer = {
    ...source,
    id: options.id,
    x: source.x + options.offset,
    y: source.y + options.offset,
    parentIds: source.parentIds ? [...source.parentIds] : undefined,
  };

  const childUpdates = layers.flatMap((layer) => {
    const parentIds = layer.parentIds ?? (layer.parentId ? [layer.parentId] : []);
    if (!parentIds.includes(source.id)) {
      return [];
    }

    return [{ ...layer, parentIds: [...parentIds, copy.id] }];
  });

  return { copy, childUpdates };
}
