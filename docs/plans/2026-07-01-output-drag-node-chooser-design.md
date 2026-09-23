# Output Drag Node Chooser Design

**Date:** 2026-07-01

**Goal:** Let users drag from an image-generation node's output port and choose whether to create an image node or a video node, while making the video path immediately usable for image-to-video work.

## Problem

The current output-drag flow in `src/components/CanvasWorkspace.tsx` creates a new image node immediately when the cable is dropped on empty canvas space. That blocks the desired branching flow because users cannot choose a video node at that moment.

There is also a semantic gap in the current graph model: downstream generation requests only treat `isReference` image nodes as reference inputs. A newly created video node connected to a generated image node would look connected in the UI, but would not reliably receive that upstream image as a usable first-frame source.

## Approved Scope

- Replace the fixed blank-drop behavior with a chooser that offers:
  - image node
  - video node
- Reuse the existing node-creation language and visual style already used by the plus menu and double-click menu.
- When the user chooses a video node from an image output:
  - create the video node already connected to the source image
  - default the node to `image-to-video` when the source image has a `src`
  - prefill the prompt with the first-frame directive for the first connected image reference
- Keep the existing image-node branch behavior intact.

## Approach

### 1. Add a cable-drop chooser state

When an output cable is dropped on blank canvas:

- do not create a node immediately
- store the source node id plus both viewport coordinates and canvas coordinates
- render a chooser menu near the drop point

This keeps the interaction parallel to the current double-click node creation pattern and avoids introducing a new modal flow.

### 2. Extract source-aware child-node shaping

Move the branch-specific node initialization into a small pure helper so it can be tested without trying to simulate the full canvas interaction stack.

The helper will:

- connect the new node back to the source node via `parentId` and `parentIds`
- preserve the current image-branch behavior
- when creating a video node from an image source with `src`, switch the child node to `image-to-video` and prefill `@参考图1[首帧]`

### 3. Broaden connected reference eligibility

Update reference resolution so connected image nodes with a real `src` can act as usable references, not only imported `isReference` cards.

That makes the new video branch actually work after creation, and it also aligns the visible connection graph with the request payload graph.

## Behavior Details

- Dropping onto another node still creates a normal connection and should not open the chooser.
- Dropping onto blank canvas opens the chooser.
- Choosing `image` creates a connected image node at the stored drop point.
- Choosing `video` creates a connected video node at the stored drop point.
- If the source node is an image with `src`, the created video node should start in `image-to-video` mode with a first-frame directive prompt.
- If the source node has no usable image `src`, the created video node should fall back to normal text-to-video defaults while keeping the visual connection.

## Testing

- Add a pure helper test for source-aware child-node creation.
- Extend connected-reference tests so connected generated image nodes with `src` are treated as usable references.
- Run targeted tests plus typecheck.

## Risks

- Expanding reference eligibility changes numbering to be based on all connected image-reference candidates, not only imported reference cards.
- This is acceptable because all UI surfaces and payload builders already rely on the same helper; the numbering stays internally consistent.
