import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, { 
  Background,
  Controls,
  Connection,
  Edge,
  Node as FlowNode,
  applyNodeChanges,
  addEdge,
  ReactFlowProvider,
  useReactFlow,
  Panel,
  NodeChange,
  EdgeChange,
  useStore,
  NodeProps,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Node, Pipeline, NodeType, NodeData } from './types/Pipeline';
import { Toolbar } from './components/Toolbar';
import { EditorPanel } from './components/EditorPanel';
import { DataSourceNode } from './components/nodes/DataSourceNode';
import { PromptNode } from './components/nodes/PromptNode';
import { DisplayNode } from './components/nodes/DisplayNode';
import { ContextMenu } from './components/ContextMenu';
import { GoogleSheetsNode } from './components/nodes/GoogleSheetsNode';
import { SpreadsheetNode } from './components/nodes/SpreadsheetNode';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 100;

interface PipelineEditorProps {
  pipeline: Pipeline;
  onChange: (pipeline: Pipeline) => void;
}

const findClosestNode = (nodes: FlowNode<NodeData>[], position: { x: number, y: number }): FlowNode<NodeData> | null => {
  let closestNode: FlowNode<NodeData> | null = null;
  let minDistance = Infinity;

  nodes.forEach(node => {
    const dx = node.position.x - position.x;
    const dy = node.position.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestNode = node;
    }
  });

  return closestNode;
};

const createConnection = (sourceNode: FlowNode<NodeData>, targetNode: FlowNode<NodeData>) => {
  const isAbove = sourceNode.position.y < targetNode.position.y;
  
  return {
    id: `edge-${sourceNode.id}-${targetNode.id}`,
    source: isAbove ? sourceNode.id : targetNode.id,
    target: isAbove ? targetNode.id : sourceNode.id,
    type: 'smoothstep',
    animated: true
  };
};

