import type { PocNode } from "@hyperflow/react";

export type StarterScenario = {
  id: string;
  label: string;
  subtitle: string;
  summary: string;
  proof: string;
  why: string;
  defaultNodeId: number;
};

export type TicketNodeData = {
  title: string;
  status: string;
  sourceLabel: string;
  summary: string;
  form: {
    title: string;
    status: string;
    sourceLabel: string;
  };
};

export type DraftResponseNodeData = {
  title: string;
  status: string;
  tone: string;
  outputSummary: string;
  summary: string;
  form: {
    title: string;
    tone: string;
    outputSummary: string;
  };
};

export type GenericNodeData = {
  title: string;
  status: string;
  summary: string;
};

export type WorkflowNodeData = TicketNodeData | DraftResponseNodeData | GenericNodeData;

export type WorkflowNode = PocNode & {
  type: string;
  data: WorkflowNodeData;
};

export type StarterWorkflowDetails = {
  title: string;
  status: string;
  summary: string;
  description: string;
  why: string;
  configGroups: { title: string; fields: { label: string; value: string }[] }[];
  example: string;
};

export type StarterSurfaceState = "live" | "loading" | "empty" | "error";
export type StarterSurfaceAction = {
  id: string;
  label: string;
  tone?: "primary" | "secondary";
  disabled?: boolean;
};

export type StarterSurfaceGuidance = {
  title: string;
  description: string;
  inspectorSummary: string;
  interactionLabel: string;
  shellNote: string;
  actions: StarterSurfaceAction[];
};

export const STARTER_SURFACE_STATES: {
  id: StarterSurfaceState;
  label: string;
  subtitle: string;
}[] = [
  { id: "live", label: "Live proof", subtitle: "Current validated slice" },
  { id: "loading", label: "Loading", subtitle: "Starter shell waiting on data" },
  { id: "empty", label: "Empty", subtitle: "No workflow loaded yet" },
  { id: "error", label: "Error", subtitle: "Surface failed gracefully" },
];

export const STARTER_SURFACE_GUIDANCE: Record<Exclude<StarterSurfaceState, "live">, StarterSurfaceGuidance> = {
  loading: {
    title: "Preparing workflow surface",
    description:
      "Use this state when fixture data, remote config, or runtime resources are still being prepared before the starter surface becomes interactive.",
    inspectorSummary:
      "The shell is still visible while data or runtime resources are being prepared, so the host app can show progress without collapsing the starter surface.",
    interactionLabel: "Blocked temporarily",
    shellNote: "Still visible",
    actions: [{ id: "syncing", label: "Syncing workflow data", disabled: true }],
  },
  empty: {
    title: "No workflow loaded yet",
    description:
      "Use this state when the host app has no workflow to render yet and should guide the user toward loading or creating one later.",
    inspectorSummary:
      "The surface stays structured even before a workflow exists, so the host app can explain the next step clearly.",
    interactionLabel: "Awaiting data",
    shellNote: "Ready for host action",
    actions: [
      { id: "load-starter-workflow", label: "Load starter workflow", tone: "primary" },
      { id: "open-starter-template", label: "Open starter template", tone: "secondary" },
    ],
  },
  error: {
    title: "Surface failed gracefully",
    description:
      "Use this state when the starter surface cannot render the current workflow safely and needs to fail without collapsing the surrounding product shell.",
    inspectorSummary:
      "The shell contains the failure and provides a recovery path instead of collapsing the surrounding product frame.",
    interactionLabel: "Recovery path",
    shellNote: "Still visible",
    actions: [
      { id: "retry-load", label: "Retry load", tone: "primary" },
      { id: "return-safe-overview", label: "Return to safe overview", tone: "secondary" },
    ],
  },
};

export const STARTER_SCENARIOS: StarterScenario[] = [
  {
    id: "automation-support",
    label: "Automation SaaS",
    subtitle: "Support workflow template",
    summary: "A customer support automation flow where structured inputs and AI-generated outputs are configured through forms.",
    proof: "Demonstrates that selecting a workflow node opens an editable inspector and that Apply updates the node UI and graph state together.",
    why: "Best for showing how the SDK becomes a real workflow builder instead of a generic canvas demo.",
    defaultNodeId: 1,
  },
];

