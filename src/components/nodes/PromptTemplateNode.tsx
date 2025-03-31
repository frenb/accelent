import React, { useEffect, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useReactFlow } from 'reactflow';
import { NodeData } from '../../types/Pipeline';

interface PromptTemplateNodeProps extends NodeProps<NodeData> {
  onTabAdd: (name: string, content: string, type: string) => void;
  onDelete?: (id: string) => void;
}

export const PromptTemplateNode: React.FC<PromptTemplateNodeProps> = ({ data, id, onTabAdd, onDelete }) => {
  const [inputData, setInputData] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getEdges, getNode, setNodes, getNodes } = useReactFlow();

  // Function to check if this node has input connections
  const hasInputConnection = () => {
    const edges = getEdges();
    return edges.some(edge => edge.target === id);
  };

  // Function to get input data from connected nodes and update node data
  const updateInputData = () => {
    const edges = getEdges();
    const inputEdge = edges.find(edge => edge.target === id);
    if (inputEdge) {
      const sourceNode = getNode(inputEdge.source);
      if (sourceNode) {
        // Update this node's input data with the source node's output
        const nodes = getNodes();
        const updatedNodes = nodes.map(node => {
          if (node.id === id) {
            return {
              ...node,
              data: {
                ...node.data,
                input: sourceNode.data.output || ''
              }
            };
          }
          return node;
        });
        setNodes(updatedNodes);
        setInputData(sourceNode.data.output || '');
      }
    } else {
      // If no input connection, clear the input data
      const nodes = getNodes();
      const updatedNodes = nodes.map(node => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              input: ''
            }
          };
        }
        return node;
      });
      setNodes(updatedNodes);
      setInputData('');
    }
  };

  // Function to update node data
  const updateNodeData = (newData: Partial<NodeData>) => {
    const nodes = getNodes();
    const updatedNodes = nodes.map(node => {
      if (node.id === id) {
        return {
          ...node,
          data: {
            ...node.data,
            ...newData
          }
        };
      }
      return node;
    });
    setNodes(updatedNodes);
  };

  // Function to create a unique output tab name
  const createUniqueOutputName = (baseName: string) => {
    return `${baseName} Output`;
  };

  // Handle double-click on output field
  const handleOutputDoubleClick = useCallback(() => {
    console.log('handleOutputDoubleClick called');
    console.log('Current output:', output);
    console.log('onTabAdd callback:', onTabAdd);
    console.log('Node label:', data.label);
    console.log('Node output:', data.output);

    if (output && onTabAdd) {
      console.log('Creating new tab with output:', output);
      onTabAdd(data.label, output, 'output');
    } else {
      console.log('Cannot create tab - missing output or callback:', { output, onTabAdd });
    }
  }, [output, onTabAdd, data.label, data.output]);

  // Function to execute the prompt
  const executePrompt = async () => {
    if (!data.prompt) return;

    setLoading(true);
    setError(null);

    try {
      const promptWithInput = data.input ? `${data.prompt}\n\nInput: ${data.input}` : data.prompt;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.REACT_APP_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: promptWithInput
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to execute prompt');
      }

      const result = await response.json();
      // Extract the generated text from the Gemini API response
      const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      setOutput(generatedText);
      updateNodeData({ output: generatedText });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Update input data when edges change or when source node output changes
  useEffect(() => {
    updateInputData();
  }, [getEdges(), getNode]);

  // Execute prompt when prompt or input changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      executePrompt();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [data.prompt, data.input]);

  return (
    <div style={{
      background: 'white',
      border: '1px solid #ccc',
      borderRadius: '4px',
      padding: '10px',
      minWidth: '200px',
      maxWidth: '300px'
    }}>
      <Handle type="target" position={Position.Top} />
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '8px',
          borderBottom: '1px solid #eee'
        }}>
          <div style={{
            fontWeight: 'bold',
            color: '#333'
          }}>{data.label}</div>
          {onDelete && (
            <button 
              style={{
                background: 'none',
                border: 'none',
                color: '#999',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0 4px',
                lineHeight: 1
              }}
              onMouseOver={(e) => e.currentTarget.style.color = '#ff4444'}
              onMouseOut={(e) => e.currentTarget.style.color = '#999'}
              onClick={() => onDelete(id)}
            >
              ×
            </button>
          )}
        </div>
        {hasInputConnection() && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div style={{
              fontSize: '12px',
              color: '#666',
              textTransform: 'uppercase'
            }}>INPUT</div>
            <div style={{
              background: '#f5f5f5',
              borderRadius: '4px',
              padding: '8px',
              minHeight: '60px',
              maxHeight: '100px',
              overflowY: 'auto'
            }}>
              {inputData ? (
                <div style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>{inputData}</div>
              ) : (
                <div style={{
                  color: '#999',
                  fontStyle: 'italic'
                }}>No input data</div>
              )}
            </div>
          </div>
        )}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{
            fontSize: '12px',
            color: '#666',
            textTransform: 'uppercase'
          }}>PROMPT</div>
          <div style={{
            background: '#f5f5f5',
            borderRadius: '4px',
            padding: '8px',
            minHeight: '60px',
            maxHeight: '100px',
            overflowY: 'auto'
          }}>
            <div style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>{data.prompt}</div>
          </div>
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{
            fontSize: '12px',
            color: '#666',
            textTransform: 'uppercase'
          }}>GENERATED OUTPUT</div>
          <div 
            style={{
              background: '#f5f5f5',
              borderRadius: '4px',
              padding: '8px',
              minHeight: '60px',
              maxHeight: '100px',
              overflowY: 'auto',
              cursor: output ? 'pointer' : 'default'
            }}
            onDoubleClick={handleOutputDoubleClick}
          >
            {loading ? (
              <div style={{ color: '#666' }}>Generating...</div>
            ) : error ? (
              <div style={{ color: '#ff4444' }}>{error}</div>
            ) : output ? (
              <div style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>{output}</div>
            ) : (
              <div style={{
                color: '#999',
                fontStyle: 'italic'
              }}>No output generated</div>
            )}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}; 