const PipelineEditorContent: React.FC<PipelineEditorProps> = ({ pipeline, onChange }) => {
  const [nodes, setNodes] = useState<FlowNode<NodeData>[]>(pipeline.nodes || []);
  const [edges, setEdges] = useState<Edge[]>(pipeline.edges || []);
  const [editorWidth, setEditorWidth] = useState(50); // Width in percentage
  const [isResizing, setIsResizing] = useState(false);
  const { screenToFlowPosition } = useReactFlow();
  const [selectedNode, setSelectedNode] = useState<FlowNode<NodeData> | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    nodeId: string;
    edgeId: string;
  } | null>(null);

  // Add event listener for node output updates
  React.useEffect(() => {
    const handleNodeOutputUpdate = (event: CustomEvent) => {
      const { nodeId, output } = event.detail;
      setNodes((nds) => {
        const updatedNodes = nds.map(node => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                output
              }
            };
          }
          return node;
        });
        onChange({ ...pipeline, nodes: updatedNodes });
        return updatedNodes;
      });
    };

    window.addEventListener('updateNodeOutput', handleNodeOutputUpdate as EventListener);
    return () => {
      window.removeEventListener('updateNodeOutput', handleNodeOutputUpdate as EventListener);
    };
  }, [pipeline, onChange]);

  const removeNode = useCallback((nodeId: string) => {
    setNodes((nds) => {
      const updatedNodes = nds.filter(node => node.id !== nodeId);
      onChange({ ...pipeline, nodes: updatedNodes });
      return updatedNodes;
    });
    
    // Also remove any edges connected to this node
    setEdges((eds) => {
      const updatedEdges = eds.filter(edge => edge.source !== nodeId && edge.target !== nodeId);
      onChange({ ...pipeline, edges: updatedEdges });
      return updatedEdges;
    });
  }, [pipeline, onChange]);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const container = document.getElementById('pipeline-container');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    // Limit the width between 30% and 70% of the container
    const clampedWidth = Math.min(Math.max(newWidth, 30), 70);
    setEditorWidth(clampedWidth);
  }, [isResizing]);

  React.useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }

    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  const onNodesChange = (changes: any) => {
    setNodes((nds) => {
      const updatedNodes = applyNodeChanges(changes, nds);
      onChange({ ...pipeline, nodes: updatedNodes });
      return updatedNodes;
    });
  };

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => {
      const updatedEdges = addEdge(connection, eds);
      onChange({ ...pipeline, edges: updatedEdges });
      return updatedEdges;
    });

    // Get the source and target nodes
    const sourceNode = nodes.find(node => node.id === connection.source);
    const targetNode = nodes.find(node => node.id === connection.target);

    if (sourceNode && targetNode) {
      // Update the target node with the source node's output as input
      setNodes((nds) => {
        const updatedNodes = nds.map(node => {
          if (node.id === targetNode.id) {
            // Keep the original prompt but add the input from the source node
            return {
              ...node,
              data: {
                ...node.data,
                input: sourceNode.data.output || '', // Set the input to the source node's output
                output: undefined // Reset the output since we're updating the input
              }
            };
          }
          return node;
        });
        onChange({ ...pipeline, nodes: updatedNodes });
        return updatedNodes;
      });
    }
  }, [nodes, pipeline, onChange]);

  const createNodeTypes = useCallback((onRemove: (nodeId: string) => void) => ({
    [NodeType.DATA_SOURCE]: (props: any) => {
      console.log('Rendering DataSourceNode with props:', props);
      return <DataSourceNode {...props} onRemove={onRemove} />;
    },
    [NodeType.PROMPT_TEMPLATE]: (props: any) => {
      console.log('Rendering PromptTemplateNode with props:', props);
      return <PromptNode {...props} onRemove={onRemove} />;
    },
    [NodeType.SPREADSHEET]: (props: any) => {
      console.log('Rendering SpreadsheetNode with props:', props);
      return <SpreadsheetNode {...props} onRemove={onRemove} />;
    },
    [NodeType.DISPLAY]: (props: any) => {
      console.log('Rendering DisplayNode with props:', props);
      return <DisplayNode {...props} onRemove={onRemove} />;
    }
  }), []);

  // Add a debug log to check if nodeTypes is being used
  React.useEffect(() => {
    console.log('Current nodeTypes:', createNodeTypes(removeNode));
  }, [createNodeTypes, removeNode]);

  const onAddNode = useCallback((type: NodeType) => {
    // Find the lowest y position of existing nodes
    const lowestY = nodes.reduce((maxY, node) => Math.max(maxY, node.position.y), 0);
    
    // Find the lowest node to get its x position
    const lowestNode = nodes.reduce((lowest, node) => {
      return node.position.y > lowest.position.y ? node : lowest;
    }, nodes[0]);
    
    // Use the lowest node's x position for horizontal alignment
    const xPosition = lowestNode ? lowestNode.position.x : (window.innerWidth / 2) - (NODE_WIDTH / 2);
    
    // Generate unique name if duplicate exists
    let nodeName = `New ${type.replace('_', ' ')}`;
    let counter = 1;
    while (nodes.some(node => node.data.label === nodeName)) {
      nodeName = `New ${type.replace('_', ' ')} (Copy ${counter})`;
      counter++;
    }

    const newNode: FlowNode<NodeData> = {
      id: `node-${Date.now()}`,
      type: type,
      position: {
        x: xPosition,
        y: lowestY + 100 // Place 100 pixels below the lowest node
      },
      data: { 
        label: nodeName,
        ...(type === NodeType.DATA_SOURCE && {
          sourceType: 'csv',
          sourceConfig: {},
          input: '',
          output: undefined,
          tabId: `tab-${Date.now()}`
        }),
        ...(type === NodeType.PROMPT_TEMPLATE && {
          prompt: '',
          input: '',
          output: undefined,
          tabId: `tab-${Date.now()}`
        }),
        ...(type === NodeType.SPREADSHEET && {
          sourceType: 'spreadsheet',
          sourceConfig: {},
          input: '',
          output: undefined,
          tabId: `tab-${Date.now()}`
        }),
        ...(type === NodeType.DISPLAY && {
          displayType: 'table',
          tabId: `tab-${Date.now()}`
        })
      }
    };

    setNodes((nds) => {
      const updatedNodes = [...nds, newNode];
      onChange({ ...pipeline, nodes: updatedNodes });
      return updatedNodes;
    });

    if (lowestNode) {
      // Create connection from bottom of lowest node to top of new node
      const newEdge = {
        id: `edge-${lowestNode.id}-${newNode.id}`,
        source: lowestNode.id,
        target: newNode.id,
        type: 'smoothstep',
        animated: true
      };

      setEdges((eds) => {
        const updatedEdges = [...eds, newEdge];
        onChange({ ...pipeline, edges: updatedEdges });
        return updatedEdges;
      });

      // Update the new node with the input from the lowest node
      setNodes((nds) => {
        const updatedNodes = nds.map(node => {
          if (node.id === newNode.id) {
            return {
              ...node,
              data: {
                ...node.data,
                input: lowestNode.data.output || '',
                output: undefined // Reset output since we're updating input
              }
            };
          }
          return node;
        });
        onChange({ ...pipeline, nodes: updatedNodes });
        return updatedNodes;
      });
    }
  }, [nodes, pipeline, onChange]);

  const onTabDrop = useCallback((tabId: string, nodeId: string, tabName: string, content: string) => {
    // We're dropping on the canvas
    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

    // Center the node on the drop position
    const centeredPosition = {
      x: position.x - NODE_WIDTH / 2,
      y: position.y - NODE_HEIGHT / 2
    };

    // Generate unique name if duplicate exists
    let nodeName = tabName;
    let counter = 1;
    while (nodes.some(node => node.data.label === nodeName)) {
      nodeName = `${tabName} (Copy ${counter})`;
      counter++;
    }

    // Determine node type from the nodeId
    const nodeType = nodeId.startsWith('data-source') 
      ? NodeType.DATA_SOURCE 
      : nodeId.startsWith('prompt-template')
        ? NodeType.PROMPT_TEMPLATE
        : nodeId.startsWith('spreadsheet')
          ? NodeType.SPREADSHEET
          : NodeType.DISPLAY;

    // Find the closest node to get its output
    const closestNode = findClosestNode(nodes, centeredPosition);
    const sourceOutput = closestNode?.data.output || '';

    const newNode: FlowNode<NodeData> = {
      id: `node-${Date.now()}`,
      type: nodeType,
      position: centeredPosition,
      data: { 
        label: nodeName,
        ...(nodeType === NodeType.DATA_SOURCE && {
          sourceType: 'csv',
          sourceConfig: {}
        }),
        ...(nodeType === NodeType.PROMPT_TEMPLATE && {
          prompt: content,  // Use the content from the tab
          input: sourceOutput, // Set input to the source node's output
          output: undefined,
          tabId
        }),
        ...(nodeType === NodeType.SPREADSHEET && {
          sourceType: 'spreadsheet',
          sourceConfig: {},
          input: sourceOutput,
          output: undefined,
          tabId
        }),
        ...(nodeType === NodeType.DISPLAY && {
          displayType: 'table'
        }),
        tabId
      }
    };
    
    console.log('Creating new node from tab:', newNode);
    
    setNodes((nds) => {
      const updatedNodes = [...nds, newNode];
      onChange({ ...pipeline, nodes: updatedNodes });
      return updatedNodes;
    });

    // Find and connect to closest node
    if (closestNode) {
      const newEdge = createConnection(closestNode, newNode);
      setEdges((eds) => {
        const updatedEdges = [...(eds || []), newEdge];
        onChange({ ...pipeline, edges: updatedEdges });
        return updatedEdges;
      });
    }
  }, [nodes, pipeline, onChange, screenToFlowPosition]);

  const onTabContentChange = useCallback((tabId: string, content: string) => {
    console.log('Tab content changed:', { tabId, content });
    
    setNodes((nds) => {
      const updatedNodes = nds.map(node => {
        if (node.data.tabId === tabId) {
          console.log('Updating node with new content:', { nodeId: node.id, content });
          return {
            ...node,
            data: {
              ...node.data,
              prompt: content,
              output: undefined // Reset output to trigger new Gemini call
            }
          };
        }
        return node;
      });
      onChange({ ...pipeline, nodes: updatedNodes });
      return updatedNodes;
    });
  }, [pipeline, onChange]);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const nodeId = event.dataTransfer.getData('nodeId');
    const tabId = event.dataTransfer.getData('tabId');
    const tabName = event.dataTransfer.getData('tabName');
    const tabContent = event.dataTransfer.getData('tabContent');

    console.log('Drop event:', { nodeId, tabId, tabName, tabContent });

    // Get the target node if we're dropping on a node
    const targetNodeId = event.dataTransfer.getData('targetNodeId');
    const targetNode = targetNodeId ? nodes.find(n => n.id === targetNodeId) : null;

    if (targetNode) {
      // We're dropping on a node
      console.log('Dropping on node:', targetNode);
      
      // Update the target node's properties based on the dropped data
      setNodes((nds) => {
        const updatedNodes = nds.map(node => {
          if (node.id === targetNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...(nodeId.startsWith('data-source') && {
                  sourceType: 'csv',
                  sourceConfig: {}
                }),
                ...(nodeId.startsWith('prompt-template') && {
                  prompt: tabContent,
                  input: targetNode.data.input || '',
                  output: undefined
                }),
                ...(nodeId.startsWith('spreadsheet') && {
                  sourceType: 'spreadsheet',
                  sourceConfig: {},
                  input: targetNode.data.input || '',
                  output: undefined
                }),
                ...(nodeId.startsWith('display') && {
                  displayType: 'table'
                }),
                tabId
              }
            };
          }
          return node;
        });
        onChange({ ...pipeline, nodes: updatedNodes });
        return updatedNodes;
      });
    } else {
      // We're dropping on the canvas
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Center the node on the drop position
      const centeredPosition = {
        x: position.x - NODE_WIDTH / 2,
        y: position.y - NODE_HEIGHT / 2
      };

      // Generate unique name if duplicate exists
      let nodeName = tabName;
      let counter = 1;
      while (nodes.some(node => node.data.label === nodeName)) {
        nodeName = `${tabName} (Copy ${counter})`;
        counter++;
      }

      // Determine node type from the nodeId
      const nodeType = nodeId.startsWith('data-source') 
        ? NodeType.DATA_SOURCE 
        : nodeId.startsWith('prompt-template')
          ? NodeType.PROMPT_TEMPLATE
          : nodeId.startsWith('spreadsheet')
            ? NodeType.SPREADSHEET
            : NodeType.DISPLAY;

      // Find the closest node to get its output
      const closestNode = findClosestNode(nodes, centeredPosition);
      const sourceOutput = closestNode?.data.output || '';

      const newNode: FlowNode<NodeData> = {
        id: `node-${Date.now()}`,
        type: nodeType,
        position: centeredPosition,
        data: { 
          label: nodeName,
          ...(nodeType === NodeType.DATA_SOURCE && {
            sourceType: 'csv',
            sourceConfig: {}
          }),
          ...(nodeType === NodeType.PROMPT_TEMPLATE && {
            prompt: tabContent,
            input: sourceOutput,
            output: undefined,
            tabId
          }),
          ...(nodeType === NodeType.SPREADSHEET && {
            sourceType: 'spreadsheet',
            sourceConfig: {},
            input: sourceOutput,
            output: undefined,
            tabId
          }),
          ...(nodeType === NodeType.DISPLAY && {
            displayType: 'table'
          }),
          tabId
        }
      };
      
      console.log('Creating new node from drop:', newNode);
      
      setNodes((nds) => {
        const updatedNodes = [...nds, newNode];
        onChange({ ...pipeline, nodes: updatedNodes });
        return updatedNodes;
      });

      // Find and connect to closest node
      if (closestNode) {
        const newEdge = createConnection(closestNode, newNode);
        setEdges((eds) => {
          const updatedEdges = [...(eds || []), newEdge];
          onChange({ ...pipeline, edges: updatedEdges });
          return updatedEdges;
        });
      }
    }
  }, [nodes, pipeline, onChange, screenToFlowPosition]);

  const onNodeDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // Get the target node if we're dragging over a node
    const targetNodeId = event.dataTransfer.getData('targetNodeId');
    const targetNode = targetNodeId ? nodes.find(n => n.id === targetNodeId) : null;

    if (targetNode) {
      // We're dragging over a node
      console.log('Dragging over node:', targetNode);
      
      // Update the target node's properties based on the dragged data
      setNodes((nds) => {
        const updatedNodes = nds.map(node => {
          if (node.id === targetNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...(event.dataTransfer.getData('nodeId').startsWith('data-source') && {
                  sourceType: 'csv',
                  sourceConfig: {}
                }),
                ...(event.dataTransfer.getData('nodeId').startsWith('prompt-template') && {
                  prompt: event.dataTransfer.getData('tabContent'),
                  input: targetNode.data.input || '',
                  output: undefined
                }),
                ...(event.dataTransfer.getData('nodeId').startsWith('spreadsheet') && {
                  sourceType: 'spreadsheet',
                  sourceConfig: {},
                  input: targetNode.data.input || '',
                  output: undefined
                }),
                ...(event.dataTransfer.getData('nodeId').startsWith('display') && {
                  displayType: 'table'
                }),
                tabId: event.dataTransfer.getData('tabId')
              }
            };
          }
          return node;
        });
        onChange({ ...pipeline, nodes: updatedNodes });
        return updatedNodes;
      });
    }
  }, [nodes, pipeline, onChange]);

  const handleClearAll = useCallback(() => {
    setNodes([]);
    setEdges([]);
    onChange({ ...pipeline, nodes: [], edges: [] });
  }, [pipeline, onChange]);

  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      nodeId: '',
      edgeId: edge.id
    });
  }, []);

  const handleDeleteEdge = useCallback((edgeId: string) => {
    setEdges(edges => {
      const updatedEdges = edges.filter(edge => edge.id !== edgeId);
      onChange({ ...pipeline, edges: updatedEdges });
      return updatedEdges;
    });
    setContextMenu(null);
  }, [pipeline, onChange]);

  // Close context menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };

    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu]);

  console.log('Initial nodes:', pipeline.nodes);
  console.log('Current nodes:', nodes);
  console.log('Node types:', createNodeTypes(removeNode));
  console.log('NodeType enum:', NodeType);

  return (
    <div id="pipeline-container" style={{ 
      width: '100%', 
      height: '100vh', 
      display: 'flex',
      fontFamily: '"Open Sans", sans-serif'
    }}>
      <div style={{ width: `${editorWidth}%`, height: '100vh' }}>
        <EditorPanel 
          onTabDrop={onTabDrop}
          onTabContentChange={onTabContentChange}
        />
      </div>
      <div 
        style={{
          width: '8px',
          height: '100vh',
          background: '#e0e0e0',
          cursor: 'col-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseDown={startResizing}
      >
        <div style={{
          width: '2px',
          height: '100%',
          background: '#bdbdbd'
        }} />
      </div>
      <div style={{ width: `${100 - editorWidth}%`, height: '100vh' }}>
        <Toolbar onAddNode={onAddNode} editorWidth={editorWidth} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
          nodeTypes={createNodeTypes(removeNode)}
          onEdgeContextMenu={handleEdgeContextMenu}
          onDrop={onDrop}
          onDragOver={onNodeDragOver}
        fitView
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          style={{ fontFamily: '"Open Sans", sans-serif' }}
      >
        <Background />
        <Controls />
          <Panel position="top-right">
            <button
              onClick={handleClearAll}
              style={{
                padding: '8px 16px',
                background: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'background-color 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                fontFamily: '"Open Sans", sans-serif'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ff6666';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ff4444';
              }}
            >
              Clear All
            </button>
          </Panel>
      </ReactFlow>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.mouseX}
            y={contextMenu.mouseY}
            onClose={() => setContextMenu(null)}
            onDelete={() => handleDeleteEdge(contextMenu.edgeId)}
          />
        )}
      </div>
    </div>
  );
}; 

export const PipelineEditor: React.FC<PipelineEditorProps> = (props) => {
  return (
    <ReactFlowProvider>
      <PipelineEditorContent {...props} />
    </ReactFlowProvider>
  );
}; 
