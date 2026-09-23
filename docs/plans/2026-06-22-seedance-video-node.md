# Seedance Video Node Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Seedance 2.0 and Seedance 2.0 Fast as node-based video generation options with text-to-video, image-to-video, prompt-directed first and last frames, and local MP4 caching.

**Architecture:** Add a dedicated Seedance video backend flow that reads from a local JSON config file, creates and polls asynchronous upstream tasks, then downloads the completed MP4 to local storage. Extend the existing infinite-canvas node workflow with a new `video` node type and pure helper modules for prompt directive parsing and payload construction so the current image flow stays isolated.

**Tech Stack:** TypeScript, Express, React 19, Node test runner, `tsx`, Vite

---

### Task 1: Add failing tests for video prompt directive parsing

**Files:**
- Create: `src/components/videoReferenceDirectives.test.ts`
- Create: `src/components/videoReferenceDirectives.ts`

**Step 1: Write the failing test**

Add tests that cover:

```ts
test('parses general references, first frame, and last frame directives', () => {
  const parsed = parseVideoReferenceDirectives(
    'cinematic motion @参考图1 @参考图2[首帧] @参考图3[尾帧]',
  );

  assert.deepEqual(parsed.generalReferenceNumbers, [1]);
  assert.equal(parsed.firstFrameNumber, 2);
  assert.equal(parsed.lastFrameNumber, 3);
});
```

Also cover:

- duplicate `[首帧]` is rejected
- duplicate `[尾帧]` is rejected
- plain `@参考图N` remains a general reference

**Step 2: Run test to verify it fails**

Run: `npx tsx --test src/components/videoReferenceDirectives.test.ts`

Expected: FAIL because `videoReferenceDirectives.ts` does not exist yet.

**Step 3: Commit**

```bash
git add src/components/videoReferenceDirectives.test.ts
git commit -m "test: add failing video directive parser tests"
```

### Task 2: Implement the directive parser

**Files:**
- Modify: `src/components/videoReferenceDirectives.ts`
- Test: `src/components/videoReferenceDirectives.test.ts`

**Step 1: Write minimal implementation**

Implement:

- `parseVideoReferenceDirectives(prompt: string)`
- `validateVideoReferenceRoles(...)`

Return a shape like:

```ts
{
  generalReferenceNumbers: number[];
  firstFrameNumber?: number;
  lastFrameNumber?: number;
}
```

**Step 2: Run test to verify it passes**

Run: `npx tsx --test src/components/videoReferenceDirectives.test.ts`

Expected: PASS

**Step 3: Commit**

```bash
git add src/components/videoReferenceDirectives.ts src/components/videoReferenceDirectives.test.ts
git commit -m "feat: parse video reference directives"
```

### Task 3: Add failing tests for video reference payload construction

**Files:**
- Create: `src/components/videoReferenceRequest.test.ts`
- Create: `src/components/videoReferenceRequest.ts`
- Modify: `src/components/referenceConnections.ts`

**Step 1: Write the failing test**

Add tests that cover:

```ts
test('maps connected references and directives into seedance roles', async () => {
  const payload = await buildVideoGenerationReferencePayload({
    prompt: 'camera move @参考图1 @参考图2[首帧] @参考图3[尾帧]',
    connectedReferences: [ref1, ref2, ref3],
    mode: 'image-to-video',
  });

  assert.equal(payload.firstFrame?.labelNumber, 2);
  assert.equal(payload.lastFrame?.labelNumber, 3);
  assert.deepEqual(
    payload.generalReferences.map((item) => item.labelNumber),
    [1],
  );
});
```

Also cover:

- image-to-video fails when no `[首帧]` exists
- unconnected `@参考图N` is rejected
- text-to-video works with general references only

**Step 2: Run test to verify it fails**

Run: `npx tsx --test src/components/videoReferenceRequest.test.ts`

Expected: FAIL because the helper module does not exist yet.

**Step 3: Commit**

```bash
git add src/components/videoReferenceRequest.test.ts
git commit -m "test: add failing video reference payload tests"
```

