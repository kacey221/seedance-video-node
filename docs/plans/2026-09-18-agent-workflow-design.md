# Agent Workflow Phase 1 Design

## Goal

Add a first executable agent loop to the infinite canvas:

1. The user enters a creative brief.
2. GPT converts the brief into a validated image plan and video plan.
3. The canvas creates an image generation node from that plan.
4. The generated image is connected to a video generation node.
5. The existing video API runs the video step.

## Boundary

Phase 1 is intentionally a vertical slice. It does not add autonomous retries,
long-running orchestration, or local MiniMax H3 inference. The video plan keeps
the H3 model aliases available for the next provider adapter, while the
executable default uses the existing Seedance route.

## Architecture

- `server/agentPlan.ts` owns the JSON contract, validation, and defaults.
- `server/agentServer.ts` exposes `POST /api/agent/analyze`.
- The browser calls the analysis endpoint, creates two connected canvas nodes,
  and submits the image node through the existing Right Codes endpoint.
- The image node's output becomes the video's first-frame reference.
- No API key is sent to the browser. GPT credentials stay in server env vars.

## Failure handling

- Missing `OPENAI_API_KEY` returns a clear configuration error.
- Invalid GPT JSON is rejected before any canvas nodes are created.
- Image or video failures leave the generated nodes visible with their loading
  state cleared, so the user can retry manually.

## Verification

- Unit tests cover plan defaults, validation, and OpenAI request construction.
- Existing test, typecheck, and production build commands must pass.
