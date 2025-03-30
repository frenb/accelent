import React from 'react';
import { Handle, Position } from 'reactflow';

interface DataSourceNodeProps {
  data: {
    label: string;
    sourceType: 'csv' | 'googleSheets';
    sourceConfig: {
      url?: string;
      content?: string;
    };
  };
}

export const DataSourceNode: React.FC<DataSourceNodeProps> = ({ data }) => {
  return (
    <div className="data-source-node">
      <Handle type="source" position={Position.Right} />
      <div className="node-content">
        <h3>{data.label}</h3>
        <div className="node-type">
          {data.sourceType === 'csv' ? 'CSV Import' : 'Google Sheets'}
        </div>
        <div className="node-actions">
          <button onClick={() => {/* Implement file upload or sheets connection */}}>
            Configure Source
          </button>
        </div>
      </div>
    </div>
  );
}; 