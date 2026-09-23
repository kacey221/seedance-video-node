# Seedance Video Request And Mention Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix Seedance video reference binding, selected ratio propagation, and `@参考图` cursor insertion for video nodes.

**Architecture:** Isolate the two root causes into separate seams. Add a pure prompt-mention editing helper for caret-aware insertion in `CanvasWorkspace`, and split Seedance create-task request shaping into prompt-based and content-array model branches so newer models receive the settings and reference payload shape they actually honor.

**Tech Stack:** TypeScript, React 19, Express, Node test runner, `tsx`

---

### Task 1: Add failing tests for caret-aware mention insertion

**Files:**
- Create: `src/components/promptMentionInsertion.test.ts`
- Create: `src/components/promptMentionInsertion.ts`

**Step 1: Write the failing test**

Cover:

- thumbnail insertion writes `@参考图N` at the current cursor
- mention-dropdown selection replaces the active `@` token near the cursor instead of the last `@` in the string
- duplicate thumbnail insertion can be skipped without moving text
- missing selection falls back to append

**Step 2: Run test to verify it fails**

Run: `npx tsx --test src/components/promptMentionInsertion.test.ts`

Expected: FAIL because the helper does not exist yet.

**Step 3: Write minimal implementation**

Implement one small helper that returns:

- `nextPrompt`
- `nextSelectionStart`
- `nextSelectionEnd`

**Step 4: Run test to verify it passes**

Run: `npx tsx --test src/components/promptMentionInsertion.test.ts`

Expected: PASS

### Task 2: Wire caret-aware mention editing into `CanvasWorkspace`

**Files:**
- Modify: `src/components/CanvasWorkspace.tsx`
- Test: `src/components/promptMentionInsertion.test.ts`

**Step 1: Update prompt editing state**

Add:

- textarea refs keyed by node id
- latest selection tracking keyed by node id
- a tiny post-update selection restore helper

**Step 2: Replace thumbnail and dropdown insertion logic**

Use the new helper for:

- connected-reference thumbnail clicks
- `@参考图` dropdown selection

Both flows should use the current selection for the active node.

**Step 3: Run targeted tests**

Run: `npx tsx --test src/components/promptMentionInsertion.test.ts`

Expected: PASS

### Task 3: Add failing tests for newer-model Seedance request shaping

**Files:**
- Modify: `server/seedanceVideo.test.ts`

**Step 1: Write the failing test**

Add a content-array model request test that verifies:

- `ratio` is used instead of `aspectRatio`
- `duration` is used instead of `durationSeconds`
- `resolution` is derived from `videoQuality`
- `generate_audio` is derived from `generateAudio`
- references are embedded into `content`
- old top-level `firstFrame`, `lastFrame`, and `references` fields are absent

**Step 2: Run test to verify it fails**

Run: `npx tsx --test server/seedanceVideo.test.ts`

Expected: FAIL because the service still uses the old shape for newer models.

### Task 4: Implement newer-model request shaping in `server/seedanceVideo.ts`

**Files:**
- Modify: `server/seedanceVideo.ts`
- Modify: `src/components/videoReferenceRequest.ts`
- Test: `server/seedanceVideo.test.ts`

**Step 1: Extend the request model**

Allow the frontend request to carry:

- `videoQuality`
- `generateAudio`

and add a helper that formats deterministic reference binding text for newer models.

**Step 2: Split request building by model family**

Keep prompt-based models unchanged.

For content-array models:

- send `content`
- send `ratio`
- send `duration`
- send `resolution`
- send `generate_audio`

**Step 3: Run targeted tests**

Run: `npx tsx --test server/seedanceVideo.test.ts src/components/videoReferenceRequest.test.ts`

Expected: PASS

### Task 5: Wire new video settings into the frontend request

**Files:**
- Modify: `src/components/CanvasWorkspace.tsx`

**Step 1: Send the newer settings**

Include:

- `videoQuality`
- `generateAudio`

in the `/api/seedance/generate-video` request body.

**Step 2: Re-run targeted tests**

Run: `npx tsx --test src/components/promptMentionInsertion.test.ts server/seedanceVideo.test.ts src/components/videoReferenceRequest.test.ts`

Expected: PASS

### Task 6: Run full verification

**Files:**
- Modify: none

**Step 1: Run focused tests**

Run: `npx tsx --test src/components/promptMentionInsertion.test.ts src/components/videoReferenceDirectives.test.ts src/components/videoReferenceRequest.test.ts src/components/videoReferencePromptRoles.test.ts server/seedanceVideo.test.ts src/components/videoNodeGeneration.test.ts`

Expected: PASS

**Step 2: Run TypeScript verification**

Run: `npm run lint`

Expected: PASS
