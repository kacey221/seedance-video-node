import express from 'express';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  generateSeedanceVideo,
  SEEDANCE_PUBLIC_VIDEO_PATH,
  type GenerateSeedanceVideoRequest,
  type SeedanceVideoAspectRatio,
  type SeedanceVideoMode,
  type SeedanceVideoReference,
} from './seedanceVideo';
import {
  loadSeedanceVideoConfig,
  type SeedanceVideoConfig,
  type SeedanceVideoModelAlias,
} from './seedanceVideoConfig';

const SEEDANCE_VIDEO_CONFIG_PATH = path.join(
  process.cwd(),
  'config',
  'seedance-video.json',
);
const SEEDANCE_VIDEO_MODES: SeedanceVideoMode[] = ['text-to-video', 'image-to-video'];
const SEEDANCE_VIDEO_MODEL_ALIASES: SeedanceVideoModelAlias[] = [
  'seedance-2.5',
  'seedance-2.0',
  'seedance-2.0-fast',
  'seedance-2.0-mini',
  'seedance-1.5-pro',
  'seedance-1.0-pro-fast',
];
const SEEDANCE_VIDEO_ASPECT_RATIOS: SeedanceVideoAspectRatio[] = [
  '1:1',
  '3:4',
  '4:3',
  '9:16',
  '16:9',
];
const SEEDANCE_VIDEO_QUALITIES = ['480P', '720P', '1080P'] as const;

class RequestValidationError extends Error {}

export function registerSeedanceVideoRoutes(app: express.Express): void {
  configureSeedanceVideoStaticServing(app);
  app.post('/api/seedance/generate-video', handleSeedanceGenerateVideo);
  app.get('/api/seedance/tasks/:taskId', handleSeedanceTaskStatus);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new RequestValidationError(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

function readOptionalNonEmptyString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new RequestValidationError(`${fieldName} must be a string when provided.`);
  }

  const trimmedValue = value.trim();
  return trimmedValue || undefined;
}

