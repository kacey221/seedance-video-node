import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { SeedanceVideoConfig, SeedanceVideoModelAlias } from './seedanceVideoConfig';

export type SeedanceVideoMode = 'text-to-video' | 'image-to-video';
export type SeedanceVideoAspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

export interface SeedanceVideoReference {
  labelNumber: number;
  src: string;
}

export interface GenerateSeedanceVideoRequest {
  prompt: string;
  mode: SeedanceVideoMode;
  modelAlias: SeedanceVideoModelAlias;
  aspectRatio: SeedanceVideoAspectRatio;
  durationSeconds: number;
  videoQuality?: '480P' | '720P' | '1080P';
  generateAudio?: boolean;
  firstFrame?: SeedanceVideoReference;
  lastFrame?: SeedanceVideoReference;
  references?: SeedanceVideoReference[];
  referenceSummary?: string;
}

export interface SeedanceVideoFetchResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
  arrayBuffer?(): Promise<ArrayBuffer>;
  headers?: {
    get(name: string): string | null;
  };
}

export interface GenerateSeedanceVideoOptions {
  config: SeedanceVideoConfig;
  request: GenerateSeedanceVideoRequest;
  fetchImpl?: (input: string, init?: RequestInit) => Promise<SeedanceVideoFetchResponseLike>;
  writeFileImpl?: (filePath: string, contents: Buffer) => Promise<void> | void;
  sleepImpl?: (ms: number) => Promise<void>;
  nowImpl?: () => number;
}

export interface GenerateSeedanceVideoResult {
  taskId: string;
  video: string;
  mode: SeedanceVideoMode;
  modelName: string;
  durationSeconds: number;
  referenceSummary?: string;
}

export const SEEDANCE_PUBLIC_VIDEO_PATH = '/generated-videos';

type SeedanceFetchImpl = NonNullable<GenerateSeedanceVideoOptions['fetchImpl']>;
type SeedanceWriteFileImpl = NonNullable<GenerateSeedanceVideoOptions['writeFileImpl']>;
type SeedanceSleepImpl = NonNullable<GenerateSeedanceVideoOptions['sleepImpl']>;
type SeedanceNowImpl = NonNullable<GenerateSeedanceVideoOptions['nowImpl']>;

const MODEL_NAMES: Record<SeedanceVideoModelAlias, string> = {
  'seedance-2.5': 'Seedance 2.5',
  'seedance-2.0': 'Seedance 2.0',
  'seedance-2.0-fast': 'Seedance 2.0 Fast',
  'seedance-2.0-mini': 'Seedance 2.0 Mini',
  'seedance-1.5-pro': 'Seedance 1.5 Pro',
  'seedance-1.0-pro-fast': 'Seedance 1.0 Pro Fast',
};

const CONTENT_ARRAY_MODEL_ALIASES = new Set<SeedanceVideoModelAlias>([
  'seedance-2.5',
  'seedance-2.0-mini',
  'seedance-1.5-pro',
  'seedance-1.0-pro-fast',
]);

export async function generateSeedanceVideo(
  options: GenerateSeedanceVideoOptions,
): Promise<GenerateSeedanceVideoResult> {
  const fetchImpl = options.fetchImpl ?? defaultFetchImpl;
  const writeFileImpl = options.writeFileImpl ?? defaultWriteFileImpl;
  const sleepImpl = options.sleepImpl ?? defaultSleepImpl;
  const nowImpl = options.nowImpl ?? Date.now;
  const modelId = resolveModelId(options.config, options.request.modelAlias);

  const createdTask = await requestSeedanceJson(fetchImpl, buildTasksUrl(options.config.baseUrl), {
    method: 'POST',
    headers: buildSeedanceHeaders(options.config),
    body: JSON.stringify(buildCreateTaskBody(options.request, modelId)),
  });
  const taskId = readTaskId(createdTask, 'Seedance task creation response');
  const startedAt = nowImpl();
  let currentTask = createdTask;

  while (true) {
    const status = readTaskStatus(currentTask);

    if (!status) {
      currentTask = await requestSeedanceJson(
        fetchImpl,
        buildTaskUrl(options.config.baseUrl, taskId),
        {
          method: 'GET',
          headers: buildSeedanceHeaders(options.config),
        },
      );
      continue;
    }

    if (status === 'succeeded') {
      return completeSucceededTask({
        config: options.config,
        request: options.request,
        taskId,
        taskResponse: currentTask,
        fetchImpl,
        writeFileImpl,
      });
    }

    if (status === 'failed') {
      throw createTaskFailureError(taskId, currentTask);
    }

    if (nowImpl() - startedAt >= options.config.pollTimeoutMs) {
      throw new Error(`Seedance task ${taskId} timed out after ${options.config.pollTimeoutMs}ms.`);
    }

    await sleepImpl(options.config.pollIntervalMs);
    currentTask = await requestSeedanceJson(
      fetchImpl,
      buildTaskUrl(options.config.baseUrl, taskId),
      {
        method: 'GET',
        headers: buildSeedanceHeaders(options.config),
      },
    );
  }
}

