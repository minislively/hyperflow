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

export type TaskBriefNodeData = {
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

export type ManagerResponseNodeData = {
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

export type WorkflowNodeData = TaskBriefNodeData | ManagerResponseNodeData | GenericNodeData;

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
  { id: "live", label: "Live starter", subtitle: "Workflow builder proof" },
  { id: "loading", label: "Loading", subtitle: "Preparing workflow data" },
  { id: "empty", label: "Empty", subtitle: "No workflow template loaded" },
  { id: "error", label: "Error", subtitle: "Starter surface recovered safely" },
];

export const STARTER_SURFACE_GUIDANCE: Record<Exclude<StarterSurfaceState, "live">, StarterSurfaceGuidance> = {
  loading: {
    title: "Preparing agent workflow surface",
    description:
      "Use this state when fixture data, remote config, or runtime resources are still being prepared before the starter surface becomes interactive.",
    inspectorSummary:
      "The shell is still visible while data or runtime resources are being prepared, so the host app can show progress without collapsing the starter surface.",
    interactionLabel: "Blocked temporarily",
    shellNote: "Still visible",
    actions: [{ id: "syncing", label: "Syncing agent workflow data", disabled: true }],
  },
  empty: {
    title: "No agent workflow loaded yet",
    description:
      "Use this state when the host app has no workflow to render yet and should guide the user toward loading or creating one later.",
    inspectorSummary:
      "The surface stays structured even before a workflow exists, so the host app can explain the next step clearly.",
    interactionLabel: "Awaiting data",
    shellNote: "Ready for host action",
    actions: [
      { id: "load-starter-workflow", label: "Load agent workflow", tone: "primary" },
      { id: "open-starter-template", label: "Open agent template", tone: "secondary" },
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
    id: "agent-builder",
    label: "Agent builder UI",
    subtitle: "Product-like starter shell",
    summary: "A product-style agent workflow surface where task intake, planning, tools, memory, and review are designed through a visible shell instead of a bare canvas proof.",
    proof: "Demonstrates that the surface reads like an agent builder first, while selecting a workflow step still opens an editable inspector and Apply updates the workflow state plus node UI together.",
    why: "Best for showing HyperFlow as the foundation behind agent-builder products instead of a generic node canvas.",
    defaultNodeId: 1,
  },
];

export const INITIAL_WORKFLOW_NODES: WorkflowNode[] = [
  {
    id: 1,
    type: "task-brief",
    x: 40,
    y: 80,
    width: 180,
    height: 92,
    data: {
      title: "Task Brief",
      status: "Input · Ready",
      sourceLabel: "Task request",
      summary: "Structured task request enters the agent workflow.",
      form: {
        title: "Task Brief",
        status: "Input · Ready",
        sourceLabel: "Task request",
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
      title: "Planner Agent",
      status: "Agent step · Configured",
      summary: "Breaks the task into steps before execution.",
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
      title: "Delegation Router",
      status: "Logic step · Active",
      summary: "Routes work to the right agent or tool path.",
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
      title: "Memory Retrieval",
      status: "Context step · Ready",
      summary: "Pulls project context before the agent acts.",
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
      title: "Tool Executor",
      status: "Tool step · Connected",
      summary: "Runs tools and returns execution output.",
    },
  },
  {
    id: 6,
    type: "manager-response",
    x: 700,
    y: 80,
    width: 200,
    height: 96,
    data: {
      title: "Manager Response",
      status: "AI step · Draft ready",
      tone: "Concise operator",
      outputSummary: "Answer + execution trace",
      summary: "Manager-ready response is generated after planning, tools, and memory lookup.",
      form: {
        title: "Manager Response",
        tone: "Concise operator",
        outputSummary: "Answer + execution trace",
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
      title: "Human Review",
      status: "Review · Optional gate",
      summary: "Lets an operator approve before final handoff.",
    },
  },
];

export const WORKFLOW_DETAILS = new Map<number, StarterWorkflowDetails>([
  [
    1,
    {
      title: "Task Brief",
      status: "Input · Ready",
      summary: "Structured task request enters the flow.",
      description: "Receives the incoming user goal before any planning or tool execution begins.",
      why: "This step is a strong first editing target because agent products often customize task labels, intake status, and source naming.",
      configGroups: [
        {
          title: "Editable fields",
          fields: [
            { label: "Title", value: "Task Brief" },
            { label: "Status", value: "Input · Ready" },
            { label: "Source", value: "Task request" },
          ],
        },
      ],
      example: "Apply updates should change title, status, and source label on the workflow step card.",
    },
  ],
  [
    6,
    {
      title: "Manager Response",
      status: "AI step · Draft ready",
      summary: "Manager-ready response is prepared with workflow context.",
      description: "Generates the synthesized response after planning, tool execution, and memory retrieval.",
      why: "This step is a strong second editing target because tone and output summary clearly show how the host product shapes final agent output.",
      configGroups: [
        {
          title: "Editable fields",
          fields: [
            { label: "Title", value: "Manager Response" },
            { label: "Tone", value: "Concise operator" },
            { label: "Output", value: "Answer + execution trace" },
          ],
        },
      ],
      example: "Apply updates should change the workflow step title, tone label, and output summary block.",
    },
  ],
]);

export const WORKFLOW_SEQUENCE = INITIAL_WORKFLOW_NODES.map((node) => node.id);
