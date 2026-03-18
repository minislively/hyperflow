import test from "node:test";
import assert from "node:assert/strict";

import { createMockContext, drawVisibleBoxes } from "../src/index.js";

test("drawVisibleBoxes draws one fill and stroke per visible box", () => {
  const context = createMockContext();
  const count = drawVisibleBoxes(
    context,
    [
      { id: 1, x: 0, y: 0, width: 100, height: 50 },
      { id: 2, x: 120, y: 10, width: 80, height: 40 },
    ],
    { x: 0, y: 0, width: 400, height: 300, zoom: 1 },
  );

  assert.equal(count, 2);
  assert.equal(context.drawCalls.filter((call) => call.type === "fillRect").length, 2);
  assert.equal(context.drawCalls.filter((call) => call.type === "strokeRect").length, 2);
});
