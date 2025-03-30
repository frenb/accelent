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
import { Toolbar } from './components/Toolbar';
import { EditorPanel } from './components/EditorPanel';
import { NodeType } from './types/Pipeline';

// Define node types
const nodeTypes: NodeTypes = {
  dataSource: DataSourceNode,
};

// Initial nodes
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'dataSource',
    position: { x: 250, y: 100 },
    data: { label: 'Data Source 1', sourceType: 'CSV' },
  },
  {
    id: '2',
    type: 'dataSource',
    position: { x: 250, y: 300 },
    data: { label: 'Data Source 2', sourceType: 'JSON' },
  },
];

// Initial edges
const initialEdges: Edge[] = [];

function PipelineEditorContent() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editorWidth, setEditorWidth] = useState(window.innerWidth / 2);
  const { screenToFlowPosition } = useReactFlow();
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

  // Handle adding new nodes
  const handleAddNode = useCallback((type: NodeType) => {
    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

    let newNode: Node;
    switch (type) {
      case NodeType.DATA_SOURCE:
        newNode = {
          id: `node-${Date.now()}`,
          type: 'dataSource',
          position,
          data: {
            label: 'New Data Source',
            sourceType: 'CSV',
          },
        };
        break;
      case NodeType.PROMPT_TEMPLATE:
        newNode = {
          id: `node-${Date.now()}`,
          type: 'promptTemplate',
          position,
          data: {
            label: 'New Prompt Template',
            prompt: '',
          },
        };
        break;
      case NodeType.SPREADSHEET:
        newNode = {
          id: `node-${Date.now()}`,
          type: 'spreadsheet',
          position,
          data: {
            label: 'New Spreadsheet',
            sourceType: 'sheets',
          },
        };
        break;
      case NodeType.DISPLAY:
        newNode = {
          id: `node-${Date.now()}`,
          type: 'display',
          position,
          data: {
            label: 'New Display',
            displayType: 'text',
          },
        };
        break;
      default:
        return;
    }

    console.error('Adding new node:', newNode);
    setNodes((nds) => [...nds, newNode]);
  }, [screenToFlowPosition, setNodes]);

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
  const handleTabDrop = useCallback((tabId: string, nodeId: string, tabName: string, content: string) => {
    console.error('Tab dropped:', { tabId, nodeId, tabName, content });
    // Update node data with the dropped tab content
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
  }, [setNodes]);

  // Handle tab content change
  const handleTabContentChange = useCallback((tabId: string, content: string) => {
    console.error('Tab content changed:', { tabId, content });
    // Handle tab content changes if needed
  }, []);

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