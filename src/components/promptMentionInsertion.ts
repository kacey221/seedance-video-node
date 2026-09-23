export interface PromptMentionEditResult {
  nextPrompt: string;
  nextSelectionStart: number;
  nextSelectionEnd: number;
}

export interface PromptMentionSelection {
  selectionStart: number;
  selectionEnd: number;
}

interface InsertMentionAtSelectionParams {
  prompt: string;
  mention: string;
  selectionStart?: number;
  selectionEnd?: number;
  skipIfAlreadyPresent?: boolean;
}

interface ReplaceActiveMentionQueryParams {
  prompt: string;
  mention: string;
  selectionStart?: number;
  selectionEnd?: number;
}

export function insertMentionAtSelection(
  params: InsertMentionAtSelectionParams,
): PromptMentionEditResult {
  const existingMention = params.mention.trim();
  if (params.skipIfAlreadyPresent && params.prompt.includes(existingMention)) {
    return keepPromptWithSelection(
      params.prompt,
      params.selectionStart,
      params.selectionEnd,
    );
  }

  const selection = normalizeSelection(
    params.prompt,
    params.selectionStart,
    params.selectionEnd,
  );

  if (!selection) {
    const suffix = params.mention.trimEnd();
    const nextPrompt = params.prompt.trim()
      ? `${params.prompt.trimEnd()} ${suffix}`
      : suffix;
    return {
      nextPrompt,
      nextSelectionStart: nextPrompt.length,
      nextSelectionEnd: nextPrompt.length,
    };
  }

  const nextPrompt =
    params.prompt.slice(0, selection.selectionStart) +
    params.mention +
    params.prompt.slice(selection.selectionEnd);
  const nextSelection = selection.selectionStart + params.mention.length;

  return {
    nextPrompt,
    nextSelectionStart: nextSelection,
    nextSelectionEnd: nextSelection,
  };
}

export function replaceActiveMentionQuery(
  params: ReplaceActiveMentionQueryParams,
): PromptMentionEditResult {
  const selection = normalizeSelection(
    params.prompt,
    params.selectionStart,
    params.selectionEnd,
  );

  if (!selection) {
    return insertMentionAtSelection(params);
  }

  const mentionBounds = findActiveMentionBounds(params.prompt, selection);
  if (!mentionBounds) {
    return insertMentionAtSelection(params);
  }

  const nextPrompt =
    params.prompt.slice(0, mentionBounds.selectionStart) +
    params.mention +
    params.prompt.slice(mentionBounds.selectionEnd);
  const nextSelection = mentionBounds.selectionStart + params.mention.length;

  return {
    nextPrompt,
    nextSelectionStart: nextSelection,
    nextSelectionEnd: nextSelection,
  };
}

function normalizeSelection(
  prompt: string,
  selectionStart?: number,
  selectionEnd?: number,
): PromptMentionSelection | undefined {
  if (
    typeof selectionStart !== 'number' ||
    Number.isNaN(selectionStart) ||
    typeof selectionEnd !== 'number' ||
    Number.isNaN(selectionEnd)
  ) {
    return undefined;
  }

  const promptLength = prompt.length;
  const start = Math.max(0, Math.min(promptLength, selectionStart));
  const end = Math.max(start, Math.min(promptLength, selectionEnd));

  return {
    selectionStart: start,
    selectionEnd: end,
  };
}

function keepPromptWithSelection(
  prompt: string,
  selectionStart?: number,
  selectionEnd?: number,
): PromptMentionEditResult {
  const selection = normalizeSelection(prompt, selectionStart, selectionEnd);
  const cursor = selection?.selectionEnd ?? prompt.length;

  return {
    nextPrompt: prompt,
    nextSelectionStart: cursor,
    nextSelectionEnd: cursor,
  };
}

function findActiveMentionBounds(
  prompt: string,
  selection: PromptMentionSelection,
): PromptMentionSelection | undefined {
  const cursor = selection.selectionStart;
  const atIndex = prompt.lastIndexOf('@', Math.max(0, cursor - 1));
  if (atIndex === -1) {
    return undefined;
  }

  const betweenAtAndCursor = prompt.slice(atIndex + 1, cursor);
  if ([...betweenAtAndCursor].some(isMentionBoundaryCharacter)) {
    return undefined;
  }

  let tokenEnd = Math.max(selection.selectionEnd, cursor);
  while (
    tokenEnd < prompt.length &&
    !isMentionBoundaryCharacter(prompt[tokenEnd])
  ) {
    tokenEnd += 1;
  }

  return {
    selectionStart: atIndex,
    selectionEnd: tokenEnd,
  };
}

function isMentionBoundaryCharacter(value: string): boolean {
  return /[\s,.;:!?，。！？、（）()[\]{}<>《》"“”'‘’]/u.test(value);
}
