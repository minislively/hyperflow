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
pub enum AnchorSide {
    Left = 0,
    Right = 1,
    Top = 2,
    Bottom = 3,
}

const ALL_ANCHOR_SIDES: [AnchorSide; 4] = [
    AnchorSide::Left,
    AnchorSide::Right,
    AnchorSide::Top,
    AnchorSide::Bottom,
];

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct AnchorPoint {
    pub x: f32,
    pub y: f32,
    pub side: AnchorSide,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Point {
    pub x: f32,
    pub y: f32,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ResolvedNodeAnchors {
    pub input_anchor: AnchorPoint,
    pub output_anchor: AnchorPoint,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ResolvedEdgeCurve {
    pub source_x: f32,
    pub source_y: f32,
    pub source_control_x: f32,
    pub source_control_y: f32,
    pub target_control_x: f32,
    pub target_control_y: f32,
    pub target_x: f32,
    pub target_y: f32,
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
    resolved_anchor_buffer: Vec<f32>,
    resolved_edge_curve_buffer: Vec<f32>,
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

    fn resolve_node_anchors_batch(&mut self, packed_requests: &[f32]) -> usize {
        self.resolved_anchor_buffer.clear();

        for chunk in packed_requests.chunks_exact(11) {
            let node = Node {
                id: 0,
                x: chunk[0],
                y: chunk[1],
                width: chunk[2],
                height: chunk[3],
            };
            let resolved = resolve_node_anchors(
                node,
                Point {
                    x: chunk[4],
                    y: chunk[5],
                },
                Point {
                    x: chunk[6],
                    y: chunk[7],
                },
                chunk[8],
                decode_optional_anchor_side(chunk[9]),
                decode_optional_anchor_side(chunk[10]),
            );

            self.resolved_anchor_buffer.extend_from_slice(&[
                resolved.input_anchor.x,
                resolved.input_anchor.y,
                resolved.input_anchor.side as u32 as f32,
                resolved.output_anchor.x,
                resolved.output_anchor.y,
                resolved.output_anchor.side as u32 as f32,
            ]);
        }

        self.resolved_anchor_buffer.len()
    }

    fn resolve_edge_curves_batch(&mut self, packed_requests: &[f32]) -> usize {
        self.resolved_edge_curve_buffer.clear();

        for chunk in packed_requests.chunks_exact(11) {
            let resolved = resolve_edge_curve(
                Point {
                    x: chunk[0],
                    y: chunk[1],
                },
                Point {
                    x: chunk[2],
                    y: chunk[3],
                },
                decode_anchor_side(chunk[4]),
                decode_anchor_side(chunk[5]),
                chunk[6],
                chunk[7],
                Some(chunk[8]),
                Some(chunk[9]),
                chunk[10],
            );

            self.resolved_edge_curve_buffer.extend_from_slice(&[
                resolved.source_x,
                resolved.source_y,
                resolved.source_control_x,
                resolved.source_control_y,
                resolved.target_control_x,
                resolved.target_control_y,
                resolved.target_x,
                resolved.target_y,
            ]);
        }

        self.resolved_edge_curve_buffer.len()
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

pub fn get_node_center(node: Node) -> Point {
    Point {
        x: node.x + node.width / 2.0,
        y: node.y + node.height / 2.0,
    }
}

pub fn get_node_anchor_point(node: Node, toward: Point) -> AnchorPoint {
    let center = get_node_center(node);
    let dx = toward.x - center.x;
    let dy = toward.y - center.y;

    if dx.abs() >= dy.abs() {
        if dx >= 0.0 {
            AnchorPoint {
                x: node.x + node.width,
                y: center.y,
                side: AnchorSide::Right,
            }
        } else {
            AnchorPoint {
                x: node.x,
                y: center.y,
                side: AnchorSide::Left,
            }
        }
    } else if dy >= 0.0 {
        AnchorPoint {
            x: center.x,
            y: node.y + node.height,
            side: AnchorSide::Bottom,
        }
    } else {
        AnchorPoint {
            x: center.x,
            y: node.y,
            side: AnchorSide::Top,
        }
    }
}

pub fn get_orthogonal_anchor_point(node: Node, side: AnchorSide, toward: Point) -> AnchorPoint {
    let center = get_node_center(node);

    if side == AnchorSide::Left || side == AnchorSide::Right {
        if toward.y >= center.y {
            AnchorPoint {
                x: center.x,
                y: node.y + node.height,
                side: AnchorSide::Bottom,
            }
        } else {
            AnchorPoint {
                x: center.x,
                y: node.y,
                side: AnchorSide::Top,
            }
        }
    } else if toward.x >= center.x {
        AnchorPoint {
            x: node.x + node.width,
            y: center.y,
            side: AnchorSide::Right,
        }
    } else {
        AnchorPoint {
            x: node.x,
            y: center.y,
            side: AnchorSide::Left,
        }
    }
}

pub fn offset_anchor_within_side(node: Node, anchor: AnchorPoint, offset: f32) -> AnchorPoint {
    let inset = 14.0_f32;

    if anchor.side == AnchorSide::Left || anchor.side == AnchorSide::Right {
        let min_y = node.y + inset;
        let max_y = node.y + node.height - inset;
        AnchorPoint {
            y: (anchor.y + offset).max(min_y).min(max_y),
            ..anchor
        }
    } else {
        let min_x = node.x + inset;
        let max_x = node.x + node.width - inset;
        AnchorPoint {
            x: (anchor.x + offset).max(min_x).min(max_x),
            ..anchor
        }
    }
}

pub fn resolve_node_anchors(
    node: Node,
    input_toward: Point,
    output_toward: Point,
    same_side_offset: f32,
    preferred_input_side: Option<AnchorSide>,
    preferred_output_side: Option<AnchorSide>,
) -> ResolvedNodeAnchors {
    let center = get_node_center(node);

    fn get_node_anchor_point_for_side(node: Node, side: AnchorSide) -> AnchorPoint {
        let center = get_node_center(node);
        match side {
            AnchorSide::Left => AnchorPoint {
                x: node.x,
                y: center.y,
                side,
            },
            AnchorSide::Right => AnchorPoint {
                x: node.x + node.width,
                y: center.y,
                side,
            },
            AnchorSide::Top => AnchorPoint {
                x: center.x,
                y: node.y,
                side,
            },
            AnchorSide::Bottom => AnchorPoint {
                x: center.x,
                y: node.y + node.height,
                side,
            },
        }
    }

    fn opposite_anchor_side(side: AnchorSide) -> AnchorSide {
        match side {
            AnchorSide::Left => AnchorSide::Right,
            AnchorSide::Right => AnchorSide::Left,
            AnchorSide::Top => AnchorSide::Bottom,
            AnchorSide::Bottom => AnchorSide::Top,
        }
    }

    fn score_anchor_side(
        node: Node,
        toward: Point,
        side: AnchorSide,
        role: &str,
        preferred_side: Option<AnchorSide>,
        center: Point,
    ) -> f32 {
        let anchor = get_node_anchor_point_for_side(node, side);
        let dx = toward.x - center.x;
        let dy = toward.y - center.y;
        let dominant_axis_is_horizontal = dx.abs() >= dy.abs();
        let preferred_directional_side = if dominant_axis_is_horizontal {
            if dx >= 0.0 {
                AnchorSide::Right
            } else {
                AnchorSide::Left
            }
        } else if dy >= 0.0 {
            AnchorSide::Bottom
        } else {
            AnchorSide::Top
        };
        let opposite_directional_side = opposite_anchor_side(preferred_directional_side);
        let orthogonal_penalty = if dominant_axis_is_horizontal {
            if side == AnchorSide::Top || side == AnchorSide::Bottom {
                18.0
            } else {
                0.0
            }
        } else if side == AnchorSide::Left || side == AnchorSide::Right {
            18.0
        } else {
            0.0
        };
        let opposite_penalty = if side == opposite_directional_side { 42.0 } else { 0.0 };
        let preferred_penalty = if preferred_side.is_some() && preferred_side != Some(side) {
            36.0
        } else {
            0.0
        };
        let role_bias_penalty = if role == "input" {
            match side {
                AnchorSide::Left => 0.0,
                AnchorSide::Top | AnchorSide::Bottom => 8.0,
                AnchorSide::Right => 16.0,
            }
        } else {
            match side {
                AnchorSide::Right => 0.0,
                AnchorSide::Top | AnchorSide::Bottom => 8.0,
                AnchorSide::Left => 16.0,
            }
        };
        let distance_penalty =
            ((anchor.x - toward.x).abs() + (anchor.y - toward.y).abs()) * 0.12;

        opposite_penalty
            + orthogonal_penalty
            + preferred_penalty
            + role_bias_penalty
            + distance_penalty
    }

    let mut best_score = f32::INFINITY;
    let mut best_input_anchor = get_node_anchor_point(node, input_toward);
    let mut best_output_anchor = get_node_anchor_point(node, output_toward);

    for input_side in ALL_ANCHOR_SIDES {
        for output_side in ALL_ANCHOR_SIDES {
            let pair_penalty = if input_side == output_side {
                64.0
            } else if input_side == AnchorSide::Right && output_side == AnchorSide::Left {
                24.0
            } else {
                0.0
            };
            let score = pair_penalty
                + score_anchor_side(
                    node,
                    input_toward,
                    input_side,
                    "input",
                    preferred_input_side,
                    center,
                )
                + score_anchor_side(
                    node,
                    output_toward,
                    output_side,
                    "output",
                    preferred_output_side,
                    center,
                );

            if score < best_score {
                best_score = score;
                best_input_anchor = get_node_anchor_point_for_side(node, input_side);
                best_output_anchor = get_node_anchor_point_for_side(node, output_side);
            }
        }
    }

    let mut input_anchor = best_input_anchor;
    let mut output_anchor = best_output_anchor;

    if input_anchor.side == output_anchor.side {
        input_anchor = get_orthogonal_anchor_point(node, input_anchor.side, input_toward);
        output_anchor = offset_anchor_within_side(node, output_anchor, same_side_offset);
    }

    ResolvedNodeAnchors {
        input_anchor,
        output_anchor,
    }
}

pub fn decode_anchor_side(code: f32) -> AnchorSide {
    match code.round() as i32 {
        0 => AnchorSide::Left,
        1 => AnchorSide::Right,
        2 => AnchorSide::Top,
        3 => AnchorSide::Bottom,
        _ => AnchorSide::Right,
    }
}

pub fn decode_optional_anchor_side(code: f32) -> Option<AnchorSide> {
    if code < 0.0 {
        None
    } else {
        Some(decode_anchor_side(code))
    }
}

pub fn build_directional_control_point(
    x: f32,
    y: f32,
    side: AnchorSide,
    base_offset: f32,
    spread: f32,
    bend_x: f32,
    bend_y: f32,
) -> Point {
    match side {
        AnchorSide::Left => Point {
            x: x - base_offset + bend_x,
            y: y + spread + bend_y,
        },
        AnchorSide::Right => Point {
            x: x + base_offset + bend_x,
            y: y + spread + bend_y,
        },
        AnchorSide::Top => Point {
            x: x + spread + bend_x,
            y: y - base_offset + bend_y,
        },
        AnchorSide::Bottom => Point {
            x: x + spread + bend_x,
            y: y + base_offset + bend_y,
        },
    }
}

pub fn resolve_edge_curve(
    source: Point,
    target: Point,
    source_side: AnchorSide,
    target_side: AnchorSide,
    source_spread: f32,
    target_spread: f32,
    bend_offset_x: Option<f32>,
    bend_offset_y: Option<f32>,
    minimum_curve_offset: f32,
) -> ResolvedEdgeCurve {
    let dx = target.x - source.x;
    let dy = target.y - source.y;
    let base_offset = minimum_curve_offset.max(dx.abs().max(dy.abs()) * 0.28);
    let bend_influence_x = bend_offset_x.unwrap_or(0.0);
    let bend_influence_y = bend_offset_y.unwrap_or(0.0);

    let source_control = build_directional_control_point(
        source.x,
        source.y,
        source_side,
        base_offset,
        source_spread,
        bend_influence_x * 0.16,
        bend_influence_y * 0.34,
    );
    let target_control = build_directional_control_point(
        target.x,
        target.y,
        target_side,
        base_offset,
        target_spread,
        bend_influence_x * 0.16,
        bend_influence_y * 0.34,
    );

    ResolvedEdgeCurve {
        source_x: source.x,
        source_y: source.y,
        source_control_x: source_control.x,
        source_control_y: source_control.y,
        target_control_x: target_control.x,
        target_control_y: target_control.y,
        target_x: target.x,
        target_y: target.y,
    }
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

#[no_mangle]
pub unsafe extern "C" fn resolve_node_anchors_batch(ptr: *const f32, len: usize) -> usize {
    if ptr.is_null() || len == 0 || len % 11 != 0 {
        return 0;
    }

    let packed_requests = slice::from_raw_parts(ptr, len);
    let mut state = kernel_state().lock().expect("kernel state poisoned");
    state.resolve_node_anchors_batch(packed_requests)
}

#[no_mangle]
pub extern "C" fn resolved_anchor_buffer_ptr() -> *const f32 {
    let state = kernel_state().lock().expect("kernel state poisoned");
    state.resolved_anchor_buffer.as_ptr()
}

#[no_mangle]
pub extern "C" fn resolved_anchor_buffer_len() -> usize {
    let state = kernel_state().lock().expect("kernel state poisoned");
    state.resolved_anchor_buffer.len()
}

#[no_mangle]
pub unsafe extern "C" fn resolve_edge_curves_batch(ptr: *const f32, len: usize) -> usize {
    if ptr.is_null() || len == 0 || len % 11 != 0 {
        return 0;
    }

    let packed_requests = slice::from_raw_parts(ptr, len);
    let mut state = kernel_state().lock().expect("kernel state poisoned");
    state.resolve_edge_curves_batch(packed_requests)
}

#[no_mangle]
pub extern "C" fn resolved_edge_curve_buffer_ptr() -> *const f32 {
    let state = kernel_state().lock().expect("kernel state poisoned");
    state.resolved_edge_curve_buffer.as_ptr()
}

#[no_mangle]
pub extern "C" fn resolved_edge_curve_buffer_len() -> usize {
    let state = kernel_state().lock().expect("kernel state poisoned");
    state.resolved_edge_curve_buffer.len()
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

    #[test]
    fn resolve_node_anchors_moves_input_off_a_collapsed_side() {
        let node = Node { id: 1, x: 100.0, y: 100.0, width: 180.0, height: 96.0 };
        let resolved = resolve_node_anchors(
            node,
            Point { x: 320.0, y: 120.0 },
            Point { x: 360.0, y: 140.0 },
            18.0,
            None,
            None,
        );

        assert_ne!(resolved.input_anchor.side, resolved.output_anchor.side);
    }

    #[test]
    fn resolve_node_anchors_batch_writes_six_values_per_request() {
        let mut state = KernelState::default();
        let written = state.resolve_node_anchors_batch(&[
            100.0, 100.0, 180.0, 96.0, 320.0, 120.0, 360.0, 140.0, 18.0, -1.0, -1.0,
            260.0, 80.0, 180.0, 96.0, 120.0, 120.0, 520.0, 160.0, 18.0, -1.0, -1.0,
        ]);

        assert_eq!(written, 12);
        assert_eq!(state.resolved_anchor_buffer.len(), 12);
    }

    #[test]
    fn resolve_node_anchors_can_prefer_left_right_sides() {
        let node = Node { id: 1, x: 100.0, y: 100.0, width: 180.0, height: 96.0 };
        let resolved = resolve_node_anchors(
            node,
            Point { x: 190.0, y: 340.0 },
            Point { x: 190.0, y: -100.0 },
            18.0,
            Some(AnchorSide::Left),
            Some(AnchorSide::Right),
        );

        assert_eq!(resolved.input_anchor.side, AnchorSide::Left);
        assert_eq!(resolved.output_anchor.side, AnchorSide::Right);
    }

    #[test]
    fn resolve_edge_curve_preserves_source_and_target_points() {
        let resolved = resolve_edge_curve(
            Point { x: 10.0, y: 20.0 },
            Point { x: 200.0, y: 100.0 },
            AnchorSide::Right,
            AnchorSide::Left,
            0.0,
            0.0,
            None,
            None,
            40.0,
        );

        assert_eq!(resolved.source_x, 10.0);
        assert_eq!(resolved.source_y, 20.0);
        assert_eq!(resolved.target_x, 200.0);
        assert_eq!(resolved.target_y, 100.0);
        assert!(resolved.source_control_x > resolved.source_x);
        assert!(resolved.target_control_x < resolved.target_x);
    }

    #[test]
    fn resolve_edge_curves_batch_writes_eight_values_per_request() {
        let mut state = KernelState::default();
        let written = state.resolve_edge_curves_batch(&[
            10.0, 20.0, 200.0, 100.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 40.0, 20.0, 40.0, 250.0,
            140.0, 1.0, 0.0, 18.0, -18.0, 4.0, -8.0, 40.0,
        ]);

        assert_eq!(written, 16);
        assert_eq!(state.resolved_edge_curve_buffer.len(), 16);
        assert_eq!(state.resolved_edge_curve_buffer[0], 10.0);
        assert_eq!(state.resolved_edge_curve_buffer[7], 100.0);
    }
}
