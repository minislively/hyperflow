import { useCallback, useState } from "react";
import type { PocNode } from "@hyperflow/sdk";

export type WorkflowNodesUpdater = PocNode[] | ((nodes: PocNode[]) => PocNode[]);
export type WorkflowNodeDataPatch<TNode extends PocNode = PocNode> =
  | Partial<TNode>
  | ((node: TNode) => Partial<TNode> | TNode);

function resolveNodes(next: WorkflowNodesUpdater, current: PocNode[]) {
  return typeof next === "function" ? next(current) : next;
}

export function useWorkflowNodesState(initialNodes: PocNode[]) {
  const [nodes, setNodes] = useState<PocNode[]>(initialNodes);

  const onNodesChange = useCallback((next: WorkflowNodesUpdater) => {
    setNodes((current) => resolveNodes(next, current));
  }, []);

  return [nodes, setNodes, onNodesChange] as const;
}

export function updateNodeData<TNode extends PocNode = PocNode>(
  setNodes: React.Dispatch<React.SetStateAction<TNode[]>>,
  nodeId: number,
  patchOrUpdater: WorkflowNodeDataPatch<TNode>,
) {
  setNodes((current) =>
    current.map((node) => {
      if (Number(node.id) !== Number(nodeId)) return node;

      const patch = typeof patchOrUpdater === "function" ? patchOrUpdater(node) : patchOrUpdater;
      return { ...node, ...patch };
    }),
  );
}
