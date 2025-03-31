import React, { useCallback, useState, useEffect, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  NodeChange,
  EdgeChange,
  Connection,
  addEdge,
  NodeTypes,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { DataSourceNode } from './components/nodes/DataSourceNode';
import { PromptTemplateNode } from './components/nodes/PromptTemplateNode';
import { Toolbar } from './components/Toolbar';
import { EditorPanel } from './components/EditorPanel';
import { NodeType } from './types/Pipeline';

// Define node types
const nodeTypes: NodeTypes = {
  dataSource: DataSourceNode,
  promptTemplate: PromptTemplateNode,
};

// Initial nodes
const initialNodes: Node[] = [];

// Initial edges
const initialEdges: Edge[] = [];

function PipelineEditorContent() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editorWidth, setEditorWidth] = useState(window.innerWidth / 2);
  const { screenToFlowPosition, getNodes } = useReactFlow();
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  // Calculate editor width percentage
  const editorWidthPercentage = (editorWidth / window.innerWidth) * 100;

  // Handle node changes (including selection)
  const handleNodeChanges = useCallback(
    (changes: NodeChange[]) => {
      console.error('Node changes:', changes);
      onNodesChange(changes);
    },
    [onNodesChange]
  );

  // Handle edge changes
  const handleEdgeChanges = useCallback(
    (changes: EdgeChange[]) => {
      console.error('Edge changes:', changes);
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  // Handle new connections
  const handleConnect = useCallback(
    (connection: Connection) => {
      console.error('New connection:', connection);
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  // Handle node selection
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      console.error('Node clicked:', { nodeId: node.id, event });
      setSelectedNode(node.id);
    },
    []
  );

  // Find the closest node to a given position
  const findClosestNode = useCallback((position: { x: number; y: number }): Node | null => {
    const nodes = getNodes();
    let closestNode: Node | null = null;
    let minDistance = Infinity;

    nodes.forEach((node) => {
      const dx = node.position.x - position.x;
      const dy = node.position.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < minDistance) {
        minDistance = distance;
        closestNode = node;
      }
    });

    return closestNode;
  }, [getNodes]);

  // Create a new node with a unique name
  const createUniqueNodeName = useCallback((baseName: string) => {
    const existingNames = nodes.map(node => node.data.label);
    let newName = baseName;
    let counter = 1;

    while (existingNames.includes(newName)) {
      newName = `${baseName} (Copy ${counter})`;
      counter++;
    }

    return newName;
  }, [nodes]);

  // Handle adding new nodes
  const handleAddNode = useCallback((type: NodeType, position?: { x: number; y: number }, tabData?: { name: string, content: string, type?: string, tabId?: string }) => {
    const nodePosition = position || screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

    let newNode: Node;
    switch (type) {
      case NodeType.DATA_SOURCE:
        newNode = {
          id: `node-${Date.now()}`,
          type: 'dataSource',
          position: nodePosition,
          data: {
            label: tabData ? `${createUniqueNodeName(tabData.name)} (${tabData.type || 'Data Source'})` : createUniqueNodeName('New Data Source'),
            sourceType: tabData?.content.includes('{') ? 'JSON' : 'CSV',
            content: tabData?.content || '',
          },
        };
        break;
      case NodeType.PROMPT_TEMPLATE:
        newNode = {
          id: `node-${Date.now()}`,
          type: 'promptTemplate',
          position: nodePosition,
          data: {
            label: tabData ? `${createUniqueNodeName(tabData.name)} (${tabData.type || 'Prompt'})` : createUniqueNodeName('New Prompt Template'),
            prompt: tabData?.content || '',
            input: '',
            output: '',
            tabId: tabData?.tabId || '',
          },
        };
        break;
      case NodeType.SPREADSHEET:
        newNode = {
          id: `node-${Date.now()}`,
          type: 'spreadsheet',
          position: nodePosition,
          data: {
            label: tabData ? `${createUniqueNodeName(tabData.name)} (${tabData.type || 'Spreadsheet'})` : createUniqueNodeName('New Spreadsheet'),
            sourceType: 'sheets',
            content: tabData?.content || '',
          },
        };
        break;
      case NodeType.DISPLAY:
        newNode = {
          id: `node-${Date.now()}`,
          type: 'display',
          position: nodePosition,
          data: {
            label: tabData ? `${createUniqueNodeName(tabData.name)} (${tabData.type || 'Display'})` : createUniqueNodeName('New Display'),
            displayType: 'text',
            content: tabData?.content || '',
          },
        };
        break;
      default:
        return;
    }

    console.error('Adding new node:', newNode);
    setNodes((nds) => [...nds, newNode]);

    // Find and connect to closest node
    const closestNode = findClosestNode(nodePosition);
    if (closestNode) {
      const isAbove = nodePosition.y < closestNode.position.y;
      const newEdge = {
        id: `edge-${Date.now()}`,
        source: isAbove ? newNode.id : closestNode.id,
        target: isAbove ? closestNode.id : newNode.id,
        type: 'smoothstep',
      };
      setEdges((eds) => [...eds, newEdge]);
    }
  }, [screenToFlowPosition, setNodes, setEdges, findClosestNode, createUniqueNodeName]);

  // Handle keyboard events for node deletion
  const handleRemoveNode = useCallback((nodeId: string) => {
    console.error('Delete key pressed for node:', nodeId);
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setSelectedNode(null);
  }, [setNodes]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' && selectedNode) {
        handleRemoveNode(selectedNode);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, handleRemoveNode]);

  // Handle separator dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = editorWidth;
    e.preventDefault();
  }, [editorWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;

      const deltaX = e.clientX - startX.current;
      const newWidth = startWidth.current + deltaX;
      
      // Set minimum width of 200px for both panels
      if (newWidth >= 200 && newWidth <= window.innerWidth - 200) {
        setEditorWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Handle tab drop
  const handleTabDrop = useCallback((tabId: string, nodeId: string | null, tabName: string, content: string, dropPosition?: { x: number, y: number }) => {
    console.error('Tab dropped:', { tabId, nodeId, tabName, content, dropPosition });
    
    if (nodeId) {
      // Update existing node
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  label: tabName,
                  sourceType: content.includes('{') ? 'JSON' : 'CSV',
                },
              }
            : node
        )
      );
    } else {
      // Create new node at drop position
      const position = dropPosition 
        ? screenToFlowPosition(dropPosition)
        : screenToFlowPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          });
      
      // Determine node type based on content
      let nodeType = NodeType.DATA_SOURCE;
      if (content.includes('{')) {
        nodeType = NodeType.DATA_SOURCE;
      } else if (content.includes('prompt')) {
        nodeType = NodeType.PROMPT_TEMPLATE;
      } else if (content.includes('sheet')) {
        nodeType = NodeType.SPREADSHEET;
      } else if (content.includes('display')) {
        nodeType = NodeType.DISPLAY;
      }

      handleAddNode(nodeType, position, { name: tabName, content: content });
    }
  }, [setNodes, screenToFlowPosition, handleAddNode]);

  // Handle tab content change
  const handleTabContentChange = useCallback((tabId: string, content: string) => {
    console.error('Tab content changed:', { tabId, content });
    
    // Update any nodes associated with this tab
    setNodes((nds) =>
      nds.map((node) =>
        node.data.tabId === tabId
          ? {
              ...node,
              data: {
                ...node.data,
                prompt: content,
              },
            }
          : node
      )
    );
  }, [setNodes]);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex' }}>
      <div style={{ width: editorWidth, height: '100%', overflow: 'hidden' }}>
        <EditorPanel 
          onTabDrop={handleTabDrop}
          onTabContentChange={handleTabContentChange}
        />
      </div>
      <div
        style={{
          width: '8px',
          height: '100%',
          backgroundColor: '#ddd',
          cursor: 'col-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
        onMouseDown={handleMouseDown}
      >
        <div
          style={{
            width: '2px',
            height: '100%',
            backgroundColor: '#999',
            position: 'absolute',
            left: '3px',
          }}
        />
      </div>
      <div style={{ flex: 1, height: '100%', overflow: 'hidden', position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodeChanges}
          onEdgesChange={handleEdgeChanges}
          onConnect={handleConnect}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          fitView
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(event) => {
            event.preventDefault();
            const tabId = event.dataTransfer.getData('text/plain');
            const nodeId = event.dataTransfer.getData('nodeId');
            const tabName = event.dataTransfer.getData('tabName');
            const tabContent = event.dataTransfer.getData('tabContent');
            const tabType = event.dataTransfer.getData('tabType');
            
            if (tabId && tabName && tabContent) {
              const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY
              });
              
              // Determine node type based on tab type
              let nodeType = NodeType.DATA_SOURCE;
              switch (tabType) {
                case 'data-source':
                  nodeType = NodeType.DATA_SOURCE;
                  break;
                case 'prompt-template':
                  nodeType = NodeType.PROMPT_TEMPLATE;
                  break;
                case 'spreadsheet':
                  nodeType = NodeType.SPREADSHEET;
                  break;
                case 'display':
                  nodeType = NodeType.DISPLAY;
                  break;
                default:
                  // Fallback to content-based determination
                  if (tabContent.includes('{')) {
                    nodeType = NodeType.DATA_SOURCE;
                  } else if (tabContent.includes('prompt')) {
                    nodeType = NodeType.PROMPT_TEMPLATE;
                  } else if (tabContent.includes('sheet')) {
                    nodeType = NodeType.SPREADSHEET;
                  } else if (tabContent.includes('display')) {
                    nodeType = NodeType.DISPLAY;
                  }
              }

              handleAddNode(nodeType, position, { 
                name: tabName, 
                content: tabContent, 
                type: tabType,
                tabId: tabId 
              });
            }
          }}
        >
          <Background />
          <Controls />
          <Toolbar onAddNode={handleAddNode} editorWidth={editorWidthPercentage} />
        </ReactFlow>
      </div>
    </div>
  );
}

export function PipelineEditor() {
  return (
    <ReactFlowProvider>
      <PipelineEditorContent />
    </ReactFlowProvider>
  );
} 