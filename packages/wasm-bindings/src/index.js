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
        }
    };
}
