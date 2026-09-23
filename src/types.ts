export type DetailLevel = '1K' | '2K' | '4K';
export type VideoGenerationMode = 'text-to-video' | 'image-to-video';
export type AgentStage = 'chat' | 'storyboard' | 'generating' | 'completed';
export type AgentMessageRole = 'user' | 'assistant';

export interface AgentMessage {
  id: string;
  role: AgentMessageRole;
  content: string;
}

export interface StoryboardItem {
  id: string;
  order: number;
  title: string;
  prompt: string;
  negativePrompt: string;
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  model: NonNullable<CanvasLayer['rightCodesModel']>;
  detailLevel: DetailLevel;
  selected: boolean;
}
export type VideoModelAlias =
  | 'seedance-2.5'
  | 'seedance-2.0'
  | 'seedance-2.0-fast'
  | 'seedance-2.0-mini'
  | 'seedance-1.5-pro'
  | 'seedance-1.0-pro-fast'
  | 'minimax-h3-local'
  | 'minimax-h3-api';

export interface ModelPreset {
  id: string;
  name: string;
  category: 'Realistic' | 'Anime/Illustration' | 'Sci-Fi/Cyber' | 'Fantasy/Art' | 'Flux/SDXL Base';
  thumbnailUrl: string;
  description: string;
  promptTrigger?: string;
}

export interface StyleReference {
  id: string;
  name: string;
  category: 'LoRA' | 'Style' | 'Effect';
  thumbnailUrl: string;
  promptTrigger: string;
  weight: number; // 0 to 1
}

export interface CanvasLayer {
  id: string;
  type: 'image' | 'drawing' | 'text' | 'video' | 'agent';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  src?: string; // base64 or URL
  visible: boolean;
  locked: boolean;
  opacity: number;
  rotate: number; // in degrees
  drawingData?: string; // Base64 dataURL of drawing layer
  textValue?: string;
  textColor?: string;
  fontSize?: number;
  videoMode?: VideoGenerationMode;
  videoModel?: VideoModelAlias;
  durationSeconds?: number;
  videoSrc?: string;
  videoTaskId?: string;
  videoQuality?: '480P' | '720P' | '1080P';
  generateAudio?: boolean;
  agentModel?: string;
  agentStage?: AgentStage;
  agentMessages?: AgentMessage[];
  storyboards?: StoryboardItem[];
  agentError?: string;
  generationProgress?: { completed: number; failed: number; total: number };

  // Node relationships & specifications for node-based graph structure in infinite canvas
  parentId?: string;
  parentIds?: string[]; // Supports multiple connected parent nodes
  prompt?: string; // Local positive prompt for this generation node
  negativePrompt?: string; // Local negative prompt
  engine?: 'imagen-4' | 'gemini-2.5-image' | 'gemini-3.1-image' | 'rightcodes-image'; // Local generation model selected
  rightCodesModel?: 'gpt-image-2' | 'gpt-image-2-vip' | 'nano-banana' | 'nano-banana-2' | 'nano-banana-pro' | 'image-2.5' | 'image-2.5-flare' | 'image-2.5-sunburst';
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | 'auto'; // Local size / aspect ratio
  detailLevel?: DetailLevel; // Requested image output resolution
  isGenerating?: boolean; // Generating spinner status
  isReference?: boolean; // Reference node flag
}

export interface GenerationConfig {
  engine: 'imagen-4' | 'gemini-2.5-image' | 'gemini-3.1-image' | 'rightcodes-image';
  positivePrompt: string;
  negativePrompt: string;
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | 'auto';
  imageSize: '512px' | '1K' | '2K';
  batchCount: number; // number of images (1, 2, 4)
  cfgScale: number; // 1 to 20
  steps: number; // 1 to 50
  seed: number;
  denoisingStrength: number; // For image-to-image (0 to 1)
  useImageToImage: boolean;
  selectedModelId: string;
  selectedStyles: Array<{ id: string; weight: number }>;
}

interface GenerationHistoryItemBase {
  id: string;
  prompt: string;
  negativePrompt: string;
  aspectRatio: string;
  engine: string;
  modelName: string;
  seed: number;
  timestamp: string;
}

export interface ImageGenerationHistoryItem extends GenerationHistoryItemBase {
  mediaType: 'image';
  images: string[]; // Base64 image data strings for image generations
  videoSrc?: never;
  videoTaskId?: never;
  durationSeconds?: never;
}

export interface VideoGenerationHistoryItem extends GenerationHistoryItemBase {
  mediaType: 'video';
  images?: never;
  videoSrc: string;
  videoTaskId?: string;
  durationSeconds?: number;
}

export type GenerationHistoryItem = ImageGenerationHistoryItem | VideoGenerationHistoryItem;

export type CanvasTool = 'select' | 'pan' | 'brush' | 'eraser' | 'add-text' | 'crop';