async function completeSucceededTask({
  config,
  request,
  taskId,
  taskResponse,
  fetchImpl,
  writeFileImpl,
}: {
  config: SeedanceVideoConfig;
  request: GenerateSeedanceVideoRequest;
  taskId: string;
  taskResponse: Record<string, unknown>;
  fetchImpl: SeedanceFetchImpl;
  writeFileImpl: SeedanceWriteFileImpl;
}): Promise<GenerateSeedanceVideoResult> {
  const videoUrl = readVideoUrl(taskResponse, taskId);
  const videoBytes = await downloadVideoBytes(fetchImpl, videoUrl);
  const fileName = `${sanitizeTaskId(taskId)}.mp4`;
  const cacheDir = resolve(config.cacheDir);
  const filePath = join(cacheDir, fileName);

  await mkdir(cacheDir, { recursive: true });
  await writeFileImpl(filePath, videoBytes);

  return {
    taskId,
    video: buildPublicVideoPath(fileName),
    mode: request.mode,
    modelName: MODEL_NAMES[request.modelAlias],
    durationSeconds: request.durationSeconds,
    referenceSummary: request.referenceSummary,
  };
}

function resolveModelId(config: SeedanceVideoConfig, modelAlias: SeedanceVideoModelAlias): string {
  const modelId = config.models[modelAlias];

  if (!modelId) {
    throw new Error(`Seedance model alias "${modelAlias}" is not configured.`);
  }

  return modelId;
}

function buildCreateTaskBody(
  request: GenerateSeedanceVideoRequest,
  modelId: string,
): Record<string, unknown> {
  if (CONTENT_ARRAY_MODEL_ALIASES.has(request.modelAlias)) {
    return buildContentArrayTaskBody(request, modelId);
  }

  return buildPromptTaskBody(request, modelId);
}

function buildPromptTaskBody(
  request: GenerateSeedanceVideoRequest,
  modelId: string,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: modelId,
    durationSeconds: request.durationSeconds,
    aspectRatio: request.aspectRatio,
  };

  body.prompt = request.prompt;

  if (request.firstFrame) {
    body.firstFrame = request.firstFrame;
  }

  if (request.lastFrame) {
    body.lastFrame = request.lastFrame;
  }

  if (request.references?.length) {
    body.references = request.references;
  }

  return body;
}

function buildContentArrayTaskBody(
  request: GenerateSeedanceVideoRequest,
  modelId: string,
): Record<string, unknown> {
  const orderedReferences = collectOrderedReferences(request);

  return {
    model: modelId,
    content: [
      {
        type: 'text',
        text: buildContentArrayPromptText(request, orderedReferences),
      },
      ...orderedReferences.map((reference) => ({
        role: resolveContentImageRole(request, reference),
        type: 'image_url',
        image_url: {
          url: reference.src,
        },
      })),
    ],
    ratio: request.aspectRatio,
    duration: request.durationSeconds,
    resolution: normalizeVideoResolution(request.videoQuality),
    generate_audio: request.generateAudio ?? false,
  };
}

function resolveContentImageRole(
  request: GenerateSeedanceVideoRequest,
  reference: SeedanceVideoReference,
): 'first_frame' | 'last_frame' | 'reference_image' {
  if (request.firstFrame?.labelNumber === reference.labelNumber) {
    return 'first_frame';
  }

  if (request.lastFrame?.labelNumber === reference.labelNumber) {
    return 'last_frame';
  }

  return 'reference_image';
}

function collectOrderedReferences(
  request: GenerateSeedanceVideoRequest,
): SeedanceVideoReference[] {
  const uniqueReferences = new Map<number, SeedanceVideoReference>();

  for (const reference of [
    ...(request.references ?? []),
    request.firstFrame,
    request.lastFrame,
  ]) {
    if (!reference || uniqueReferences.has(reference.labelNumber)) {
      continue;
    }

    uniqueReferences.set(reference.labelNumber, reference);
  }

  return [...uniqueReferences.values()].sort(
    (left, right) => left.labelNumber - right.labelNumber,
  );
}

function buildContentArrayPromptText(
  request: GenerateSeedanceVideoRequest,
  orderedReferences: SeedanceVideoReference[],
): string {
  const instructionParts: string[] = [];

  if (orderedReferences.length > 0) {
    instructionParts.push(
      `参考图绑定：${orderedReferences
        .map(
          (reference, index) =>
            `第${index + 1}张图对应@参考图${reference.labelNumber}`,
        )
        .join('；')}。`,
    );
  }

  if (request.firstFrame) {
    instructionParts.push(`首帧参考：@参考图${request.firstFrame.labelNumber}。`);
  }

  if (request.lastFrame) {
    instructionParts.push(`尾帧参考：@参考图${request.lastFrame.labelNumber}。`);
  }

  if (instructionParts.length === 0) {
    return request.prompt;
  }

  return `${instructionParts.join(' ')}\n\n${request.prompt}`;
}

