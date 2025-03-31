import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData } from '../../types/Pipeline';

interface DataSourceNodeProps extends NodeProps<NodeData> {
  onDelete?: (nodeId: string) => void;
}

const DataSourceNode = memo(({ data, id, onDelete }: DataSourceNodeProps) => {
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
      {onDelete && (
        <button
          onClick={() => onDelete(id)}
          style={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 5px',
            color: '#ff4444',
            fontSize: '12px',
            pointerEvents: 'auto'
          }}
        >
          ×
        </button>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

DataSourceNode.displayName = 'DataSourceNode';

export { DataSourceNode }; 