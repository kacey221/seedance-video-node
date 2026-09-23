import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';
import { loadSeedanceVideoConfig } from './seedanceVideoConfig';

function createValidSeedanceConfigFixture() {
  return {
    provider: 'seedance',
    baseUrl: 'https://ark.cn-beijing.volces.com',
    apiKeyEnv: 'VOLCENGINE_ARK_API_KEY',
    defaultModel: 'dreamina-seedance-2-0-260128',
    models: {
      'seedance-2.5': 'doubao-seedance-2-5-260628',
      'seedance-2.0': 'dreamina-seedance-2-0-260128',
      'seedance-2.0-fast': 'dreamina-seedance-2-0-fast-260128',
      'seedance-2.0-mini': 'doubao-seedance-2-0-mini-260615',
      'seedance-1.5-pro': 'doubao-seedance-1-5-pro-251215',
      'seedance-1.0-pro-fast': 'doubao-seedance-1-0-pro-fast-251015',
    },
    pollIntervalMs: 4000,
    pollTimeoutMs: 480000,
    cacheDir: 'storage/generated-videos',
  };
}

function writeSeedanceConfigFixture(
  t: TestContext,
  config: Record<string, unknown> = createValidSeedanceConfigFixture(),
) {
  const tempDir = mkdtempSync(join(tmpdir(), 'seedance-video-config-'));
  t.after(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  const fixturePath = join(tempDir, 'seedance-video.json');
  writeFileSync(fixturePath, JSON.stringify(config, null, 2));
  return fixturePath;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('loads a local seedance config and resolves model aliases', (t) => {
  const fixturePath = writeSeedanceConfigFixture(t);
  const config = loadSeedanceVideoConfig({
    configPath: fixturePath,
    env: { VOLCENGINE_ARK_API_KEY: 'secret-key' },
  });
  const modelMap = config.models as Record<string, string>;

  assert.equal(config.apiKey, 'secret-key');
  assert.equal(config.models['seedance-2.0'], 'dreamina-seedance-2-0-260128');
  assert.equal(config.models['seedance-2.0-fast'], 'dreamina-seedance-2-0-fast-260128');
  assert.equal(modelMap['seedance-2.0-mini'], 'doubao-seedance-2-0-mini-260615');
  assert.equal(modelMap['seedance-1.5-pro'], 'doubao-seedance-1-5-pro-251215');
  assert.equal(modelMap['seedance-1.0-pro-fast'], 'doubao-seedance-1-0-pro-fast-251015');
});

test('missing config file throws a readable error', (t) => {
  const tempDir = mkdtempSync(join(tmpdir(), 'seedance-video-config-missing-'));
  t.after(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  const missingConfigFilename = 'seedance-video-config-does-not-exist.json';
  const missingConfigPath = join(tempDir, missingConfigFilename);

  assert.throws(
    () =>
      loadSeedanceVideoConfig({
        configPath: missingConfigPath,
        env: { VOLCENGINE_ARK_API_KEY: 'secret-key' },
      }),
    new RegExp(
      `Seedance video config file was not found at .*${escapeRegExp(missingConfigFilename)}`,
    ),
  );
});

test('missing API key env throws a readable error', (t) => {
  const fixturePath = writeSeedanceConfigFixture(t);

  assert.throws(
    () =>
      loadSeedanceVideoConfig({
        configPath: fixturePath,
        env: {},
      }),
    /Seedance video API key environment variable "VOLCENGINE_ARK_API_KEY" is not set\./,
  );
});

test('invalid provider throws a readable error', (t) => {
  const fixturePath = writeSeedanceConfigFixture(t, {
    ...createValidSeedanceConfigFixture(),
    provider: 'not-seedance',
  });

  assert.throws(
    () =>
      loadSeedanceVideoConfig({
        configPath: fixturePath,
        env: { VOLCENGINE_ARK_API_KEY: 'secret-key' },
      }),
    /Seedance video config at .* has unsupported provider "not-seedance"; expected "seedance"\./,
  );
});

test('missing model aliases throws a readable error', (t) => {
  const fixturePath = writeSeedanceConfigFixture(t, {
    ...createValidSeedanceConfigFixture(),
    models: {
      'seedance-2.5': 'doubao-seedance-2-5-260628',
      'seedance-2.0': 'dreamina-seedance-2-0-260128',
      'seedance-2.0-mini': 'doubao-seedance-2-0-mini-260615',
      'seedance-1.5-pro': 'doubao-seedance-1-5-pro-251215',
      'seedance-1.0-pro-fast': 'doubao-seedance-1-0-pro-fast-251015',
    },
  });

  assert.throws(
    () =>
      loadSeedanceVideoConfig({
        configPath: fixturePath,
        env: { VOLCENGINE_ARK_API_KEY: 'secret-key' },
      }),
    /Seedance video config is missing required model alias "seedance-2\.0-fast"\./,
  );
});

test('missing one of the newly supported model aliases throws a readable error', (t) => {
  const fixturePath = writeSeedanceConfigFixture(t, {
    ...createValidSeedanceConfigFixture(),
    models: {
      'seedance-2.5': 'doubao-seedance-2-5-260628',
      'seedance-2.0': 'dreamina-seedance-2-0-260128',
      'seedance-2.0-fast': 'dreamina-seedance-2-0-fast-260128',
      'seedance-2.0-mini': 'doubao-seedance-2-0-mini-260615',
      'seedance-1.0-pro-fast': 'doubao-seedance-1-0-pro-fast-251015',
    },
  });

  assert.throws(
    () =>
      loadSeedanceVideoConfig({
        configPath: fixturePath,
        env: { VOLCENGINE_ARK_API_KEY: 'secret-key' },
      }),
    /Seedance video config is missing required model alias "seedance-1\.5-pro"\./,
  );
});
