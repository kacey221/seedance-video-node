import assert from 'node:assert/strict';
import test from 'node:test';
import { parseVideoReferenceDirectives } from './videoReferenceDirectives';

const referenceTag = '@\u53c2\u8003\u56fe';
const firstFrameTag = '[\u9996\u5e27]';
const lastFrameTag = '[\u5c3e\u5e27]';

test('keeps plain references as general references', () => {
  const parsed = parseVideoReferenceDirectives(`slow pan ${referenceTag}4`);

  assert.deepEqual(parsed.generalReferenceNumbers, [4]);
  assert.equal(parsed.firstFrameNumber, undefined);
  assert.equal(parsed.lastFrameNumber, undefined);
});

test(`parses ${firstFrameTag} directives separately from general references`, () => {
  const parsed = parseVideoReferenceDirectives(
    `slow pan ${referenceTag}2${firstFrameTag} with ${referenceTag}4`,
  );

  assert.deepEqual(parsed.generalReferenceNumbers, [4]);
  assert.equal(parsed.firstFrameNumber, 2);
  assert.equal(parsed.lastFrameNumber, undefined);
});

test(`parses ${lastFrameTag} directives separately from general references`, () => {
  const parsed = parseVideoReferenceDirectives(
    `slow pan ${referenceTag}2 with ${referenceTag}4${lastFrameTag}`,
  );

  assert.deepEqual(parsed.generalReferenceNumbers, [2]);
  assert.equal(parsed.firstFrameNumber, undefined);
  assert.equal(parsed.lastFrameNumber, 4);
});

test(`keeps plain references, ${firstFrameTag}, and ${lastFrameTag} directives distinct in one prompt`, () => {
  const parsed = parseVideoReferenceDirectives(
    `slow pan ${referenceTag}7 with ${referenceTag}2${firstFrameTag} and ${referenceTag}4${lastFrameTag}`,
  );

  assert.deepEqual(parsed.generalReferenceNumbers, [7]);
  assert.equal(parsed.firstFrameNumber, 2);
  assert.equal(parsed.lastFrameNumber, 4);
});

test(`allows the same image to be both a plain reference and a ${firstFrameTag} directive`, () => {
  const parsed = parseVideoReferenceDirectives(
    `slow pan ${referenceTag}2 with ${referenceTag}2${firstFrameTag}`,
  );

  assert.deepEqual(parsed.generalReferenceNumbers, [2]);
  assert.equal(parsed.firstFrameNumber, 2);
  assert.equal(parsed.lastFrameNumber, undefined);
});

test(`rejects duplicate ${firstFrameTag} directives`, () => {
  assert.throws(
    () =>
      parseVideoReferenceDirectives(
        `camera move ${referenceTag}1${firstFrameTag} ${referenceTag}2${firstFrameTag}`,
      ),
    {
      message: `Duplicate ${firstFrameTag} directive`,
    },
  );
});

test(`rejects duplicate ${firstFrameTag} directives with optional spaces`, () => {
  assert.throws(
    () =>
      parseVideoReferenceDirectives(
        `camera move ${referenceTag} 1${firstFrameTag} ${referenceTag} 2${firstFrameTag}`,
      ),
    {
      message: `Duplicate ${firstFrameTag} directive`,
    },
  );
});

test(`rejects duplicate ${lastFrameTag} directives`, () => {
  assert.throws(
    () =>
      parseVideoReferenceDirectives(
        `camera move ${referenceTag}1${lastFrameTag} ${referenceTag}2${lastFrameTag}`,
      ),
    {
      message: `Duplicate ${lastFrameTag} directive`,
    },
  );
});

test(`rejects duplicate ${lastFrameTag} directives with optional spaces`, () => {
  assert.throws(
    () =>
      parseVideoReferenceDirectives(
        `camera move ${referenceTag} 1${lastFrameTag} ${referenceTag} 2${lastFrameTag}`,
      ),
    {
      message: `Duplicate ${lastFrameTag} directive`,
    },
  );
});
