import type { CanvasLayer } from '../types';

export function connectNodeCreatedFromOutput(
  sourceNode: CanvasLayer,
  childNode: CanvasLayer,
): CanvasLayer {
  const connectedChildNode: CanvasLayer = {
    ...childNode,
    parentId: sourceNode.id,
    parentIds: [sourceNode.id],
  };

  if (childNode.type === 'image') {
    return {
      ...connectedChildNode,
      src: sourceNode.src || '',
    };
  }

  if (childNode.type === 'video' && sourceNode.type === 'image' && sourceNode.src) {
    return {
      ...connectedChildNode,
      videoMode: 'image-to-video',
      prompt: '@参考图1[首帧]',
    };
  }

  return connectedChildNode;
}
