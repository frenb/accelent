import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface NodeData {
  label: string;
  sourceType: string;
}

const DataSourceNode = memo(({ data, id }: NodeProps<NodeData>) => {
  console.error('Rendering DataSourceNode:', { id, data });

  return (
    <div
      style={{
        padding: '10px',
        borderRadius: '5px',
        background: 'white',
        border: '1px solid #ddd',
        width: '180px',
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ marginBottom: '10px' }}>
        <strong>{data.label}</strong>
      </div>
      <div style={{ fontSize: '12px', color: '#666' }}>
        Type: {data.sourceType}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

DataSourceNode.displayName = 'DataSourceNode';

export { DataSourceNode }; 