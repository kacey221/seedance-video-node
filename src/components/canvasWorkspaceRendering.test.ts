import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { CanvasLayer, GenerationHistoryItem } from '../types';
import CanvasWorkspace from './CanvasWorkspace';
import { NodeCreateMenu } from './NodeCreateMenu';

function createLayer(overrides: Partial<CanvasLayer> = {}): CanvasLayer {
  return {
    id: 'node-1',
    type: 'image',
    name: 'Layer 1',
    x: 120,
    y: 80,
    width: 320,
    height: 320,
    src: 'data:image/png;base64,layer-1',
    visible: true,
    locked: false,
    opacity: 1,
    rotate: 0,
    prompt: '',
    engine: 'rightcodes-image',
    rightCodesModel: 'gpt-image-2',
    aspectRatio: '1:1',
    parentIds: [],
    ...overrides,
  };
}

function renderWorkspace(
  layers: CanvasLayer[],
  selectedLayerId: string,
  history: GenerationHistoryItem[] = [],
) {
  return renderToStaticMarkup(
    React.createElement(CanvasWorkspace, {
      layers,
      selectedLayerId,
      onSelectLayer: () => {},
      onUpdateLayer: () => {},
      onAddLayer: () => {},
      onDeleteLayer: () => {},
      history,
      onDeleteHistory: () => {},
    }),
  );
}

test('selected imported reference images still expose an output port', () => {
  const referenceNode = createLayer({
    id: 'ref-1',
    name: 'Imported reference',
    isReference: true,
  });

  const html = renderWorkspace([referenceNode], referenceNode.id);

  assert.match(html, /port-dot absolute -right-2/);
});

test('node cards avoid transition-all on the draggable wrapper', () => {
  const node = createLayer();

  const html = renderWorkspace([node], node.id);
  const layerElementClassName = html.match(/class="([^"]*layer-element[^"]*)"/)?.[1];

  assert.ok(layerElementClassName, 'expected to find the node wrapper class name');
  assert.doesNotMatch(layerElementClassName, /transition-all/);
});

test('image node model dropdown exposes Image 2.5 aliases', () => {
  const html = renderWorkspace([createLayer()], 'node-1');

  assert.match(html, /<option value="image-2\.5"/);
  assert.match(html, /<option value="image-2\.5-flare"/);
  assert.match(html, /<option value="image-2\.5-sunburst"/);
});

test('connection cables render below the node card layer', () => {
  const html = renderWorkspace([createLayer()], '');
  const cableClassName = html.match(/data-canvas-cables="true" class="([^"]*)"/)?.[1];
  const nodeLayerClassName = html.match(/data-canvas-node-layer="true" class="([^"]*)"/)?.[1];

  assert.match(cableClassName || '', /z-0/);
  assert.match(nodeLayerClassName || '', /z-10/);
});

test('node create menu exposes image and video creation choices', () => {
  const html = renderToStaticMarkup(
    React.createElement(NodeCreateMenu, {
      title: 'Create node',
      onClose: () => {},
      onSelect: () => {},
      className: 'test-node-menu',
    }),
  );

  assert.match(html, /data-node-create-option="image"/);
  assert.match(html, /data-node-create-option="video"/);
  assert.match(html, /Create node/);
});

test('agent conversations are no longer rendered as canvas nodes', () => {
  const agentNode = createLayer({
    id: 'agent-1',
    type: 'agent',
    name: 'AI 分析与分镜',
    width: 420,
    height: 560,
    agentModel: 'gpt-5.5',
    agentStage: 'chat',
    agentMessages: [],
    storyboards: [],
  });

  const html = renderWorkspace([agentNode], agentNode.id);

  assert.doesNotMatch(html, /data-agent-node="true"/);
  assert.doesNotMatch(html, /GPT-5\.5/);
  assert.doesNotMatch(html, /整理分镜/);
});

test('left navigation uses icon-only image and video entries', () => {
  const html = renderWorkspace([createLayer()], 'node-1');

  assert.match(html, /title="新建图片节点"/);
  assert.match(html, /title="新建视频节点"/);
  assert.doesNotMatch(html, />图片</);
  assert.doesNotMatch(html, />视频</);
  assert.doesNotMatch(html, /plus-add-node-btn/);
  assert.doesNotMatch(html, /history-clock-btn/);
});

test('left navigation includes an agent entry and hides the top status bar', () => {
  const html = renderWorkspace([createLayer()], 'node-1');

  assert.match(html, /title="打开 agent 对话"/);
  assert.doesNotMatch(html, />agent</);
  assert.doesNotMatch(html, /Agent 一键创作/);
  assert.doesNotMatch(html, /新建生图节点/);
  assert.doesNotMatch(html, /图库/);
});

test('canvas does not render the floating tool tag bar', () => {
  const html = renderWorkspace([createLayer()], 'node-1');

  assert.doesNotMatch(html, /节点卡片选择及移动/);
  assert.doesNotMatch(html, /画板抓手漫游视角拖拽/);
  assert.doesNotMatch(html, /红遮罩笔/);
  assert.doesNotMatch(html, /一键擦除整张画板/);
});
