import { NodeType } from './types/Pipeline';

export interface Node {
  id: string;
  type: NodeType;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  position: { x: number; y: number };
  settings: Record<string, any>;
}

export interface Pipeline {
  id: string;
  name: string;
  nodes: Node[];
  connections: Connection[];
}

export interface Connection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string;
  targetHandle: string;
} 