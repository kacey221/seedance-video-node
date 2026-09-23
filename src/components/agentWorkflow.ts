import type { CanvasLayer, StoryboardItem } from '../types';

type StoryboardInput = {
  title?: unknown;
  shots?: unknown;
};

const RATIOS: StoryboardItem['aspectRatio'][] = ['1:1', '3:4', '4:3', '9:16', '16:9'];
const MODELS: StoryboardItem['model'][] = [
  'gpt-image-2',
  'gpt-image-2-vip',
  'nano-banana',
  'nano-banana-2',
  'nano-banana-pro',
  'image-2.5',
  'image-2.5-flare',
  'image-2.5-sunburst',
];

export function createAgentNode(params: { id: string; x: number; y: number }): CanvasLayer {
  return {
    id: params.id,
    type: 'agent',
    name: 'AI 分析与分镜',
    x: params.x,
    y: params.y,
    width: 420,
    height: 560,
    visible: true,
    locked: false,
    opacity: 1,
    rotate: 0,
    agentModel: 'gpt-5.5',
    agentStage: 'chat',
    agentMessages: [],
    storyboards: [],
    generationProgress: { completed: 0, failed: 0, total: 0 },
  };
}

export function normalizeStoryboard(input: StoryboardInput): StoryboardItem[] {
  const shots = Array.isArray(input?.shots) ? input.shots : [];
  return shots.map((raw, index) => {
    const shot = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const prompt = typeof shot.prompt === 'string' ? shot.prompt.trim() : '';
    if (!prompt) throw new Error(`shots[${index}].prompt must be a non-empty string.`);
    return {
      id: typeof shot.id === 'string' && shot.id ? shot.id : `shot-${Date.now()}-${index}`,
      order: index + 1,
      title: typeof shot.title === 'string' && shot.title.trim()
        ? shot.title.trim()
        : `分镜 ${index + 1}`,
      prompt,
      negativePrompt: typeof shot.negativePrompt === 'string' && shot.negativePrompt.trim()
        ? shot.negativePrompt.trim()
        : 'low quality, blurry, distorted, text',
      aspectRatio: RATIOS.includes(shot.aspectRatio as StoryboardItem['aspectRatio'])
        ? shot.aspectRatio as StoryboardItem['aspectRatio']
        : '16:9',
      model: MODELS.includes(shot.model as StoryboardItem['model'])
        ? shot.model as StoryboardItem['model']
        : 'gpt-image-2',
      detailLevel: shot.detailLevel === '2K' || shot.detailLevel === '4K'
        ? shot.detailLevel
        : '1K',
      selected: typeof shot.selected === 'boolean' ? shot.selected : true,
    };
  });
}

export function createStoryboardImageNodes(agent: CanvasLayer, timestamp = Date.now()): CanvasLayer[] {
  return (agent.storyboards || [])
    .filter((shot) => shot.selected)
    .map((shot, index) => ({
      id: `agent-image-${timestamp}-${index}`,
      type: 'image' as const,
      name: `${shot.order}. ${shot.title}`,
      x: agent.x + agent.width + 0 + index * 380,
      y: agent.y,
      width: 320,
      height: 320,
      visible: true,
      locked: false,
      opacity: 1,
      rotate: 0,
      parentId: agent.id,
      parentIds: [agent.id],
      prompt: shot.prompt,
      negativePrompt: shot.negativePrompt,
      engine: 'rightcodes-image' as const,
      rightCodesModel: shot.model,
      aspectRatio: shot.aspectRatio,
      detailLevel: shot.detailLevel,
      isGenerating: true,
    }));
}
