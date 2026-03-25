import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPocSvgCurvePath,
  buildSmoothPocEdgePath,
  createPocEdgePathResolutionRequest,
  createPocEdgeSpreadMaps,
  createPocEngine,
  createPocMetricsSummary,
  createPocViewport,
  getPocCenteredSlotSpread,
  getPocNodeCenter,
  projectPocNodeToRuntimeNode,
  projectPocNodesToRuntimeNodes,
  resolvePocEdgeAnchorsBatch,
  resolvePocEdgeCurveSpread,
  resolvePocSmoothEdgeCurve,
  resolvePocNodeAnchors,
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

test("resolvePocNodeAnchors keeps input and output from collapsing to the same side", () => {
  const anchors = resolvePocNodeAnchors(
    {
      id: 1,
      type: "default",
      position: { x: 100, y: 100 },
      size: { width: 180, height: 96 },
      data: { title: "Node A" },
    },
    {
      inputToward: { x: 320, y: 120 },
      outputToward: { x: 360, y: 140 },
    },
  );

  assert.notEqual(anchors.inputAnchor.side, anchors.outputAnchor.side);
});

test("resolvePocNodeAnchors can honor preferred left/right sides for editor readability", () => {
  const anchors = resolvePocNodeAnchors(
    {
      id: 1,
      type: "default",
      position: { x: 100, y: 100 },
      size: { width: 180, height: 96 },
      data: { title: "Node A" },
    },
    {
      inputToward: { x: 190, y: 340 },
      outputToward: { x: 190, y: -100 },
      preferredInputSide: "left",
      preferredOutputSide: "right",
    },
  );

  assert.equal(anchors.inputAnchor.side, "left");
  assert.equal(anchors.outputAnchor.side, "right");
});

test("createPocEdgeSpreadMaps fans out same-side siblings", () => {
  const nodes = [
    {
      id: 1,
      type: "default",
      position: { x: 0, y: 0 },
      size: { width: 180, height: 96 },
      data: { title: "A" },
    },
    {
      id: 2,
      type: "default",
      position: { x: 260, y: -60 },
      size: { width: 180, height: 96 },
      data: { title: "B" },
    },
    {
      id: 3,
      type: "default",
      position: { x: 260, y: 80 },
      size: { width: 180, height: 96 },
      data: { title: "C" },
    },
  ] as const;

  const anchorMap = new Map(
    nodes.map((node) => {
      const center = getPocNodeCenter(node);
      return [
        Number(node.id),
        resolvePocNodeAnchors(node, {
          inputToward: { x: center.x - 1, y: center.y },
          outputToward: { x: center.x + 1, y: center.y },
        }),
      ] as const;
    }),
  );

  const { sourceSpreadByEdgeId } = createPocEdgeSpreadMaps(
    nodes.slice(),
    [
      { id: "e-1-2", source: 1, target: 2 },
      { id: "e-1-3", source: 1, target: 3 },
    ],
    anchorMap,
  );

  assert.notEqual(sourceSpreadByEdgeId.get("e-1-2"), sourceSpreadByEdgeId.get("e-1-3"));
});

test("resolvePocEdgeAnchorsBatch keeps same-side siblings on distinct anchors", () => {
  const nodes = [
    {
      id: 1,
      type: "default",
      position: { x: 0, y: 0 },
      size: { width: 180, height: 96 },
      data: { title: "A" },
    },
    {
      id: 2,
      type: "default",
      position: { x: 260, y: -60 },
      size: { width: 180, height: 96 },
      data: { title: "B" },
    },
    {
      id: 3,
      type: "default",
      position: { x: 260, y: 80 },
      size: { width: 180, height: 96 },
      data: { title: "C" },
    },
  ] as const;

  const anchorMap = new Map(
    nodes.map((node) => {
      const center = getPocNodeCenter(node);
      return [
        Number(node.id),
        resolvePocNodeAnchors(node, {
          inputToward: { x: center.x - 1, y: center.y },
          outputToward: { x: center.x + 1, y: center.y },
        }),
      ] as const;
    }),
  );

  const resolved = resolvePocEdgeAnchorsBatch(
    nodes.slice(),
    [
      { id: "e-1-2", source: 1, target: 2 },
      { id: "e-1-3", source: 1, target: 3 },
    ],
    anchorMap,
  );

  assert.equal(resolved.length, 2);
  assert.equal(resolved[0]!.sourceAnchor.side, "right");
  assert.equal(resolved[1]!.sourceAnchor.side, "right");
  assert.notEqual(resolved[0]!.sourceAnchor.y, resolved[1]!.sourceAnchor.y);
});

test("resolvePocEdgeCurveSpread centers slot-based offsets", () => {
  assert.equal(getPocCenteredSlotSpread(0, 2, 18), -9);
  assert.equal(getPocCenteredSlotSpread(1, 2, 18), 9);
  assert.equal(resolvePocEdgeCurveSpread({ spread: 99, slot: 0, slotCount: 2, spreadStep: 18 }), -9);
});

test("createPocEdgePathResolutionRequest carries per-edge slot metadata into curve requests", () => {
  const request = createPocEdgePathResolutionRequest({
    sourceAnchor: { x: 10, y: 20, side: "right", slot: 0, slotCount: 2 },
    targetAnchor: { x: 200, y: 100, side: "left", slot: 1, slotCount: 2 },
  });

  assert.equal(request.sourceSlot, 0);
  assert.equal(request.sourceSlotCount, 2);
  assert.equal(request.targetSlot, 1);
  assert.equal(request.targetSlotCount, 2);
  assert.equal(request.spreadStep, 18);
});

test("buildSmoothPocEdgePath returns a cubic curve path", () => {
  const path = buildSmoothPocEdgePath({
    sourceX: 10,
    sourceY: 20,
    targetX: 200,
    targetY: 100,
    sourceSide: "right",
    targetSide: "left",
  });

  assert.match(path, /^M 10 20 C /);
  assert.match(path, /, .* 200 100$/);
});

test("resolvePocSmoothEdgeCurve returns cubic control points without moving endpoints", () => {
  const curve = resolvePocSmoothEdgeCurve(
    createPocEdgePathResolutionRequest({
      sourceAnchor: { x: 10, y: 20, side: "right", slot: 0, slotCount: 2 },
      targetAnchor: { x: 200, y: 100, side: "left", slot: 1, slotCount: 2 },
    }),
  );

  assert.equal(curve.sourceX, 10);
  assert.equal(curve.sourceY, 20);
  assert.equal(curve.targetX, 200);
  assert.equal(curve.targetY, 100);
  assert.ok(curve.sourceControlX > curve.sourceX);
  assert.ok(curve.targetControlX < curve.targetX);
  assert.notEqual(curve.sourceControlY, curve.targetControlY);
});

test("buildPocSvgCurvePath formats a resolved curve as an svg cubic path", () => {
  const path = buildPocSvgCurvePath({
    sourceX: 10,
    sourceY: 20,
    sourceControlX: 40,
    sourceControlY: 20,
    targetControlX: 160,
    targetControlY: 100,
    targetX: 200,
    targetY: 100,
  });

  assert.equal(path, "M 10 20 C 40 20, 160 100, 200 100");
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
      resolveNodeAnchorsBatch() {
        return [];
      },
      resolveEdgeAnchorsBatch() {
        return [];
      },
      resolveEdgeCurvesBatch() {
        return [];
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
