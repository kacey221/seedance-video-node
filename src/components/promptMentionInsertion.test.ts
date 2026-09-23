import assert from 'node:assert/strict';
import test from 'node:test';
import {
  insertMentionAtSelection,
  replaceActiveMentionQuery,
} from './promptMentionInsertion';

test('inserts a mention at the current cursor position', () => {
  const result = insertMentionAtSelection({
    prompt: '镜头先写环境，再写主体',
    mention: '@参考图2 ',
    selectionStart: 7,
    selectionEnd: 7,
  });

  assert.equal(result.nextPrompt, '镜头先写环境，@参考图2 再写主体');
  assert.equal(result.nextSelectionStart, '镜头先写环境，@参考图2 '.length);
  assert.equal(result.nextSelectionEnd, '镜头先写环境，@参考图2 '.length);
});

test('replaces the active @ token nearest the cursor instead of the last @ in the prompt', () => {
  const result = replaceActiveMentionQuery({
    prompt: '先写 @参，后面保留 @参考图4 不动',
    mention: '@参考图2 ',
    selectionStart: 5,
    selectionEnd: 5,
  });

  assert.equal(result.nextPrompt, '先写 @参考图2 ，后面保留 @参考图4 不动');
  assert.equal(result.nextSelectionStart, '先写 @参考图2 '.length);
  assert.equal(result.nextSelectionEnd, '先写 @参考图2 '.length);
});

test('skips duplicate thumbnail insertion when requested', () => {
  const prompt = '构图参考 @参考图1 并保持主体稳定';
  const result = insertMentionAtSelection({
    prompt,
    mention: '@参考图1 ',
    selectionStart: prompt.length,
    selectionEnd: prompt.length,
    skipIfAlreadyPresent: true,
  });

  assert.equal(result.nextPrompt, prompt);
  assert.equal(result.nextSelectionStart, prompt.length);
  assert.equal(result.nextSelectionEnd, prompt.length);
});

test('falls back to append when no selection information exists', () => {
  const result = insertMentionAtSelection({
    prompt: '添加一个角色参考',
    mention: '@参考图3 ',
  });

  assert.equal(result.nextPrompt, '添加一个角色参考 @参考图3');
  assert.equal(result.nextSelectionStart, '添加一个角色参考 @参考图3'.length);
  assert.equal(result.nextSelectionEnd, '添加一个角色参考 @参考图3'.length);
});
