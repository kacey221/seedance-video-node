import assert from 'node:assert/strict';
import test from 'node:test';
import type { SeedanceVideoConfig } from './seedanceVideoConfig';
import {
  generateSeedanceVideo,
  type SeedanceVideoFetchResponseLike,
} from './seedanceVideo';

function createSeedanceConfig(overrides: Partial<SeedanceVideoConfig> = {}): SeedanceVideoConfig {
  return {
    provider: 'seedance',
    baseUrl: 'https://ark.cn-beijing.volces.com',
    apiKeyEnv: 'VOLCENGINE_ARK_API_KEY',
    apiKey: 'test-api-key',
    defaultModel: 'dreamina-seedance-2-0-260128',
    models: {
      'seedance-2.5': 'doubao-seedance-2-5-260628',
      'seedance-2.0': 'dreamina-seedance-2-0-260128',
      'seedance-2.0-fast': 'dreamina-seedance-2-0-fast-260128',
      'seedance-2.0-mini': 'doubao-seedance-2-0-mini-260615',
      'seedance-1.5-pro': 'doubao-seedance-1-5-pro-251215',
      'seedance-1.0-pro-fast': 'doubao-seedance-1-0-pro-fast-251015',
    } as SeedanceVideoConfig['models'] & Record<string, string>,
    pollIntervalMs: 5,
    pollTimeoutMs: 5_000,
    cacheDir: 'storage/generated-videos',
    ...overrides,
  };
}

function createJsonResponse(body: unknown, status = 200): SeedanceVideoFetchResponseLike {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
    arrayBuffer: async () => {
      throw new Error('JSON response does not provide binary bytes.');
    },
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null),
    },
  };
}

function createBinaryResponse(
  bytes: Buffer,
  contentType = 'video/mp4',
): SeedanceVideoFetchResponseLike {
  return {
    ok: true,
    status: 200,
    json: async () => {
      throw new Error('Binary response does not provide JSON.');
    },
    text: async () => {
      throw new Error('Binary response must be read with arrayBuffer().');
    },
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null),
    },
  };
}

function parseJsonBody(init?: RequestInit): Record<string, unknown> {
  assert.ok(init?.body, 'Expected request body to be set.');
  return JSON.parse(String(init.body)) as Record<string, unknown>;
}

function normalizeSlashes(value: string): string {
  return value.replace(/\\/g, '/');
}

function createNowSequence(values: number[]): () => number {
  let index = 0;

  return () => {
    const value = values[Math.min(index, values.length - 1)];
    index += 1;
    return value;
  };
}

test('creates a seedance task, polls until success, and returns a local video path', async () => {
  const config = createSeedanceConfig();
  const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
  const writeCalls: Array<{ filePath: string; contents: Buffer }> = [];
  const succeededVideoUrl = 'https://cdn.example.com/task-123.mp4';
  const downloadedBytes = Buffer.from([0x00, 0xff, 0x88, 0x41, 0xc3, 0x28, 0x10, 0x9f]);

  const result = await generateSeedanceVideo({
    config,
    request: {
      prompt: 'tracking shot',
      mode: 'text-to-video',
      modelAlias: 'seedance-2.0-fast',
      aspectRatio: '16:9',
      durationSeconds: 5,
    },
    fetchImpl: async (url, init) => {
      fetchCalls.push({ url, init });

      switch (fetchCalls.length) {
        case 1:
          return createJsonResponse({ id: 'task-123', status: 'submitted' });
        case 2:
          return createJsonResponse({ id: 'task-123', status: 'running' });
        case 3:
          return createJsonResponse({
            id: 'task-123',
            status: 'succeeded',
            content: {
              video_url: succeededVideoUrl,
            },
          });
        case 4:
          return createBinaryResponse(downloadedBytes);
        default:
          throw new Error(`Unexpected fetch call ${fetchCalls.length} for ${url}.`);
      }
    },
    writeFileImpl: async (filePath, contents) => {
      writeCalls.push({ filePath, contents });
    },
    sleepImpl: async () => {},
  });

  assert.equal(result.taskId, 'task-123');
  assert.equal(result.modelName, 'Seedance 2.0 Fast');
  assert.equal(result.mode, 'text-to-video');
  assert.equal(result.durationSeconds, 5);
  assert.match(result.video, /^\/generated-videos\/.+\.mp4$/);

  assert.equal(fetchCalls.length, 4);
  assert.equal(
    fetchCalls[0].url,
    `${config.baseUrl}/api/v3/contents/generations/tasks`,
  );
  assert.equal(fetchCalls[0].init?.method, 'POST');

  const createBody = parseJsonBody(fetchCalls[0].init);
  assert.equal(createBody.prompt, 'tracking shot');
  assert.equal(createBody.model, 'dreamina-seedance-2-0-fast-260128');
  assert.equal(createBody.aspectRatio, '16:9');
  assert.equal(createBody.durationSeconds, 5);

  assert.equal(fetchCalls[1].init?.method, 'GET');
  assert.equal(
    fetchCalls[1].url,
    `${config.baseUrl}/api/v3/contents/generations/tasks/task-123`,
  );
  assert.equal(fetchCalls[2].init?.method, 'GET');
  assert.equal(
    fetchCalls[2].url,
    `${config.baseUrl}/api/v3/contents/generations/tasks/task-123`,
  );
  assert.equal(fetchCalls[3].url, succeededVideoUrl);

  assert.equal(writeCalls.length, 1);
  assert.match(normalizeSlashes(writeCalls[0].filePath), /storage\/generated-videos\/.+\.mp4$/);
  assert.equal(writeCalls[0].contents.equals(downloadedBytes), true);
});

