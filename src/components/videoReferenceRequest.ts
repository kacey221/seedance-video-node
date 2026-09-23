import type { ConnectedReferenceItem } from './referenceConnections';
import { parseVideoReferenceDirectives } from './videoReferenceDirectives';

export type VideoGenerationMode = 'text-to-video' | 'image-to-video';

export interface VideoReferenceSource {
  labelNumber: number;
  src: string;
}

export interface VideoGenerationReferencePayload {
  firstFrame?: VideoReferenceSource;
  lastFrame?: VideoReferenceSource;
  generalReferences: VideoReferenceSource[];
  referenceSummary: string;
}

interface BuildVideoGenerationReferencePayloadParams {
  prompt: string;
  connectedReferences: ConnectedReferenceItem[];
  mode: VideoGenerationMode;
}

export async function buildVideoGenerationReferencePayload(
  params: BuildVideoGenerationReferencePayloadParams,
): Promise<VideoGenerationReferencePayload> {
  const directives = parseVideoReferenceDirectives(params.prompt);
  const connectedReferenceMap = new Map(
    params.connectedReferences.map((item) => [item.labelNumber, item]),
  );

  if (params.mode === 'image-to-video' && directives.firstFrameNumber === undefined) {
    throw new Error('Image-to-video requires a [首帧] reference');
  }

  const firstFrame = createReferenceSource(
    directives.firstFrameNumber,
    connectedReferenceMap,
  );
  const lastFrame = createReferenceSource(
    directives.lastFrameNumber,
    connectedReferenceMap,
  );
  const generalReferences = directives.generalReferenceNumbers.map((labelNumber) =>
    createReferenceSource(labelNumber, connectedReferenceMap),
  );

  return {
    firstFrame,
    lastFrame,
    generalReferences,
    referenceSummary: buildReferenceSummary({
      generalReferenceNumbers: directives.generalReferenceNumbers,
      firstFrameNumber: directives.firstFrameNumber,
      lastFrameNumber: directives.lastFrameNumber,
    }),
  };
}

function createReferenceSource(
  labelNumber: number | undefined,
  connectedReferenceMap: Map<number, ConnectedReferenceItem>,
): VideoReferenceSource | undefined {
  if (labelNumber === undefined) {
    return undefined;
  }

  const connectedReference = connectedReferenceMap.get(labelNumber);
  if (!connectedReference) {
    throw new Error(`Missing connected reference @参考图${labelNumber}`);
  }

  const { src } = connectedReference.reference;
  if (!src) {
    throw new Error(`Connected reference @参考图${labelNumber} is missing a src`);
  }

  return {
    labelNumber,
    src,
  };
}

function buildReferenceSummary({
  generalReferenceNumbers,
  firstFrameNumber,
  lastFrameNumber,
}: {
  generalReferenceNumbers: number[];
  firstFrameNumber?: number;
  lastFrameNumber?: number;
}): string {
  const summaryParts = [
    ...generalReferenceNumbers.map((labelNumber) => `@参考图${labelNumber}`),
  ];

  if (firstFrameNumber !== undefined) {
    summaryParts.push(`@参考图${firstFrameNumber}[首帧]`);
  }

  if (lastFrameNumber !== undefined) {
    summaryParts.push(`@参考图${lastFrameNumber}[尾帧]`);
  }

  return summaryParts.join(' ');
}
