# Output Drag Node Chooser Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a chooser when dragging from a node output to blank canvas so users can create either an image node or a video node, with video children becoming immediately usable for image-to-video flows.

**Architecture:** Keep the canvas interaction in `CanvasWorkspace.tsx`, but move source-aware child-node shaping into a pure helper for TDD coverage. Extend reference connection resolution so connected generated image nodes with `src` can be used by downstream image and video request builders.

**Tech Stack:** React 19, TypeScript, node:test, Vite

---

### Task 1: Lock the new child-node shaping in tests

**Files:**
- Create: `src/components/outputNodeCreation.test.ts`
- Create: `src/components/outputNodeCreation.ts`

**Step 1: Write the failing test**

Add tests that prove:

- creating an image child keeps the source connection fields
- creating a video child from an image source with `src` switches to `image-to-video`
- that video child pre-fills `@参考图1[首帧]`
- creating a video child from a source without `src` stays on text-to-video defaults

**Step 2: Run test to verify it fails**

Run: `npx tsx --test src/components/outputNodeCreation.test.ts`

Expected: FAIL because `src/components/outputNodeCreation.ts` does not exist yet.

**Step 3: Write minimal implementation**

Implement a small pure helper that receives:

- source node
- requested child node type
- a base node

and returns the correctly connected child node.

**Step 4: Run test to verify it passes**

Run: `npx tsx --test src/components/outputNodeCreation.test.ts`

Expected: PASS

### Task 2: Make connected generated images usable as references

**Files:**
- Modify: `src/components/referenceConnections.ts`
- Test: `src/components/referenceConnections.test.ts`

**Step 1: Write the failing test**

Add a case proving that a connected generated image node with `src` is returned as a usable connected reference with a stable label number.

**Step 2: Run test to verify it fails**

Run: `npx tsx --test src/components/referenceConnections.test.ts`

Expected: FAIL because the helper currently filters to `isReference` nodes only.

**Step 3: Write minimal implementation**

Update the helper so connected candidates include:

- imported reference nodes
- generated image nodes with a truthy `src`

Exclude:

- videos
- images without `src`

**Step 4: Run test to verify it passes**

Run: `npx tsx --test src/components/referenceConnections.test.ts`

Expected: PASS

### Task 3: Wire the chooser into the canvas output-drag flow

**Files:**
- Modify: `src/components/CanvasWorkspace.tsx`
- Modify: `src/components/canvasWorkspaceRendering.test.ts`

**Step 1: Write the failing test**

Add a rendering-level test that asserts the shared chooser UI still offers both image and video node options.

**Step 2: Run test to verify it fails**

Run: `npx tsx --test src/components/canvasWorkspaceRendering.test.ts`

Expected: FAIL after the new assertion because the extracted chooser UI is not wired yet.

**Step 3: Write minimal implementation**

In `CanvasWorkspace.tsx`:

- add cable-drop chooser state
- reuse a shared node-creation chooser renderer
- on blank-drop, open the chooser instead of creating an image immediately
- on chooser selection, create the chosen child node using the pure helper from Task 1
- keep node-to-node connection behavior unchanged

**Step 4: Run test to verify it passes**

Run: `npx tsx --test src/components/canvasWorkspaceRendering.test.ts`

Expected: PASS

### Task 4: Verify the flow stays green

**Files:**
- Test: `src/components/outputNodeCreation.test.ts`
- Test: `src/components/referenceConnections.test.ts`
- Test: `src/components/canvasWorkspaceRendering.test.ts`
- Modify: `src/components/CanvasWorkspace.tsx`
- Modify: `src/components/outputNodeCreation.ts`
- Modify: `src/components/referenceConnections.ts`

**Step 1: Run targeted tests**

Run: `npx tsx --test src/components/outputNodeCreation.test.ts src/components/referenceConnections.test.ts src/components/canvasWorkspaceRendering.test.ts`

Expected: PASS

**Step 2: Run typecheck**

Run: `npm run lint`

Expected: PASS
