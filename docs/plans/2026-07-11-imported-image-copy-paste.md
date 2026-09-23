# Imported Image Copy/Paste And Cable Layering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move canvas cables behind node media and add copy/paste for imported images only.

**Architecture:** Add a pure clipboard helper that clones one imported reference image and calculates child relationship updates. Wire it into the existing canvas keyboard and paste listeners, while preserving external image-file paste. Adjust the SVG/node stacking contract with explicit z-index classes.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Node test runner via `tsx --test`.

---

### Task 1: Add imported-image clipboard behavior

**Files:**
- Create: `src/components/importedImageClipboard.ts`
- Create: `src/components/importedImageClipboard.test.ts`
- Modify: `src/components/CanvasWorkspace.tsx`

1. Write failing tests for imported-image eligibility and relationship-preserving clones.
2. Run `npx tsx --test src/components/importedImageClipboard.test.ts` and confirm failure.
3. Implement the minimal pure helper.
4. Run the targeted test and confirm it passes.
5. Wire `Ctrl/Cmd+C` and `Ctrl/Cmd+V` into `CanvasWorkspace`, excluding editable controls and non-imported nodes.

### Task 2: Put cables behind nodes

**Files:**
- Modify: `src/components/CanvasWorkspace.tsx`
- Modify: `src/components/canvasWorkspaceRendering.test.ts`

1. Add a failing rendering assertion for the cable and node stacking classes.
2. Lower the cable SVG layer and give the node transform container a higher stacking layer.
3. Run `npx tsx --test src/components/canvasWorkspaceRendering.test.ts`.

### Task 3: Verify

1. Run `npm run lint`.
2. Run `npm test`.
3. Review the final diff for unrelated changes.