### Task 4: Implement the video reference payload helper

**Files:**
- Modify: `src/components/videoReferenceRequest.ts`
- Modify: `src/components/videoReferenceDirectives.ts`
- Test: `src/components/videoReferenceRequest.test.ts`

**Step 1: Write minimal implementation**

Implement:

- prompt parsing reuse from `videoReferenceDirectives.ts`
- connected-reference validation
- an output shape like:

```ts
{
  firstFrame?: { labelNumber: number; src: string };
  lastFrame?: { labelNumber: number; src: string };
  generalReferences: Array<{ labelNumber: number; src: string }>;
  referenceSummary: string;
}
```

**Step 2: Run tests to verify they pass**

Run: `npx tsx --test src/components/videoReferenceDirectives.test.ts src/components/videoReferenceRequest.test.ts`

Expected: PASS

**Step 3: Commit**

```bash
git add src/components/videoReferenceDirectives.ts src/components/videoReferenceRequest.ts src/components/videoReferenceDirectives.test.ts src/components/videoReferenceRequest.test.ts
git commit -m "feat: build seedance video reference payloads"
```

### Task 5: Add failing tests for local Seedance config loading

**Files:**
- Create: `server/seedanceVideoConfig.test.ts`
- Create: `server/seedanceVideoConfig.ts`
- Create: `config/seedance-video.example.json`
- Modify: `.gitignore`

**Step 1: Write the failing test**

Add tests that cover:

```ts
test('loads a local seedance config and resolves model aliases', () => {
  const config = loadSeedanceVideoConfig({
    configPath: fixturePath,
    env: { VOLCENGINE_ARK_API_KEY: 'secret-key' },
  });

  assert.equal(config.models['seedance-2.0'], 'dreamina-seedance-2-0-260128');
  assert.equal(config.models['seedance-2.0-fast'], 'dreamina-seedance-2-0-fast-260128');
});
```

Also cover:

- missing config file throws a readable error
- missing API key env throws a readable error
- missing model aliases throws a readable error

**Step 2: Run test to verify it fails**

Run: `npx tsx --test server/seedanceVideoConfig.test.ts`

Expected: FAIL because the config loader does not exist yet.

**Step 3: Commit**

```bash
git add server/seedanceVideoConfig.test.ts
git commit -m "test: add failing seedance config loader tests"
```

### Task 6: Implement the local Seedance config loader

**Files:**
- Modify: `server/seedanceVideoConfig.ts`
- Create: `config/seedance-video.example.json`
- Modify: `.gitignore`
- Test: `server/seedanceVideoConfig.test.ts`

**Step 1: Write minimal implementation**

Implement:

- `loadSeedanceVideoConfig()`
- runtime JSON parsing and validation
- environment-backed API key resolution
- committed example config
- gitignore entry for `config/seedance-video.json`

**Step 2: Run test to verify it passes**

Run: `npx tsx --test server/seedanceVideoConfig.test.ts`

Expected: PASS

**Step 3: Commit**

```bash
git add server/seedanceVideoConfig.ts server/seedanceVideoConfig.test.ts config/seedance-video.example.json .gitignore
git commit -m "feat: load local seedance video config"
```

### Task 7: Add failing tests for Seedance task creation, polling, and local download flow

**Files:**
- Create: `server/seedanceVideo.test.ts`
- Create: `server/seedanceVideo.ts`
- Modify: `server/seedanceVideoConfig.ts`

**Step 1: Write the failing test**

Add tests that cover:

```ts
test('creates a seedance task, polls until success, and returns a local video path', async () => {
  const result = await generateSeedanceVideo({
    config,
    request: {
      prompt: 'tracking shot',
      mode: 'text-to-video',
      modelAlias: 'seedance-2.0-fast',
      aspectRatio: '16:9',
      durationSeconds: 5,
    },
    fetchImpl,
    writeFileImpl,
  });

  assert.equal(result.modelName, 'Seedance 2.0 Fast');
  assert.match(result.video, /generated-videos/);
});
```

