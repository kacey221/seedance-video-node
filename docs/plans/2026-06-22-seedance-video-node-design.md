# Seedance Video Node Integration Design

**Date:** 2026-06-22

**Goal:** Add node-based Seedance video generation to the canvas app with local file configuration, text-to-video and image-to-video support, and local MP4 caching.

## Problem

The current app only supports image generation through the existing Right Codes workflow. The user wants a video-generation workflow that feels native to the same infinite-canvas node system, without changing the existing image API layer or adding a new API-management UI.

The new workflow must support:

- Seedance 2.0 and Seedance 2.0 Fast only
- Node-based text-to-video and image-to-video generation
- Multiple connected reference images
- Prompt-based `@` binding for general references, first frame, and last frame
- Local file configuration for the video API
- Local MP4 caching so generated videos remain usable after upstream URLs expire

## Approved Scope

- Add a dedicated Seedance video backend integration
- Read video provider settings from a local file instead of from the UI
- Keep the current image generation API flow unchanged
- Add a new canvas node type for videos
- Support two video node modes:
  - `text-to-video`
  - `image-to-video`
- Support two selectable video models:
  - `Seedance 2.0`
  - `Seedance 2.0 Fast`
- Support multi-image references plus explicit `@` directives:
  - `@参考图N`
  - `@参考图N[首帧]`
  - `@参考图N[尾帧]`
- Download completed videos to a local cache directory and return a local URL to the frontend
- Extend history so videos can be previewed and re-imported onto the canvas

## Out of Scope

- Seedance 2.0 Mini
- A new API settings drawer or any left-sidebar API-management UI
- Refactoring the current image provider architecture
- ffmpeg-based poster extraction or thumbnail generation
- Advanced media library management such as pruning, deduplication, or persistent metadata storage outside the in-memory history

## External API Contract

The implementation will follow the current BytePlus / Volcano Engine ModelArk documentation for Seedance video generation:

- Video generation is asynchronous
- The backend must create a task, then poll for task completion
- Seedance 2.0 and Seedance 2.0 Fast both support image-to-video with first and last frames
- Returned video URLs are time-limited, so the app should not rely on them for durable history playback

Approved model IDs:

- `Seedance 2.0` -> `dreamina-seedance-2-0-260128`
- `Seedance 2.0 Fast` -> `dreamina-seedance-2-0-fast-260128`

Reference documents:

- Model list: `https://docs.byteplus.com/en/docs/ModelArk/1330310`
- Seedance 2.0 guide: `https://docs.byteplus.com/en/docs/ModelArk/2291680`
- Create task API: `https://docs.byteplus.com/en/docs/ModelArk/1520757`
- Query task API: `https://docs.byteplus.com/en/docs/ModelArk/1521309`

## Local Configuration

The video API configuration will live in a local file instead of the UI.

Recommended files:

- committed example: `config/seedance-video.example.json`
- local runtime file: `config/seedance-video.json`

The runtime file should be gitignored and read by the server at request time or server startup.

Recommended shape:

```json
{
  "provider": "seedance",
  "baseUrl": "https://ark.cn-beijing.volces.com",
  "apiKeyEnv": "VOLCENGINE_ARK_API_KEY",
  "defaultModel": "dreamina-seedance-2-0-260128",
  "models": {
    "seedance-2.0": "dreamina-seedance-2-0-260128",
    "seedance-2.0-fast": "dreamina-seedance-2-0-fast-260128"
  },
  "pollIntervalMs": 4000,
  "pollTimeoutMs": 480000,
  "cacheDir": "storage/generated-videos"
}
```

This keeps secrets out of the frontend while still making the integration editable through a simple local file.

## Prompt Directive Rules

The existing `@参考图N` concept will be extended for video generation.

### Supported syntax

- `@参考图1`
  - General reference only
- `@参考图2[首帧]`
  - Explicit first frame
- `@参考图3[尾帧]`
  - Explicit last frame

The same image may be used in multiple roles, for example:

- `@参考图2 @参考图2[首帧]`

### Validation rules

For `text-to-video`:

- `@参考图N` is optional
- `[首帧]` and `[尾帧]` are optional
- connected images may still be used as references if explicitly mentioned