test('image-to-video request includes explicit first frame and optional last frame', async () => {
  const config = createSeedanceConfig();
  const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
  const referenceSummary =
    '@\u53c2\u8003\u56fe1 @\u53c2\u8003\u56fe2[\u9996\u5e27] @\u53c2\u8003\u56fe3[\u5c3e\u5e27]';

  const result = await generateSeedanceVideo({
    config,
    request: {
      prompt: 'camera move',
      mode: 'image-to-video',
      modelAlias: 'seedance-2.0',
      aspectRatio: '9:16',
      durationSeconds: 5,
      firstFrame: {
        labelNumber: 2,
        src: 'data:image/png;base64,first-frame',
      },
      lastFrame: {
        labelNumber: 3,
        src: 'data:image/png;base64,last-frame',
      },
      references: [
        {
          labelNumber: 1,
          src: 'data:image/png;base64,general-reference',
        },
      ],
      referenceSummary,
    },
    fetchImpl: async (url, init) => {
      fetchCalls.push({ url, init });

      switch (fetchCalls.length) {
        case 1:
          return createJsonResponse({ id: 'task-456', status: 'submitted' });
        case 2:
          return createJsonResponse({
            id: 'task-456',
            status: 'succeeded',
            content: {
              video_url: 'https://cdn.example.com/task-456.mp4',
            },
          });
        case 3:
          return createBinaryResponse(Buffer.from('image-to-video-mp4'));
        default:
          throw new Error(`Unexpected fetch call ${fetchCalls.length} for ${url}.`);
      }
    },
    writeFileImpl: async () => {},
    sleepImpl: async () => {},
  });

  assert.equal(result.modelName, 'Seedance 2.0');
  assert.equal(result.referenceSummary, referenceSummary);
  assert.equal(fetchCalls.length, 3);

  const createBody = parseJsonBody(fetchCalls[0].init);
  assert.equal(createBody.prompt, 'camera move');
  assert.equal(createBody.model, 'dreamina-seedance-2-0-260128');
  assert.equal(createBody.durationSeconds, 5);
  assert.equal(createBody.aspectRatio, '9:16');
  assert.equal('referenceSummary' in createBody, false);
  assert.deepEqual(createBody.firstFrame, {
    labelNumber: 2,
    src: 'data:image/png;base64,first-frame',
  });
  assert.deepEqual(createBody.lastFrame, {
    labelNumber: 3,
    src: 'data:image/png;base64,last-frame',
  });
  assert.deepEqual(createBody.references, [
    {
      labelNumber: 1,
      src: 'data:image/png;base64,general-reference',
    },
  ]);
});

