import React, { useEffect, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { NodeProps } from 'reactflow';

interface GoogleSheetsNodeData {
  label: string;
  input?: string;
  output?: string;
  isExecuting?: boolean;
}

interface GoogleSheetsNodeProps extends NodeProps<GoogleSheetsNodeData> {
  onRemove: (id: string) => void;
}

const styles = {
  node: {
    padding: '10px',
    borderRadius: '5px',
    background: 'white',
    border: '1px solid #ccc',
    width: '180px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    position: 'relative' as const,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    fontFamily: '"Open Sans", sans-serif'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%'
  },
  circle: {
    width: '24px',
    height: '24px',
    background: '#34a853',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
    fontFamily: '"Open Sans", sans-serif'
  },
  label: {
    flex: 1,
    fontSize: '14px',
    fontFamily: '"Open Sans", sans-serif'
  },
  handle: {
    width: '8px',
    height: '8px',
    background: '#34a853',
    border: '2px solid white',
    borderRadius: '50%'
  }
};

export function GoogleSheetsNode({ data, id, onRemove }: GoogleSheetsNodeProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [output, setOutput] = useState<string | undefined>(data.output);

  useEffect(() => {
    if (data.input && !output && !isExecuting) {
      createGoogleSheet(data.input);
    }
  }, [data.input, id]);

  const createGoogleSheet = async (input: string) => {
    try {
      setIsExecuting(true);
      console.log('Creating Google Sheet with input:', input);

      // Parse the input data
      let parsedData;
      try {
        parsedData = JSON.parse(input);
      } catch (e) {
        console.error('Failed to parse input data:', e);
        throw new Error('Input must be valid JSON data');
      }

      // Call the Google Sheets API
      const response = await fetch('/api/google-sheets/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: parsedData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create Google Sheet');
      }

      const result = await response.json();
      console.log('Google Sheet created:', result);

      // Update the node with the sheet URL
      setOutput(result.sheetUrl);
      data.output = result.sheetUrl;
    } catch (error: any) {
      console.error('Error creating Google Sheet:', error);
      setOutput(`Error: ${error.message}`);
      data.output = `Error: ${error.message}`;
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div style={styles.node}>
      <Handle type="target" position={Position.Top} style={styles.handle} />
      <div style={styles.header}>
        <div style={styles.circle}>GS</div>
        <div style={styles.label}>{data.label}</div>
        <button
          onClick={() => onRemove(id)}
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
      <Handle type="source" position={Position.Bottom} style={styles.handle} />
    </div>
  );
} 