export const INITIAL_WORKFLOW_NODES: WorkflowNode[] = [
  {
    id: 1,
    type: "customer-ticket",
    x: 40,
    y: 80,
    width: 180,
    height: 92,
    data: {
      title: "Customer Ticket",
      status: "Input · Ready",
      sourceLabel: "Support form",
      summary: "Structured request enters the automation workflow.",
      form: {
        title: "Customer Ticket",
        status: "Input · Ready",
        sourceLabel: "Support form",
      },
    },
  },
  {
    id: 2,
    type: "intent-classifier",
    x: 280,
    y: 80,
    width: 140,
    height: 72,
    data: {
      title: "Intent Classifier",
      status: "AI step · Configured",
      summary: "Classifies the request before routing.",
    },
  },
  {
    id: 3,
    type: "priority-router",
    x: 480,
    y: 80,
    width: 140,
    height: 72,
    data: {
      title: "Priority Router",
      status: "Logic step · Active",
      summary: "Routes urgency and account tier.",
    },
  },
  {
    id: 4,
    type: "knowledge-search",
    x: 280,
    y: 220,
    width: 140,
    height: 72,
    data: {
      title: "Knowledge Search",
      status: "Tool step · Search ready",
      summary: "Pulls internal context before drafting.",
    },
  },
  {
    id: 5,
    type: "crm-lookup",
    x: 480,
    y: 220,
    width: 140,
    height: 72,
    data: {
      title: "CRM Lookup",
      status: "Tool step · Context ready",
      summary: "Loads customer plan and tier.",
    },
  },
  {
    id: 6,
    type: "draft-response",
    x: 700,
    y: 80,
    width: 200,
    height: 96,
    data: {
      title: "Draft Response",
      status: "AI step · Draft ready",
      tone: "Support-friendly",
      outputSummary: "Draft reply + internal notes",
      summary: "Agent-ready response is generated after routing and context lookup.",
      form: {
        title: "Draft Response",
        tone: "Support-friendly",
        outputSummary: "Draft reply + internal notes",
      },
    },
  },
  {
    id: 7,
    type: "review-output",
    x: 700,
    y: 220,
    width: 140,
    height: 72,
    data: {
      title: "Review Output",
      status: "Output · Human review",
      summary: "Packages the draft for approval.",
    },
  },
];

export const WORKFLOW_DETAILS = new Map<number, StarterWorkflowDetails>([
  [
    1,
    {
      title: "Customer Ticket",
      status: "Input · Ready",
      summary: "Structured support request enters the flow.",
      description: "Receives the incoming ticket before any automation begins.",
      why: "This node is a strong first editing target because product teams often customize intake labels and statuses.",
      configGroups: [
        {
          title: "Editable fields",
          fields: [
            { label: "Title", value: "Customer Ticket" },
            { label: "Status", value: "Input · Ready" },
            { label: "Source", value: "Support form" },
          ],
        },
      ],
      example: "Apply updates should change title, status, and source label on the node card.",
    },
  ],
  [
    6,
    {
      title: "Draft Response",
      status: "AI step · Draft ready",
      summary: "Agent-ready response is prepared with automation context.",
      description: "Generates the draft output that the team wants to review before sending.",
      why: "This node is a strong second editing target because tone and output summary clearly show before/after differences.",
      configGroups: [
        {
          title: "Editable fields",
          fields: [
            { label: "Title", value: "Draft Response" },
            { label: "Tone", value: "Support-friendly" },
            { label: "Output", value: "Draft reply + internal notes" },
          ],
        },
      ],
      example: "Apply updates should change the node title, tone label, and output summary block.",
    },
  ],
]);

export const WORKFLOW_SEQUENCE = INITIAL_WORKFLOW_NODES.map((node) => node.id);
