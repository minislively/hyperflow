// Generated from TypeScript source by tooling/sync-ts-artifacts.mjs. Do not edit directly.

export function drawVisibleBoxes(context, visibleBoxes, viewport, options = {}) {
    const canvasWidth = options.canvasWidth ?? viewport.width;
    const canvasHeight = options.canvasHeight ?? viewport.height;
    if (options.clear !== false && typeof context.clearRect === "function") {
        context.clearRect(0, 0, canvasWidth, canvasHeight);
    }
    context.fillStyle = options.fillStyle ?? "rgba(79, 70, 229, 0.20)";
    context.strokeStyle = options.strokeStyle ?? "#4f46e5";
    context.lineWidth = options.lineWidth ?? 1;
    for (const box of visibleBoxes){
        const screenX = (box.x - viewport.x) * viewport.zoom;
        const screenY = (box.y - viewport.y) * viewport.zoom;
        const width = box.width * viewport.zoom;
        const height = box.height * viewport.zoom;
        context.fillRect(screenX, screenY, width, height);
        context.strokeRect(screenX, screenY, width, height);
    }
    return visibleBoxes.length;
}
export function createMockContext() {
    return {
        drawCalls: [],
        clearRect (x, y, width, height) {
            this.drawCalls.push({
                type: "clearRect",
                args: [
                    x,
                    y,
                    width,
                    height
                ]
            });
        },
        fillRect (x, y, width, height) {
            this.drawCalls.push({
                type: "fillRect",
                args: [
                    x,
                    y,
                    width,
                    height
                ]
            });
        },
        strokeRect (x, y, width, height) {
            this.drawCalls.push({
                type: "strokeRect",
                args: [
                    x,
                    y,
                    width,
                    height
                ]
            });
        },
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1
    };
}
