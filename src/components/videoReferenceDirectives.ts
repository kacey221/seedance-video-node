export type VideoReferenceDirectives = {
  generalReferenceNumbers: number[];
  firstFrameNumber?: number;
  lastFrameNumber?: number;
};

const FIRST_FRAME_TAG = '[\u9996\u5e27]';
const LAST_FRAME_TAG = '[\u5c3e\u5e27]';
const FIRST_FRAME_DIRECTIVE_PATTERN = /@\u53c2\u8003\u56fe\s*\d+\s*\[\u9996\u5e27\]/gu;
const LAST_FRAME_DIRECTIVE_PATTERN = /@\u53c2\u8003\u56fe\s*\d+\s*\[\u5c3e\u5e27\]/gu;
const VIDEO_REFERENCE_DIRECTIVE_PATTERN =
  /@\u53c2\u8003\u56fe\s*(\d+)(?:\s*(\[\u9996\u5e27\]|\[\u5c3e\u5e27\]))?/gu;

export function parseVideoReferenceDirectives(prompt: string): VideoReferenceDirectives {
  validateVideoReferenceRoles(prompt);

  const generalReferenceNumbers: number[] = [];
  const seenGeneralReferenceNumbers = new Set<number>();
  let firstFrameNumber: number | undefined;
  let lastFrameNumber: number | undefined;

  for (const match of prompt.matchAll(VIDEO_REFERENCE_DIRECTIVE_PATTERN)) {
    const labelNumber = Number(match[1]);
    const directiveTag = match[2];
    if (directiveTag === FIRST_FRAME_TAG) {
      firstFrameNumber = labelNumber;
      continue;
    }

    if (directiveTag === LAST_FRAME_TAG) {
      lastFrameNumber = labelNumber;
      continue;
    }

    if (seenGeneralReferenceNumbers.has(labelNumber)) {
      continue;
    }

    seenGeneralReferenceNumbers.add(labelNumber);
    generalReferenceNumbers.push(labelNumber);
  }

  return {
    generalReferenceNumbers,
    firstFrameNumber,
    lastFrameNumber,
  };
}

function validateVideoReferenceRoles(prompt: string): void {
  if (countMatches(prompt, FIRST_FRAME_DIRECTIVE_PATTERN) > 1) {
    throw new Error(`Duplicate ${FIRST_FRAME_TAG} directive`);
  }

  if (countMatches(prompt, LAST_FRAME_DIRECTIVE_PATTERN) > 1) {
    throw new Error(`Duplicate ${LAST_FRAME_TAG} directive`);
  }
}

function countMatches(prompt: string, pattern: RegExp): number {
  return prompt.match(pattern)?.length ?? 0;
}
