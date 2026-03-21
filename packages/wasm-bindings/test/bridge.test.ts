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

test("bridge keeps visible ids and boxes aligned across successive viewport updates", async () => {
  const bridge = await bridgePromise;
  bridge.loadFixture(getFixture(100));

  const firstViewport = getDefaultViewport();
  const secondViewport = {
    ...firstViewport,
    x: firstViewport.x + 280,
    y: firstViewport.y + 120,
    zoom: 1.12,
  };

  const firstVisibleCount = bridge.setViewport(firstViewport);
  const firstVisibleIds = bridge.getVisibleNodeIds();
  const firstVisibleBoxes = bridge.getVisibleBoxes();

  assert.equal(firstVisibleCount, firstVisibleIds.length);
  assert.equal(firstVisibleBoxes.length, firstVisibleIds.length);
  assert.deepEqual(firstVisibleBoxes.map((box) => box.id), firstVisibleIds);

  const secondVisibleCount = bridge.setViewport(secondViewport);
  const secondVisibleIds = bridge.getVisibleNodeIds();
  const secondVisibleBoxes = bridge.getVisibleBoxes();

  assert.equal(secondVisibleCount, secondVisibleIds.length);
  assert.equal(secondVisibleBoxes.length, secondVisibleIds.length);
  assert.deepEqual(secondVisibleBoxes.map((box) => box.id), secondVisibleIds);
  assert.notDeepEqual(secondVisibleIds, firstVisibleIds);
});
