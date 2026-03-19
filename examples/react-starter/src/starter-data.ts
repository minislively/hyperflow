export type StarterScenario = {
  id: number;
  label: string;
  subtitle: string;
  summary: string;
  proof: string;
  why: string;
  defaultNodeId: number;
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

export const STARTER_SCENARIOS: StarterScenario[] = [
  {
    id: 100,
    label: "Fast first proof",
    subtitle: "Starter-like small graph",
    summary: "Use the smallest fixture to understand the React starter shell before you inspect scale.",
    proof: "Shows that the same current slice can power a React toolbar/canvas/inspector surface without pretending the full Starter Kit already exists.",
    why: "Best for quickly validating that the new product proof reads like a workflow builder, not only a renderer demo.",
    defaultNodeId: 1,
  },
  {
    id: 300,
    label: "Mid graph check",
    subtitle: "Bigger proof with same shell",
    summary: "Move to a denser fixture and confirm the starter shell still feels readable.",
    proof: "Demonstrates that the thin React surface keeps the same product story while the graph grows.",
    why: "Useful for checking whether the shell still feels product-like beyond the smallest case.",
    defaultNodeId: 3,
  },
  {
    id: 1000,
    label: "Dense graph tour",
    subtitle: "Stress the current slice",
    summary: "Inspect the largest current fixture to understand the outer limit of this bounded proof slice.",
    proof: "Shows the React starter shell under the heaviest shared demo fixture without widening scope into full editor features.",
    why: "Best for judging how honest and useful the thin slice still feels at the edge of the current proof.",
    defaultNodeId: 6,
  },
];

export const WORKFLOW_DETAILS = new Map<number, StarterWorkflowDetails>([
  [
    1,
    {
      title: "Customer Ticket",
      status: "Input · Ready",
      summary: "Starting node for incoming support work.",
      description: "Receives the incoming support request before any automation begins.",
      why: "Keeps the workflow grounded in a concrete customer problem instead of an abstract graph.",
      configGroups: [
        {
          title: "Source",
          fields: [
            { label: "Type", value: "Support form" },
            { label: "Primary fields", value: "subject, message, customer_id" },
          ],
        },
        {
          title: "Example payload",
          fields: [
            { label: "Subject", value: "Refund request" },
            { label: "Customer", value: "cus_2048" },
          ],
        },
      ],
      example: `{"subject": "Refund request", "customer_id": "cus_2048"}`,
    },
  ],
  [
    2,
    {
      title: "Intent Classifier",
      status: "AI step · Configured",
      summary: "Classifies request intent before routing.",
      description: "Maps the incoming request into a bounded label set so the workflow can choose the next route.",
      why: "Shows that the starter proof is tied to an operational workflow step instead of generic AI branding.",
      configGroups: [
        {
          title: "Model",
          fields: [
            { label: "Model", value: "gpt-5.4-mini" },
            { label: "Confidence threshold", value: "0.80" },
          ],
        },
      ],
      example: "Intent: Billing · Confidence: 0.93",
    },
  ],
  [
    3,
    {
      title: "Priority Router",
      status: "Logic step · Active",
      summary: "Maps urgency and account tier to a route.",
      description: "Routes work using simple product rules instead of exposing raw graph mechanics.",
      why: "This is where the product proof starts to look like a real operations workflow.",
      configGroups: [
        {
          title: "Routing rules",
          fields: [
            { label: "Billing + urgent", value: "Escalate" },
            { label: "Fallback", value: "Standard queue" },
          ],
        },
      ],
      example: "Route selected: Billing queue",
    },
  ],
  [
    4,
    {
      title: "Knowledge Search",
      status: "Tool step · Search ready",
      summary: "Adds help-center context before drafting.",
      description: "Pulls relevant internal knowledge before any reply is drafted.",
      why: "Shows that the inspector is grounded in product logic, not only box coordinates.",
      configGroups: [
        {
          title: "Search settings",
          fields: [
            { label: "Mode", value: "Hybrid search" },
            { label: "Source", value: "Help center + policies" },
          ],
        },
      ],
      example: "Matched docs: refund-policy, duplicate-charge-faq",
    },
  ],
  [
    5,
    {
      title: "CRM Lookup",
      status: "Tool step · Context ready",
      summary: "Fetches plan and support tier context.",
      description: "Loads customer context that changes how the request should be handled.",
      why: "Makes the workflow feel product-specific rather than a generic canvas toy.",
      configGroups: [
        {
          title: "Lookup",
          fields: [
            { label: "Source", value: "CRM" },
            { label: "Key", value: "customer_id" },
          ],
        },
      ],
      example: "Plan: Pro · Support tier: Priority",
    },
  ],
  [
    6,
    {
      title: "Draft Response",
      status: "AI step · Draft ready",
      summary: "Generates an agent-ready reply draft.",
      description: "Packages the routed context into a visible product outcome.",
      why: "This is the clearest value-creation step in the current bounded proof.",
      configGroups: [
        {
          title: "Response settings",
          fields: [
            { label: "Tone", value: "Support-friendly" },
            { label: "Output", value: "Draft reply + internal notes" },
          ],
        },
      ],
      example: "Draft ready: refund-policy-based response generated",
    },
  ],
  [
    7,
    {
      title: "Review Output",
      status: "Output · Human review",
      summary: "Packages the result for approval.",
      description: "Shows the workflow ending in a human-controlled review step.",
      why: "Keeps the proof honest about bounded autonomy and operational control.",
      configGroups: [
        {
          title: "Review policy",
          fields: [
            { label: "Approval required", value: "Yes" },
            { label: "Escalation path", value: "Billing queue" },
          ],
        },
      ],
      example: "Ready for billing-team approval",
    },
  ],
]);

export const WORKFLOW_SEQUENCE = Array.from(WORKFLOW_DETAILS.keys());
