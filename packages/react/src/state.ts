import { useCallback, useState } from "react";
import type { PocEdge, PocNode } from "@hyperflow/sdk";

export type WorkflowNodesUpdater<TNode extends PocNode = PocNode> = TNode[] | ((nodes: TNode[]) => TNode[]);
export type WorkflowNodeDataPatch<TNode extends PocNode = PocNode> =
  | Partial<TNode>
  | ((node: TNode) => Partial<TNode> | TNode);
export type WorkflowEdgesUpdater<TEdge extends PocEdge = PocEdge> = TEdge[] | ((edges: TEdge[]) => TEdge[]);

function resolveNodes<TNode extends PocNode>(next: WorkflowNodesUpdater<TNode>, current: TNode[]) {
  return typeof next === "function" ? next(current) : next;
}

function resolveEdges<TEdge extends PocEdge>(next: WorkflowEdgesUpdater<TEdge>, current: TEdge[]) {
  return typeof next === "function" ? next(current) : next;
}

export function useWorkflowNodesState<TNode extends PocNode>(initialNodes: TNode[]) {
  const [nodes, setNodes] = useState<TNode[]>(initialNodes);

  const onNodesChange = useCallback((next: WorkflowNodesUpdater<TNode>) => {
    setNodes((current) => resolveNodes(next, current));
  }, []);

  return [nodes, setNodes, onNodesChange] as const;
}

export function useWorkflowEdgesState<TEdge extends PocEdge>(initialEdges: TEdge[]) {
  const [edges, setEdges] = useState<TEdge[]>(initialEdges);

  const onEdgesChange = useCallback((next: WorkflowEdgesUpdater<TEdge>) => {
    setEdges((current) => resolveEdges(next, current));
  }, []);

  return [edges, setEdges, onEdgesChange] as const;
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
