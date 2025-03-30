import { Node as FlowNode, Edge as FlowEdge } from 'reactflow';

export enum NodeType {
  DATA_SOURCE = 'DATA_SOURCE',
  PROMPT_TEMPLATE = 'PROMPT_TEMPLATE',
  AI_COMPLETION = 'AI_COMPLETION',
  DATA_TRANSFORM = 'DATA_TRANSFORM',
  OUTPUT = 'OUTPUT',
  DISPLAY = 'DISPLAY',
  SPREADSHEET = 'SPREADSHEET'
}

export interface NodeData {
  label: string;
  sourceType?: string;
  sourceConfig?: any;
  prompt?: string;
  displayType?: string;
  output?: string;
  input?: string;
  tabId?: string;
}

export type Node = FlowNode<NodeData>;
export type Edge = FlowEdge;

export interface Pipeline {
  nodes: Node[];
  edges: Edge[];
} 