function readEnumValue<T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[],
): T {
  if (typeof value !== 'string' || !allowedValues.includes(value as T)) {
    throw new RequestValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}.`,
    );
  }

  return value as T;
}

function readPositiveInteger(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new RequestValidationError(`${fieldName} must be a positive integer.`);
  }

  return value;
}

function readOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw new RequestValidationError(`${fieldName} must be a boolean when provided.`);
  }

  return value;
}

function readSeedanceVideoReference(
  value: unknown,
  fieldName: string,
): SeedanceVideoReference {
  if (!isRecord(value)) {
    throw new RequestValidationError(`${fieldName} must be an object.`);
  }

  return {
    labelNumber: readPositiveInteger(value.labelNumber, `${fieldName}.labelNumber`),
    src: readNonEmptyString(value.src, `${fieldName}.src`),
  };
}

function readOptionalSeedanceVideoReference(
  value: unknown,
  fieldName: string,
): SeedanceVideoReference | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return readSeedanceVideoReference(value, fieldName);
}

function readOptionalSeedanceVideoReferences(
  value: unknown,
  fieldName: string,
): SeedanceVideoReference[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new RequestValidationError(`${fieldName} must be an array when provided.`);
  }

  return value.map((item, index) =>
    readSeedanceVideoReference(item, `${fieldName}[${index}]`),
  );
}

function parseSeedanceGenerateVideoRequest(body: unknown): GenerateSeedanceVideoRequest {
  if (!isRecord(body)) {
    throw new RequestValidationError('Request body must be a JSON object.');
  }

  const mode = readEnumValue(body.mode, 'mode', SEEDANCE_VIDEO_MODES);
  const request: GenerateSeedanceVideoRequest = {
    prompt: readNonEmptyString(body.prompt, 'prompt'),
    mode,
    modelAlias: readEnumValue(
      body.modelAlias,
      'modelAlias',
      SEEDANCE_VIDEO_MODEL_ALIASES,
    ),
    aspectRatio: readEnumValue(
      body.aspectRatio,
      'aspectRatio',
      SEEDANCE_VIDEO_ASPECT_RATIOS,
    ),
    durationSeconds: readPositiveInteger(body.durationSeconds, 'durationSeconds'),
    videoQuality: body.videoQuality
      ? readEnumValue(body.videoQuality, 'videoQuality', SEEDANCE_VIDEO_QUALITIES)
      : undefined,
    generateAudio: readOptionalBoolean(body.generateAudio, 'generateAudio'),
    firstFrame: readOptionalSeedanceVideoReference(body.firstFrame, 'firstFrame'),
    lastFrame: readOptionalSeedanceVideoReference(body.lastFrame, 'lastFrame'),
    references: readOptionalSeedanceVideoReferences(body.references, 'references'),
    referenceSummary: readOptionalNonEmptyString(body.referenceSummary, 'referenceSummary'),
  };

  if (mode === 'image-to-video' && !request.firstFrame) {
    throw new RequestValidationError('firstFrame is required for image-to-video requests.');
  }

  return request;
}

function loadRuntimeSeedanceVideoConfig(): SeedanceVideoConfig {
  return loadSeedanceVideoConfig({
    configPath: SEEDANCE_VIDEO_CONFIG_PATH,
  });
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function buildSeedanceTaskUrl(baseUrl: string, taskId: string): string {
  return `${trimTrailingSlash(baseUrl)}/api/v3/contents/generations/tasks/${encodeURIComponent(taskId)}`;
}

function buildSeedanceTaskHeaders(config: SeedanceVideoConfig): HeadersInit {
  return {
    Authorization: `Bearer ${config.apiKey}`,
  };
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
}

function readNestedErrorMessage(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (!isRecord(value)) {
    return undefined;
  }

  if (typeof value.message === 'string' && value.message.trim()) {
    return value.message.trim();
  }

  return readNestedErrorMessage(value.error);
}

function parseJsonSafely(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function readSeedanceCacheDirForStaticServing(): string | undefined {
  try {
    const rawConfig = readFileSync(SEEDANCE_VIDEO_CONFIG_PATH, 'utf8');
    const parsedConfig = parseJsonSafely(rawConfig);

    if (
      isRecord(parsedConfig) &&
      typeof parsedConfig.cacheDir === 'string' &&
      parsedConfig.cacheDir.trim()
    ) {
      return parsedConfig.cacheDir.trim();
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function configureSeedanceVideoStaticServing(app: express.Express): void {
  try {
    const cacheDir =
      readSeedanceCacheDirForStaticServing() ?? loadRuntimeSeedanceVideoConfig().cacheDir;

    app.use(
      SEEDANCE_PUBLIC_VIDEO_PATH,
      express.static(path.resolve(cacheDir), {
        fallthrough: false,
      }),
    );
  } catch (error) {
    console.warn(
      '[SEEDANCE] Local video static serving disabled:',
      getErrorMessage(error, 'Unknown Seedance config error.'),
    );
  }
}

async function handleSeedanceGenerateVideo(
  req: express.Request,
  res: express.Response,
): Promise<void> {
  try {
    const request = parseSeedanceGenerateVideoRequest(req.body);
    const config = loadRuntimeSeedanceVideoConfig();
    const result = await generateSeedanceVideo({
      config,
      request,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Seedance generate video error:', error);

    const statusCode = error instanceof RequestValidationError ? 400 : 500;
    res.status(statusCode).json({
      error: getErrorMessage(error, 'Error generating video with Seedance.'),
    });
  }
}

async function handleSeedanceTaskStatus(
  req: express.Request,
  res: express.Response,
): Promise<void> {
  const taskId = req.params.taskId?.trim();

  if (!taskId) {
    res.status(400).json({ error: 'Task ID is required.' });
    return;
  }

  try {
    const config = loadRuntimeSeedanceVideoConfig();
    const response = await fetch(buildSeedanceTaskUrl(config.baseUrl, taskId), {
      method: 'GET',
      headers: buildSeedanceTaskHeaders(config),
    });
    const responseText = await response.text();
    const parsedPayload = parseJsonSafely(responseText);

    if (!response.ok) {
      res.status(response.status).json({
        error:
          readNestedErrorMessage(parsedPayload) ||
          responseText.trim() ||
          `Seedance request failed with status ${response.status}.`,
      });
      return;
    }

    if (parsedPayload === undefined) {
      throw new Error('Seedance task status response was not valid JSON.');
    }

    res.status(response.status).json(parsedPayload);
  } catch (error) {
    console.error('Seedance task status error:', error);
    res.status(500).json({
      error: getErrorMessage(error, 'Error fetching Seedance task status.'),
    });
  }
}
