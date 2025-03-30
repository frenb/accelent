import React, { useEffect, useCallback, useRef } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { NodeData } from '../../types/Pipeline';
import './PromptNode.css';

interface PromptNodeProps extends NodeProps<NodeData> {
  onRemove: (id: string) => void;
}

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

// Keep track of executed nodes across re-renders
const executedNodes = new Set<string>();

// Add CSS for scrollbar styling
const scrollbarStyles = `
  .scrollable-content::-webkit-scrollbar {
    width: 4px;
  }
  .scrollable-content::-webkit-scrollbar-track {
    background: #f1f1f1;
  }
  .scrollable-content::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 2px;
  }
  .scrollable-content {
    scrollbar-width: thin;
    scrollbar-color: #888 #f1f1f1;
  }
  .scrollable-container {
    position: relative;
    max-height: 100px;
    overflow: hidden;
  }
`;

export const PromptNode: React.FC<PromptNodeProps> = ({ data, id, onRemove }) => {
  const { setNodes, getNodes } = useReactFlow();

  const isExecuting = data.output === undefined && data.prompt !== undefined;
  const isJson = data.output && typeof data.output === 'string' && data.output.startsWith('{');

  const formattedOutput = React.useMemo(() => {
    if (!data.output) return null;
    if (isJson) {
      try {
        return JSON.stringify(JSON.parse(data.output), null, 2);
      } catch {
        return data.output;
      }
    }
    return data.output;
  }, [data.output, isJson]);

  const handleOutputDoubleClick = (e: React.MouseEvent) => {
    console.error('Double-click detected on output area');
    e.stopPropagation();
    if (!data.output) {
      console.error('No output available');
      return;
    }
    
    console.error('Dispatching createOutputTab event:', {
      name: `${data.label} Output`,
      content: data.output,
      type: 'display',
      color: '#2196F3'
    });
    
    // Create a new tab with the output
    const event = new CustomEvent('createOutputTab', {
      detail: {
        name: `${data.label} Output`,
        content: data.output,
        type: 'display',
        color: '#2196F3'
      }
    });
    window.dispatchEvent(event);
  };

  const executePrompt = useCallback(async () => {
    if (!data.prompt || !GEMINI_API_KEY) return;

    try {
      const processedPrompt = data.prompt.replace('INPUT', data.input || '');
      console.log('Making Gemini API call:', {
        nodeId: id,
        nodeLabel: data.label,
        prompt: processedPrompt,
        input: data.input
      });

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: processedPrompt
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const output = result.candidates[0].content.parts[0].text;
      
      console.log('Gemini API response:', {
        nodeId: id,
        nodeLabel: data.label,
        output
      });
      
      // Update the node's output through a custom event
      const event = new CustomEvent('updateNodeOutput', {
        detail: {
          nodeId: id,
          output
        }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Error executing prompt:', {
        nodeId: id,
        nodeLabel: data.label,
        error: error instanceof Error ? error.message : 'Failed to execute prompt'
      });
      // Update the node's output with the error message
      const event = new CustomEvent('updateNodeOutput', {
        detail: {
          nodeId: id,
          output: `Error: ${error instanceof Error ? error.message : 'Failed to execute prompt'}`
        }
      });
      window.dispatchEvent(event);
    }
  }, [data.prompt, data.input, id, data.label]);

  useEffect(() => {
    // Execute only on initial creation and if not already executed
    if (!executedNodes.has(id) && data.prompt) {
      executedNodes.add(id);
      executePrompt();
    }

    // Listen for tab content updates
    const handleTabUpdate = (event: CustomEvent) => {
      const { tabId, content } = event.detail;
      if (tabId === id) {
        executePrompt();
      }
    };

    window.addEventListener('tabContentUpdated', handleTabUpdate as EventListener);
    return () => {
      window.removeEventListener('tabContentUpdated', handleTabUpdate as EventListener);
    };
  }, [executePrompt, id]);

  const handleScroll = (e: React.WheelEvent<HTMLPreElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const pre = e.currentTarget;
    pre.scrollTop += e.deltaY;
  };

  const handleDelete = useCallback((e: React.MouseEvent) => {
    console.error('Delete button clicked for node:', id);
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // Call the onRemove prop directly
      if (onRemove) {
        console.error('Calling onRemove with id:', id);
        onRemove(id);
      } else {
        console.error('No onRemove handler provided');
      }
    } catch (error) {
      console.error('Error deleting node:', error);
    }
  }, [id, onRemove]);

  return (
    <div className="prompt-node">
      <Handle type="target" position={Position.Top} />
      <div className="prompt-node-header">
        <div className="prompt-node-title">
          <div className="prompt-node-circle">P</div>
          <div className="prompt-node-label">{data.label}</div>
        </div>
        <button 
          className="prompt-node-delete"
          onClick={handleDelete}
          type="button"
          aria-label="Delete node"
        >
          ×
        </button>
      </div>
      <div className="prompt-node-content">
        {isExecuting ? (
          <div className="executing">
            <div className="spinner" />
            Executing...
          </div>
        ) : (
          <>
            {data.prompt && (
              <div className="prompt-section">
                <div className="section-label">Prompt:</div>
                <pre className="section-content">{data.prompt}</pre>
              </div>
            )}
            {data.input && (
              <div className="input-section">
                <div className="section-label">Input:</div>
                <div className="scrollable-container">
                  <pre 
                    className="scrollable-content" 
                    style={{ cursor: 'pointer' }}
                    onWheel={handleScroll}
                  >
                    {data.input}
                  </pre>
                </div>
              </div>
            )}
            {formattedOutput && (
              <div className="output-section">
                <div className="section-label">Output:</div>
                <div 
                  className="scrollable-container"
                  style={{ cursor: 'pointer' }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleOutputDoubleClick(e);
                  }}
                >
                  <pre 
                    className="scrollable-content"
                    style={{ cursor: 'pointer' }}
                    onWheel={handleScroll}
                    title="Double-click to create output tab"
                  >
                    {formattedOutput}
                  </pre>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default PromptNode; 