function normalizeVideoResolution(
  videoQuality: GenerateSeedanceVideoRequest['videoQuality'],
): string {
  switch (videoQuality) {
    case '480P':
      return '480p';
    case '1080P':
      return '1080p';
    case '720P':
    default:
      return '720p';
  }
}

function buildSeedanceHeaders(config: SeedanceVideoConfig): HeadersInit {
  return {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
  };
}

function buildTasksUrl(baseUrl: string): string {
  return `${trimTrailingSlash(baseUrl)}/api/v3/contents/generations/tasks`;
}

function buildTaskUrl(baseUrl: string, taskId: string): string {
  return `${buildTasksUrl(baseUrl)}/${encodeURIComponent(taskId)}`;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

async function requestSeedanceJson(
  fetchImpl: SeedanceFetchImpl,
  url: string,
  init: RequestInit,
): Promise<Record<string, unknown>> {
  const response = await fetchImpl(url, init);

  if (!response.ok) {
    const details = await safeReadText(response);
    throw new Error(normalizeSeedanceHttpError(response.status, details));
  }

  const payload = await response.json();

  if (!isRecord(payload)) {
    throw new Error('Seedance returned an invalid JSON response.');
  }

  return payload;
}

async function downloadVideoBytes(
  fetchImpl: SeedanceFetchImpl,
  url: string,
): Promise<Buffer> {
  const response = await fetchImpl(url);

  if (!response.ok) {
    const details = await safeReadText(response);
    throw new Error(normalizeSeedanceHttpError(response.status, details));
  }

  if (!response.arrayBuffer) {
    throw new Error('Seedance video download response did not include binary data.');
  }

  return Buffer.from(await response.arrayBuffer());
}

function readVideoUrl(taskResponse: Record<string, unknown>, taskId: string): string {
  const documentedVideoUrl = taskResponse.video_url;
  if (typeof documentedVideoUrl === 'string' && documentedVideoUrl.trim()) {
    return documentedVideoUrl;
  }

  if (isRecord(taskResponse.content)) {
    const contentVideoUrl = taskResponse.content.video_url;
    if (typeof contentVideoUrl === 'string' && contentVideoUrl.trim()) {
      return contentVideoUrl;
    }
  }

  const directVideoUrl = taskResponse.videoUrl;
  if (typeof directVideoUrl === 'string' && directVideoUrl.trim()) {
    return directVideoUrl;
  }

  if (isRecord(taskResponse.output)) {
    const outputVideoUrl = taskResponse.output.videoUrl;
    if (typeof outputVideoUrl === 'string' && outputVideoUrl.trim()) {
      return outputVideoUrl;
    }
  }

  throw new Error(`Seedance task ${taskId} succeeded but did not return a video URL.`);
}

function createTaskFailureError(taskId: string, taskResponse: Record<string, unknown>): Error {
  const message =
    readErrorMessage(taskResponse.error) ??
    readErrorMessage(taskResponse) ??
    'Unknown Seedance failure';
  return new Error(`Seedance task ${taskId} failed: ${ensureTrailingPeriod(message)}`);
}

function readErrorMessage(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const directMessage = value.message;
  if (typeof directMessage === 'string' && directMessage.trim()) {
    return directMessage.trim();
  }

  const nestedErrorMessage = readErrorMessage(value.error);
  if (nestedErrorMessage) {
    return nestedErrorMessage;
  }

  return undefined;
}

function ensureTrailingPeriod(message: string): string {
  return /[.!?]$/.test(message) ? message : `${message}.`;
}

function normalizeSeedanceHttpError(status: number, details: string): string {
  const parsedMessage = readErrorMessage(parseJsonSafely(details));
  if (parsedMessage) {
    return parsedMessage;
  }

  const trimmedDetails = details.trim();
  return trimmedDetails || `Seedance request failed with status ${status}.`;
}

async function safeReadText(response: SeedanceVideoFetchResponseLike): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function parseJsonSafely(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRequiredString(
  record: Record<string, unknown>,
  key: string,
  context: string,
): string {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${context} is missing required string "${key}".`);
  }

  return value;
}

function readTaskId(record: Record<string, unknown>, context: string): string {
  const documentedTaskId = record.id;
  if (typeof documentedTaskId === 'string' && documentedTaskId.trim()) {
    return documentedTaskId;
  }

  return readRequiredString(record, 'taskId', context);
}

function readTaskStatus(record: Record<string, unknown>): string | undefined {
  const value = record.status;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function sanitizeTaskId(taskId: string): string {
  return taskId.replace(/[^a-zA-Z0-9_-]+/g, '-');
}

function buildPublicVideoPath(fileName: string): string {
  return `${SEEDANCE_PUBLIC_VIDEO_PATH}/${fileName}`;
}

async function defaultWriteFileImpl(filePath: string, contents: Buffer): Promise<void> {
  await writeFile(filePath, contents);
}

async function defaultFetchImpl(
  input: string,
  init?: RequestInit,
): Promise<SeedanceVideoFetchResponseLike> {
  return fetch(input, init);
}

async function defaultSleepImpl(ms: number): Promise<void> {
  await new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}
