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
  const { getEdges } = useReactFlow();

  // Function to check if this node has input connections
  const hasInputConnection = () => {
    const edges = getEdges();
    return edges.some(edge => edge.target === id);
  };

  // Function to get input data from connected nodes
  const getInputData = () => {
    const edges = getEdges();
    const inputEdge = edges.find(edge => edge.target === id);
    if (inputEdge) {
      // TODO: Get the actual input data from the source node
      return "Input data from connected node";
    }
    return "";
  };

  // Function to execute the prompt
  const executePrompt = async () => {
    if (!data.prompt) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.REACT_APP_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: data.prompt
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Execute prompt when component mounts or prompt changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      executePrompt();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [data.prompt]);

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
            {getInputData()}
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