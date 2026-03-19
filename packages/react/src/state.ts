import { useCallback, useState } from "react";
import type { PocNode } from "@hyperflow/sdk";

export type WorkflowNodesUpdater<TNode extends PocNode = PocNode> = TNode[] | ((nodes: TNode[]) => TNode[]);
export type WorkflowNodeDataPatch<TNode extends PocNode = PocNode> =
  | Partial<TNode>
  | ((node: TNode) => Partial<TNode> | TNode);

function resolveNodes<TNode extends PocNode>(next: WorkflowNodesUpdater<TNode>, current: TNode[]) {
  return typeof next === "function" ? next(current) : next;
}

export function useWorkflowNodesState<TNode extends PocNode>(initialNodes: TNode[]) {
  const [nodes, setNodes] = useState<TNode[]>(initialNodes);

  const onNodesChange = useCallback((next: WorkflowNodesUpdater<TNode>) => {
    setNodes((current) => resolveNodes(next, current));
  }, []);

  return [nodes, setNodes, onNodesChange] as const;
}

export function updateNodeData<TNode extends PocNode>(
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
