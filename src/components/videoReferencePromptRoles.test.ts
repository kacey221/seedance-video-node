import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getVideoReferenceRole,
  setVideoReferenceRole,
} from './videoReferencePromptRoles';

const referenceTag = '@\u53c2\u8003\u56fe';
const firstFrameTag = '[\u9996\u5e27]';
const lastFrameTag = '[\u5c3e\u5e27]';
const referenceMentionPattern =
  /@\u53c2\u8003\u56fe\s*2(?:\s*\[(?:\u9996\u5e27|\u5c3e\u5e27)\])?/gu;

function role(flags?: Partial<ReturnType<typeof getVideoReferenceRole>>) {
  return {
    isReference: false,
    isFirstFrame: false,
    isLastFrame: false,
    ...flags,
  };
}

test(`setting only a plain reference writes ${referenceTag}N`, () => {
  assert.equal(
    setVideoReferenceRole('slow pan', 2, role({ isReference: true })),
    'slow pan @\u53c2\u8003\u56fe2',
  );
});

test(`setting a reference and first frame writes ${referenceTag}N and ${referenceTag}N${firstFrameTag}`, () => {
  assert.equal(
    setVideoReferenceRole(
      'slow pan',
      2,
      role({ isReference: true, isFirstFrame: true }),
    ),
    'slow pan @\u53c2\u8003\u56fe2 @\u53c2\u8003\u56fe2[\u9996\u5e27]',
  );
});

test(`setting all supported flags writes plain, ${firstFrameTag}, and ${lastFrameTag} mentions`, () => {
  assert.equal(
    setVideoReferenceRole(
      'slow pan',
      2,
      role({ isReference: true, isFirstFrame: true, isLastFrame: true }),
    ),
    'slow pan @\u53c2\u8003\u56fe2 @\u53c2\u8003\u56fe2[\u9996\u5e27] @\u53c2\u8003\u56fe2[\u5c3e\u5e27]',
  );
});

test('switching flags for the same label replaces old mentions instead of duplicating', () => {
  const updatedPrompt = setVideoReferenceRole(
    'slow pan @\u53c2\u8003\u56fe2 @\u53c2\u8003\u56fe 2 [\u5c3e\u5e27]',
    2,
    role({ isReference: true, isFirstFrame: true }),
  );

  assert.equal(
    updatedPrompt,
    'slow pan @\u53c2\u8003\u56fe2 @\u53c2\u8003\u56fe2[\u9996\u5e27]',
  );
  assert.equal([...updatedPrompt.matchAll(referenceMentionPattern)].length, 2);
});

test('clearing flags removes every mention for that label cleanly', () => {
  assert.equal(
    setVideoReferenceRole(
      'slow pan @\u53c2\u8003\u56fe2 @\u53c2\u8003\u56fe 2 [\u9996\u5e27] with mist',
      2,
      role(),
    ),
    'slow pan with mist',
  );
});

test('existing unrelated labels remain untouched', () => {
  assert.equal(
    setVideoReferenceRole(
      'slow pan @\u53c2\u8003\u56fe3[\u5c3e\u5e27]',
      2,
      role({ isReference: true }),
    ),
    'slow pan @\u53c2\u8003\u56fe3[\u5c3e\u5e27] @\u53c2\u8003\u56fe2',
  );
});

test('punctuation-wrapped mentions are detected and replaced in place', () => {
  const prompt = 'slow pan (@\u53c2\u8003\u56fe2[\u9996\u5e27]) with mist';

  assert.deepEqual(
    getVideoReferenceRole(prompt, 2),
    role({ isFirstFrame: true }),
  );
  assert.equal(
    setVideoReferenceRole(prompt, 2, role({ isLastFrame: true })),
    'slow pan (@\u53c2\u8003\u56fe2[\u5c3e\u5e27]) with mist',
  );
});

test('clearing a wrapped mention in the middle removes the empty wrapper', () => {
  assert.equal(
    setVideoReferenceRole(
      'slow pan (@\u53c2\u8003\u56fe2[\u9996\u5e27]) with mist',
      2,
      role(),
    ),
    'slow pan with mist',
  );
});

test('clearing a separator-delimited mention in the middle removes dangling punctuation', () => {
  assert.equal(
    setVideoReferenceRole('slow pan: @\u53c2\u8003\u56fe2; with mist', 2, role()),
    'slow pan with mist',
  );
});

test('clearing mentions at the start removes wrapper and separator artifacts', () => {
  assert.equal(
    setVideoReferenceRole('(@\u53c2\u8003\u56fe2[\u9996\u5e27]) with mist', 2, role()),
    'with mist',
  );
  assert.equal(
    setVideoReferenceRole('@\u53c2\u8003\u56fe2: with mist', 2, role()),
    'with mist',
  );
});

test('clearing mentions at the end removes wrapper and separator artifacts', () => {
  assert.equal(
    setVideoReferenceRole('slow pan (@\u53c2\u8003\u56fe2[\u9996\u5e27])', 2, role()),
    'slow pan',
  );
  assert.equal(
    setVideoReferenceRole('slow pan: @\u53c2\u8003\u56fe2', 2, role()),
    'slow pan',
  );
});

test('toggling roles preserves unrelated whitespace and newlines', () => {
  const prompt =
    'slow pan\n\n  @\u53c2\u8003\u56fe2[\u9996\u5e27]\nwith mist  and glow';

  assert.equal(
    setVideoReferenceRole(prompt, 2, role({ isReference: true, isLastFrame: true })),
    'slow pan\n\n  @\u53c2\u8003\u56fe2 @\u53c2\u8003\u56fe2[\u5c3e\u5e27]\nwith mist  and glow',
  );
});

test('getVideoReferenceRole reports combined flags with whitespace-tolerant mentions', () => {
  const prompt =
    'slow pan @\u53c2\u8003\u56fe1 @\u53c2\u8003\u56fe2 @\u53c2\u8003\u56fe 2 [\u9996\u5e27] @\u53c2\u8003\u56fe 3 [\u5c3e\u5e27]';

  assert.deepEqual(getVideoReferenceRole(prompt, 1), role({ isReference: true }));
  assert.deepEqual(
    getVideoReferenceRole(prompt, 2),
    role({ isReference: true, isFirstFrame: true }),
  );
  assert.deepEqual(
    getVideoReferenceRole(prompt, 3),
    role({ isLastFrame: true }),
  );
  assert.deepEqual(getVideoReferenceRole(prompt, 4), role());
});
