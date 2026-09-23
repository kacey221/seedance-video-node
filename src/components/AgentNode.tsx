import React, { useState } from 'react';
import { Check, MessageCircle, Plus, Send, Sparkles, Trash2 } from 'lucide-react';
import type { AgentMessage, CanvasLayer, StoryboardItem } from '../types';
import { getAgentTextScale } from './agentSizing';

interface AgentNodeProps {
  node: CanvasLayer;
  onUpdate: (node: CanvasLayer) => void;
  onConfirm: () => void;
}

export default function AgentNode({ node, onUpdate, onConfirm }: AgentNodeProps) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const messages = node.agentMessages || [];
  const shots = node.storyboards || [];
  const stage = node.agentStage || 'chat';
  const textScale = getAgentTextScale(node.width);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || busy) return;
    const nextMessages: AgentMessage[] = [
      ...messages,
      { id: `user-${Date.now()}`, role: 'user', content },
    ];
    onUpdate({ ...node, agentMessages: nextMessages, agentError: undefined });
    setInput('');
    setBusy(true);
    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: node.agentModel || 'gpt-5.5', messages: nextMessages }),
      });
      const data = await response.json();
      if (!response.ok || !data.message) throw new Error(data.error || '对话请求失败');
      onUpdate({
        ...node,
        agentStage: 'chat',
        agentMessages: [
          ...nextMessages,
          { id: `assistant-${Date.now()}`, role: 'assistant', content: data.message },
        ],
      });
    } catch (error) {
      onUpdate({ ...node, agentError: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(false);
    }
  };

  const makeStoryboard = async () => {
    if (!messages.length || busy) return;
    setBusy(true);
    onUpdate({ ...node, agentError: undefined });
    try {
      const response = await fetch('/api/agent/storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: node.agentModel || 'gpt-5.5', messages }),
      });
      const data = await response.json();
      if (!response.ok || !data.storyboard?.shots) {
        throw new Error(data.error || '整理分镜失败');
      }
      const normalized: StoryboardItem[] = data.storyboard.shots.map((shot: StoryboardItem, index: number) => ({
        ...shot,
        id: shot.id || `shot-${Date.now()}-${index}`,
        order: index + 1,
        selected: shot.selected !== false,
      }));
      onUpdate({
        ...node,
        name: data.storyboard.title || 'AI 分析与分镜',
        agentStage: 'storyboard',
        storyboards: normalized,
      });
    } catch (error) {
      onUpdate({ ...node, agentError: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(false);
    }
  };

  const updateShot = (id: string, patch: Partial<StoryboardItem>) => {
    onUpdate({
      ...node,
      storyboards: shots.map((shot) => shot.id === id ? { ...shot, ...patch } : shot),
    });
  };

  const addShot = () => {
    const id = `shot-${Date.now()}`;
    onUpdate({
      ...node,
      storyboards: [...shots, {
        id,
        order: shots.length + 1,
        title: `分镜 ${shots.length + 1}`,
        prompt: '',
        negativePrompt: 'low quality, blurry, distorted, text',
        aspectRatio: '16:9',
        model: 'gpt-image-2',
        detailLevel: '1K',
        selected: true,
      }],
      agentStage: 'storyboard',
    });
  };

  return (
    <div
      data-agent-node="true"
      className="relative flex h-full min-h-0 flex-col overflow-hidden bg-white p-5 text-left pointer-events-auto"
      style={{ fontSize: `${10 * textScale}px` }}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <MessageCircle className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-[15px] font-black text-slate-900">{node.name}</div>
            <div className="mt-0.5 text-[10px] text-slate-400">先讨论，再确认创作</div>
          </div>
        </div>
        <select
          value={node.agentModel || 'gpt-5.5'}
          onChange={(event) => onUpdate({ ...node, agentModel: event.target.value })}
          className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-semibold text-slate-700 outline-none"
          aria-label="大语言模型"
        >
          <option value="gpt-5.5">GPT-5.5</option>
          <option value="gpt-4o-mini">GPT-4o mini</option>
        </select>
      </div>

      {stage === 'chat' && (
        <div className="flex min-h-0 flex-1 flex-col gap-3 pt-4">
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl bg-slate-50/80 p-3">
            {messages.length === 0 && (
              <div className="py-8 text-center text-[10px] leading-relaxed text-slate-400">
                描述你想创作的内容。<br />可以讨论主题、风格、角色、镜头和分镜数量。
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id} className={`rounded-xl px-2.5 py-2 text-[1em] leading-relaxed ${
                message.role === 'user' ? 'ml-5 bg-white text-slate-700' : 'mr-5 bg-slate-900 text-white'
              }`}>
                {message.content}
              </div>
            ))}
            {busy && <div className="text-[1em] text-slate-400">GPT 正在思考...</div>}
          </div>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="继续描述或追问..."
            className="min-h-[92px] w-full shrink-0 resize-none rounded-2xl border border-slate-200 bg-white p-3 text-[1.1em] text-slate-700 outline-none focus:border-slate-400"
          />
          <div className="flex shrink-0 justify-between gap-2">
            <button type="button" onClick={() => void makeStoryboard()} disabled={busy || !messages.length} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 disabled:opacity-40">
              <Sparkles className="h-3 w-3" />整理分镜
            </button>
            <button type="button" onClick={() => void sendMessage()} disabled={busy || !input.trim()} className="flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-40">
              <Send className="h-3 w-3" />发送
            </button>
          </div>
        </div>
      )}

      {stage === 'storyboard' && (
        <div className="flex min-h-0 flex-1 flex-col gap-3 pt-4">
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {shots.map((shot) => (
              <div key={shot.id} className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-2.5">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={shot.selected} onChange={(event) => updateShot(shot.id, { selected: event.target.checked })} />
                  <input value={shot.title} onChange={(event) => updateShot(shot.id, { title: event.target.value })} className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1 text-[10px] font-bold outline-none" />
                  <button type="button" onClick={() => onUpdate({ ...node, storyboards: shots.filter((item) => item.id !== shot.id).map((item, index) => ({ ...item, order: index + 1 })) })} title="删除分镜" className="text-slate-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                <textarea value={shot.prompt} onChange={(event) => updateShot(shot.id, { prompt: event.target.value })} className="min-h-[52px] w-full resize-y rounded-md border border-slate-200 p-2 text-[10px] leading-relaxed outline-none" />
                <div className="flex gap-1.5">
                  <select value={shot.aspectRatio} onChange={(event) => updateShot(shot.id, { aspectRatio: event.target.value as StoryboardItem['aspectRatio'] })} className="flex-1 rounded-md border border-slate-200 px-1 py-1 text-[9px]">
                    {['1:1', '3:4', '4:3', '9:16', '16:9'].map((ratio) => <option key={ratio}>{ratio}</option>)}
                  </select>
                  <select value={shot.detailLevel} onChange={(event) => updateShot(shot.id, { detailLevel: event.target.value as StoryboardItem['detailLevel'] })} className="flex-1 rounded-md border border-slate-200 px-1 py-1 text-[9px]">
                    {['1K', '2K', '4K'].map((level) => <option key={level}>{level}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={addShot} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-600"><Plus className="h-3 w-3" />新增分镜</button>
            <button type="button" onClick={() => onUpdate({ ...node, agentStage: 'chat' })} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-600">返回对话</button>
            <button type="button" onClick={onConfirm} disabled={!shots.some((shot) => shot.selected && shot.prompt.trim())} className="ml-auto flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-40"><Check className="h-3 w-3" />确认并创作</button>
          </div>
        </div>
      )}

      {node.agentError && <div className="rounded-lg bg-red-50 px-2.5 py-2 text-[10px] text-red-600">{node.agentError}</div>}
    </div>
  );
}
