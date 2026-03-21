import { useCallback } from 'react';
import type { Node } from '@xyflow/react';

interface UseOnDropParams {
  screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number };
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
}

export function useOnDrop({ screenToFlowPosition, setNodes }: UseOnDropParams) {
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type: 'default',
        position,
        data: { label: type },
        className: 'min-w-[150px] font-medium',
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes],
  );

  return onDrop;
}
