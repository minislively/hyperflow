const DEFAULT_WASM_URL = new URL("../../core-rs/target/wasm32-unknown-unknown/release/hyperflow_core.wasm", import.meta.url);

export type HyperflowNode = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HyperflowViewport = {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
};

export type HyperflowPoint = {
  x: number;
  y: number;
};

export type HyperflowWasmSourceOptions = {
  wasmPath?: string | URL;
  wasmUrl?: string | URL;
};

type NodeFsPromises = {
  readFile(path: string | URL): Promise<Uint8Array>;
};

type WasmExports = {
  memory: WebAssembly.Memory;
  alloc(byteLength: number): number;
  dealloc(pointer: number, byteLength: number): void;
  load_nodes(pointer: number, length: number): number;
  set_viewport(x: number, y: number, width: number, height: number, zoom: number): number;
  visible_ids_ptr(): number;
  visible_ids_len(): number;
  visible_boxes_ptr(): number;
  visible_boxes_len(): number;
  hit_test_at(x: number, y: number): number;
  node_count(): number;
};

export type HyperflowWasmBridge = {
  loadFixture(nodes: HyperflowNode[]): number;
  setViewport(viewport: HyperflowViewport): number;
  getVisibleNodeIds(): number[];
  getVisibleBoxes(): HyperflowNode[];
  hitTest(point: HyperflowPoint): number | null;
  getNodeCount(): number;
};

function isNodeRuntime(): boolean {
  return typeof process !== "undefined" && Boolean(process.versions?.node);
}

async function importNodeFsPromises(): Promise<NodeFsPromises> {
  const dynamicImport = new Function("specifier", "return import(specifier);") as (specifier: string) => Promise<NodeFsPromises>;
  return dynamicImport("node:fs/promises");
}

async function loadWasmBytes(source: HyperflowWasmSourceOptions = {}): Promise<BufferSource> {
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

function packNodes(nodes: HyperflowNode[]): Float32Array {
  const packed = new Float32Array(nodes.length * 5);
  nodes.forEach((node, index) => {
    const offset = index * 5;
    packed[offset] = Number(node.id);
    packed[offset + 1] = Number(node.x);
    packed[offset + 2] = Number(node.y);
    packed[offset + 3] = Number(node.width);
    packed[offset + 4] = Number(node.height);
  });
  return packed;
}

function cloneTypedArray<TArray extends Float32Array | Uint32Array>(
  Type: { new (buffer: ArrayBufferLike, byteOffset: number, length: number): TArray; new (array: TArray): TArray },
  memory: WebAssembly.Memory,
  pointer: number,
  length: number,
): TArray {
  const view = new Type(memory.buffer, pointer, length);
  return new Type(view);
}

export async function createHyperflowWasmBridge(options: HyperflowWasmSourceOptions = {}): Promise<HyperflowWasmBridge> {
  const wasmBytes = await loadWasmBytes(options);
  const { instance } = await WebAssembly.instantiate(wasmBytes, {});
  const exports = instance.exports as unknown as WasmExports;

  if (!exports.memory) {
    throw new Error("The HyperFlow WASM module does not export memory.");
  }

  function copyInput(typedArray: Float32Array): { pointer: number; byteLength: number } {
    const bytes = new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
    const pointer = exports.alloc(bytes.byteLength);
    new Uint8Array(exports.memory.buffer, pointer, bytes.byteLength).set(bytes);
    return { pointer, byteLength: bytes.byteLength };
  }

  return {
    loadFixture(nodes) {
      const packed = packNodes(nodes);
      const { pointer, byteLength } = copyInput(packed);
      try {
        return exports.load_nodes(pointer, packed.length);
      } finally {
        exports.dealloc(pointer, byteLength);
      }
    },

    setViewport(viewport) {
      return exports.set_viewport(
        Number(viewport.x),
        Number(viewport.y),
        Number(viewport.width),
        Number(viewport.height),
        Number(viewport.zoom ?? 1),
      );
    },

    getVisibleNodeIds() {
      const pointer = exports.visible_ids_ptr();
      const length = exports.visible_ids_len();
      return Array.from(cloneTypedArray(Uint32Array, exports.memory, pointer, length));
    },

    getVisibleBoxes() {
      const pointer = exports.visible_boxes_ptr();
      const length = exports.visible_boxes_len();
      const values = cloneTypedArray(Float32Array, exports.memory, pointer, length);
      const boxes: HyperflowNode[] = [];

      for (let index = 0; index < values.length; index += 5) {
        boxes.push({
          id: values[index],
          x: values[index + 1],
          y: values[index + 2],
          width: values[index + 3],
          height: values[index + 4],
        });
      }

      return boxes;
    },

    hitTest(point) {
      const result = exports.hit_test_at(Number(point.x), Number(point.y));
      return result >= 0 ? result : null;
    },

    getNodeCount() {
      return exports.node_count();
    },
  };
}
