import React from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onDelete: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, onDelete }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: y,
        left: x,
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 1000,
        padding: '4px 0',
        minWidth: '160px',
        fontFamily: '"Open Sans", sans-serif'
      }}
    >
      <button
        onClick={onDelete}
        style={{
          display: 'block',
          width: '100%',
          padding: '8px 16px',
          border: 'none',
          background: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          color: '#ff4444',
          fontSize: '14px',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f5f5f5';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'none';
        }}
      >
        Delete Connection
      </button>
    </div>
  );
}; 