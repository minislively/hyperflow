import type { HyperFlowPocNodeRenderers, HyperFlowPocNodeRendererProps, WorkflowNode } from "@hyperflow/react";
import type { ManagerResponseNodeData, TaskBriefNodeData } from "./starter-data";

function BaseNode({
  title,
  status,
  summary,
  badge,
  selected,
  accent,
}: {
  title: string;
  status: string;
  summary: string;
  badge?: string;
  selected: boolean;
  accent: string;
}) {
  return (
    <div className={`starter-custom-node${selected ? " is-selected" : ""}`} style={{ borderColor: accent }}>
      <div className="starter-custom-node__header">
        <span className="starter-custom-node__title">{title}</span>
        {badge ? <span className="starter-custom-node__badge">{badge}</span> : null}
      </div>
      <p className="starter-custom-node__status">{status}</p>
      <p className="starter-custom-node__summary">{summary}</p>
    </div>
  );
}

function TaskBriefNode({ data, selected }: HyperFlowPocNodeRendererProps<TaskBriefNodeData>) {
  return (
    <BaseNode
      title={data.title}
      status={`${data.status} · ${data.sourceLabel}`}
      summary={data.summary}
      selected={selected}
      badge="Task"
      accent="rgba(34, 197, 94, 0.5)"
    />
  );
}

function ManagerResponseNode({ data, selected }: HyperFlowPocNodeRendererProps<ManagerResponseNodeData>) {
  return (
    <BaseNode
      title={data.title}
      status={`${data.status} · ${data.tone}`}
      summary={data.outputSummary}
      selected={selected}
      badge="Agent"
      accent="rgba(99, 102, 241, 0.5)"
    />
  );
}

export const starterNodeRenderers: HyperFlowPocNodeRenderers = {
  "task-brief": TaskBriefNode,
  "manager-response": ManagerResponseNode,
};

export function getStarterNodeRendererKey(node: WorkflowNode) {
  if (node.type === "task-brief") return "task-brief";
  if (node.type === "manager-response") return "manager-response";
  return null;
}

export function getStarterNodeRendererData(node: WorkflowNode) {
  return node.data;
}
