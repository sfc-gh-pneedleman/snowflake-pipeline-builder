"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  addEdge,
  NodeTypes,
  Handle,
  Position,
  OnNodesChange,
  OnEdgesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { v4 as uuidv4 } from "uuid";
import { PipelineConfig, ScheduledPipeline, ScheduleNodeData } from "@/lib/types";
import { 
  Clock, 
  Play, 
  Pause, 
  Layers,
  Calendar,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ScheduleNodeProps {
  data: ScheduleNodeData;
  selected?: boolean;
}

function ScheduleNode({ data, selected }: ScheduleNodeProps) {
  const sp = data.scheduledPipeline;
  
  const getScheduleText = () => {
    if (sp.dependencies.length > 0) {
      return 'After dependency';
    }
    if (sp.schedule.type === 'cron' && sp.schedule.cron) {
      return sp.schedule.cron;
    }
    if (sp.schedule.type === 'interval' && sp.schedule.intervalMinutes) {
      return `Every ${sp.schedule.intervalMinutes} min`;
    }
    return 'Not configured';
  };

  return (
    <div 
      className={`
        px-4 py-3 rounded-xl min-w-[200px] border-2 transition-all
        ${sp.enabled 
          ? 'bg-emerald-500/10 border-emerald-500/50' 
          : 'bg-slate-800 border-slate-600'
        }
        ${selected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950' : ''}
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-cyan-400 !w-3 !h-3" />
      
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${sp.enabled ? 'bg-emerald-500/20' : 'bg-slate-700'}`}>
          {sp.enabled ? (
            <Play className="w-4 h-4 text-emerald-400" />
          ) : (
            <Pause className="w-4 h-4 text-slate-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{sp.pipelineName}</div>
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {getScheduleText()}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mt-2">
        <Badge 
          variant="outline" 
          className={`text-xs ${sp.enabled ? 'border-emerald-600 text-emerald-400' : 'border-slate-600'}`}
        >
          {sp.enabled ? 'Active' : 'Paused'}
        </Badge>
        {sp.dependencies.length > 0 && (
          <Badge variant="outline" className="text-xs border-cyan-600 text-cyan-400">
            <Layers className="w-3 h-3 mr-1" />
            Chained
          </Badge>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-400 !w-3 !h-3" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  scheduleNode: ScheduleNode,
};

interface ScheduleCanvasProps {
  scheduledPipelines: ScheduledPipeline[];
  nodes: Node<ScheduleNodeData>[];
  edges: Edge[];
  onNodesChange: OnNodesChange<Node<ScheduleNodeData>>;
  onEdgesChange: OnEdgesChange<Edge>;
  setNodes: React.Dispatch<React.SetStateAction<Node<ScheduleNodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onNodeSelect: (node: Node<ScheduleNodeData> | null) => void;
  onEdgeSelect: (edge: Edge | null) => void;
  selectedEdgeId?: string;
  onScheduledPipelineAdd: (pipeline: PipelineConfig, position: { x: number; y: number }) => void;
  onDependencyAdd: (sourceId: string, targetId: string) => void;
}

export default function ScheduleCanvas({
  scheduledPipelines,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  setNodes,
  setEdges,
  onNodeSelect,
  onEdgeSelect,
  selectedEdgeId,
  onScheduledPipelineAdd,
  onDependencyAdd,
}: ScheduleCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        onDependencyAdd(connection.source, connection.target);
        setEdges((eds) => addEdge({
          ...connection,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#06b6d4' },
        }, eds));
      }
    },
    [setEdges, onDependencyAdd]
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      onEdgeSelect(edge);
    },
    [onEdgeSelect]
  );

  const styledEdges = edges.map((edge) => ({
    ...edge,
    style: {
      stroke: edge.id === selectedEdgeId ? '#22d3ee' : '#06b6d4',
      strokeWidth: edge.id === selectedEdgeId ? 3 : 2,
    },
    animated: edge.id === selectedEdgeId,
  }));

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const pipelineData = event.dataTransfer.getData("application/pipeline");
      if (!pipelineData || !reactFlowInstance) return;

      const pipeline: PipelineConfig = JSON.parse(pipelineData);
      
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      onScheduledPipelineAdd(pipeline, position);
    },
    [reactFlowInstance, onScheduledPipelineAdd]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<ScheduleNodeData>) => {
    onNodeSelect(node);
  }, [onNodeSelect]);

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
    onEdgeSelect(null);
  }, [onNodeSelect, onEdgeSelect]);

  return (
    <div ref={reactFlowWrapper} className="h-full bg-slate-950">
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
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#06b6d4' },
        }}
      >
        <Background color="#334155" gap={16} size={1} />
        <Controls className="[&>button]:bg-slate-800 [&>button]:border-slate-700 [&>button]:text-slate-300" />
        <MiniMap
          nodeColor={(node: Node<ScheduleNodeData>) => {
            const sp = node.data.scheduledPipeline;
            return sp.enabled ? '#10b981' : '#64748b';
          }}
          className="!bg-slate-900 rounded-lg border border-slate-700"
        />
      </ReactFlow>
      
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <Calendar className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 text-lg font-medium">Drop pipelines here to schedule</p>
            <p className="text-slate-600 text-sm mt-2">Connect pipelines to create dependencies</p>
          </div>
        </div>
      )}
    </div>
  );
}
