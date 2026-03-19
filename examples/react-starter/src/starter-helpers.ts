import { createPocViewport, type PocNode, type PocViewport } from "@hyperflow/react";
import type { StarterScenario, StarterWorkflowDetails } from "./starter-data";
import { STARTER_SCENARIOS, WORKFLOW_DETAILS } from "./starter-data";

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

export const starterCanvasSize = {
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
};

export function getDefaultStarterViewport() {
  return createPocViewport(CANVAS_WIDTH, CANVAS_HEIGHT, { x: 0, y: 0, zoom: 1 });
}

export function getStarterScenarioBySize(size: number): StarterScenario {
  return STARTER_SCENARIOS.find((scenario) => scenario.id === size) ?? STARTER_SCENARIOS[0];
}

export function getSelectedNodeDetails(
  node: PocNode | undefined,
  scenarioSize: number,
): StarterWorkflowDetails {
  if (!node) {
    return {
      title: "No node selected",
      status: "Read-only starter proof",
      summary: "Switch to Inspect mode and click a node on the canvas to inspect the current validated slice.",
      description: "The bounded React starter now supports a real read-only overview mode alongside click-based node inspection.",
      why: "This keeps the surface product-like without pretending full editing exists yet.",
      configGroups: [
        {
          title: "Current scope",
          fields: [
            { label: "Fixture size", value: String(scenarioSize) },
            { label: "Mode", value: "Read-only overview" },
          ],
        },
      ],
      example: "Select Inspect mode to bind the inspector to a real node.",
    };
  }

  const details = WORKFLOW_DETAILS.get(node.id);
  if (details) return details;

  return {
    title: `Workflow Step ${node.id}`,
    status: "Generated proof node",
    summary: `Grid-backed PoC node rendered through the current HyperFlow slice at (${Math.round(node.x)}, ${Math.round(node.y)}).`,
    description: "This node comes from the shared grid fixture and proves that the React starter shell is bound to the real current slice.",
    why: "Useful for confirming that the inspector remains tied to actual rendered nodes even outside the named workflow steps.",
    configGroups: [
      {
        title: "Fixture details",
        fields: [
          { label: "Width × height", value: `${Math.round(node.width)} × ${Math.round(node.height)}` },
          { label: "Scenario size", value: String(scenarioSize) },
        ],
      },
    ],
    example: `Node ${node.id} @ (${Math.round(node.x)}, ${Math.round(node.y)})`,
  };
}

export function getSelectedNode(nodes: PocNode[], nodeId: number | null) {
  return nodes.find((node) => node.id === nodeId);
}

export function getStarterViewportOptions() {
  return { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
}

export function getNodeFocusViewportOptions(currentViewport: PocViewport) {
  return {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    minZoom: Math.max(currentViewport.zoom, 0.7),
  };
}
