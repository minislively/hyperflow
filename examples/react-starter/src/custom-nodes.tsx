import type { HyperFlowPocNodeRenderers, HyperFlowPocNodeRendererProps, WorkflowNode } from "@hyperflow/react";
import type { DraftResponseNodeData, TicketNodeData } from "./starter-data";

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

function CustomerTicketNode({ data, selected }: HyperFlowPocNodeRendererProps<TicketNodeData>) {
  return (
    <BaseNode
      title={data.title}
      status={`${data.status} · ${data.sourceLabel}`}
      summary={data.summary}
      selected={selected}
      badge="Input"
      accent="rgba(34, 197, 94, 0.5)"
    />
  );
}

function DraftResponseNode({ data, selected }: HyperFlowPocNodeRendererProps<DraftResponseNodeData>) {
  return (
    <BaseNode
      title={data.title}
      status={`${data.status} · ${data.tone}`}
      summary={data.outputSummary}
      selected={selected}
      badge="AI"
      accent="rgba(99, 102, 241, 0.5)"
    />
  );
}

export const starterNodeRenderers: HyperFlowPocNodeRenderers = {
  "customer-ticket": CustomerTicketNode,
  "draft-response": DraftResponseNode,
};

export function getStarterNodeRendererKey(node: WorkflowNode) {
  if (node.type === "customer-ticket") return "customer-ticket";
  if (node.type === "draft-response") return "draft-response";
  return null;
}

export function getStarterNodeRendererData(node: WorkflowNode) {
  return node.data;
}
