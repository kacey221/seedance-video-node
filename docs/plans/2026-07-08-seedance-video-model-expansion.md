# Seedance Video Model Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three new Volcano ModelArk-backed Seedance video models to the existing five-model alias flow so one backend API configuration can switch between all supported models.

**Architecture:** Extend the existing alias-based model-selection path rather than introducing a new provider abstraction. Expand the shared alias unions, frontend model selector, backend validation lists, and config-mapping requirements so the same `VOLCENGINE_ARK_API_KEY` and `baseUrl` can route requests to any of the five configured ModelArk model IDs.

**Tech Stack:** TypeScript, React 19, Express, Node test runner, `tsx`, Vite

---

### Task 1: Add failing backend tests for the three new model aliases

**Files:**
- Modify: `server/seedanceVideoConfig.test.ts`
- Modify: `server/seedanceVideo.test.ts`

**Step 1: Write the failing test**

Extend the config fixture and add assertions like:

```ts
assert.equal(config.models['seedance-2.0-mini'], 'Doubao-Seedance-2.0-mini');
assert.equal(config.models['seedance-1.5-pro'], 'Doubao-Seedance-1.5-pro');
assert.equal(config.models['seedance-1.0-pro-fast'], 'Doubao-Seedance-1.0-pro-fast');
```

Add a request test that calls `generateSeedanceVideo` with one of the new aliases and verifies the create-task body uses the mapped model ID.

**Step 2: Run test to verify it fails**

Run: `npm test -- server/seedanceVideoConfig.test.ts server/seedanceVideo.test.ts`

Expected: FAIL because the backend alias unions and required mappings still only support two models.

**Step 3: Commit**

```bash
git add server/seedanceVideoConfig.test.ts server/seedanceVideo.test.ts
git commit -m "test: add failing seedance model expansion coverage"
```

### Task 2: Implement backend support for all five model aliases

**Files:**
- Modify: `server/seedanceVideoConfig.ts`
- Modify: `server/seedanceVideoServer.ts`
- Modify: `server/seedanceVideo.ts`

**Step 1: Write minimal implementation**

Expand:

- `SeedanceVideoModelAlias`
- required model alias arrays
- request validation whitelist
- display-name map
- config-model return shape

Keep the existing default model and request flow unchanged.

**Step 2: Run tests to verify they pass**

Run: `npm test -- server/seedanceVideoConfig.test.ts server/seedanceVideo.test.ts`

Expected: PASS

**Step 3: Commit**

```bash
git add server/seedanceVideoConfig.ts server/seedanceVideoServer.ts server/seedanceVideo.ts server/seedanceVideoConfig.test.ts server/seedanceVideo.test.ts
git commit -m "feat: support five seedance video model aliases"
```

### Task 3: Add failing frontend and shared-type tests for the new aliases

**Files:**
- Modify: `src/typesVideoCompat.test.ts`
- Modify: `src/components/videoNodeGeneration.test.ts`

**Step 1: Write the failing test**

Add coverage that uses the new aliases in real typed objects, for example:

```ts
const layer = {
  ...createVideoGenerationNode({ id: 'video-2', name: 'Test', x: 0, y: 0 }),
  videoModel: 'seedance-2.0-mini',
};

assert.equal(layer.videoModel, 'seedance-2.0-mini');
```

Also add a compatibility assertion that `CanvasLayer.videoModel` accepts `seedance-1.5-pro` and `seedance-1.0-pro-fast`.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/typesVideoCompat.test.ts src/components/videoNodeGeneration.test.ts`

Expected: FAIL because the shared alias unions still only allow the original two values.

**Step 3: Commit**

```bash
git add src/typesVideoCompat.test.ts src/components/videoNodeGeneration.test.ts
git commit -m "test: add failing frontend video model alias coverage"
```

### Task 4: Implement frontend and shared support for the new aliases

**Files:**
- Modify: `src/types.ts`
- Modify: `src/components/videoNodeGeneration.ts`
- Modify: `src/components/CanvasWorkspace.tsx`

**Step 1: Write minimal implementation**

Expand the shared `VideoModelAlias` unions and add the three new selector options:

- `Seedance 2.0 Mini`
- `Seedance 1.5 Pro`
- `Seedance 1.0 Pro Fast`

Keep the default node model as `seedance-2.0`.

**Step 2: Run tests to verify they pass**

Run: `npm test -- src/typesVideoCompat.test.ts src/components/videoNodeGeneration.test.ts`

Expected: PASS

**Step 3: Commit**

```bash
git add src/types.ts src/components/videoNodeGeneration.ts src/components/CanvasWorkspace.tsx src/typesVideoCompat.test.ts src/components/videoNodeGeneration.test.ts
git commit -m "feat: expose five video models in canvas ui"
```

### Task 5: Update example and runtime config mappings

**Files:**
- Modify: `config/seedance-video.example.json`
- Modify: `config/seedance-video.json`

**Step 1: Update the model map**

Add:

```json
"seedance-2.0-mini": "Doubao-Seedance-2.0-mini",
"seedance-1.5-pro": "Doubao-Seedance-1.5-pro",
"seedance-1.0-pro-fast": "Doubao-Seedance-1.0-pro-fast"
```

Do not change `baseUrl`, `apiKeyEnv`, or `defaultModel`.

**Step 2: Verify the config files contain the five mappings**

Run: `Get-Content config/seedance-video.example.json`

Expected: five model aliases are present under `models`

**Step 3: Commit**

```bash
git add config/seedance-video.example.json config/seedance-video.json
git commit -m "chore: expand local seedance model config"
```

### Task 6: Run full verification

**Files:**
- Modify: none

**Step 1: Run targeted tests**

Run: `npm test -- server/seedanceVideoConfig.test.ts server/seedanceVideo.test.ts src/typesVideoCompat.test.ts src/components/videoNodeGeneration.test.ts`

Expected: PASS

**Step 2: Run static verification**

Run: `npm run lint`

Expected: PASS

**Step 3: Commit**

```bash
git add .
git commit -m "test: verify seedance model expansion"
```
