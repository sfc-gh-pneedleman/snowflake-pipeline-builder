"use client";

import { useState, useCallback, useEffect } from "react";
import { Node, Edge, useNodesState, useEdgesState } from "@xyflow/react";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";
import { 
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Snowflake,
  Calendar,
  ArrowLeft,
  Code2,
  Rocket,
  Copy,
  CheckCircle2,
  Download,
  Upload,
  Loader2,
  XCircle,
  Save,
  FolderOpen,
  Trash2,
  Plus,
  MoreVertical
} from "lucide-react";
import PipelineLibrary from "@/components/pipeline-library";
import ScheduleCanvas from "@/components/schedule-canvas";
import ScheduleConfigPanel from "@/components/schedule-config-panel";
import ExecutionMonitor from "@/components/execution-monitor";
import { 
  PipelineConfig, 
  ScheduledPipeline, 
  ScheduleNodeData, 
  ExecutionRecord 
} from "@/lib/types";
import { generateAllTasksSQL } from "@/lib/task-generator";
import { ScrollArea } from "@/components/ui/scroll-area";

const SCHEDULED_PIPELINES_KEY = "etl-scheduled-pipelines";
const SAVED_SCHEDULES_KEY = "etl-saved-schedules";
const CURRENT_SCHEDULE_KEY = "etl-current-schedule";
const PIPELINES_KEY = "etl-pipelines";

interface SavedSchedule {
  id: string;
  name: string;
  scheduledPipelines: ScheduledPipeline[];
  nodePositions: { id: string; position: { x: number; y: number } }[];
  created_at: string;
  updated_at: string;
}

interface ConnectionStatus {
  connected: boolean;
  account: string | null;
  username: string | null;
  warehouse: string | null;
  database: string | null;
  schema: string | null;
}

