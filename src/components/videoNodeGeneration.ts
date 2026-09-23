import type { CanvasLayer } from '../types';

export type VideoGenerationMode = 'text-to-video' | 'image-to-video';
export type VideoModelAlias =
  | 'seedance-2.5'
  | 'seedance-2.0'
  | 'seedance-2.0-fast'
  | 'seedance-2.0-mini'
  | 'seedance-1.5-pro'
  | 'seedance-1.0-pro-fast'
  | 'minimax-h3-local'
  | 'minimax-h3-api';

export type VideoGenerationNode = Omit<CanvasLayer, 'type'> & {
  type: 'video';
  videoMode: VideoGenerationMode;
  videoModel: VideoModelAlias;
  durationSeconds: number;
  videoSrc?: string;
  videoTaskId?: string;
};

export interface CreateVideoGenerationNodeParams {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface GeneratedVideoResult {
  video: string;
  durationSeconds: number;
  taskId: string;
}

export function createVideoGenerationNode(
  params: CreateVideoGenerationNodeParams,
): VideoGenerationNode {
  return {
    id: params.id,
    type: 'video',
    name: params.name,
    x: params.x,
    y: params.y,
    width: 320,
    height: 180,
    visible: true,
    locked: false,
    opacity: 1,
    rotate: 0,
    prompt: '',
    parentIds: [],
    aspectRatio: '16:9',
    videoMode: 'text-to-video',
    videoModel: 'seedance-2.0',
    durationSeconds: 5,
    videoSrc: '',
  };
}

export function applyGeneratedVideoToNode(
  node: VideoGenerationNode,
  result: GeneratedVideoResult,
): VideoGenerationNode {
  return {
    ...node,
    videoSrc: result.video,
    videoTaskId: result.taskId,
    durationSeconds: result.durationSeconds,
  };
}
