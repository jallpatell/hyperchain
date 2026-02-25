  import React from 'react';
  
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type: 'default', // Using default for MVP, but styled
        position,
        data: { label: type },
        className: 'min-w-[150px] font-medium'
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes],
  );

  export default onDrop;