import test from "node:test";
import assert from "node:assert/strict";

import { createHyperflowWasmBridge } from "../src/index.js";
import { getDefaultViewport, getFixture } from "../../../benchmarks/fixtures.js";

const bridgePromise = createHyperflowWasmBridge();

test("bridge loads fixture data and returns visible node ids", async () => {
  const bridge = await bridgePromise;
  const fixture = getFixture(100);
  const loaded = bridge.loadFixture(fixture);

  assert.equal(loaded, 100);
  assert.equal(bridge.getNodeCount(), 100);

  const visibleCount = bridge.setViewport(getDefaultViewport());
  const visibleIds = bridge.getVisibleNodeIds();

  assert.equal(visibleCount, visibleIds.length);
  assert.ok(visibleIds.length > 0);
  assert.ok(visibleIds.every((id) => Number.isInteger(id)));
});

test("bridge hit testing returns a node id when the point intersects a visible node", async () => {
  const bridge = await bridgePromise;
  bridge.loadFixture(getFixture(100));
  bridge.setViewport(getDefaultViewport());

  const hit = bridge.hitTest({ x: 12, y: 12 });
  const miss = bridge.hitTest({ x: 100000, y: 100000 });

  assert.equal(hit, 1);
  assert.equal(miss, null);
});