export default function SchedulerPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ScheduleNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node<ScheduleNodeData> | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [scheduledPipelines, setScheduledPipelines] = useState<ScheduledPipeline[]>([]);
  const [pipelines, setPipelines] = useState<PipelineConfig[]>([]);
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    account: null,
    username: null,
    warehouse: null,
    database: null,
    schema: null,
  });
  
  const [scheduleName, setScheduleName] = useState("Untitled Schedule");
  const [savedSchedules, setSavedSchedules] = useState<SavedSchedule[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);

  useEffect(() => {
    const checkConnection = (verify = false) => {
      const url = verify ? '/api/connection?verify=true' : '/api/connection';
      fetch(url)
        .then(res => res.json())
        .then(setConnectionStatus)
        .catch(console.error);
    };
    
    checkConnection();
    
    const interval = setInterval(() => checkConnection(true), 300000);
      
    const storedPipelines = localStorage.getItem(PIPELINES_KEY);
    if (storedPipelines) {
      setPipelines(JSON.parse(storedPipelines));
    }

    const currentSchedule = localStorage.getItem(CURRENT_SCHEDULE_KEY);
    if (currentSchedule) {
      const schedule: SavedSchedule = JSON.parse(currentSchedule);
      setScheduledPipelines(schedule.scheduledPipelines);
      localStorage.setItem(SCHEDULED_PIPELINES_KEY, JSON.stringify(schedule.scheduledPipelines));
      
      const loadedNodes: Node<ScheduleNodeData>[] = schedule.scheduledPipelines.map((sp, index) => {
        const savedPos = schedule.nodePositions?.find(np => np.id === sp.id);
        return {
          id: sp.id,
          type: 'scheduleNode',
          position: savedPos?.position || { x: 100 + (index % 3) * 280, y: 100 + Math.floor(index / 3) * 150 },
          data: { scheduledPipeline: sp },
        };
      });
      setNodes(loadedNodes);

      const loadedEdges: Edge[] = [];
      schedule.scheduledPipelines.forEach(sp => {
        sp.dependencies.forEach(depId => {
          loadedEdges.push({
            id: `${depId}-${sp.id}`,
            source: depId,
            target: sp.id,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#06b6d4' },
          });
        });
      });
      setEdges(loadedEdges);
      setScheduleName(schedule.name);
      localStorage.removeItem(CURRENT_SCHEDULE_KEY);
      return;
    }

    const storedScheduled = localStorage.getItem(SCHEDULED_PIPELINES_KEY);
    if (storedScheduled) {
      const parsed: ScheduledPipeline[] = JSON.parse(storedScheduled);
      setScheduledPipelines(parsed);
      
      const loadedNodes: Node<ScheduleNodeData>[] = parsed.map((sp, index) => ({
        id: sp.id,
        type: 'scheduleNode',
        position: { x: 100 + (index % 3) * 280, y: 100 + Math.floor(index / 3) * 150 },
        data: { scheduledPipeline: sp },
      }));
      setNodes(loadedNodes);

      const loadedEdges: Edge[] = [];
      parsed.forEach(sp => {
        sp.dependencies.forEach(depId => {
          loadedEdges.push({
            id: `${depId}-${sp.id}`,
            source: depId,
            target: sp.id,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#06b6d4' },
          });
        });
      });
      setEdges(loadedEdges);
    }
    
    return () => clearInterval(interval);
  }, [setNodes, setEdges]);

  const saveScheduledPipelines = useCallback((updated: ScheduledPipeline[]) => {
    localStorage.setItem(SCHEDULED_PIPELINES_KEY, JSON.stringify(updated));
    setScheduledPipelines(updated);
  }, []);

  const loadSavedSchedules = useCallback(() => {
    const stored = localStorage.getItem(SAVED_SCHEDULES_KEY);
    if (stored) {
      setSavedSchedules(JSON.parse(stored));
    }
  }, []);

  const checkAndSaveSchedule = useCallback(() => {
    loadSavedSchedules();
    const existing = savedSchedules.find(s => s.name === scheduleName);
    if (existing) {
      setShowOverwriteDialog(true);
    } else {
      saveSchedule(false);
    }
  }, [scheduleName, savedSchedules, loadSavedSchedules]);

  const saveSchedule = useCallback((overwrite: boolean) => {
    const stored = localStorage.getItem(SAVED_SCHEDULES_KEY);
    let schedules: SavedSchedule[] = stored ? JSON.parse(stored) : [];
    
    const nodePositions = nodes.map(n => ({ id: n.id, position: n.position }));
    
    if (overwrite) {
      schedules = schedules.map(s => {
        if (s.name === scheduleName) {
          return {
            ...s,
            scheduledPipelines,
            nodePositions,
            updated_at: new Date().toISOString(),
          };
        }
        return s;
      });
    } else {
      const newSchedule: SavedSchedule = {
        id: uuidv4(),
        name: scheduleName,
        scheduledPipelines,
        nodePositions,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      schedules.push(newSchedule);
    }
    
    localStorage.setItem(SAVED_SCHEDULES_KEY, JSON.stringify(schedules));
    setSavedSchedules(schedules);
    setShowSaveDialog(false);
    setShowOverwriteDialog(false);
  }, [scheduleName, scheduledPipelines, nodes]);

  const loadSchedule = useCallback((schedule: SavedSchedule) => {
    setScheduledPipelines(schedule.scheduledPipelines);
    localStorage.setItem(SCHEDULED_PIPELINES_KEY, JSON.stringify(schedule.scheduledPipelines));
    
    const loadedNodes: Node<ScheduleNodeData>[] = schedule.scheduledPipelines.map((sp, index) => {
      const savedPos = schedule.nodePositions?.find(np => np.id === sp.id);
      return {
        id: sp.id,
        type: 'scheduleNode',
        position: savedPos?.position || { x: 100 + (index % 3) * 280, y: 100 + Math.floor(index / 3) * 150 },
        data: { scheduledPipeline: sp },
      };
    });
    setNodes(loadedNodes);

    const loadedEdges: Edge[] = [];
    schedule.scheduledPipelines.forEach(sp => {
      sp.dependencies.forEach(depId => {
        loadedEdges.push({
          id: `${depId}-${sp.id}`,
          source: depId,
          target: sp.id,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#06b6d4' },
        });
      });
    });
    setEdges(loadedEdges);
    
    setScheduleName(schedule.name);
    setShowLoadDialog(false);
    setSelectedNode(null);
    setSelectedEdge(null);
  }, [setNodes, setEdges]);

  const deleteSchedule = useCallback((id: string) => {
    const stored = localStorage.getItem(SAVED_SCHEDULES_KEY);
    if (stored) {
      const schedules: SavedSchedule[] = JSON.parse(stored);
      const filtered = schedules.filter(s => s.id !== id);
      localStorage.setItem(SAVED_SCHEDULES_KEY, JSON.stringify(filtered));
      setSavedSchedules(filtered);
    }
  }, []);

  const newSchedule = useCallback(() => {
    setScheduledPipelines([]);
    setNodes([]);
    setEdges([]);
    setScheduleName("Untitled Schedule");
    setSelectedNode(null);
    setSelectedEdge(null);
    localStorage.removeItem(SCHEDULED_PIPELINES_KEY);
  }, [setNodes, setEdges]);

  const exportSchedule = useCallback(() => {
    const schedule: SavedSchedule = {
      id: uuidv4(),
      name: scheduleName,
      scheduledPipelines,
      nodePositions: nodes.map(n => ({ id: n.id, position: n.position })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(schedule, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${scheduleName.replace(/\s+/g, "_")}_schedule.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [scheduleName, scheduledPipelines, nodes]);

  const importSchedule = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const schedule: SavedSchedule = JSON.parse(e.target?.result as string);
        loadSchedule(schedule);
      } catch (err) {
        console.error("Failed to import schedule:", err);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [loadSchedule]);

  const handleScheduledPipelineAdd = useCallback((pipeline: PipelineConfig, position: { x: number; y: number }) => {
    if (scheduledPipelines.some(sp => sp.pipelineId === pipeline.id)) {
      return;
    }

    const newScheduledPipeline: ScheduledPipeline = {
      id: uuidv4(),
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      schedule: {
        type: 'cron',
        cron: '0 0 * * *',
        timezone: 'UTC',
      },
      taskConfig: {
        warehouse: 'COMPUTE_WH',
        allowOverlappingExecution: false,
      },
      enabled: false,
      dependencies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newNode: Node<ScheduleNodeData> = {
      id: newScheduledPipeline.id,
      type: 'scheduleNode',
      position,
      data: { scheduledPipeline: newScheduledPipeline },
    };

    setNodes((nds) => [...nds, newNode]);
    saveScheduledPipelines([...scheduledPipelines, newScheduledPipeline]);
  }, [scheduledPipelines, setNodes, saveScheduledPipelines]);

  const handleDependencyAdd = useCallback((sourceId: string, targetId: string) => {
    setScheduledPipelines(prev => {
      const updated = prev.map(sp => {
        if (sp.id === targetId && !sp.dependencies.includes(sourceId)) {
          return {
            ...sp,
            dependencies: [...sp.dependencies, sourceId],
            updatedAt: new Date().toISOString(),
          };
        }
        return sp;
      });
      saveScheduledPipelines(updated);
      return updated;
    });

    setNodes(nds => nds.map(node => {
      if (node.id === targetId) {
        const sp = scheduledPipelines.find(p => p.id === targetId);
        if (sp) {
          return {
            ...node,
            data: {
              scheduledPipeline: {
                ...sp,
                dependencies: [...sp.dependencies, sourceId],
              },
            },
          };
        }
      }
      return node;
    }));
  }, [scheduledPipelines, setNodes, saveScheduledPipelines]);

  const handleUpdate = useCallback((id: string, updates: Partial<ScheduledPipeline>) => {
    const updated = scheduledPipelines.map(sp => {
      if (sp.id === id) {
        return { ...sp, ...updates, updatedAt: new Date().toISOString() };
      }
      return sp;
    });
    saveScheduledPipelines(updated);

    setNodes(nds => nds.map(node => {
      if (node.id === id) {
        const sp = updated.find(p => p.id === id);
        if (sp) {
          return { ...node, data: { scheduledPipeline: sp } };
        }
      }
      return node;
    }));

    if (selectedNode && selectedNode.id === id) {
      const sp = updated.find(p => p.id === id);
      if (sp) {
        setSelectedNode({ ...selectedNode, data: { scheduledPipeline: sp } });
      }
    }
  }, [scheduledPipelines, setNodes, selectedNode, saveScheduledPipelines]);

  const handleDelete = useCallback((id: string) => {
    const updated = scheduledPipelines
      .filter(sp => sp.id !== id)
      .map(sp => ({
        ...sp,
        dependencies: sp.dependencies.filter(depId => depId !== id),
      }));
    saveScheduledPipelines(updated);

    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
    
    if (selectedNode?.id === id) {
      setSelectedNode(null);
    }
  }, [scheduledPipelines, setNodes, setEdges, selectedNode, saveScheduledPipelines]);

  const handleToggleEnabled = useCallback((id: string) => {
    handleUpdate(id, { 
      enabled: !scheduledPipelines.find(sp => sp.id === id)?.enabled 
    });
  }, [scheduledPipelines, handleUpdate]);

  const handleNodeSelect = useCallback((node: Node<ScheduleNodeData> | null) => {
    setSelectedNode(node);
    if (node) setSelectedEdge(null);
  }, []);

  const handleEdgeSelect = useCallback((edge: Edge | null) => {
    setSelectedEdge(edge);
    if (edge) setSelectedNode(null);
  }, []);

  const handleEdgeDelete = useCallback((edgeId: string) => {
    const edge = edges.find(e => e.id === edgeId);
    if (edge) {
      setScheduledPipelines(prev => {
        const updated = prev.map(sp => {
          if (sp.id === edge.target) {
            return {
              ...sp,
              dependencies: sp.dependencies.filter(depId => depId !== edge.source),
              updatedAt: new Date().toISOString(),
            };
          }
          return sp;
        });
        saveScheduledPipelines(updated);
        return updated;
      });

      setEdges(eds => eds.filter(e => e.id !== edgeId));
      setSelectedEdge(null);
    }
  }, [edges, setEdges, saveScheduledPipelines]);

  const handleDragStart = useCallback(() => {
  }, []);

  const handleRefreshExecutions = useCallback(() => {
  }, []);

  const handleGenerateCode = useCallback(() => {
    const code = generateAllTasksSQL(scheduledPipelines, pipelines);
    setGeneratedCode(code);
    setShowCodeDialog(true);
  }, [scheduledPipelines, pipelines]);

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generatedCode]);

  const handleExportCode = useCallback(() => {
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'snowflake_tasks.sql';
    a.click();
    URL.revokeObjectURL(url);
  }, [generatedCode]);

  const handleDeploy = useCallback(async () => {
    const code = generateAllTasksSQL(scheduledPipelines, pipelines);
    if (!code.trim()) {
      setDeployResult({ success: false, message: "No SQL to deploy" });
      return;
    }

    setIsDeploying(true);
    setDeployResult(null);

    try {
      const connCheck = await fetch('/api/connection?verify=true');
      const connStatus = await connCheck.json();
      if (!connStatus.connected) {
        setConnectionStatus(connStatus);
        setDeployResult({ success: false, message: "Connection expired. Please reconnect." });
        setIsDeploying(false);
        return;
      }
      
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: code }),
      });

      const result = await res.json();
      setDeployResult(result);
    } catch (error) {
      setDeployResult({ success: false, message: (error as Error).message });
    } finally {
      setIsDeploying(false);
    }
  }, [scheduledPipelines, pipelines]);

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100">
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <span className="text-slate-500">|</span>
          <div className="flex items-center gap-2 text-cyan-400">
            <img src="/logo.svg" alt="Data Pipeline Builder" className="w-7 h-7" />
            <span className="font-bold text-lg">Data Pipeline Builder</span>
          </div>
          <span className="text-slate-500">|</span>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300 font-medium">Scheduler</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={`border-slate-700 ${connectionStatus.connected ? '' : 'text-slate-500'}`}
          >
            {connectionStatus.connected ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                {connectionStatus.account}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-slate-500" />
                Not Connected
              </span>
            )}
          </Badge>
          
          <span className="text-slate-600">|</span>
          
          <Badge variant="outline" className="border-slate-700">
            {scheduledPipelines.length} Tasks
          </Badge>
          <Badge variant="outline" className="border-emerald-700 text-emerald-400">
            {scheduledPipelines.filter(sp => sp.enabled).length} Start Active
          </Badge>
          
          <span className="text-slate-600">|</span>
          
          <Button variant="outline" size="sm" onClick={newSchedule} className="border-slate-700">
            <Plus className="w-4 h-4 mr-1" /> New
          </Button>
          
          <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="border-slate-700">
                <Save className="w-4 h-4 mr-1" /> Save
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700">
              <DialogHeader>
                <DialogTitle>Save Schedule Configuration</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Save your schedule to local storage
                </DialogDescription>
              </DialogHeader>
              <Input
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
                placeholder="Schedule name"
                className="bg-slate-800 border-slate-600"
              />
              <DialogFooter>
                <Button onClick={() => checkAndSaveSchedule()}>Save Schedule</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
            <DialogContent className="bg-slate-900 border-slate-700">
              <DialogHeader>
                <DialogTitle>Overwrite Schedule?</DialogTitle>
                <DialogDescription className="text-slate-400">
                  A schedule named &quot;{scheduleName}&quot; already exists. Do you want to overwrite it?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowOverwriteDialog(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={() => saveSchedule(true)}>
                  Overwrite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={loadSavedSchedules} className="border-slate-700">
                <FolderOpen className="w-4 h-4 mr-1" /> Load
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
              <DialogHeader>
                <DialogTitle>Load Schedule Configuration</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Select a saved schedule to load
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {savedSchedules.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No saved schedules</p>
                ) : (
                  savedSchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-800 hover:bg-slate-700 cursor-pointer"
                      onClick={() => loadSchedule(schedule)}
                    >
                      <div>
                        <div className="font-medium">{schedule.name}</div>
                        <div className="text-xs text-slate-500">
                          {schedule.scheduledPipelines.length} tasks • {new Date(schedule.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSchedule(schedule.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-slate-700">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-900 border-slate-700">
              <DropdownMenuItem onClick={exportSchedule}>
                <Download className="w-4 h-4 mr-2" /> Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <label className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" /> Import JSON
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={importSchedule}
                  />
                </label>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <span className="text-slate-600">|</span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateCode}
            className="border-slate-700"
            disabled={scheduledPipelines.length === 0}
          >
            <Code2 className="w-4 h-4 mr-1" />
            Generate SQL
          </Button>
          
          <Button
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-700"
            disabled={scheduledPipelines.length === 0 || isDeploying || !connectionStatus.connected}
            onClick={handleDeploy}
            title={!connectionStatus.connected ? "Connect to Snowflake first" : ""}
          >
            {isDeploying ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Rocket className="w-4 h-4 mr-1" />
            )}
            {isDeploying ? "Deploying..." : "Deploy Tasks"}
          </Button>
          
          {deployResult && (
            <Badge 
              variant="outline" 
              className={deployResult.success ? "border-emerald-700 text-emerald-400" : "border-red-700 text-red-400"}
            >
              {deployResult.success ? (
                <CheckCircle2 className="w-3 h-3 mr-1" />
              ) : (
                <XCircle className="w-3 h-3 mr-1" />
              )}
              {deployResult.success ? "Deployed!" : "Failed"}
            </Badge>
          )}
        </div>
      </header>
      
      <main className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={18} minSize={15} maxSize={25}>
            <PipelineLibrary 
              onDragStart={handleDragStart}
              scheduledPipelineIds={scheduledPipelines.map(sp => sp.pipelineId)}
            />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={42} minSize={30}>
            <ScheduleCanvas
              scheduledPipelines={scheduledPipelines}
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              setNodes={setNodes}
              setEdges={setEdges}
              onNodeSelect={handleNodeSelect}
              onEdgeSelect={handleEdgeSelect}
              selectedEdgeId={selectedEdge?.id}
              onScheduledPipelineAdd={handleScheduledPipelineAdd}
              onDependencyAdd={handleDependencyAdd}
            />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <ScheduleConfigPanel
              selectedNode={selectedNode}
              selectedEdge={selectedEdge}
              allScheduledPipelines={scheduledPipelines}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onToggleEnabled={handleToggleEnabled}
              onEdgeDelete={handleEdgeDelete}
            />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <ExecutionMonitor
              executions={executions}
              onRefresh={handleRefreshExecutions}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>

      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-cyan-400" />
              Generated Snowflake Tasks
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              SQL code to create Tasks and Stored Procedures for your scheduled pipelines
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[50vh] rounded-lg bg-slate-950 border border-slate-800">
            <pre className="p-4 text-sm text-slate-300 font-mono whitespace-pre-wrap">
              {generatedCode}
            </pre>
          </ScrollArea>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleExportCode} className="border-slate-700">
              <Download className="w-4 h-4 mr-1" />
              Download .sql
            </Button>
            <Button onClick={handleCopyCode} className="bg-cyan-600 hover:bg-cyan-700">
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