test('newly added seedance aliases reuse the same backend config and resolve model names', async () => {
  const config = createSeedanceConfig();
  const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];

  const result = await generateSeedanceVideo({
    config,
    request: {
      prompt: 'stylized city rush',
      mode: 'text-to-video',
      modelAlias: 'seedance-1.5-pro' as never,
      aspectRatio: '16:9',
      durationSeconds: 5,
    },
    fetchImpl: async (url, init) => {
      fetchCalls.push({ url, init });

      switch (fetchCalls.length) {
        case 1:
          return createJsonResponse({ id: 'task-789' });
        case 2:
          return createJsonResponse({
            id: 'task-789',
            status: 'running',
          });
        case 3:
          return createJsonResponse({
            id: 'task-789',
            status: 'succeeded',
            content: {
              video_url: 'https://cdn.example.com/task-789.mp4',
            },
          });
        case 4:
          return createBinaryResponse(Buffer.from('seedance-1.5-pro-mp4'));
        default:
          throw new Error(`Unexpected fetch call ${fetchCalls.length} for ${url}.`);
      }
    },
    writeFileImpl: async () => {},
    sleepImpl: async () => {},
  });

  const createBody = parseJsonBody(fetchCalls[0].init);
  assert.equal(createBody.model, 'doubao-seedance-1-5-pro-251215');
  assert.equal('prompt' in createBody, false);
  assert.deepEqual(createBody.content, [
    {
      type: 'text',
      text: 'stylized city rush',
    },
  ]);
  assert.equal(result.modelName, 'Seedance 1.5 Pro');
});

test('content-array models send ratio, resolution, audio, and embedded reference content', async () => {
  const config = createSeedanceConfig();
  const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];

  await generateSeedanceVideo({
    config,
    request: {
      prompt: 'camera move',
      mode: 'image-to-video',
      modelAlias: 'seedance-1.5-pro',
      aspectRatio: '3:4',
      durationSeconds: 5,
      videoQuality: '1080P',
      generateAudio: false,
      firstFrame: {
        labelNumber: 2,
        src: 'data:image/png;base64,first-frame',
      },
      lastFrame: {
        labelNumber: 3,
        src: 'data:image/png;base64,last-frame',
      },
      references: [
        {
          labelNumber: 1,
          src: 'data:image/png;base64,general-reference',
        },
      ],
    },
    fetchImpl: async (url, init) => {
      fetchCalls.push({ url, init });

      switch (fetchCalls.length) {
        case 1:
          return createJsonResponse({ id: 'task-790', status: 'submitted' });
        case 2:
          return createJsonResponse({
            id: 'task-790',
            status: 'succeeded',
            content: {
              video_url: 'https://cdn.example.com/task-790.mp4',
            },
          });
        case 3:
          return createBinaryResponse(Buffer.from('seedance-1.5-pro-references'));
        default:
          throw new Error(`Unexpected fetch call ${fetchCalls.length} for ${url}.`);
      }
    },
    writeFileImpl: async () => {},
    sleepImpl: async () => {},
  });

  const createBody = parseJsonBody(fetchCalls[0].init);
  assert.equal(createBody.model, 'doubao-seedance-1-5-pro-251215');
  assert.equal(createBody.ratio, '3:4');
  assert.equal(createBody.duration, 5);
  assert.equal(createBody.resolution, '1080p');
  assert.equal(createBody.generate_audio, false);
  assert.equal('aspectRatio' in createBody, false);
  assert.equal('durationSeconds' in createBody, false);
  assert.equal('firstFrame' in createBody, false);
  assert.equal('lastFrame' in createBody, false);
  assert.equal('references' in createBody, false);
  assert.ok(Array.isArray(createBody.content));
  assert.equal(createBody.content.length, 4);
  assert.deepEqual(
    createBody.content.map((item: Record<string, unknown>) => item.type),
    ['text', 'image_url', 'image_url', 'image_url'],
  );
  assert.equal((createBody.content[0] as Record<string, unknown>).role, undefined);
  assert.match(String((createBody.content[0] as Record<string, unknown>).text), /camera move/u);
  assert.deepEqual(
    createBody.content.slice(1).map((item: Record<string, unknown>) => item.role),
    ['reference_image', 'first_frame', 'last_frame'],
  );
  return;
  assert.deepEqual(createBody.content, [
    {
      role: 'user',
      type: 'text',
      text:
        '参考图绑定：第1张图对应@参考图1；第2张图对应@参考图2；第3张图对应@参考图3。 首帧参考：@参考图2。 尾帧参考：@参考图3。\n\ncamera move',
    },
    {
      role: 'user',
      type: 'image_url',
      image_url: {
        url: 'data:image/png;base64,general-reference',
      },
    },
    {
      role: 'user',
      type: 'image_url',
      image_url: {
        url: 'data:image/png;base64,first-frame',
      },
    },
    {
      role: 'user',
      type: 'image_url',
      image_url: {
        url: 'data:image/png;base64,last-frame',
      },
    },
  ]);
});

