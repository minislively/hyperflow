//! HyperFlow small-PoC core kernel.

use std::mem;
use std::slice;
use std::sync::{Mutex, OnceLock};

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Node {
    pub id: u32,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

impl Node {
    fn intersects(&self, viewport: &Viewport) -> bool {
        let right = self.x + self.width;
        let bottom = self.y + self.height;

        right >= viewport.left()
            && self.x <= viewport.right()
            && bottom >= viewport.top()
            && self.y <= viewport.bottom()
    }

    fn contains(&self, px: f32, py: f32) -> bool {
        px >= self.x
            && px <= self.x + self.width
            && py >= self.y
            && py <= self.y + self.height
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Viewport {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub zoom: f32,
}

impl Default for Viewport {
    fn default() -> Self {
        Self {
            x: 0.0,
            y: 0.0,
            width: 960.0,
            height: 540.0,
            zoom: 1.0,
        }
    }
}

impl Viewport {
    pub fn left(&self) -> f32 {
        self.x
    }

    pub fn top(&self) -> f32 {
        self.y
    }

    pub fn right(&self) -> f32 {
        self.x + self.width / self.zoom.max(0.000_1)
    }

    pub fn bottom(&self) -> f32 {
        self.y + self.height / self.zoom.max(0.000_1)
    }
}

#[derive(Default)]
struct KernelState {
    nodes: Vec<Node>,
    viewport: Viewport,
    visible_ids: Vec<u32>,
    visible_boxes: Vec<f32>,
}

impl KernelState {
    fn load_nodes(&mut self, packed_nodes: &[f32]) -> usize {
        self.nodes.clear();
        self.visible_ids.clear();
        self.visible_boxes.clear();

        for chunk in packed_nodes.chunks_exact(5) {
            self.nodes.push(Node {
                id: chunk[0] as u32,
                x: chunk[1],
                y: chunk[2],
                width: chunk[3],
                height: chunk[4],
            });
        }

        self.visible_ids.reserve(self.nodes.len());
        self.visible_boxes.reserve(self.nodes.len() * 5);

        self.nodes.len()
    }

    fn update_visible(&mut self) -> usize {
        update_visible_buffers(
            &self.nodes,
            self.viewport,
            &mut self.visible_ids,
            &mut self.visible_boxes,
        )
    }
}

fn update_visible_buffers(
    nodes: &[Node],
    viewport: Viewport,
    visible_ids: &mut Vec<u32>,
    visible_boxes: &mut Vec<f32>,
) -> usize {
    visible_ids.clear();
    visible_boxes.clear();

    for node in nodes.iter().filter(|node| node.intersects(&viewport)) {
        visible_ids.push(node.id);
        visible_boxes.extend_from_slice(&[node.id as f32, node.x, node.y, node.width, node.height]);
    }

    visible_ids.len()
}

pub fn compute_visible_nodes(nodes: &[Node], viewport: Viewport) -> Vec<Node> {
    nodes
        .iter()
        .copied()
        .filter(|node| node.intersects(&viewport))
        .collect()
}

pub fn hit_test(nodes: &[Node], px: f32, py: f32) -> Option<u32> {
    nodes
        .iter()
        .rev()
        .find(|node| node.contains(px, py))
        .map(|node| node.id)
}

fn kernel_state() -> &'static Mutex<KernelState> {
    static STATE: OnceLock<Mutex<KernelState>> = OnceLock::new();
    STATE.get_or_init(|| Mutex::new(KernelState::default()))
}

#[no_mangle]
pub extern "C" fn alloc(size: usize) -> *mut u8 {
    let mut bytes = Vec::<u8>::with_capacity(size);
    let ptr = bytes.as_mut_ptr();
    mem::forget(bytes);
    ptr
}

#[no_mangle]
pub unsafe extern "C" fn dealloc(ptr: *mut u8, size: usize) {
    if !ptr.is_null() && size > 0 {
        let _ = Vec::from_raw_parts(ptr, size, size);
    }
}

#[no_mangle]
pub unsafe extern "C" fn load_nodes(ptr: *const f32, len: usize) -> usize {
    if ptr.is_null() || len == 0 || len % 5 != 0 {
        return 0;
    }

    let packed_nodes = slice::from_raw_parts(ptr, len);
    let mut state = kernel_state().lock().expect("kernel state poisoned");
    state.load_nodes(packed_nodes)
}

#[no_mangle]
pub extern "C" fn set_viewport(x: f32, y: f32, width: f32, height: f32, zoom: f32) -> usize {
    let mut state = kernel_state().lock().expect("kernel state poisoned");
    state.viewport = Viewport {
        x,
        y,
        width,
        height,
        zoom,
    };

    state.update_visible()
}

#[no_mangle]
pub extern "C" fn node_count() -> usize {
    let state = kernel_state().lock().expect("kernel state poisoned");
    state.nodes.len()
}

#[no_mangle]
pub extern "C" fn visible_ids_ptr() -> *const u32 {
    let state = kernel_state().lock().expect("kernel state poisoned");
    state.visible_ids.as_ptr()
}

#[no_mangle]
pub extern "C" fn visible_ids_len() -> usize {
    let state = kernel_state().lock().expect("kernel state poisoned");
    state.visible_ids.len()
}

#[no_mangle]
pub extern "C" fn visible_boxes_ptr() -> *const f32 {
    let state = kernel_state().lock().expect("kernel state poisoned");
    state.visible_boxes.as_ptr()
}

#[no_mangle]
pub extern "C" fn visible_boxes_len() -> usize {
    let state = kernel_state().lock().expect("kernel state poisoned");
    state.visible_boxes.len()
}

#[no_mangle]
pub extern "C" fn hit_test_at(px: f32, py: f32) -> i32 {
    let state = kernel_state().lock().expect("kernel state poisoned");
    hit_test(&state.nodes, px, py).map(|id| id as i32).unwrap_or(-1)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_nodes() -> Vec<Node> {
        vec![
            Node { id: 1, x: 0.0, y: 0.0, width: 100.0, height: 60.0 },
            Node { id: 2, x: 140.0, y: 0.0, width: 100.0, height: 60.0 },
            Node { id: 3, x: 0.0, y: 120.0, width: 100.0, height: 60.0 },
            Node { id: 4, x: 40.0, y: 20.0, width: 80.0, height: 40.0 },
        ]
    }

    #[test]
    fn computes_visible_nodes_for_viewport_changes() {
        let nodes = sample_nodes();
        let initial = compute_visible_nodes(
            &nodes,
            Viewport { x: 0.0, y: 0.0, width: 120.0, height: 80.0, zoom: 1.0 },
        );
        assert_eq!(initial.iter().map(|node| node.id).collect::<Vec<_>>(), vec![1, 4]);

        let shifted = compute_visible_nodes(
            &nodes,
            Viewport { x: 120.0, y: 0.0, width: 140.0, height: 80.0, zoom: 1.0 },
        );
        assert_eq!(shifted.iter().map(|node| node.id).collect::<Vec<_>>(), vec![2, 4]);
    }

    #[test]
    fn hit_test_returns_topmost_matching_node() {
        let nodes = sample_nodes();
        assert_eq!(hit_test(&nodes, 10.0, 10.0), Some(1));
        assert_eq!(hit_test(&nodes, 50.0, 30.0), Some(4));
        assert_eq!(hit_test(&nodes, 500.0, 500.0), None);
    }

    #[test]
    fn viewport_zoom_changes_visible_bounds() {
        let nodes = vec![
            Node { id: 1, x: 0.0, y: 0.0, width: 90.0, height: 60.0 },
            Node { id: 2, x: 160.0, y: 0.0, width: 90.0, height: 60.0 },
        ];

        let zoomed_out = compute_visible_nodes(
            &nodes,
            Viewport { x: 0.0, y: 0.0, width: 180.0, height: 80.0, zoom: 1.0 },
        );
        assert_eq!(zoomed_out.len(), 2);

        let zoomed_in = compute_visible_nodes(
            &nodes,
            Viewport { x: 0.0, y: 0.0, width: 180.0, height: 80.0, zoom: 2.0 },
        );
        assert_eq!(zoomed_in.iter().map(|node| node.id).collect::<Vec<_>>(), vec![1]);
    }

    #[test]
    fn update_visible_buffers_keeps_ids_and_boxes_in_sync() {
        let nodes = sample_nodes();
        let mut visible_ids = vec![999];
        let mut visible_boxes = vec![999.0];

        let initial_visible_count = update_visible_buffers(
            &nodes,
            Viewport { x: 0.0, y: 0.0, width: 120.0, height: 80.0, zoom: 1.0 },
            &mut visible_ids,
            &mut visible_boxes,
        );

        assert_eq!(initial_visible_count, 2);
        assert_eq!(visible_ids, vec![1, 4]);
        assert_eq!(
            visible_boxes,
            vec![
                1.0, 0.0, 0.0, 100.0, 60.0,
                4.0, 40.0, 20.0, 80.0, 40.0,
            ],
        );

        let shifted_visible_count = update_visible_buffers(
            &nodes,
            Viewport { x: 120.0, y: 0.0, width: 140.0, height: 80.0, zoom: 1.0 },
            &mut visible_ids,
            &mut visible_boxes,
        );

        assert_eq!(shifted_visible_count, 2);
        assert_eq!(visible_ids, vec![2, 4]);
        assert_eq!(visible_boxes.len(), visible_ids.len() * 5);
        assert_eq!(
            visible_boxes,
            vec![
                2.0, 140.0, 0.0, 100.0, 60.0,
                4.0, 40.0, 20.0, 80.0, 40.0,
            ],
        );
    }
}
