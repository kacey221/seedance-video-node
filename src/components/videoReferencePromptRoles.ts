export type VideoReferenceRole = {
  isReference: boolean;
  isFirstFrame: boolean;
  isLastFrame: boolean;
};

const referenceTag = '@\u53c2\u8003\u56fe';
const firstFrameTag = '[\u9996\u5e27]';
const lastFrameTag = '[\u5c3e\u5e27]';
const mentionBoundaryPattern = '[\\p{L}\\p{N}_]';

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function createEmptyRole(): VideoReferenceRole {
  return {
    isReference: false,
    isFirstFrame: false,
    isLastFrame: false,
  };
}

function buildMentions(labelNumber: number, role: VideoReferenceRole): string[] {
  const mentions: string[] = [];

  if (role.isReference) {
    mentions.push(`${referenceTag}${labelNumber}`);
  }

  if (role.isFirstFrame) {
    mentions.push(`${referenceTag}${labelNumber}${firstFrameTag}`);
  }

  if (role.isLastFrame) {
    mentions.push(`${referenceTag}${labelNumber}${lastFrameTag}`);
  }

  return mentions;
}

function getMentionPattern(labelNumber: number): RegExp {
  return new RegExp(
    `(?<!${mentionBoundaryPattern})${escapeForRegExp(referenceTag)}\\s*${labelNumber}(?:\\s*(${escapeForRegExp(firstFrameTag)}|${escapeForRegExp(lastFrameTag)}))?(?!${mentionBoundaryPattern}|\\[)`,
    'gu',
  );
}

type MentionMatch = {
  start: number;
  end: number;
  frameTag?: string;
};

type MentionGroup = {
  start: number;
  end: number;
};

const wrapperPairs = [
  ['(', ')'],
  ['[', ']'],
  ['{', '}'],
  ['（', '）'],
  ['【', '】'],
] as const;
const danglingPunctuationPattern = /[,:;，：；]/u;

function trimGapEnd(value: string): string {
  return value.replace(/[ \t]+$/u, '');
}

function trimGapStart(value: string): string {
  return value.replace(/^[ \t]+/u, '');
}

function cleanupRemovedMention(
  before: string,
  after: string,
): {
  before: string;
  after: string;
  didAdjustBoundary: boolean;
} {
  let nextBefore = before;
  let nextAfter = after;

  for (const [opening, closing] of wrapperPairs) {
    const trimmedBefore = trimGapEnd(nextBefore);
    const trimmedAfter = trimGapStart(nextAfter);

    if (!trimmedBefore.endsWith(opening) || !trimmedAfter.startsWith(closing)) {
      continue;
    }

    nextBefore = trimmedBefore.slice(0, -opening.length);
    nextAfter = trimmedAfter.slice(closing.length);
    break;
  }

  const trimmedBefore = trimGapEnd(nextBefore);
  const trailingPunctuation = trimmedBefore.slice(-1);

  if (danglingPunctuationPattern.test(trailingPunctuation)) {
    nextBefore = trimGapEnd(trimmedBefore.slice(0, -1));
  }

  const trimmedAfter = trimGapStart(nextAfter);
  const leadingPunctuation = trimmedAfter[0] ?? '';

  if (danglingPunctuationPattern.test(leadingPunctuation)) {
    nextAfter = trimGapStart(trimmedAfter.slice(1));
  }

  return {
    before: nextBefore,
    after: nextAfter,
    didAdjustBoundary: nextBefore !== before || nextAfter !== after,
  };
}

function getMentionMatches(prompt: string, labelNumber: number): MentionMatch[] {
  return [...prompt.matchAll(getMentionPattern(labelNumber))].map((match) => {
    const start = match.index ?? 0;

    return {
      start,
      end: start + match[0].length,
      frameTag: match[1],
    };
  });
}

function getMentionGroups(
  prompt: string,
  matches: MentionMatch[],
): MentionGroup[] {
  if (matches.length === 0) {
    return [];
  }

  const groups: MentionGroup[] = [];
  let currentGroup: MentionGroup = {
    start: matches[0].start,
    end: matches[0].end,
  };

  for (const match of matches.slice(1)) {
    if (/^\s*$/u.test(prompt.slice(currentGroup.end, match.start))) {
      currentGroup.end = match.end;
      continue;
    }

    groups.push(currentGroup);
    currentGroup = {
      start: match.start,
      end: match.end,
    };
  }

  groups.push(currentGroup);

  return groups;
}

function replaceMentionGroup(
  prompt: string,
  group: MentionGroup,
  replacement: string,
): string {
  let before = prompt.slice(0, group.start);
  let after = prompt.slice(group.end);

  if (!replacement) {
    let didAdjustBoundary = false;
    ({ before, after, didAdjustBoundary } = cleanupRemovedMention(before, after));

    if (!before) {
      return trimGapStart(after);
    }

    if (!after) {
      return trimGapEnd(before);
    }

    if (/[^\s][ \t]+$/u.test(before) && /^[ \t]+[^\s]/u.test(after)) {
      return `${trimGapEnd(before)} ${trimGapStart(after)}`;
    }

    if (didAdjustBoundary && /\S$/u.test(before) && /^\S/u.test(after)) {
      return `${before} ${after}`;
    }
  }

  return `${before}${replacement}${after}`;
}

export function getVideoReferenceRole(
  prompt: string,
  labelNumber: number,
): VideoReferenceRole {
  const role = createEmptyRole();

  for (const match of getMentionMatches(prompt, labelNumber)) {
    const frameTag = match.frameTag;

    if (frameTag === firstFrameTag) {
      role.isFirstFrame = true;
      continue;
    }

    if (frameTag === lastFrameTag) {
      role.isLastFrame = true;
      continue;
    }

    role.isReference = true;
  }

  return role;
}

export function setVideoReferenceRole(
  prompt: string,
  labelNumber: number,
  role: VideoReferenceRole,
): string {
  const nextMentions = buildMentions(labelNumber, role).join(' ');
  const mentionGroups = getMentionGroups(
    prompt,
    getMentionMatches(prompt, labelNumber),
  );

  if (mentionGroups.length === 0) {
    if (!nextMentions) {
      return prompt;
    }

    if (!prompt.trim()) {
      return nextMentions;
    }

    return /\s$/u.test(prompt) ? `${prompt}${nextMentions}` : `${prompt} ${nextMentions}`;
  }

  let nextPrompt = prompt;

  for (let index = mentionGroups.length - 1; index >= 0; index -= 1) {
    nextPrompt = replaceMentionGroup(
      nextPrompt,
      mentionGroups[index],
      index === 0 ? nextMentions : '',
    );
  }

  return nextPrompt;
}
