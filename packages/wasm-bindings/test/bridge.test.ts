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

test("bridge resolves node anchors with the same-side fallback applied", async () => {
  const bridge = await bridgePromise;
  const resolved = bridge.resolveNodeAnchorsBatch([
    {
      x: 100,
      y: 100,
      width: 180,
      height: 96,
      inputToward: { x: 320, y: 120 },
      outputToward: { x: 360, y: 140 },
    },
  ]);

  assert.equal(resolved.length, 1);
  assert.notEqual(resolved[0].inputAnchor.side, resolved[0].outputAnchor.side);
});

test("bridge resolves node anchors with preferred editor-facing sides when requested", async () => {
  const bridge = await bridgePromise;
  const resolved = bridge.resolveNodeAnchorsBatch([
    {
      x: 100,
      y: 100,
      width: 180,
      height: 96,
      inputToward: { x: 190, y: 340 },
      outputToward: { x: 190, y: -100 },
      preferredInputSide: "left",
      preferredOutputSide: "right",
    },
  ]);

  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].inputAnchor.side, "left");
  assert.equal(resolved[0].outputAnchor.side, "right");
});

test("bridge resolves same-side edge anchors into distinct slots", async () => {
  const bridge = await bridgePromise;
  const resolved = bridge.resolveEdgeAnchorsBatch([
    {
      x: 0,
      y: 0,
      width: 180,
      height: 96,
      side: "right",
      slot: 0,
      slotCount: 2,
    },
    {
      x: 0,
      y: 0,
      width: 180,
      height: 96,
      side: "right",
      slot: 1,
      slotCount: 2,
    },
  ]);

  assert.equal(resolved.length, 2);
  assert.equal(resolved[0].side, "right");
  assert.equal(resolved[1].side, "right");
  assert.notEqual(resolved[0].y, resolved[1].y);
});

test("bridge resolves edge curves into cubic control points", async () => {
  const bridge = await bridgePromise;
  const resolved = bridge.resolveEdgeCurvesBatch([
    {
      sourceX: 10,
      sourceY: 20,
      targetX: 200,
      targetY: 100,
      sourceSide: "right",
      targetSide: "left",
    },
  ]);

  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].sourceX, 10);
  assert.equal(resolved[0].sourceY, 20);
  assert.equal(resolved[0].targetX, 200);
  assert.equal(resolved[0].targetY, 100);
  assert.ok(resolved[0].sourceControlX > resolved[0].sourceX);
  assert.ok(resolved[0].targetControlX < resolved[0].targetX);
});
