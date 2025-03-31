import React, { useEffect, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useReactFlow } from 'reactflow';

interface PromptTemplateData {
  label: string;
  prompt: string;
  input: string;
  output: string;
  tabId: string;
}

export function PromptTemplateNode({ data, id }: NodeProps<PromptTemplateData>) {
  const [output, setOutput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
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
      }
    }
  };

  // Function to update node data
  const updateNodeData = (newData: Partial<PromptTemplateData>) => {
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

  // Function to execute the prompt
  const executePrompt = async () => {
    if (!data.prompt) return;

    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  // Update input data when edges change or when source node output changes
  useEffect(() => {
    const edges = getEdges();
    const inputEdge = edges.find(edge => edge.target === id);
    if (inputEdge) {
      const sourceNode = getNode(inputEdge.source);
      if (sourceNode) {
        updateInputData();
      }
    }
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
      padding: '10px',
      borderRadius: '5px',
      background: '#fff',
      border: '1px solid #ddd',
      minWidth: '200px',
      maxWidth: '300px',
    }}>
      <Handle type="target" position={Position.Top} />
      <div style={{ marginBottom: '10px' }}>
        <strong>{data.label}</strong>
      </div>

      {/* Input Section */}
      {hasInputConnection() && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>INPUT</div>
          <div style={{
            padding: '8px',
            background: '#f5f5f5',
            borderRadius: '4px',
            fontSize: '12px',
            maxHeight: '100px',
            overflow: 'auto'
          }}>
            {data.input}
          </div>
        </div>
      )}

      {/* Prompt Section */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>PROMPT</div>
        <div style={{
          padding: '8px',
          background: '#f5f5f5',
          borderRadius: '4px',
          fontSize: '12px',
          maxHeight: '100px',
          overflow: 'auto'
        }}>
          {data.prompt}
        </div>
      </div>

      {/* Output Section */}
      <div>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>GENERATED OUTPUT</div>
        <div style={{
          padding: '8px',
          background: '#f5f5f5',
          borderRadius: '4px',
          fontSize: '12px',
          maxHeight: '100px',
          overflow: 'auto'
        }}>
          {isLoading ? (
            <div style={{ color: '#666' }}>Generating...</div>
          ) : error ? (
            <div style={{ color: '#d32f2f' }}>{error}</div>
          ) : (
            output
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
} 