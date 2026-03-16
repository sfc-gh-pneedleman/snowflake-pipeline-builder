"use client";

import { useState, useCallback, useRef, DragEvent } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  addEdge,
  Connection,
  NodeTypes,
  BackgroundVariant,
  ReactFlowInstance,
  OnNodesChange,
  OnEdgesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { v4 as uuidv4 } from "uuid";
import ETLNode from "./etl-node";
import { NodeType, ETLNodeData } from "@/lib/types";

const nodeTypes: NodeTypes = {
  etlNode: ETLNode,
};

const miniMapColors: Record<NodeType, string> = {
  'source-table': '#3b82f6',
  'sql-transform': '#a855f7',
  'dynamic-table': '#10b981',
  'task': '#f97316',
  'stream': '#06b6d4',
  'stage': '#eab308',
  'file-format': '#ec4899',
  'copy-into': '#6366f1',
  'target-table': '#22c55e',
};

interface ETLCanvasProps {
  nodes: Node<ETLNodeData>[];
  edges: Edge[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onNodesChange: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEdgesChange: any;
  setNodes: React.Dispatch<React.SetStateAction<Node<ETLNodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onNodeSelect: (node: Node<ETLNodeData> | null) => void;
  onEdgeSelect: (edge: Edge | null) => void;
  selectedEdgeId?: string;
}

const defaultLabels: Record<NodeType, string> = {
  'source-table': 'Source Table',
  'sql-transform': 'SQL Transform',
  'dynamic-table': 'Dynamic Table',
  'task': 'Task',
  'stream': 'Stream',
  'stage': 'Stage',
  'file-format': 'File Format',
  'copy-into': 'Copy Into',
  'target-table': 'Target Table',
};

export default function ETLCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  setNodes,
  setEdges,
  onNodeSelect,
  onEdgeSelect,
  selectedEdgeId,
}: ETLCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow") as NodeType;
      if (!type || !reactFlowInstance || !reactFlowWrapper.current) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node<ETLNodeData> = {
        id: uuidv4(),
        type: "etlNode",
        position,
        data: {
          label: defaultLabels[type],
          type,
          config: {},
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, setNodes]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeSelect(node as Node<ETLNodeData>);
    },
    [onNodeSelect]
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
    onEdgeSelect(null);
  }, [onNodeSelect, onEdgeSelect]);

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      onEdgeSelect(edge);
    },
    [onEdgeSelect]
  );

  const styledEdges = edges.map(edge => ({
    ...edge,
    style: {
      stroke: edge.id === selectedEdgeId ? '#22d3ee' : '#06b6d4',
      strokeWidth: edge.id === selectedEdgeId ? 3 : 2,
    },
    animated: edge.id === selectedEdgeId,
  }));

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        className="bg-slate-950"
        proOptions={{ hideAttribution: true }}
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1}
          color="#334155"
        />
        <Controls 
          className="bg-slate-800 border-slate-700 rounded-lg [&_button]:bg-slate-700 [&_button]:border-slate-600 [&_button]:text-slate-200 [&_button:hover]:bg-slate-600 [&_button_svg]:fill-slate-200"
          showInteractive={false}
        />
        <MiniMap 
          className="bg-slate-800 border-slate-700 rounded-lg"
          nodeColor={(node) => {
            const data = node.data as ETLNodeData;
            return miniMapColors[data.type] || '#475569';
          }}
          maskColor="rgba(0,0,0,0.5)"
        />
      </ReactFlow>
    </div>
  );
}
