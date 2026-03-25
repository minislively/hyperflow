// Generated from TypeScript source by tooling/sync-ts-artifacts.mjs. Do not edit directly.

import { createHyperflowWasmBridge } from "../../wasm-bindings/src/index.js";
import { drawVisibleBoxes } from "../../renderer-canvas/src/index.js";
const POC_ANCHOR_SIDES = [
    "left",
    "right",
    "top",
    "bottom"
];
export function getPocNodeCenter(node) {
    return {
        x: node.position.x + node.size.width / 2,
        y: node.position.y + node.size.height / 2
    };
}
export function getPocNodeAnchorPoint(node, toward) {
    const center = getPocNodeCenter(node);
    const dx = toward.x - center.x;
    const dy = toward.y - center.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
        return dx >= 0 ? {
            x: node.position.x + node.size.width,
            y: center.y,
            side: "right"
        } : {
            x: node.position.x,
            y: center.y,
            side: "left"
        };
    }
    return dy >= 0 ? {
        x: center.x,
        y: node.position.y + node.size.height,
        side: "bottom"
    } : {
        x: center.x,
        y: node.position.y,
        side: "top"
    };
}
function getPocNodeAnchorPointForSide(node, side) {
    const center = getPocNodeCenter(node);
    switch(side){
        case "left":
            return {
                x: node.position.x,
                y: center.y,
                side
            };
        case "right":
            return {
                x: node.position.x + node.size.width,
                y: center.y,
                side
            };
        case "top":
            return {
                x: center.x,
                y: node.position.y,
                side
            };
        case "bottom":
            return {
                x: center.x,
                y: node.position.y + node.size.height,
                side
            };
    }
}
export function getPocOrthogonalAnchorPoint(node, side, toward) {
    const center = getPocNodeCenter(node);
    if (side === "left" || side === "right") {
        return toward.y >= center.y ? {
            x: center.x,
            y: node.position.y + node.size.height,
            side: "bottom"
        } : {
            x: center.x,
            y: node.position.y,
            side: "top"
        };
    }
    return toward.x >= center.x ? {
        x: node.position.x + node.size.width,
        y: center.y,
        side: "right"
    } : {
        x: node.position.x,
        y: center.y,
        side: "left"
    };
}
export function offsetPocAnchorWithinSide(anchor, node, offset) {
    const inset = 14;
    if (anchor.side === "left" || anchor.side === "right") {
        const minY = node.position.y + inset;
        const maxY = node.position.y + node.size.height - inset;
        return {
            ...anchor,
            y: Math.min(maxY, Math.max(minY, anchor.y + offset))
        };
    }
    const minX = node.position.x + inset;
    const maxX = node.position.x + node.size.width - inset;
    return {
        ...anchor,
        x: Math.min(maxX, Math.max(minX, anchor.x + offset))
    };
}
export function resolvePocEdgeAnchor(node, options) {
    const baseAnchor = getPocNodeAnchorPointForSide(node, options.side);
    const spreadStep = options.spreadStep ?? 18;
    const offset = (options.slot - (options.slotCount - 1) / 2) * spreadStep;
    const offsetAnchor = options.slotCount > 1 ? offsetPocAnchorWithinSide(baseAnchor, node, offset) : baseAnchor;
    return {
        ...offsetAnchor,
        slot: options.slot,
        slotCount: options.slotCount
    };
}
export function resolvePocLowLevelEdgeAnchorsBatch(requests) {
    return requests.map((request)=>resolvePocEdgeAnchor({
            id: 0,
            type: "default",
            position: {
                x: request.x,
                y: request.y
            },
            size: {
                width: request.width,
                height: request.height
            },
            data: {}
        }, {
            side: request.side,
            slot: request.slot,
            slotCount: request.slotCount,
            spreadStep: request.spreadStep
        }));
}
export function resolvePocNodeAnchors(node, options) {
    const sameSideOffset = options.sameSideOffset ?? 18;
    const center = getPocNodeCenter(node);
    function scoreAnchorSide(toward, side, role, preferredSide) {
        const anchor = getPocNodeAnchorPointForSide(node, side);
        const dx = toward.x - center.x;
        const dy = toward.y - center.y;
        const dominantAxis = Math.abs(dx) >= Math.abs(dy) ? "horizontal" : "vertical";
        const preferredDirectionalSide = dominantAxis === "horizontal" ? dx >= 0 ? "right" : "left" : dy >= 0 ? "bottom" : "top";
        const oppositeDirectionalSide = preferredDirectionalSide === "left" ? "right" : preferredDirectionalSide === "right" ? "left" : preferredDirectionalSide === "top" ? "bottom" : "top";
        const orthogonalPenalty = dominantAxis === "horizontal" ? side === "top" || side === "bottom" ? 18 : 0 : side === "left" || side === "right" ? 18 : 0;
        const oppositePenalty = side === oppositeDirectionalSide ? 42 : 0;
        const preferredPenalty = preferredSide && side !== preferredSide ? 36 : 0;
        const roleBiasPenalty = role === "input" ? side === "left" ? 0 : side === "top" || side === "bottom" ? 8 : 16 : side === "right" ? 0 : side === "top" || side === "bottom" ? 8 : 16;
        const distancePenalty = (Math.abs(anchor.x - toward.x) + Math.abs(anchor.y - toward.y)) * 0.12;
        return oppositePenalty + orthogonalPenalty + preferredPenalty + roleBiasPenalty + distancePenalty;
    }
    let bestScore = Number.POSITIVE_INFINITY;
    let bestInputAnchor = getPocNodeAnchorPoint(node, options.inputToward);
    let bestOutputAnchor = getPocNodeAnchorPoint(node, options.outputToward);
    for (const inputSide of POC_ANCHOR_SIDES){
        for (const outputSide of POC_ANCHOR_SIDES){
            const pairPenalty = inputSide === outputSide ? 64 : inputSide === "right" && outputSide === "left" ? 24 : 0;
            const score = pairPenalty + scoreAnchorSide(options.inputToward, inputSide, "input", options.preferredInputSide) + scoreAnchorSide(options.outputToward, outputSide, "output", options.preferredOutputSide);
            if (score >= bestScore) continue;
            bestScore = score;
            bestInputAnchor = getPocNodeAnchorPointForSide(node, inputSide);
            bestOutputAnchor = getPocNodeAnchorPointForSide(node, outputSide);
        }
    }
    let inputAnchor = bestInputAnchor;
    let outputAnchor = bestOutputAnchor;
    if (inputAnchor.side === outputAnchor.side) {
        inputAnchor = getPocOrthogonalAnchorPoint(node, inputAnchor.side, options.inputToward);
        outputAnchor = offsetPocAnchorWithinSide(outputAnchor, node, sameSideOffset);
    }
    return {
        inputAnchor,
        outputAnchor
    };
}
export function createPocEdgeSpreadMaps(nodes, edges, nodeAnchorsById, spreadStep = 18) {
    const sourceSpreadByEdgeId = new Map();
    const targetSpreadByEdgeId = new Map();
    const nodeById = new Map(nodes.map((node)=>[
            Number(node.id),
            node
        ]));
    const edgePositionMetric = (node, side)=>{
        const center = getPocNodeCenter(node);
        return side === "left" || side === "right" ? center.y : center.x;
    };
    const getCenteredSpread = (index, count)=>(index - (count - 1) / 2) * spreadStep;
    const outgoingBySource = new Map();
    const incomingByTarget = new Map();
    edges.forEach((edge)=>{
        const sourceId = Number(edge.source);
        const targetId = Number(edge.target);
        outgoingBySource.set(sourceId, [
            ...outgoingBySource.get(sourceId) ?? [],
            edge
        ]);
        incomingByTarget.set(targetId, [
            ...incomingByTarget.get(targetId) ?? [],
            edge
        ]);
    });
    outgoingBySource.forEach((group, sourceId)=>{
        const sourceAnchor = nodeAnchorsById.get(sourceId)?.outputAnchor;
        if (!sourceAnchor || group.length <= 1) return;
        group.slice().sort((left, right)=>{
            const leftTarget = nodeById.get(Number(left.target));
            const rightTarget = nodeById.get(Number(right.target));
            if (!leftTarget || !rightTarget) return 0;
            return edgePositionMetric(leftTarget, sourceAnchor.side) - edgePositionMetric(rightTarget, sourceAnchor.side);
        }).forEach((edge, index, ordered)=>{
            sourceSpreadByEdgeId.set(edge.id, getCenteredSpread(index, ordered.length));
        });
    });
    incomingByTarget.forEach((group, targetId)=>{
        const targetAnchor = nodeAnchorsById.get(targetId)?.inputAnchor;
        if (!targetAnchor || group.length <= 1) return;
        group.slice().sort((left, right)=>{
            const leftSource = nodeById.get(Number(left.source));
            const rightSource = nodeById.get(Number(right.source));
            if (!leftSource || !rightSource) return 0;
            return edgePositionMetric(leftSource, targetAnchor.side) - edgePositionMetric(rightSource, targetAnchor.side);
        }).forEach((edge, index, ordered)=>{
            targetSpreadByEdgeId.set(edge.id, getCenteredSpread(index, ordered.length));
        });
    });
    return {
        sourceSpreadByEdgeId,
        targetSpreadByEdgeId
    };
}
export function resolvePocEdgeAnchorsBatch(nodes, edges, nodeAnchorsById, resolveLowLevelAnchors = resolvePocLowLevelEdgeAnchorsBatch) {
    const nodeById = new Map(nodes.map((node)=>[
            Number(node.id),
            node
        ]));
    const sourceRequests = [];
    const sourceMeta = [];
    const targetRequests = [];
    const targetMeta = [];
    const edgePositionMetric = (node, side)=>{
        const center = getPocNodeCenter(node);
        return side === "left" || side === "right" ? center.y : center.x;
    };
    const outgoingGroups = new Map();
    const incomingGroups = new Map();
    edges.forEach((edge)=>{
        const sourceId = Number(edge.source);
        const targetId = Number(edge.target);
        const sourceSide = nodeAnchorsById.get(sourceId)?.outputAnchor.side;
        const targetSide = nodeAnchorsById.get(targetId)?.inputAnchor.side;
        if (!sourceSide || !targetSide) return;
        const outgoingKey = `${sourceId}:${sourceSide}`;
        const incomingKey = `${targetId}:${targetSide}`;
        outgoingGroups.set(outgoingKey, [
            ...outgoingGroups.get(outgoingKey) ?? [],
            edge
        ]);
        incomingGroups.set(incomingKey, [
            ...incomingGroups.get(incomingKey) ?? [],
            edge
        ]);
    });
    outgoingGroups.forEach((group, key)=>{
        const [sourceIdText, sourceSide] = key.split(":");
        const sourceId = Number(sourceIdText);
        const sourceNode = nodeById.get(sourceId);
        if (!sourceNode) return;
        group.slice().sort((left, right)=>{
            const leftTarget = nodeById.get(Number(left.target));
            const rightTarget = nodeById.get(Number(right.target));
            if (!leftTarget || !rightTarget) return 0;
            return edgePositionMetric(leftTarget, sourceSide) - edgePositionMetric(rightTarget, sourceSide);
        }).forEach((edge, index, ordered)=>{
            sourceRequests.push({
                x: sourceNode.position.x,
                y: sourceNode.position.y,
                width: sourceNode.size.width,
                height: sourceNode.size.height,
                side: sourceSide,
                slot: index,
                slotCount: ordered.length
            });
            sourceMeta.push(edge.id);
        });
    });
    incomingGroups.forEach((group, key)=>{
        const [targetIdText, targetSide] = key.split(":");
        const targetId = Number(targetIdText);
        const targetNode = nodeById.get(targetId);
        if (!targetNode) return;
        group.slice().sort((left, right)=>{
            const leftSource = nodeById.get(Number(left.source));
            const rightSource = nodeById.get(Number(right.source));
            if (!leftSource || !rightSource) return 0;
            return edgePositionMetric(leftSource, targetSide) - edgePositionMetric(rightSource, targetSide);
        }).forEach((edge, index, ordered)=>{
            targetRequests.push({
                x: targetNode.position.x,
                y: targetNode.position.y,
                width: targetNode.size.width,
                height: targetNode.size.height,
                side: targetSide,
                slot: index,
                slotCount: ordered.length
            });
            targetMeta.push(edge.id);
        });
    });
    const sourceAnchorsByEdgeId = new Map();
    resolveLowLevelAnchors(sourceRequests).forEach((anchor, index)=>{
        sourceAnchorsByEdgeId.set(sourceMeta[index], anchor);
    });
    const targetAnchorsByEdgeId = new Map();
    resolveLowLevelAnchors(targetRequests).forEach((anchor, index)=>{
        targetAnchorsByEdgeId.set(targetMeta[index], anchor);
    });
    return edges.map((edge)=>{
        const sourceAnchor = sourceAnchorsByEdgeId.get(edge.id);
        const targetAnchor = targetAnchorsByEdgeId.get(edge.id);
        if (!sourceAnchor || !targetAnchor) return null;
        return {
            edgeId: edge.id,
            sourceAnchor,
            targetAnchor
        };
    }).filter((entry)=>entry !== null);
}
export function buildSmoothPocEdgePath({ sourceX, sourceY, targetX, targetY, sourceSide, targetSide, sourceSpread = 0, targetSpread = 0, bendOffsetX, bendOffsetY, minimumCurveOffset = 40 }) {
    return buildPocSvgCurvePath(resolvePocSmoothEdgeCurve({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourceSide,
        targetSide,
        sourceSpread,
        targetSpread,
        bendOffsetX,
        bendOffsetY,
        minimumCurveOffset
    }));
}
export function resolvePocSmoothEdgeCurve({ sourceX, sourceY, targetX, targetY, sourceSide, targetSide, sourceSpread = 0, targetSpread = 0, bendOffsetX, bendOffsetY, minimumCurveOffset = 40 }) {
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const baseOffset = Math.max(minimumCurveOffset, Math.max(Math.abs(dx), Math.abs(dy)) * 0.28);
    function buildDirectionalControlPoint(x, y, side, spread, bendX = 0, bendY = 0) {
        switch(side){
            case "left":
                return {
                    x: x - baseOffset + bendX,
                    y: y + spread + bendY
                };
            case "right":
                return {
                    x: x + baseOffset + bendX,
                    y: y + spread + bendY
                };
            case "top":
                return {
                    x: x + spread + bendX,
                    y: y - baseOffset + bendY
                };
            case "bottom":
                return {
                    x: x + spread + bendX,
                    y: y + baseOffset + bendY
                };
        }
    }
    const bendInfluenceX = bendOffsetX ?? 0;
    const bendInfluenceY = bendOffsetY ?? 0;
    const sourceControl = buildDirectionalControlPoint(sourceX, sourceY, sourceSide, sourceSpread, bendInfluenceX * 0.16, bendInfluenceY * 0.34);
    const targetControl = buildDirectionalControlPoint(targetX, targetY, targetSide, targetSpread, bendInfluenceX * 0.16, bendInfluenceY * 0.34);
    return {
        sourceX,
        sourceY,
        sourceControlX: sourceControl.x,
        sourceControlY: sourceControl.y,
        targetControlX: targetControl.x,
        targetControlY: targetControl.y,
        targetX,
        targetY
    };
}
export function buildPocSvgCurvePath(curve) {
    return `M ${curve.sourceX} ${curve.sourceY} C ${curve.sourceControlX} ${curve.sourceControlY}, ${curve.targetControlX} ${curve.targetControlY}, ${curve.targetX} ${curve.targetY}`;
}
export function projectPocNodeToRuntimeNode(node) {
    return {
        id: Number(node.id),
        x: Number(node.position.x),
        y: Number(node.position.y),
        width: Number(node.size.width),
        height: Number(node.size.height)
    };
}
export function projectPocNodesToRuntimeNodes(nodes) {
    return nodes.map(projectPocNodeToRuntimeNode);
}
export function createPocViewport(width = 960, height = 540, overrides = {}) {
    return {
        x: 0,
        y: 0,
        width,
        height,
        zoom: 1,
        ...overrides
    };
}
export function createPocMetricsSummary(metrics) {
    return [
        `fixtureSize: ${metrics.fixtureSize}`,
        `visibleCount: ${metrics.visibleCount}`,
        `viewportUpdateMs: ${metrics.viewportUpdateMs.toFixed(3)}`,
        `renderMs: ${metrics.renderMs.toFixed(3)}`,
        `zoom: ${metrics.zoom.toFixed(2)}`,
        `viewport: (${metrics.x.toFixed(1)}, ${metrics.y.toFixed(1)})`
    ].join("\n");
}
export async function createPocEngine(options = {}) {
    const bridgeFactory = options.bridgeFactory ?? createHyperflowWasmBridge;
    const renderer = options.renderer ?? drawVisibleBoxes;
    const now = options.now ?? (()=>performance.now());
    const bridge = await bridgeFactory(options.bridgeOptions ?? {});
    let fixtureSize = 0;
    let hasLoadedFixture = false;
    return {
        loadFixture (nodes) {
            fixtureSize = nodes.length;
            hasLoadedFixture = true;
            return bridge.loadFixture(nodes);
        },
        renderFrame (context, viewport, renderOptions = {}) {
            if (!hasLoadedFixture) {
                throw new Error("loadFixture(nodes) must be called before renderFrame().");
            }
            const viewportStart = now();
            const visibleCount = bridge.setViewport(viewport);
            const boxes = bridge.getVisibleBoxes();
            const viewportUpdateMs = now() - viewportStart;
            const renderStart = now();
            renderer(context, boxes, viewport, {
                clear: true,
                canvasWidth: renderOptions.canvasWidth ?? viewport.width,
                canvasHeight: renderOptions.canvasHeight ?? viewport.height,
                ...renderOptions
            });
            const renderMs = now() - renderStart;
            return {
                boxes,
                metrics: {
                    fixtureSize,
                    visibleCount,
                    viewportUpdateMs,
                    renderMs,
                    zoom: viewport.zoom,
                    x: viewport.x,
                    y: viewport.y
                }
            };
        },
        hitTest (worldPoint) {
            return bridge.hitTest(worldPoint);
        },
        getVisibleNodeIds () {
            return bridge.getVisibleNodeIds();
        },
        getVisibleBoxes () {
            return bridge.getVisibleBoxes();
        },
        getNodeCount () {
            return bridge.getNodeCount();
        },
        resolveNodeAnchorsBatch (requests) {
            return bridge.resolveNodeAnchorsBatch(requests);
        },
        resolveEdgeAnchorsBatch (requests) {
            return bridge.resolveEdgeAnchorsBatch(requests);
        },
        resolveEdgeCurvesBatch (requests) {
            return bridge.resolveEdgeCurvesBatch(requests);
        }
    };
}
