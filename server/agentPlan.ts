import type { VideoModelAlias } from '../src/types';

export type AgentImagePlan = {
  prompt: string;
  negativePrompt: string;
  model: NonNullable<import('../src/types').CanvasLayer['rightCodesModel']>;
  aspectRatio: Exclude<NonNullable<import('../src/types').CanvasLayer['aspectRatio']>, 'auto'>;
  detailLevel: import('../src/types').DetailLevel;
};

export type AgentVideoPlan = {
  prompt: string;
  mode: 'image-to-video';
  modelAlias: VideoModelAlias;
  aspectRatio: Exclude<NonNullable<import('../src/types').CanvasLayer['aspectRatio']>, 'auto'>;
  durationSeconds: number;
  videoQuality: NonNullable<import('../src/types').CanvasLayer['videoQuality']>;
  generateAudio: boolean;
};

export type AgentPlan = {
  title: string;
  analysis: string;
  image: AgentImagePlan;
  video: AgentVideoPlan;
};

const IMAGE_MODELS: AgentImagePlan['model'][] = [
  'gpt-image-2',
  'gpt-image-2-vip',
  'nano-banana',
  'nano-banana-2',
  'nano-banana-pro',
  'image-2.5',
  'image-2.5-flare',
  'image-2.5-sunburst',
];
const ASPECT_RATIOS: AgentImagePlan['aspectRatio'][] = ['1:1', '3:4', '4:3', '9:16', '16:9'];
const VIDEO_MODELS: VideoModelAlias[] = [
  'seedance-2.5',
  'seedance-2.0',
  'seedance-2.0-fast',
  'seedance-2.0-mini',
  'seedance-1.5-pro',
  'seedance-1.0-pro-fast',
  'minimax-h3-local',
  'minimax-h3-api',
];
const VIDEO_QUALITIES: AgentVideoPlan['videoQuality'][] = ['480P', '720P', '1080P'];

function nonEmpty(value: unknown, field: string, fallback?: string): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error(`${field} must be a non-empty string.`);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string, fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T)
    ? value as T
    : fallback;
}

function positiveDuration(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 12
    ? value
    : 5;
}

export function normalizeAgentPlan(input: unknown): AgentPlan {
  const record = (input && typeof input === 'object' ? input : {}) as Record<string, any>;
  const image = (record.image && typeof record.image === 'object' ? record.image : {}) as Record<string, any>;
  const video = (record.video && typeof record.video === 'object' ? record.video : {}) as Record<string, any>;
  const aspectRatio = oneOf(image.aspectRatio ?? video.aspectRatio, ASPECT_RATIOS, 'aspectRatio', '16:9');

  return {
    title: nonEmpty(record.title, 'title', 'Agent storyboard'),
    analysis: nonEmpty(record.analysis, 'analysis', 'Generated an image-to-video storyboard.'),
    image: {
      prompt: nonEmpty(image.prompt, 'image.prompt'),
      negativePrompt: nonEmpty(image.negativePrompt, 'image.negativePrompt', 'low quality, blurry, distorted, text'),
      model: oneOf(image.model, IMAGE_MODELS, 'image.model', 'gpt-image-2'),
      aspectRatio,
      detailLevel: oneOf(image.detailLevel, ['1K', '2K', '4K'] as const, 'image.detailLevel', '1K'),
    },
    video: {
      prompt: nonEmpty(video.prompt, 'video.prompt'),
      mode: 'image-to-video',
      modelAlias: oneOf(video.modelAlias, VIDEO_MODELS, 'video.modelAlias', 'seedance-2.0'),
      aspectRatio: oneOf(video.aspectRatio, ASPECT_RATIOS, 'video.aspectRatio', aspectRatio),
      durationSeconds: positiveDuration(video.durationSeconds),
      videoQuality: oneOf(video.videoQuality, VIDEO_QUALITIES, 'video.videoQuality', '720P'),
      generateAudio: typeof video.generateAudio === 'boolean' ? video.generateAudio : false,
    },
  };
}

const AGENT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'analysis', 'image', 'video'],
  properties: {
    title: { type: 'string' },
    analysis: { type: 'string' },
    image: {
      type: 'object',
      additionalProperties: false,
      required: ['prompt', 'negativePrompt', 'model', 'aspectRatio', 'detailLevel'],
      properties: {
        prompt: { type: 'string' },
        negativePrompt: { type: 'string' },
        model: { type: 'string' },
        aspectRatio: { type: 'string', enum: ASPECT_RATIOS },
        detailLevel: { type: 'string', enum: ['1K', '2K', '4K'] },
      },
    },
    video: {
      type: 'object',
      additionalProperties: false,
      required: ['prompt', 'mode', 'modelAlias', 'aspectRatio', 'durationSeconds', 'videoQuality', 'generateAudio'],
      properties: {
        prompt: { type: 'string' },
        mode: { type: 'string', enum: ['image-to-video'] },
        modelAlias: { type: 'string', enum: VIDEO_MODELS },
        aspectRatio: { type: 'string', enum: ASPECT_RATIOS },
        durationSeconds: { type: 'integer', minimum: 1, maximum: 12 },
        videoQuality: { type: 'string', enum: VIDEO_QUALITIES },
        generateAudio: { type: 'boolean' },
      },
    },
  },
};

export function buildAgentAnalysisRequest(
  brief: string,
  config: { apiKey: string; model: string; baseUrl: string },
): { url: string; init: RequestInit & { headers: Record<string, string> } } {
  const trimmedBrief = brief.trim();
  if (!trimmedBrief) {
    throw new Error('brief must be a non-empty string.');
  }

  return {
    url: `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`,
    init: {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: 'You are a storyboard agent for an infinite canvas. Return only the requested JSON object. Make the image prompt concrete and make the video prompt describe motion, camera, timing, and continuity from the image.',
          },
          { role: 'user', content: trimmedBrief },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'canvas_agent_plan', strict: true, schema: AGENT_JSON_SCHEMA },
        },
      }),
    },
  };
}
