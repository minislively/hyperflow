// Generated from TypeScript source by tooling/sync-ts-artifacts.mjs. Do not edit directly.

const DEFAULT_WASM_URL = new URL("../../core-rs/target/wasm32-unknown-unknown/release/hyperflow_core.wasm", import.meta.url);
function isNodeRuntime() {
    return typeof process !== "undefined" && Boolean(process.versions?.node);
}
async function importNodeFsPromises() {
    const dynamicImport = new Function("specifier", "return import(specifier);");
    return dynamicImport("node:fs/promises");
}
async function loadWasmBytes(source = {}) {
    const wasmPathOrUrl = source.wasmPath ?? source.wasmUrl ?? DEFAULT_WASM_URL;
    if (isNodeRuntime()) {
        const fs = await importNodeFsPromises();
        const url = wasmPathOrUrl instanceof URL ? wasmPathOrUrl : new URL(wasmPathOrUrl, import.meta.url);
        return fs.readFile(url);
    }
    const response = await fetch(wasmPathOrUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch WASM module: ${response.status} ${response.statusText}`);
    }
    return new Uint8Array(await response.arrayBuffer());
}
function packNodes(nodes) {
    const packed = new Float32Array(nodes.length * 5);
    nodes.forEach((node, index)=>{
        const offset = index * 5;
        packed[offset] = Number(node.id);
        packed[offset + 1] = Number(node.x);
        packed[offset + 2] = Number(node.y);
        packed[offset + 3] = Number(node.width);
        packed[offset + 4] = Number(node.height);
    });
    return packed;
}
function packAnchorRequests(requests) {
    const packed = new Float32Array(requests.length * 11);
    requests.forEach((request, index)=>{
        const offset = index * 11;
        packed[offset] = Number(request.x);
        packed[offset + 1] = Number(request.y);
        packed[offset + 2] = Number(request.width);
        packed[offset + 3] = Number(request.height);
        packed[offset + 4] = Number(request.inputToward.x);
        packed[offset + 5] = Number(request.inputToward.y);
        packed[offset + 6] = Number(request.outputToward.x);
        packed[offset + 7] = Number(request.outputToward.y);
        packed[offset + 8] = Number(request.sameSideOffset ?? 18);
        packed[offset + 9] = request.preferredInputSide ? encodeAnchorSide(request.preferredInputSide) : -1;
        packed[offset + 10] = request.preferredOutputSide ? encodeAnchorSide(request.preferredOutputSide) : -1;
    });
    return packed;
}
function encodeAnchorSide(side) {
    switch(side){
        case "left":
            return 0;
        case "right":
            return 1;
        case "top":
            return 2;
        case "bottom":
            return 3;
    }
}
function packEdgePathRequests(requests) {
    const packed = new Float32Array(requests.length * 11);
    requests.forEach((request, index)=>{
        const offset = index * 11;
        packed[offset] = Number(request.sourceX);
        packed[offset + 1] = Number(request.sourceY);
        packed[offset + 2] = Number(request.targetX);
        packed[offset + 3] = Number(request.targetY);
        packed[offset + 4] = encodeAnchorSide(request.sourceSide);
        packed[offset + 5] = encodeAnchorSide(request.targetSide);
        packed[offset + 6] = Number(request.sourceSpread ?? 0);
        packed[offset + 7] = Number(request.targetSpread ?? 0);
        packed[offset + 8] = Number(request.bendOffsetX ?? 0);
        packed[offset + 9] = Number(request.bendOffsetY ?? 0);
        packed[offset + 10] = Number(request.minimumCurveOffset ?? 40);
    });
    return packed;
}
function packEdgeAnchorRequests(requests) {
    const packed = new Float32Array(requests.length * 8);
    requests.forEach((request, index)=>{
        const offset = index * 8;
        packed[offset] = Number(request.x);
        packed[offset + 1] = Number(request.y);
        packed[offset + 2] = Number(request.width);
        packed[offset + 3] = Number(request.height);
        packed[offset + 4] = encodeAnchorSide(request.side);
        packed[offset + 5] = Number(request.slot);
        packed[offset + 6] = Number(request.slotCount);
        packed[offset + 7] = Number(request.spreadStep ?? 18);
    });
    return packed;
}
function decodeAnchorSide(code) {
    switch(code){
        case 0:
            return "left";
        case 1:
            return "right";
        case 2:
            return "top";
        case 3:
            return "bottom";
        default:
            throw new Error(`Unknown HyperFlow anchor side code: ${code}`);
    }
}
export async function createHyperflowWasmBridge(options = {}) {
    const wasmBytes = await loadWasmBytes(options);
    const { instance } = await WebAssembly.instantiate(wasmBytes, {});
    const exports = instance.exports;
    if (!exports.memory) {
        throw new Error("The HyperFlow WASM module does not export memory.");
    }
    function copyInput(typedArray) {
        const bytes = new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
        const pointer = exports.alloc(bytes.byteLength);
        new Uint8Array(exports.memory.buffer, pointer, bytes.byteLength).set(bytes);
        return {
            pointer,
            byteLength: bytes.byteLength
        };
    }
    return {
        loadFixture (nodes) {
            const packed = packNodes(nodes);
            const { pointer, byteLength } = copyInput(packed);
            try {
                return exports.load_nodes(pointer, packed.length);
            } finally{
                exports.dealloc(pointer, byteLength);
            }
        },
        setViewport (viewport) {
            return exports.set_viewport(Number(viewport.x), Number(viewport.y), Number(viewport.width), Number(viewport.height), Number(viewport.zoom ?? 1));
        },
        getVisibleNodeIds () {
            const pointer = exports.visible_ids_ptr();
            const length = exports.visible_ids_len();
            if (length === 0) {
                return [];
            }
            return Array.from(new Uint32Array(exports.memory.buffer, pointer, length));
        },
        getVisibleBoxes () {
            const pointer = exports.visible_boxes_ptr();
            const length = exports.visible_boxes_len();
            if (length === 0) {
                return [];
            }
            const values = new Float32Array(exports.memory.buffer, pointer, length);
            const boxes = new Array(values.length / 5);
            for(let index = 0; index < values.length; index += 5){
                boxes[index / 5] = {
                    id: values[index],
                    x: values[index + 1],
                    y: values[index + 2],
                    width: values[index + 3],
                    height: values[index + 4]
                };
            }
            return boxes;
        },
        hitTest (point) {
            const result = exports.hit_test_at(Number(point.x), Number(point.y));
            return result >= 0 ? result : null;
        },
        getNodeCount () {
            return exports.node_count();
        },
        resolveNodeAnchorsBatch (requests) {
            if (requests.length === 0) return [];
            const packed = packAnchorRequests(requests);
            const { pointer, byteLength } = copyInput(packed);
            try {
                exports.resolve_node_anchors_batch(pointer, packed.length);
            } finally{
                exports.dealloc(pointer, byteLength);
            }
            const resultsPointer = exports.resolved_anchor_buffer_ptr();
            const resultsLength = exports.resolved_anchor_buffer_len();
            if (resultsLength !== requests.length * 6) {
                throw new Error(`Expected ${requests.length * 6} resolved anchor values, received ${resultsLength}.`);
            }
            const values = new Float32Array(exports.memory.buffer, resultsPointer, resultsLength);
            const resolved = new Array(requests.length);
            for(let index = 0; index < values.length; index += 6){
                resolved[index / 6] = {
                    inputAnchor: {
                        x: values[index],
                        y: values[index + 1],
                        side: decodeAnchorSide(values[index + 2])
                    },
                    outputAnchor: {
                        x: values[index + 3],
                        y: values[index + 4],
                        side: decodeAnchorSide(values[index + 5])
                    }
                };
            }
            return resolved;
        },
        resolveEdgeAnchorsBatch (requests) {
            if (requests.length === 0) return [];
            const packed = packEdgeAnchorRequests(requests);
            const { pointer, byteLength } = copyInput(packed);
            try {
                exports.resolve_edge_anchors_batch(pointer, packed.length);
            } finally{
                exports.dealloc(pointer, byteLength);
            }
            const resultsPointer = exports.resolved_edge_anchor_buffer_ptr();
            const resultsLength = exports.resolved_edge_anchor_buffer_len();
            if (resultsLength !== requests.length * 5) {
                throw new Error(`Expected ${requests.length * 5} resolved edge anchor values, received ${resultsLength}.`);
            }
            const values = new Float32Array(exports.memory.buffer, resultsPointer, resultsLength);
            const resolved = new Array(requests.length);
            for(let index = 0; index < values.length; index += 5){
                resolved[index / 5] = {
                    x: values[index],
                    y: values[index + 1],
                    side: decodeAnchorSide(values[index + 2]),
                    slot: values[index + 3] ?? 0,
                    slotCount: values[index + 4] ?? 1
                };
            }
            return resolved;
        },
        resolveEdgeCurvesBatch (requests) {
            if (requests.length === 0) return [];
            const packed = packEdgePathRequests(requests);
            const { pointer, byteLength } = copyInput(packed);
            try {
                exports.resolve_edge_curves_batch(pointer, packed.length);
            } finally{
                exports.dealloc(pointer, byteLength);
            }
            const resultsPointer = exports.resolved_edge_curve_buffer_ptr();
            const resultsLength = exports.resolved_edge_curve_buffer_len();
            if (resultsLength !== requests.length * 8) {
                throw new Error(`Expected ${requests.length * 8} resolved edge curve values, received ${resultsLength}.`);
            }
            const values = new Float32Array(exports.memory.buffer, resultsPointer, resultsLength);
            const resolved = new Array(requests.length);
            for(let index = 0; index < values.length; index += 8){
                resolved[index / 8] = {
                    sourceX: values[index],
                    sourceY: values[index + 1],
                    sourceControlX: values[index + 2],
                    sourceControlY: values[index + 3],
                    targetControlX: values[index + 4],
                    targetControlY: values[index + 5],
                    targetX: values[index + 6],
                    targetY: values[index + 7]
                };
            }
            return resolved;
        }
    };
}
