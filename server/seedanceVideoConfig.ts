import { readFileSync } from 'node:fs';

export type SeedanceVideoModelAlias =
  | 'seedance-2.5'
  | 'seedance-2.0'
  | 'seedance-2.0-fast'
  | 'seedance-2.0-mini'
  | 'seedance-1.5-pro'
  | 'seedance-1.0-pro-fast';

export interface SeedanceVideoConfig {
  provider: 'seedance';
  baseUrl: string;
  apiKeyEnv: string;
  apiKey: string;
  defaultModel: string;
  models: Record<SeedanceVideoModelAlias, string>;
  pollIntervalMs: number;
  pollTimeoutMs: number;
  cacheDir: string;
}

export interface LoadSeedanceVideoConfigOptions {
  configPath: string;
  env?: Record<string, string | undefined>;
}

const REQUIRED_MODEL_ALIASES: SeedanceVideoModelAlias[] = [
  'seedance-2.5',
  'seedance-2.0',
  'seedance-2.0-fast',
  'seedance-2.0-mini',
  'seedance-1.5-pro',
  'seedance-1.0-pro-fast',
];
const REQUIRED_PROVIDER: SeedanceVideoConfig['provider'] = 'seedance';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readConfigJson(configPath: string): Record<string, unknown> {
  let rawConfig: string;

  try {
    rawConfig = readFileSync(configPath, 'utf8');
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
        ? error.code
        : undefined;

    if (code === 'ENOENT') {
      throw new Error(`Seedance video config file was not found at ${configPath}.`);
    }

    throw error;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawConfig);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown JSON parse error.';
    throw new Error(`Seedance video config at ${configPath} contains invalid JSON: ${message}`);
  }

  if (!isRecord(parsed)) {
    throw new Error(`Seedance video config at ${configPath} must contain a JSON object.`);
  }

  return parsed;
}

function readRequiredString(
  config: Record<string, unknown>,
  key: keyof SeedanceVideoConfig,
  configPath: string,
): string {
  const value = config[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Seedance video config at ${configPath} is missing required string "${key}".`);
  }

  return value;
}

function readRequiredNumber(
  config: Record<string, unknown>,
  key: keyof SeedanceVideoConfig,
  configPath: string,
): number {
  const value = config[key];
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Seedance video config at ${configPath} is missing required number "${key}".`);
  }

  return value;
}

function readModels(
  config: Record<string, unknown>,
  configPath: string,
): Record<SeedanceVideoModelAlias, string> {
  const models = config.models;

  if (!isRecord(models)) {
    throw new Error(`Seedance video config at ${configPath} is missing required object "models".`);
  }

  for (const alias of REQUIRED_MODEL_ALIASES) {
    const modelId = models[alias];
    if (typeof modelId !== 'string' || !modelId.trim()) {
      throw new Error(`Seedance video config is missing required model alias "${alias}".`);
    }
  }

  return {
    'seedance-2.0': models['seedance-2.0'],
    'seedance-2.0-fast': models['seedance-2.0-fast'],
    'seedance-2.0-mini': models['seedance-2.0-mini'],
    'seedance-1.5-pro': models['seedance-1.5-pro'],
    'seedance-1.0-pro-fast': models['seedance-1.0-pro-fast'],
  } as Record<SeedanceVideoModelAlias, string>;
}

function readProvider(
  config: Record<string, unknown>,
  configPath: string,
): SeedanceVideoConfig['provider'] {
  const provider = readRequiredString(config, 'provider', configPath);

  if (provider !== REQUIRED_PROVIDER) {
    throw new Error(
      `Seedance video config at ${configPath} has unsupported provider "${provider}"; expected "${REQUIRED_PROVIDER}".`,
    );
  }

  return REQUIRED_PROVIDER;
}

export function loadSeedanceVideoConfig(
  options: LoadSeedanceVideoConfigOptions,
): SeedanceVideoConfig {
  const env = options.env ?? process.env;
  const config = readConfigJson(options.configPath);
  const apiKeyEnv = readRequiredString(config, 'apiKeyEnv', options.configPath);
  const apiKey = env[apiKeyEnv]?.trim();

  if (!apiKey) {
    throw new Error(`Seedance video API key environment variable "${apiKeyEnv}" is not set.`);
  }

  return {
    provider: readProvider(config, options.configPath),
    baseUrl: readRequiredString(config, 'baseUrl', options.configPath),
    apiKeyEnv,
    apiKey,
    defaultModel: readRequiredString(config, 'defaultModel', options.configPath),
    models: readModels(config, options.configPath),
    pollIntervalMs: readRequiredNumber(config, 'pollIntervalMs', options.configPath),
    pollTimeoutMs: readRequiredNumber(config, 'pollTimeoutMs', options.configPath),
    cacheDir: readRequiredString(config, 'cacheDir', options.configPath),
  };
}
