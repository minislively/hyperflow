import test from "node:test";
import assert from "node:assert/strict";

import {
  createPocEngine,
  createPocMetricsSummary,
  createPocViewport,
  projectPocNodeToRuntimeNode,
  projectPocNodesToRuntimeNodes,
  type PocRuntimeNode,
} from "../src/index.js";

test("createPocViewport returns defaults with overrides", () => {
  const viewport = createPocViewport(800, 600, { zoom: 2, x: 10 });

  assert.deepEqual(viewport, { x: 10, y: 0, width: 800, height: 600, zoom: 2 });
});

test("createPocMetricsSummary formats stable metric lines", () => {
  const summary = createPocMetricsSummary({
    fixtureSize: 100,
    visibleCount: 63,
    viewportUpdateMs: 0.25,
    renderMs: 0.13,
    zoom: 1,
    x: 0,
    y: 0,
  });

  assert.match(summary, /fixtureSize: 100/);
  assert.match(summary, /visibleCount: 63/);
  assert.match(summary, /viewportUpdateMs: 0.250/);
});

test("projectPocNodeToRuntimeNode projects editor-friendly nodes into runtime geometry", () => {
  const runtimeNode = projectPocNodeToRuntimeNode({
    id: 7,
    type: "default",
    position: { x: 120, y: 80 },
    size: { width: 180, height: 96 },
    data: { title: "Node A" },
  });

  assert.deepEqual(runtimeNode, {
    id: 7,
    x: 120,
    y: 80,
    width: 180,
    height: 96,
  });
});

test("projectPocNodesToRuntimeNodes preserves order", () => {
  const runtimeNodes = projectPocNodesToRuntimeNodes([
    {
      id: 1,
      type: "input",
      position: { x: 0, y: 0 },
      size: { width: 100, height: 80 },
      data: { title: "Node A" },
    },
    {
      id: 2,
      type: "output",
      position: { x: 140, y: 40 },
      size: { width: 120, height: 90 },
      data: { title: "Node B" },
    },
  ]);

  assert.deepEqual(runtimeNodes.map((node) => node.id), [1, 2]);
  assert.deepEqual(runtimeNodes[1], {
    id: 2,
    x: 140,
    y: 40,
    width: 120,
    height: 90,
  });
});

test("createPocEngine renders through injected bridge and renderer", async () => {
  const calls: Array<[string, number]> = [];
  const engine = await createPocEngine({
    now: (() => {
      let tick = 0;
      return () => ++tick;
    })(),
    bridgeFactory: async () => ({
      loadFixture(nodes: PocRuntimeNode[]) {
        calls.push(["loadFixture", nodes.length]);
        return nodes.length;
      },
      setViewport(viewport) {
        calls.push(["setViewport", viewport.zoom]);
        return 2;
      },
      getVisibleBoxes() {
        return [
          { id: 1, x: 0, y: 0, width: 10, height: 10 },
          { id: 2, x: 20, y: 20, width: 10, height: 10 },
        ];
      },
      getVisibleNodeIds() {
        return [1, 2];
      },
      getNodeCount() {
        return 3;
      },
      hitTest() {
        return 2;
      },
    }),
    renderer(context, boxes) {
      (context as { boxes?: PocRuntimeNode[] }).boxes = boxes;
    },
  });

  const viewport = createPocViewport();
  const fixture: PocRuntimeNode[] = [
    { id: 1, x: 0, y: 0, width: 10, height: 10 },
    { id: 2, x: 20, y: 20, width: 10, height: 10 },
    { id: 3, x: 40, y: 40, width: 10, height: 10 },
  ];
  engine.loadFixture(fixture);
  const context = {} as { boxes?: PocRuntimeNode[] };
  const frame = engine.renderFrame(context as never, viewport);

  assert.equal(frame.metrics.fixtureSize, 3);
  assert.equal(frame.metrics.visibleCount, 2);
  assert.equal(frame.metrics.viewportUpdateMs, 1);
  assert.equal(frame.metrics.renderMs, 1);
  assert.equal(context.boxes?.length, 2);
  assert.equal(engine.hitTest({ x: 0, y: 0 }), 2);
  assert.deepEqual(calls[0], ["loadFixture", 3]);
});
