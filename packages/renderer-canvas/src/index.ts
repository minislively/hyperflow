export type VisibleBoxLike = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ViewportLike = {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
};

export type CanvasRenderOptions = {
  clear?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
  fillStyle?: string;
  strokeStyle?: string;
  lineWidth?: number;
};

export type CanvasLikeContext = {
  clearRect?: (x: number, y: number, width: number, height: number) => void;
  fillRect: (x: number, y: number, width: number, height: number) => void;
  strokeRect: (x: number, y: number, width: number, height: number) => void;
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
};

export type MockDrawCall = {
  type: "clearRect" | "fillRect" | "strokeRect";
  args: [number, number, number, number];
};

export type MockContext = CanvasLikeContext & {
  drawCalls: MockDrawCall[];
};

export function drawVisibleBoxes(
  context: CanvasLikeContext,
  visibleBoxes: VisibleBoxLike[],
  viewport: ViewportLike,
  options: CanvasRenderOptions = {},
): number {
  const canvasWidth = options.canvasWidth ?? viewport.width;
  const canvasHeight = options.canvasHeight ?? viewport.height;

  if (options.clear !== false && typeof context.clearRect === "function") {
    context.clearRect(0, 0, canvasWidth, canvasHeight);
  }

  context.fillStyle = options.fillStyle ?? "rgba(79, 70, 229, 0.20)";
  context.strokeStyle = options.strokeStyle ?? "#4f46e5";
  context.lineWidth = options.lineWidth ?? 1;

  for (const box of visibleBoxes) {
    const screenX = (box.x - viewport.x) * viewport.zoom;
    const screenY = (box.y - viewport.y) * viewport.zoom;
    const width = box.width * viewport.zoom;
    const height = box.height * viewport.zoom;

    context.fillRect(screenX, screenY, width, height);
    context.strokeRect(screenX, screenY, width, height);
  }

  return visibleBoxes.length;
}

export function createMockContext(): MockContext {
  return {
    drawCalls: [],
    clearRect(x, y, width, height) {
      this.drawCalls.push({ type: "clearRect", args: [x, y, width, height] });
    },
    fillRect(x, y, width, height) {
      this.drawCalls.push({ type: "fillRect", args: [x, y, width, height] });
    },
    strokeRect(x, y, width, height) {
      this.drawCalls.push({ type: "strokeRect", args: [x, y, width, height] });
    },
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
  };
}
