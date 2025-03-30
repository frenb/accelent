import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData } from '../../types/Pipeline';

interface DisplayNodeProps extends NodeProps<NodeData> {
  onRemove: (id: string) => void;
}

export const DisplayNode: React.FC<DisplayNodeProps> = ({ data, id, onRemove }) => {
  return (
    <div className="node-container" style={{
      padding: '10px',
      borderRadius: '5px',
      background: 'white',
      border: '1px solid #ccc',
      width: '180px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      position: 'relative',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      fontFamily: '"Open Sans", sans-serif'
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#9C27B0' }} />
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%'
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          background: '#9C27B0',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
          fontFamily: '"Open Sans", sans-serif'
        }}>
          D
        </div>
        <span style={{ flex: 1, fontSize: '14px', fontFamily: '"Open Sans", sans-serif' }}>{data.label}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(id);
          }}
          style={{
            width: '20px',
            height: '20px',
            padding: 0,
            border: 'none',
            background: 'transparent',
            color: '#666',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            borderRadius: '50%',
            transition: 'all 0.2s ease',
            opacity: 0,
            position: 'absolute',
            right: '4px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.background = 'rgba(0,0,0,0.1)';
            e.currentTarget.style.color = '#000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0';
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#666';
          }}
        >
          ×
        </button>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#9C27B0' }} />
    </div>
  );
}; 