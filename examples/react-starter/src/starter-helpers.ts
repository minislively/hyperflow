import { createPocViewport, type PocViewport } from "@hyperflow/react";
import type { StarterWorkflowDetails, WorkflowNode } from "./starter-data";
import { WORKFLOW_DETAILS } from "./starter-data";

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

export const starterCanvasSize = {
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
};

export function getDefaultStarterViewport() {
  return createPocViewport(CANVAS_WIDTH, CANVAS_HEIGHT, { x: 0, y: 0, zoom: 1 });
}

export function getSelectedNodeDetails(
  node: WorkflowNode | undefined,
  _scenarioId: number,
): StarterWorkflowDetails {
  if (!node) {
    return {
      title: "No node selected",
      status: "Inspector ready",
      summary: "Select a workflow step to open its form and apply changes.",
      description: "This starter focuses on agent-builder editing flow rather than generic canvas inspection.",
      why: "The product should feel like a workflow builder surface with clear host-owned seams.",
      configGroups: [
        {
          title: "Current scope",
          fields: [
            { label: "Proof", value: "Agent builder inspector editing" },
            { label: "Interaction", value: "Select -> edit -> Apply" },
          ],
        },
      ],
      example: "Choose Task Brief or Manager Response to begin editing.",
    };
  }

  const details = WORKFLOW_DETAILS.get(node.id);
  if (details) return details;

  return {
    title: node.data.title,
    status: node.data.status,
    summary: node.data.summary,
    description: "This node is not part of the first editing proof set.",
    why: "It remains in the workflow to preserve the overall template context.",
    configGroups: [],
    example: "No direct editing proof is attached to this node in the first slice.",
  };
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
