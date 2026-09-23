# Conversational Agent Node Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a GPT-5.5 conversation node that produces an editable storyboard and creates image nodes only after explicit confirmation.

**Architecture:** Store all chat and storyboard state on an `agent` canvas layer. Use a dedicated UI component and pure workflow helpers; proxy OpenAI Responses API calls through Express.

**Tech Stack:** React 19, TypeScript, Express, OpenAI Responses API, Node test runner, Tailwind CSS.

---

### Task 1: Agent workflow domain

**Files:**
- Create: `src/components/agentWorkflow.ts`
- Create: `src/components/agentWorkflow.test.ts`
- Modify: `src/types.ts`

1. Write failing tests for agent defaults, storyboard normalization, and image-node layout.
2. Run `npm test -- --test-name-pattern="agent workflow"` and verify missing-module failure.
3. Add the agent types and minimal pure helper implementation.
4. Re-run the focused tests and verify they pass.

### Task 2: GPT chat and storyboard API

**Files:**
- Create: `server/agentConversation.ts`
- Create: `server/agentConversation.test.ts`
- Modify: `server/agentServer.ts`

1. Write failing request-construction and response-parsing tests.
2. Run the focused server tests and verify failure.
3. Implement Responses API chat and strict storyboard request builders.
4. Register `/api/agent/chat` and `/api/agent/storyboard`.
5. Re-run focused tests.

### Task 3: Canvas agent node

**Files:**
- Create: `src/components/AgentNode.tsx`
- Modify: `src/components/CanvasWorkspace.tsx`
- Modify: `src/components/canvasWorkspaceRendering.test.ts`

1. Add a failing rendering source test for the agent branch and button behavior.
2. Replace immediate generation with creation of an `agent` node.
3. Render chat, storyboard editing, and generation progress states.
4. Generate selected storyboard items as connected image nodes.
5. Run focused rendering and workflow tests.

### Task 4: Verification

1. Run `npm test`.
2. Run `npm run lint`.
3. Run `npm run build`.
4. Start the development server and inspect the agent node in the browser.
5. Record any provider-key limitation explicitly.
