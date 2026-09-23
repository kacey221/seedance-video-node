export interface AgentBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function resizeAgentNode(
  box: AgentBox,
  delta: { deltaX: number; deltaY: number },
): AgentBox {
  return {
    ...box,
    width: Math.max(300, Math.round(box.width + delta.deltaX)),
    height: Math.max(360, Math.round(box.height + delta.deltaY)),
  };
}

export function getAgentTextScale(width: number): number {
  return Math.min(1.2, Math.max(1, Number((1 + (width - 300) / 1500).toFixed(2))));
}