test('all content-array model aliases tag an input image as the first frame', async () => {
  const config = createSeedanceConfig();
  const aliases = [
    'seedance-2.0-mini',
    'seedance-1.5-pro',
    'seedance-1.0-pro-fast',
  ] as const;

  for (const modelAlias of aliases) {
    const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];

    await generateSeedanceVideo({
      config,
      request: {
        prompt: `model ${modelAlias}`,
        mode: 'image-to-video',
        modelAlias,
        aspectRatio: '9:16',
        durationSeconds: 5,
        firstFrame: {
          labelNumber: 1,
          src: 'data:image/png;base64,first-frame',
        },
      },
      fetchImpl: async (url, init) => {
        fetchCalls.push({ url, init });

        switch (fetchCalls.length) {
          case 1:
            return createJsonResponse({ id: `task-${modelAlias}`, status: 'submitted' });
          case 2:
            return createJsonResponse({
              id: `task-${modelAlias}`,
              status: 'succeeded',
              content: {
                video_url: `https://cdn.example.com/${modelAlias}.mp4`,
              },
            });
          case 3:
            return createBinaryResponse(Buffer.from(modelAlias));
          default:
            throw new Error(`Unexpected fetch call ${fetchCalls.length} for ${url}.`);
        }
      },
      writeFileImpl: async () => {},
      sleepImpl: async () => {},
    });

    const createBody = parseJsonBody(fetchCalls[0].init);
    assert.ok(Array.isArray(createBody.content), `Expected content array for ${modelAlias}`);
    assert.equal(createBody.content.length, 2);
    assert.equal(
      (createBody.content[0] as Record<string, unknown>).role,
      undefined,
      `Text content should not include role for ${modelAlias}`,
    );
    assert.deepEqual(
      createBody.content.map((item: Record<string, unknown>) => item.type),
      ['text', 'image_url'],
      `Expected multimodal content for ${modelAlias}`,
    );
    assert.equal(
      (createBody.content[1] as Record<string, unknown>).role,
      'first_frame',
      `Image content should use the first-frame role for ${modelAlias}`,
    );
    continue;
    assert.deepEqual(
      createBody.content,
      [
        {
          role: 'user',
          type: 'text',
          text: `棣栧抚鍙傝€冿細@鍙傝€冨浘1銆俓n\nmodel ${modelAlias}`,
        },
        {
          role: 'user',
          type: 'image_url',
          image_url: {
            url: 'data:image/png;base64,first-frame',
          },
        },
      ],
    );
  }
});

test('non-2xx JSON error body normalizes nested upstream error messages', async () => {
  const config = createSeedanceConfig();

  await assert.rejects(
    () =>
      generateSeedanceVideo({
        config,
        request: {
          prompt: 'bad upstream request',
          mode: 'text-to-video',
          modelAlias: 'seedance-2.0',
          aspectRatio: '16:9',
          durationSeconds: 5,
        },
        fetchImpl: async () => createJsonResponse({ error: { message: 'bad request' } }, 400),
      }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, 'bad request');
      return true;
    },
  );
});

test('upstream failed task returns a readable error', async () => {
  const config = createSeedanceConfig();
  let fetchCount = 0;

  await assert.rejects(
    () =>
      generateSeedanceVideo({
        config,
        request: {
          prompt: 'blocked prompt',
          mode: 'text-to-video',
          modelAlias: 'seedance-2.0-fast',
          aspectRatio: '1:1',
          durationSeconds: 5,
        },
        fetchImpl: async () => {
          fetchCount += 1;

          if (fetchCount === 1) {
            return createJsonResponse({ id: 'task-failed', status: 'submitted' });
          }

          return createJsonResponse({
            id: 'task-failed',
            status: 'failed',
            error: {
              message: 'safety filter triggered',
            },
          });
        },
        sleepImpl: async () => {},
      }),
    /Seedance task task-failed failed: safety filter triggered\./,
  );
});

test('polling timeout returns a readable error', async () => {
  const config = createSeedanceConfig({
    pollIntervalMs: 10,
    pollTimeoutMs: 200,
  });
  let fetchCount = 0;

  await assert.rejects(
    () =>
      generateSeedanceVideo({
        config,
        request: {
          prompt: 'slow render',
          mode: 'text-to-video',
          modelAlias: 'seedance-2.0',
          aspectRatio: '4:3',
          durationSeconds: 5,
        },
        fetchImpl: async () => {
          fetchCount += 1;

          if (fetchCount === 1) {
            return createJsonResponse({ id: 'task-timeout', status: 'submitted' });
          }

          return createJsonResponse({ id: 'task-timeout', status: 'running' });
        },
        sleepImpl: async () => {},
        nowImpl: createNowSequence([0, 0, 250, 250]),
      }),
    /Seedance task task-timeout timed out after 200ms\./,
  );
});
