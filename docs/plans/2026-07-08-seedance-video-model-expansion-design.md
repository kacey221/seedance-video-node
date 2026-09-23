# Seedance Video Model Expansion Design

**Date:** 2026-07-08

**Goal:** Expand the existing Seedance video integration from two selectable models to five selectable models while continuing to call Volcano Engine ModelArk through one backend API configuration and one API key.

## Problem

The current video integration only exposes two selectable model aliases:

- `seedance-2.0`
- `seedance-2.0-fast`

The user now wants to add three more video models:

- `Doubao-Seedance-2.0-mini`
- `Doubao-Seedance-1.5-pro`
- `Doubao-Seedance-1.0-pro-fast`

The backend must continue using Volcano Engine ModelArk with a single `baseUrl` and a single `VOLCENGINE_ARK_API_KEY`. The user should be able to switch between any of the five models through the existing video-generation flow without changing API credentials or maintaining separate provider setups.

## Approved Scope

- Keep the current Seedance video backend architecture
- Keep the current `/api/seedance/generate-video` route
- Continue reading credentials from one local config file plus one environment variable
- Add three new selectable model aliases to the frontend and backend
- Map all five aliases to concrete Volcano ModelArk model IDs through config
- Allow requests to switch between the five models using the same backend API key
- Preserve the current default model and the current node data shape

## Out of Scope

- Adding a second provider
- Adding multiple API-key slots or per-model credentials
- Auto-fallback from one model to another
- Reworking the overall video-node UI structure
- Refactoring the entire provider/config architecture into a generic registry system

## Chosen Approach

Keep the existing alias-based design.

The frontend and shared node types will continue to store a stable, app-owned model alias such as `seedance-2.0` or `seedance-1.5-pro`. The backend will continue to validate that alias against a known whitelist and then resolve it through `config/seedance-video.json` into the actual Volcano ModelArk model ID sent upstream.

This preserves the existing architecture and keeps provider-specific model IDs out of most frontend state. It also makes future model-ID changes local to config and backend validation rather than forcing data migrations across saved node state.

## Model Set

Supported frontend aliases after this change:

- `seedance-2.0`
- `seedance-2.0-fast`
- `seedance-2.0-mini`
- `seedance-1.5-pro`
- `seedance-1.0-pro-fast`

Configured Volcano ModelArk model IDs:

- `seedance-2.0` -> `dreamina-seedance-2-0-260128`
- `seedance-2.0-fast` -> `dreamina-seedance-2-0-fast-260128`
- `seedance-2.0-mini` -> `Doubao-Seedance-2.0-mini`
- `seedance-1.5-pro` -> `Doubao-Seedance-1.5-pro`
- `seedance-1.0-pro-fast` -> `Doubao-Seedance-1.0-pro-fast`

## Backend Configuration

The backend configuration shape stays the same:

```json
{
  "provider": "seedance",
  "baseUrl": "https://ark.cn-beijing.volces.com",
  "apiKeyEnv": "VOLCENGINE_ARK_API_KEY",
  "defaultModel": "dreamina-seedance-2-0-260128",
  "models": {
    "seedance-2.0": "dreamina-seedance-2-0-260128",
    "seedance-2.0-fast": "dreamina-seedance-2-0-fast-260128",
    "seedance-2.0-mini": "Doubao-Seedance-2.0-mini",
    "seedance-1.5-pro": "Doubao-Seedance-1.5-pro",
    "seedance-1.0-pro-fast": "Doubao-Seedance-1.0-pro-fast"
  },
  "pollIntervalMs": 4000,
  "pollTimeoutMs": 480000,
  "cacheDir": "storage/generated-videos"
}
```

Key behavior:

- One `baseUrl`
- One `apiKeyEnv`
- One environment variable value in `.env`
- Five selectable model aliases

Switching models only changes which entry is read from `models` before the upstream request is sent.

## Frontend and Shared Types

The existing `VideoModelAlias` union is used in multiple places:

- shared canvas-layer typing
- video node creation
- request payload generation
- UI model selection

All of those locations should be expanded to the same five-alias set. The default video node should remain `seedance-2.0` so existing behavior does not change for users who never touch the model selector.

## Request Flow

The runtime request flow remains:

1. User selects one of five model aliases in the video node UI
2. Frontend sends that alias to `/api/seedance/generate-video`
3. Backend validates the alias against the supported set
4. Backend loads `config/seedance-video.json`
5. Backend resolves the alias to the configured ModelArk model ID
6. Backend sends the request to Volcano ModelArk using the same `baseUrl` and `VOLCENGINE_ARK_API_KEY`
7. Result handling, polling, caching, and local serving stay unchanged

## Error Handling

The implementation should fail early and clearly:

- If the frontend sends an unknown alias, request validation should reject it
- If `config/seedance-video.json` omits one of the required aliases, config loading should throw a readable error
- If the selected model is rejected upstream, surface the existing upstream failure instead of silently switching models

No implicit fallback should be added. If the user selects model A, the backend must either use model A or fail explicitly.

## Files Affected

Expected code changes:

- `src/types.ts`
- `src/components/videoNodeGeneration.ts`
- `src/components/CanvasWorkspace.tsx`
- `server/seedanceVideoConfig.ts`
- `server/seedanceVideoServer.ts`
- `server/seedanceVideo.ts`
- `server/seedanceVideoConfig.test.ts`
- `server/seedanceVideo.test.ts`
- `src/typesVideoCompat.test.ts`
- `src/components/videoNodeGeneration.test.ts`
- `config/seedance-video.example.json`
- `config/seedance-video.json`

## Testing Strategy

Use TDD for behavior changes.

Backend tests should cover:

- config loader requires all five aliases
- resolved config exposes all five model mappings
- request generation accepts each new alias
- model display names remain correct for generation results

Frontend and shared tests should cover:

- type compatibility with the expanded alias set
- video-node default behavior remains `seedance-2.0`
- video-node helpers accept the new aliases without narrowing errors

Verification should include targeted tests plus a full TypeScript check.

## Risks

- Missing one alias in one layer could create a mismatch where the UI allows a model but the backend rejects it
- Forgetting to update local runtime config would cause runtime config-loading failures
- The current git worktree metadata appears unhealthy, so commit automation may fail even if file edits succeed

## Success Criteria

The work is complete when:

- the video model selector offers all five models
- one Volcano ModelArk API key can be used to switch between all five models
- backend config validation enforces all five mappings
- targeted tests pass
- TypeScript checks pass
