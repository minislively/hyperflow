import { useCallback, useMemo, useState } from "react";
import type { PocNode } from "@hyperflow/sdk";

export type WorkflowSelection = {
  nodeId: number | null;
};

export type WorkflowSelectionUpdater =
  | WorkflowSelection
  | ((selection: WorkflowSelection) => WorkflowSelection);

function resolveSelection(next: WorkflowSelectionUpdater, current: WorkflowSelection) {
  return typeof next === "function" ? next(current) : next;
}

export function useWorkflowSelection(initialSelection: WorkflowSelection = { nodeId: null }) {
  const [selection, setSelection] = useState<WorkflowSelection>(initialSelection);

  const onSelectionChange = useCallback((next: WorkflowSelectionUpdater) => {
    setSelection((current) => resolveSelection(next, current));
  }, []);

  return [selection, setSelection, onSelectionChange] as const;
}

export function useSelectedNode<TNode extends PocNode>({
  nodes,
  selection,
}: {
  nodes: TNode[];
  selection: WorkflowSelection;
}) {
  return useMemo(
    () => nodes.find((node) => Number(node.id) === Number(selection.nodeId)) ?? null,
    [nodes, selection.nodeId],
  );
}
