# Image 2.5 Model Options Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three short Image 2.5 model names to the image node dropdown and translate them to the RightAPI `gpt-image-*` identifiers when requests are built.

**Architecture:** Keep the user-facing aliases in canvas node state and centralize API-specific translation in `server/rightcodes.ts`. Existing model values and the `gpt-image-2` default continue to pass through unchanged.

**Tech Stack:** React 19, TypeScript, Node test runner, Vite

---

### Task 1: Add Failing Model Option Tests

**Files:**
- Modify: `src/components/canvasWorkspaceRendering.test.ts`
- Modify: `server/rightcodes.test.ts`

**Step 1: Write the failing dropdown test**

Render a selected image node and assert that the generated markup contains option values for:

```ts
assert.match(html, /value="image-2\.5"/);
assert.match(html, /value="image-2\.5-flare"/);
assert.match(html, /value="image-2\.5-sunburst"/);
```

**Step 2: Write the failing request mapping test**

Build requests for all three aliases and assert:

```ts
assert.equal(standard.model, 'gpt-image-2.5');
assert.equal(flare.model, 'gpt-image-2.5-flare');
assert.equal(sunburst.model, 'gpt-image-2.5-sunburst');
```

**Step 3: Run focused tests to verify RED**

Run:

```powershell
npx tsx --test src/components/canvasWorkspaceRendering.test.ts server/rightcodes.test.ts
```

Expected: both new tests fail because the options and mapping do not exist yet.

### Task 2: Implement Model Aliases

**Files:**
- Modify: `src/types.ts`
- Modify: `src/components/CanvasWorkspace.tsx`
- Modify: `server/rightcodes.ts`

**Step 1: Extend the canvas node model union**

Add:

```ts
| 'image-2.5'
| 'image-2.5-flare'
| 'image-2.5-sunburst'
```

to `CanvasLayer.rightCodesModel`.

**Step 2: Add dropdown options**

Add three options using the short aliases as both option values and labels.

**Step 3: Add centralized API model mapping**

Define an alias map:

```ts
const RIGHTCODES_MODEL_ALIASES: Record<string, string> = {
  'image-2.5': 'gpt-image-2.5',
  'image-2.5-flare': 'gpt-image-2.5-flare',
  'image-2.5-sunburst': 'gpt-image-2.5-sunburst',
};
```

Use it when assigning `RightCodesImageRequestBody.model`, falling back to the original model or `gpt-image-2`.

**Step 4: Run focused tests to verify GREEN**

Run:

```powershell
npx tsx --test src/components/canvasWorkspaceRendering.test.ts server/rightcodes.test.ts
```

Expected: all focused tests pass.

### Task 3: Verify the Application

**Files:**
- No additional source changes expected

**Step 1: Run the full test suite**

Run:

```powershell
npm test
```

Expected: all tests pass.

**Step 2: Run TypeScript validation**

Run:

```powershell
npm run lint
```

Expected: TypeScript exits successfully with no diagnostics.

**Step 3: Run the production build**

Run:

```powershell
npm run build
```

Expected: Vite and esbuild complete successfully.

**Step 4: Review the final diff**

Confirm only the planned types, dropdown options, request mapping, tests, and plan documents changed.

**Step 5: Commit**

Git metadata is currently unavailable in this workspace. If it is restored, commit with:

```powershell
git add docs/plans/2026-09-17-image-2-5-model-options-design.md docs/plans/2026-09-17-image-2-5-model-options.md src/types.ts src/components/CanvasWorkspace.tsx src/components/canvasWorkspaceRendering.test.ts server/rightcodes.ts server/rightcodes.test.ts
git commit -m "feat: add Image 2.5 model options"
```
