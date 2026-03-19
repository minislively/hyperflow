import type { HyperFlowPocNodeRenderers, HyperFlowPocNodeRendererProps, PocNode } from "@hyperflow/react";

type StarterNodeData = {
  title: string;
  status: string;
  summary: string;
  badge?: string;
};

function BaseNode({
  title,
  status,
  summary,
  badge,
  selected,
}: StarterNodeData & { selected: boolean }) {
  return (
    <div className={`starter-custom-node${selected ? " is-selected" : ""}`}>
      <div className="starter-custom-node__header">
        <span className="starter-custom-node__title">{title}</span>
        {badge ? <span className="starter-custom-node__badge">{badge}</span> : null}
      </div>
      <p className="starter-custom-node__status">{status}</p>
      <p className="starter-custom-node__summary">{summary}</p>
    </div>
  );
}

function CustomerTicketNode({ data, selected }: HyperFlowPocNodeRendererProps<StarterNodeData>) {
  return <BaseNode {...data} selected={selected} badge="Input" />;
}

function DraftResponseNode({ data, selected }: HyperFlowPocNodeRendererProps<StarterNodeData>) {
  return <BaseNode {...data} selected={selected} badge="AI" />;
}

export const starterNodeRenderers: HyperFlowPocNodeRenderers = {
  "customer-ticket": CustomerTicketNode,
  "draft-response": DraftResponseNode,
};

export function getStarterNodeRendererKey(node: PocNode) {
  if (node.id === 1) return "customer-ticket";
  if (node.id === 6) return "draft-response";
  return null;
}

export function getStarterNodeRendererData(node: PocNode): StarterNodeData | undefined {
  if (node.id === 1) {
    return {
      title: "Customer Ticket",
      status: "Input · Ready",
      summary: "Structured support request enters the workflow with real product context.",
    };
  }

  if (node.id === 6) {
    return {
      title: "Draft Response",
      status: "AI step · Draft ready",
      summary: "Agent-ready response is generated with supporting context and notes.",
    };
  }

  return undefined;
}