Also cover:

- image-to-video request includes explicit first frame and optional last frame
- upstream failed task returns a readable error
- polling timeout returns a readable error

**Step 2: Run test to verify it fails**

Run: `npx tsx --test server/seedanceVideo.test.ts`

Expected: FAIL because the Seedance service module does not exist yet.

**Step 3: Commit**

```bash
git add server/seedanceVideo.test.ts
git commit -m "test: add failing seedance video service tests"
```

### Task 8: Implement the Seedance video service

**Files:**
- Modify: `server/seedanceVideo.ts`
- Modify: `server/seedanceVideoConfig.ts`
- Test: `server/seedanceVideo.test.ts`

**Step 1: Write minimal implementation**

Implement:

- model alias to upstream model ID resolution
- create-task request shaping
- task polling loop
- local MP4 download into `storage/generated-videos`
- readable error normalization

The request builder should explicitly support:

```ts
{
  prompt,
  model: resolvedModelId,
  firstFrame,
  lastFrame,
  references,
  durationSeconds,
  aspectRatio
}
```

**Step 2: Run tests to verify they pass**

Run: `npx tsx --test server/seedanceVideoConfig.test.ts server/seedanceVideo.test.ts`

Expected: PASS

**Step 3: Commit**

```bash
git add server/seedanceVideo.ts server/seedanceVideo.test.ts server/seedanceVideoConfig.ts server/seedanceVideoConfig.test.ts
git commit -m "feat: implement seedance video task flow"
```

### Task 9: Wire the backend routes and local static serving

**Files:**
- Modify: `server.ts`
- Modify: `.env.example`
- Modify: `README.md`

**Step 1: Write the failing test or smoke checklist**

Because `server.ts` is glue code, use a smoke checklist:

- route exists at `POST /api/seedance/generate-video`
- route exists at `GET /api/seedance/tasks/:taskId`
- static files under the configured cache directory are served

**Step 2: Implement route wiring**

Add:

- JSON validation for incoming video requests
- route handlers that call `generateSeedanceVideo(...)`
- static asset serving for the local cache directory

**Step 3: Run targeted tests**

Run: `npx tsx --test server/seedanceVideoConfig.test.ts server/seedanceVideo.test.ts`

Expected: PASS

**Step 4: Commit**

```bash
git add server.ts .env.example README.md
git commit -m "feat: add seedance video routes"
```

### Task 10: Extend shared types for video nodes and media history

**Files:**
- Modify: `src/types.ts`
- Modify: `src/App.tsx`

**Step 1: Write the failing test or compile target**

Use type-driven failure as the red step:

- add `video` to the intended design in `src/types.ts`
- let existing call sites fail typecheck until the full shape is wired

**Step 2: Implement minimal shared model changes**

Add:

- `CanvasLayer.type = 'video'`
- `videoMode`
- `videoModel`
- `durationSeconds`
- `videoSrc`
- `videoTaskId`
- history `mediaType`

**Step 3: Run typecheck to verify the red/green transition**

Run: `npm run lint`

Expected: initially FAIL before all callers are updated, then PASS after Tasks 11 and 12.

**Step 4: Commit**

```bash
git add src/types.ts src/App.tsx
git commit -m "feat: add shared video node types"
```

### Task 11: Add video-node request helpers and canvas import behavior

**Files:**
- Create: `src/components/videoNodeGeneration.ts`
- Create: `src/components/videoNodeGeneration.test.ts`
- Modify: `src/components/nodeGeneration.ts`
- Modify: `src/components/previewLayout.ts`

**Step 1: Write the failing test**

Add tests that cover:

```ts
test('applies a generated video result onto a video node', () => {
  const updated = applyGeneratedVideoToNode(node, {
    video: '/generated-videos/test.mp4',
    durationSeconds: 5,
    taskId: 'task-123',
  });

  assert.equal(updated.type, 'video');
  assert.equal(updated.videoSrc, '/generated-videos/test.mp4');
});
```

