# Conversational Agent Node Design

## Goal

Replace the immediate one-click generation flow with a canvas-native analysis
node. The user chats with GPT-5.5, converts the accepted conversation into an
editable storyboard, and explicitly confirms before image nodes are created.

## Interaction

The node has three stages:

1. `chat`: multi-turn user and assistant messages, model selector, and input.
2. `storyboard`: editable ordered shots with title, prompt, ratio, quality,
   image model, and a generate checkbox.
3. `generating`: selected shots create connected image nodes and generate
   independently. The agent node reports completed and failed counts.

The storyboard count comes from the conversation. A single-image request
produces one shot; explicitly numbered scenes produce the corresponding list.

## Architecture

- Extend `CanvasLayer` with an `agent` node type and serializable agent state.
- Add pure helpers for agent-node creation, storyboard normalization, ordering,
  duplication, and child image-node construction.
- Add `/api/agent/chat` and `/api/agent/storyboard` server routes using the
  OpenAI Responses API. API credentials remain server-side.
- Render agent-specific UI in a dedicated React component to keep the existing
  canvas renderer manageable.

## Error handling

Chat and storyboard errors appear inline and preserve user input. Storyboard
generation never creates image nodes. During image generation, one failed shot
does not stop the remaining shots, and every created node remains editable.

## Testing

Unit-test normalization and child-node layout. Add source-level rendering tests
for the new node branch and API routes, then run the complete test, typecheck,
and production build suites.
