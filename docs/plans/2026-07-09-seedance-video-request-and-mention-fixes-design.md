# Seedance Video Request And Mention Fixes Design

**Date:** 2026-07-09

**Goal:** Fix three regressions in the Seedance video flow so reference images affect video generation again, selected video ratios are reflected by the upstream task, and `@参考图` insertion respects the current text cursor position.

## Problem

The current video node flow has three user-visible failures:

- Reference images do not meaningfully affect generated videos.
- Selecting a portrait ratio such as `3:4` still produces a landscape video.
- Choosing `@参考图` from the prompt UI inserts at the end of the prompt instead of the active cursor position.

Root-cause investigation found two separate issues:

1. The prompt insertion UI in `CanvasWorkspace` uses whole-string append and `lastIndexOf('@')`, so it cannot target the active caret.
2. The Seedance backend now treats the newer content-array models (`seedance-2.0-mini`, `seedance-1.5-pro`, `seedance-1.0-pro-fast`) differently from the older prompt-based models. Real upstream task payload echoes for the user's generated tasks show model `doubao-seedance-1-5-pro-251215` returning task metadata such as `ratio`, `resolution`, and `generate_audio`, while the current app still sends the older `aspectRatio`, `durationSeconds`, and top-level frame/reference fields for every model.

## Scope

- Fix prompt mention insertion for video-node reference UI.
- Preserve the existing old-model request shape for:
  - `seedance-2.0`
  - `seedance-2.0-fast`
- Add a dedicated request-shaping path for newer content-array models.
- Send newer-model references as multimodal content items instead of orphaned top-level reference fields.
- Map the selected ratio, duration, quality, and audio toggle into the newer-model request body.

## Out Of Scope

- Refactoring the whole video-node UI into smaller React components.
- Changing the saved canvas-layer data model beyond fields already present.
- Replacing the current prompt-role syntax (`@参考图N`, `[首帧]`, `[尾帧]`).

## Chosen Approach

### Prompt insertion

Extract the prompt-editing behavior into a small pure helper. The helper will:

- insert a mention at the active selection
- replace the in-progress `@...` token when the mention dropdown is used
- fall back to append only when no cursor information exists
- optionally avoid duplicate plain-reference inserts for the thumbnail shortcut

`CanvasWorkspace` will keep a per-node textarea ref plus the latest selection range so both the thumbnail strip and the mention dropdown can write at the current caret and restore focus afterward.

### Video request shaping

Split Seedance request construction into two explicit branches:

- **Prompt-based models**
  - keep the current `prompt`, `aspectRatio`, `durationSeconds`, `firstFrame`, `lastFrame`, and `references` shape
- **Content-array models**
  - build a `content` array with:
    - one text item carrying the user prompt plus deterministic reference binding guidance
    - one image item per referenced image in stable label order
  - map video settings into newer-model task fields:
    - `ratio`
    - `duration`
    - `resolution`
    - `generate_audio`

This keeps the existing stable path for older models while making the newer models stop silently ignoring ratio and references.

## Reference Binding For Newer Models

The newer-model branch will not rely on top-level `firstFrame`, `lastFrame`, or `references`. Instead it will generate one compact text instruction block derived from the parsed prompt roles, for example:

- `参考图绑定：@参考图1 对应第 1 张图。`
- `首帧参考：@参考图2。`
- `尾帧参考：@参考图3。`

That instruction block will be prepended to the user prompt inside the text content item, and the referenced images will be included in the same stable order. This preserves the current app-owned prompt syntax without introducing a second role system in the UI.

## Files Affected

- `src/components/CanvasWorkspace.tsx`
- `src/components/videoReferenceRequest.ts`
- `server/seedanceVideo.ts`
- `server/seedanceVideo.test.ts`
- new helper and tests for prompt insertion

## Testing Strategy

- Add pure helper tests for caret-based mention insertion.
- Add backend tests that prove newer content-array models no longer send the old ratio/reference fields.
- Keep existing request-shaping tests for prompt-based models green.
- Run targeted test suites first, then TypeScript verification.

## Risks

- The exact newer-model multimodal schema is inferred from real task behavior rather than official docs in this workspace, so the implementation should isolate that branch cleanly and keep old-model behavior untouched.
- `CanvasWorkspace.tsx` is large, so prompt-editing changes should be routed through a pure helper to reduce regression risk.
