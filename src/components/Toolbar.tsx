import React from 'react';
import { NodeType } from '../types/Pipeline';

interface ToolbarProps {
  onAddNode: (type: NodeType) => void;
  editorWidth: number; // Width in percentage
}

export const Toolbar: React.FC<ToolbarProps> = ({ onAddNode, editorWidth }) => {
  return (
    <div style={{
      position: 'absolute',
      top: 10,
      left: `${editorWidth + 1}%`, // Position after the editor panel
      zIndex: 4,
      background: 'white',
      padding: '10px',
      borderRadius: '5px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      fontFamily: '"Open Sans", sans-serif',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <button 
        onClick={() => onAddNode(NodeType.DATA_SOURCE)}
        style={{
          padding: '8px 16px',
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 500,
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span style={{ 
          width: '20px', 
          height: '20px', 
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px'
        }}>DS</span>
        Add Data Source
      </button>
      <button 
        onClick={() => onAddNode(NodeType.PROMPT_TEMPLATE)}
        style={{
          padding: '8px 16px',
          background: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 500,
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span style={{ 
          width: '20px', 
          height: '20px', 
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px'
        }}>P</span>
        Add Prompt
      </button>
      <button 
        onClick={() => onAddNode(NodeType.SPREADSHEET)}
        style={{
          padding: '8px 16px',
          background: '#34a853', // Google Sheets green color
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 500,
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span style={{ 
          width: '20px', 
          height: '20px', 
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px'
        }}>GS</span>
        Add Spreadsheet
      </button>
      <button 
        onClick={() => onAddNode(NodeType.DISPLAY)}
        style={{
          padding: '8px 16px',
          background: '#9C27B0',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 500,
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span style={{ 
          width: '20px', 
          height: '20px', 
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px'
        }}>D</span>
        Add Display
      </button>
    </div>
  );
}; 