Also cover:

- importing a history video creates a video node
- video preview sizing falls back cleanly when no poster exists

**Step 2: Run test to verify it fails**

Run: `npx tsx --test src/components/videoNodeGeneration.test.ts`

Expected: FAIL because the helper module does not exist yet.

**Step 3: Implement minimal helper**

Add:

- `applyGeneratedVideoToNode(...)`
- helper for building a video node from history

**Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/components/videoNodeGeneration.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/videoNodeGeneration.ts src/components/videoNodeGeneration.test.ts src/components/nodeGeneration.ts src/components/previewLayout.ts
git commit -m "feat: add video node application helpers"
```

### Task 12: Wire video node UI into `CanvasWorkspace`

**Files:**
- Modify: `src/components/CanvasWorkspace.tsx`
- Modify: `src/components/workspaceTabs.ts`
- Modify: `src/components/sizePickerOptions.ts`
- Modify: `src/App.tsx`

**Step 1: Write the failing verification target**

Use a UI smoke checklist for this glue-heavy task:

- the add-node entry point can create a video node
- a video node shows mode, model, and duration controls
- `图生视频` mode enforces one `[首帧]`
- successful responses render a `<video>` preview
- history cards support video playback and canvas re-import

**Step 2: Implement the UI wiring**

Add:

- create-video-node affordance
- video mode toggle
- fixed model dropdown with:
  - `Seedance 2.0`
  - `Seedance 2.0 Fast`
- prompt validation using the new helpers
- `fetch('/api/seedance/generate-video')`
- local video preview rendering

**Step 3: Run targeted tests and typecheck**

Run: `npx tsx --test src/components/videoReferenceDirectives.test.ts src/components/videoReferenceRequest.test.ts src/components/videoNodeGeneration.test.ts server/seedanceVideoConfig.test.ts server/seedanceVideo.test.ts`

Expected: PASS

Run: `npm run lint`

Expected: PASS

**Step 4: Commit**

```bash
git add src/components/CanvasWorkspace.tsx src/components/workspaceTabs.ts src/components/sizePickerOptions.ts src/App.tsx
git commit -m "feat: add seedance video nodes to canvas workspace"
```

### Task 13: Verify the full change

**Files:**
- Modify: `server.ts`
- Modify: `server/seedanceVideo.ts`
- Modify: `server/seedanceVideoConfig.ts`
- Modify: `src/components/CanvasWorkspace.tsx`
- Modify: `src/components/videoReferenceDirectives.ts`
- Modify: `src/components/videoReferenceRequest.ts`
- Modify: `src/components/videoNodeGeneration.ts`
- Modify: `src/types.ts`
- Modify: `src/App.tsx`
- Create: `config/seedance-video.example.json`

**Step 1: Run the targeted automated tests**

Run: `npx tsx --test src/components/videoReferenceDirectives.test.ts src/components/videoReferenceRequest.test.ts src/components/videoNodeGeneration.test.ts server/seedanceVideoConfig.test.ts server/seedanceVideo.test.ts`

Expected: PASS with zero failures.

**Step 2: Run typecheck**

Run: `npm run lint`

Expected: PASS with no TypeScript errors.

**Step 3: Manual smoke check**

With `config/seedance-video.json` present and the dev server running:

- create a video node
- switch between `文生视频` and `图生视频`
- verify `@参考图N[首帧]` is required in image-to-video mode
- verify `@参考图N[尾帧]` remains optional
- submit a video request
- confirm the final node plays the local cached MP4
- confirm the history panel can re-import the video node

**Step 4: Commit**

```bash
git add server.ts server/seedanceVideo.ts server/seedanceVideoConfig.ts src/components/CanvasWorkspace.tsx src/components/videoReferenceDirectives.ts src/components/videoReferenceRequest.ts src/components/videoNodeGeneration.ts src/types.ts src/App.tsx config/seedance-video.example.json README.md .env.example .gitignore
git commit -m "feat: add seedance video generation nodes"
```
