import express from 'express';
import { buildAgentAnalysisRequest, normalizeAgentPlan } from './agentPlan';
import {
  buildAgentChatRequest,
  buildStoryboardRequest,
  parseResponseText,
  parseStoryboardResponse,
} from './agentConversation';

function getOpenAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error('OPENAI_API_KEY environment variable is not defined.');
  return {
    apiKey,
    model: process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
    baseUrl: process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1',
  };
}

export function registerAgentRoutes(app: express.Express): void {
  const runResponseRequest = async (request: ReturnType<typeof buildAgentChatRequest>) => {
    const response = await fetch(request.url, request.init);
    const body = await response.json();
    if (!response.ok) {
      throw new Error(`GPT request failed (${response.status}): ${JSON.stringify(body).slice(0, 300)}`);
    }
    return body;
  };

  app.post('/api/agent/chat', async (req, res) => {
    try {
      const config = getOpenAIConfig();
      const body = await runResponseRequest(buildAgentChatRequest({
        model: typeof req.body?.model === 'string' ? req.body.model : 'gpt-5.5',
        messages: Array.isArray(req.body?.messages) ? req.body.messages : [],
      }, config));
      res.json({ success: true, message: parseResponseText(body) });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Agent chat failed.' });
    }
  });

  app.post('/api/agent/storyboard', async (req, res) => {
    try {
      const config = getOpenAIConfig();
      const body = await runResponseRequest(buildStoryboardRequest({
        model: typeof req.body?.model === 'string' ? req.body.model : 'gpt-5.5',
        messages: Array.isArray(req.body?.messages) ? req.body.messages : [],
      }, config));
      res.json({ success: true, storyboard: parseStoryboardResponse(body) });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Storyboard creation failed.' });
    }
  });

  app.post('/api/agent/analyze', async (req, res) => {
    try {
      const brief = typeof req.body?.brief === 'string' ? req.body.brief : '';
      const request = buildAgentAnalysisRequest(brief, getOpenAIConfig());
      const response = await fetch(request.url, request.init);
      const responseText = await response.text();
      if (!response.ok) {
        throw new Error(`GPT analysis failed (${response.status}): ${responseText.slice(0, 300)}`);
      }
      const content = JSON.parse(responseText)?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) {
        throw new Error('GPT response did not contain JSON content.');
      }
      res.json({ success: true, plan: normalizeAgentPlan(JSON.parse(content)) });
    } catch (error) {
      console.error('Agent analysis error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Agent analysis failed.',
      });
    }
  });
}
