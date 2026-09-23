import type { AgentMessage } from '../src/types';

type AgentRequestInput = {
  model: string;
  messages: AgentMessage[];
};

type OpenAIConfig = {
  apiKey: string;
  baseUrl: string;
};

const STORYBOARD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'shots'],
  properties: {
    title: { type: 'string' },
    shots: {
      type: 'array',
      minItems: 1,
      maxItems: 20,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'title',
          'prompt',
          'negativePrompt',
          'aspectRatio',
          'model',
          'detailLevel',
          'selected',
        ],
        properties: {
          title: { type: 'string' },
          prompt: { type: 'string' },
          negativePrompt: { type: 'string' },
          aspectRatio: { type: 'string', enum: ['1:1', '3:4', '4:3', '9:16', '16:9'] },
          model: {
            type: 'string',
            enum: [
              'gpt-image-2',
              'gpt-image-2-vip',
              'nano-banana',
              'nano-banana-2',
              'nano-banana-pro',
              'image-2.5',
              'image-2.5-flare',
              'image-2.5-sunburst',
            ],
          },
          detailLevel: { type: 'string', enum: ['1K', '2K', '4K'] },
          selected: { type: 'boolean' },
        },
      },
    },
  },
};

function buildRequest(
  input: AgentRequestInput,
  config: OpenAIConfig,
  storyboard: boolean,
): { url: string; init: RequestInit } {
  if (!input.messages.length) throw new Error('At least one conversation message is required.');
  return {
    url: `${config.baseUrl.replace(/\/+$/, '')}/responses`,
    init: {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: input.model,
        instructions: storyboard
          ? 'Turn the full conversation into an editable image storyboard. Follow the requested number of shots. If the user requests one image, return one shot. Write production-ready image prompts.'
          : 'You are a visual creative director inside an infinite canvas. Discuss, question, analyze, and improve the user idea. Do not claim that images were generated. Reply in the user language.',
        input: input.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        ...(storyboard
          ? {
              text: {
                format: {
                  type: 'json_schema',
                  name: 'editable_storyboard',
                  strict: true,
                  schema: STORYBOARD_SCHEMA,
                },
              },
            }
          : {}),
      }),
    },
  };
}

export function buildAgentChatRequest(input: AgentRequestInput, config: OpenAIConfig) {
  return buildRequest(input, config, false);
}

export function buildStoryboardRequest(input: AgentRequestInput, config: OpenAIConfig) {
  return buildRequest(input, config, true);
}

export function parseResponseText(response: unknown): string {
  const output = (response as any)?.output;
  if (!Array.isArray(output)) throw new Error('OpenAI response did not contain output.');
  const text = output
    .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .find((item: any) => item?.type === 'output_text' && typeof item.text === 'string')
    ?.text?.trim();
  if (!text) throw new Error('OpenAI response did not contain output text.');
  return text;
}

export function parseStoryboardResponse(response: unknown): { title: string; shots: unknown[] } {
  const parsed = JSON.parse(parseResponseText(response));
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.shots) || !parsed.shots.length) {
    throw new Error('Storyboard response did not contain any shots.');
  }
  return parsed;
}