For `image-to-video`:

- exactly one `@参考图N[首帧]` is required
- at most one `@参考图N[尾帧]` is allowed
- any additional `@参考图N` references are treated as general reference images

Invalid cases should be blocked in the node UI before the request is sent:

- no first frame in image-to-video mode
- multiple first frames
- multiple last frames
- `@` references that point to images not connected to the node

## Backend Architecture

Add a dedicated server module for Seedance rather than mixing the implementation into the current Right Codes helper.

Recommended modules:

- `server/seedanceVideoConfig.ts`
  - load and validate local config
  - resolve environment-backed API key
  - expose model alias mapping
- `server/seedanceVideo.ts`
  - build create-task payloads
  - poll query-task endpoint
  - normalize task errors
  - download the final video to local storage

Recommended routes:

- `POST /api/seedance/generate-video`
- `GET /api/seedance/tasks/:taskId`

Recommended serving path for cached assets:

- `GET /generated-videos/<filename>`

## Backend Request Flow

For every video generation request:

1. Validate the incoming mode, model alias, and prompt data
2. Validate image references and directive roles
3. Load `config/seedance-video.json`
4. Resolve the configured API key
5. Build the Seedance create-task request body
6. Submit the task to the upstream API
7. Poll the task endpoint until:
   - success
   - failure
   - timeout
8. Download the returned MP4 to the configured local cache directory
9. Return a response containing:
   - `success`
   - `taskId`
   - `video`
   - `mode`
   - `modelName`
   - `durationSeconds`
   - `referenceSummary`

## Frontend Behavior

The canvas workflow should remain familiar to current users.

### Node creation

The existing add-node entry point should allow creating:

- image node
- video node

### Video node layout

The video node should follow the current image-node card pattern:

- preview area on top
- prompt and negative prompt inputs in the middle
- model, ratio, duration, mode, and submit controls at the bottom

### Video node controls

- Mode:
  - `文生视频`
  - `图生视频`
- Model:
  - `Seedance 2.0`
  - `Seedance 2.0 Fast`
- Aspect ratio:
  - reuse the current ratio picker where possible
- Duration:
  - expose only the values supported by the upstream API for the initial version

### Preview behavior

When generation succeeds:

- render a `<video>` preview directly inside the node
- allow play and pause
- keep the cached local MP4 URL on the layer

## Data Model Changes

The app should distinguish image history from video history without breaking the current canvas abstractions.

Recommended changes:

- extend `CanvasLayer.type` to include `video`
- add video-specific fields such as:
  - `videoMode`
  - `videoModel`
  - `durationSeconds`
  - `videoSrc`
  - `videoTaskId`
- extend history items with:
  - `mediaType: 'image' | 'video'`
  - `videoSrc?`
  - `durationSeconds?`
  - `taskId?`

History should continue to support "send back to canvas", but video items should create or hydrate video nodes instead of image nodes.

## Error Handling

Errors should be split into three layers:

### Frontend validation errors

Show inline or node-local errors for:

- missing first frame in image-to-video mode
- duplicate first or last frames
- unconnected `@` references

### Backend request errors

Return clear server-side messages for:

- missing config file
- missing API key
- unsupported model alias
- invalid upstream request payload

### Upstream task errors

Normalize task failures into readable messages when:

- the upstream task returns a failed state
- polling exceeds the configured timeout
- the returned video URL cannot be downloaded

## Testing Strategy

Add focused tests around pure logic and request shaping rather than trying to test the full canvas UI end-to-end.

- frontend helper tests for parsing `@参考图N`, `[首帧]`, and `[尾帧]`
- frontend helper tests for building the outgoing video-reference payload
- server tests for config loading and model mapping
- server tests for create-task request shaping
- server tests for polling success, failure, and timeout handling
- verification via TypeScript typecheck and targeted test runs

## Implementation Notes

- Keep the first implementation intentionally narrow
- Do not refactor the existing image-generation provider flow in the same change
- Prefer new helper modules for video-specific logic so the current image path stays stable
- Store the local cached video path, not the ephemeral upstream URL, in nodes and history
