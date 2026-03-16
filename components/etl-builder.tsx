"use client";

import { useState, useCallback, useEffect } from "react";
import { Node, Edge, useNodesState, useEdgesState } from "@xyflow/react";
import { v4 as uuidv4 } from "uuid";
import { 
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Save, 
  FolderOpen, 
  Plus,
  Download,
  Upload,
  Snowflake,
  MoreVertical,
  Trash2,
  Database,
  Loader2,
  CheckCircle2,
  XCircle,
  Unplug,
  Key,
  Globe,
  Calendar,
  HelpCircle,
  BookOpen,
  MessageCircle,
  ExternalLink,
  GitBranch,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import ComponentPalette from "@/components/component-palette";
import ETLCanvas from "@/components/etl-canvas";
import NodeConfigPanel from "@/components/node-config-panel";
import CodePreviewPanel from "@/components/code-preview-panel";
import { ETLNodeData, NodeType, PipelineConfig } from "@/lib/types";

const STORAGE_KEY = "etl-pipelines";
const CONNECTION_STORAGE_KEY = "etl-connection-settings";
const CURRENT_PIPELINE_KEY = "etl-current-pipeline";

interface ConnectionStatus {
  connected: boolean;
  account: string | null;
  username: string | null;
  warehouse: string | null;
  database: string | null;
  schema: string | null;
}

export default function ETLBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ETLNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node<ETLNodeData> | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [pipelineName, setPipelineName] = useState("Untitled Pipeline");
  const [savedPipelines, setSavedPipelines] = useState<PipelineConfig[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    account: null,
    username: null,
    warehouse: null,
    database: null,
    schema: null,
  });
  const [connectionForm, setConnectionForm] = useState({
    account: "",
    username: "",
    password: "",
    warehouse: "",
    database: "",
    schema: "",
    authType: "password" as "password" | "externalbrowser",
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const checkConnection = (verify = false) => {
      const url = verify ? '/api/connection?verify=true' : '/api/connection';
      fetch(url)
        .then(res => res.json())
        .then((status) => {
          setConnectionStatus(status);
          if (status.expired) {
            setConnectionError("Connection expired. Please reconnect.");
          }
        })
        .catch(console.error);
    };
    
    checkConnection();
    
    const interval = setInterval(() => checkConnection(true), 300000);
    
    const savedConnection = localStorage.getItem(CONNECTION_STORAGE_KEY);
    if (savedConnection) {
      const parsed = JSON.parse(savedConnection);
      setConnectionForm(prev => ({
        ...prev,
        account: parsed.account || "",
        username: parsed.username || "",
        warehouse: parsed.warehouse || "",
        database: parsed.database || "",
        schema: parsed.schema || "",
        authType: parsed.authType || "password",
      }));
    }

    const currentPipeline = localStorage.getItem(CURRENT_PIPELINE_KEY);
    if (currentPipeline) {
      const pipeline: PipelineConfig = JSON.parse(currentPipeline);
      setNodes(pipeline.nodes.map(n => ({
        ...n,
        data: n.data as ETLNodeData,
      })));
      setEdges(pipeline.edges);
      setPipelineName(pipeline.name);
      localStorage.removeItem(CURRENT_PIPELINE_KEY);
    }
    
    return () => clearInterval(interval);
  }, [setNodes, setEdges]);
  
  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      const res = await fetch('/api/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connectionForm),
      });
      
      const result = await res.json();
      
      if (result.success) {
        setConnectionStatus({
          connected: true,
          account: connectionForm.account,
          username: connectionForm.username,
          warehouse: connectionForm.warehouse,
          database: connectionForm.database,
          schema: connectionForm.schema,
        });
        localStorage.setItem(CONNECTION_STORAGE_KEY, JSON.stringify({
          account: connectionForm.account,
          username: connectionForm.username,
          warehouse: connectionForm.warehouse,
          database: connectionForm.database,
          schema: connectionForm.schema,
          authType: connectionForm.authType,
        }));
        setShowConnectionDialog(false);
        setConnectionForm(prev => ({ ...prev, password: "" }));
      } else {
        setConnectionError(result.message);
      }
    } catch (err) {
      setConnectionError((err as Error).message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await fetch('/api/connection', { method: 'DELETE' });
    setConnectionStatus({
      connected: false,
      account: null,
      username: null,
      warehouse: null,
      database: null,
      schema: null,
    });
  };
  
  const loadSavedPipelines = useCallback(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSavedPipelines(JSON.parse(stored));
    }
    setShowLoadDialog(true);
  }, []);

  const checkAndSavePipeline = useCallback(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const pipelines: PipelineConfig[] = stored ? JSON.parse(stored) : [];
    const existing = pipelines.find(p => p.name === pipelineName);
    
    if (existing) {
      setShowOverwriteDialog(true);
    } else {
      savePipeline(false);
    }
  }, [pipelineName]);

  const savePipeline = useCallback((overwrite: boolean = false) => {
    const pipeline: PipelineConfig = {
      id: uuidv4(),
      name: pipelineName,
      description: "",
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.type || "etlNode",
        position: n.position,
        data: n.data,
      })),
      edges: edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const stored = localStorage.getItem(STORAGE_KEY);
    let pipelines: PipelineConfig[] = stored ? JSON.parse(stored) : [];
    
    if (overwrite) {
      const existingIndex = pipelines.findIndex(p => p.name === pipelineName);
      if (existingIndex >= 0) {
        pipeline.id = pipelines[existingIndex].id;
        pipeline.created_at = pipelines[existingIndex].created_at;
        pipelines[existingIndex] = pipeline;
      } else {
        pipelines.push(pipeline);
      }
    } else {
      pipelines.push(pipeline);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pipelines));
    setShowSaveDialog(false);
    setShowOverwriteDialog(false);
  }, [nodes, edges, pipelineName]);
  
  const loadPipeline = useCallback((pipeline: PipelineConfig) => {
    setNodes(pipeline.nodes.map(n => ({
      ...n,
      data: n.data as ETLNodeData,
    })));
    setEdges(pipeline.edges);
    setPipelineName(pipeline.name);
    setShowLoadDialog(false);
  }, [setNodes, setEdges]);
  
  const deletePipeline = useCallback((pipelineId: string) => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const pipelines: PipelineConfig[] = JSON.parse(stored);
      const updated = pipelines.filter(p => p.id !== pipelineId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSavedPipelines(updated);
    }
  }, []);
  
  const newPipeline = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setPipelineName("Untitled Pipeline");
    setSelectedNode(null);
  }, [setNodes, setEdges]);
  
  const handleDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };
  
  const handleNodeUpdate = useCallback((nodeId: string, data: Partial<ETLNodeData>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const updatedNode = {
            ...node,
            data: { ...node.data, ...data },
          };
          setSelectedNode(updatedNode);
          return updatedNode;
        }
        return node;
      })
    );
  }, [setNodes]);
  
  const handleNodeDelete = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const handleEdgeSelect = useCallback((edge: Edge | null) => {
    setSelectedEdge(edge);
    if (edge) {
      setSelectedNode(null);
    }
  }, []);

  const handleNodeSelect = useCallback((node: Node<ETLNodeData> | null) => {
    setSelectedNode(node);
    if (node) {
      setSelectedEdge(null);
    }
  }, []);

  const handleEdgeDelete = useCallback((edgeId: string) => {
    setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
    setSelectedEdge(null);
  }, [setEdges]);

  const handleEdgeUpdate = useCallback((edgeId: string, newSource: string, newTarget: string) => {
    setEdges((eds) => eds.map((edge) => {
      if (edge.id === edgeId) {
        return { ...edge, source: newSource, target: newTarget };
      }
      return edge;
    }));
    setSelectedEdge(null);
  }, [setEdges]);
  
  const exportPipeline = useCallback(() => {
    const pipeline: PipelineConfig = {
      id: uuidv4(),
      name: pipelineName,
      description: "",
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.type || "etlNode",
        position: n.position,
        data: n.data,
      })),
      edges: edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(pipeline, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pipelineName.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, pipelineName]);
  
  const importPipeline = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const pipeline: PipelineConfig = JSON.parse(e.target?.result as string);
        loadPipeline(pipeline);
      } catch (err) {
        console.error("Failed to import pipeline:", err);
      }
    };
    reader.readAsText(file);
  }, [loadPipeline]);

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
          <Input
            value={pipelineName}
            onChange={(e) => setPipelineName(e.target.value)}
            className="w-64 h-8 bg-transparent border-none text-slate-300 focus-visible:ring-0"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Link href="/scheduler">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-emerald-400 hover:text-emerald-300 hover:border-emerald-700"
            >
              <Calendar className="w-4 h-4 mr-1" />
              Scheduler
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-slate-700">
                <HelpCircle className="w-4 h-4 mr-1" />
                Help
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-700">
              <DropdownMenuItem asChild>
                <Link href="/docs" className="flex items-center cursor-pointer">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Documentation & FAQ
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem asChild>
                <a href="https://docs.snowflake.com/en/user-guide/data-load-overview" target="_blank" rel="noopener noreferrer" className="flex items-center cursor-pointer">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Data Loading Guide
                  <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="https://docs.snowflake.com/en/user-guide/tasks-intro" target="_blank" rel="noopener noreferrer" className="flex items-center cursor-pointer">
                  <Calendar className="w-4 h-4 mr-2" />
                  Tasks & Scheduling
                  <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="https://docs.snowflake.com/en/user-guide/dynamic-tables-intro" target="_blank" rel="noopener noreferrer" className="flex items-center cursor-pointer">
                  <GitBranch className="w-4 h-4 mr-2" />
                  Dynamic Tables
                  <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem asChild>
                <a href="https://docs.snowflake.com/en/user-guide/data-pipelines-intro" target="_blank" rel="noopener noreferrer" className="flex items-center cursor-pointer">
                  <Database className="w-4 h-4 mr-2" />
                  Data Pipelines Overview
                  <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem asChild>
                <a href="https://community.snowflake.com" target="_blank" rel="noopener noreferrer" className="flex items-center cursor-pointer">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Community Forum
                  <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Dialog open={showConnectionDialog} onOpenChange={setShowConnectionDialog}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={connectionStatus.connected 
                  ? "border-green-600 bg-green-950/30 hover:bg-green-950/50" 
                  : "border-slate-700"
                }
              >
                <Database className="w-4 h-4 mr-1" />
                {connectionStatus.connected ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    {connectionStatus.account}
                  </span>
                ) : (
                  "Connect"
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Snowflake className="w-5 h-5 text-cyan-400" />
                  Snowflake Connection
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  {connectionStatus.connected 
                    ? "Connected to Snowflake. You can browse tables and deploy SQL."
                    : "Enter your Snowflake credentials to connect."
                  }
                </DialogDescription>
              </DialogHeader>
              
              {connectionStatus.connected ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-800 rounded-lg">
                    <div>
                      <p className="text-xs text-slate-500">Account</p>
                      <p className="text-sm font-medium">{connectionStatus.account}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">User</p>
                      <p className="text-sm font-medium">{connectionStatus.username}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Warehouse</p>
                      <p className="text-sm font-medium">{connectionStatus.warehouse || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Database</p>
                      <p className="text-sm font-medium">{connectionStatus.database || '-'}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="w-full justify-center py-2 bg-green-950/30 border-green-700">
                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                    Connected
                  </Badge>
                  <DialogFooter>
                    <Button variant="destructive" onClick={handleDisconnect} className="w-full">
                      <Unplug className="w-4 h-4 mr-2" />
                      Disconnect
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3">
                    <div className="space-y-2">
                      <Label>Authentication Method</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={connectionForm.authType === "password" ? "default" : "outline"}
                          className={connectionForm.authType === "password" 
                            ? "bg-cyan-600 hover:bg-cyan-700" 
                            : "border-slate-600 hover:bg-slate-800"
                          }
                          onClick={() => setConnectionForm(prev => ({ ...prev, authType: "password" }))}
                        >
                          <Key className="w-4 h-4 mr-2" />
                          Password
                        </Button>
                        <Button
                          type="button"
                          variant={connectionForm.authType === "externalbrowser" ? "default" : "outline"}
                          className={connectionForm.authType === "externalbrowser" 
                            ? "bg-cyan-600 hover:bg-cyan-700" 
                            : "border-slate-600 hover:bg-slate-800"
                          }
                          onClick={() => setConnectionForm(prev => ({ ...prev, authType: "externalbrowser" }))}
                        >
                          <Globe className="w-4 h-4 mr-2" />
                          SSO Browser
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Account *</Label>
                      <Input
                        placeholder="account-id"
                        value={connectionForm.account}
                        onChange={(e) => setConnectionForm(prev => ({ ...prev, account: e.target.value }))}
                        className="bg-slate-800 border-slate-600"
                      />
                    </div>
                    <div className={connectionForm.authType === "password" ? "grid grid-cols-2 gap-3" : ""}>
                      <div className="space-y-2">
                        <Label>Username *</Label>
                        <Input
                          placeholder="username"
                          value={connectionForm.username}
                          onChange={(e) => setConnectionForm(prev => ({ ...prev, username: e.target.value }))}
                          className="bg-slate-800 border-slate-600"
                        />
                      </div>
                      {connectionForm.authType === "password" && (
                        <div className="space-y-2">
                          <Label>Password *</Label>
                          <Input
                            type="password"
                            placeholder="password"
                            value={connectionForm.password}
                            onChange={(e) => setConnectionForm(prev => ({ ...prev, password: e.target.value }))}
                            className="bg-slate-800 border-slate-600"
                          />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Warehouse</Label>
                      <Input
                        placeholder="COMPUTE_WH"
                        value={connectionForm.warehouse}
                        onChange={(e) => setConnectionForm(prev => ({ ...prev, warehouse: e.target.value }))}
                        className="bg-slate-800 border-slate-600"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Database</Label>
                        <Input
                          placeholder="MY_DB"
                          value={connectionForm.database}
                          onChange={(e) => setConnectionForm(prev => ({ ...prev, database: e.target.value }))}
                          className="bg-slate-800 border-slate-600"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Schema</Label>
                        <Input
                          placeholder="PUBLIC"
                          value={connectionForm.schema}
                          onChange={(e) => setConnectionForm(prev => ({ ...prev, schema: e.target.value }))}
                          className="bg-slate-800 border-slate-600"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {connectionError && (
                    <div className="flex items-center gap-2 p-3 bg-red-950/30 border border-red-800 rounded-lg text-sm text-red-400">
                      <XCircle className="w-4 h-4 flex-shrink-0" />
                      {connectionError}
                    </div>
                  )}
                  
                  {connectionForm.authType === "externalbrowser" && (
                    <div className="flex items-center gap-2 p-3 bg-blue-950/30 border border-blue-800 rounded-lg text-sm text-blue-400">
                      <Globe className="w-4 h-4 flex-shrink-0" />
                      A browser window will open for SSO authentication
                    </div>
                  )}
                  
                  <DialogFooter>
                    <Button 
                      onClick={handleConnect}
                      disabled={isConnecting || !connectionForm.account || !connectionForm.username || (connectionForm.authType === "password" && !connectionForm.password)}
                      className="w-full bg-cyan-600 hover:bg-cyan-700"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {connectionForm.authType === "externalbrowser" ? "Opening browser..." : "Connecting..."}
                        </>
                      ) : (
                        <>
                          {connectionForm.authType === "externalbrowser" ? (
                            <Globe className="w-4 h-4 mr-2" />
                          ) : (
                            <Database className="w-4 h-4 mr-2" />
                          )}
                          {connectionForm.authType === "externalbrowser" ? "Open Browser & Connect" : "Connect to Snowflake"}
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
          
          <Button
            variant="outline"
            size="sm"
            onClick={newPipeline}
            className="border-slate-700"
          >
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
                <DialogTitle>Save Pipeline</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Save your pipeline to local storage
                </DialogDescription>
              </DialogHeader>
              <Input
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
                placeholder="Pipeline name"
                className="bg-slate-800 border-slate-600"
              />
              <DialogFooter>
                <Button onClick={() => checkAndSavePipeline()}>Save Pipeline</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
            <DialogContent className="bg-slate-900 border-slate-700">
              <DialogHeader>
                <DialogTitle>Overwrite Pipeline?</DialogTitle>
                <DialogDescription className="text-slate-400">
                  A pipeline named &quot;{pipelineName}&quot; already exists. Do you want to overwrite it?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowOverwriteDialog(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={() => savePipeline(true)}>
                  Overwrite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={loadSavedPipelines} className="border-slate-700">
                <FolderOpen className="w-4 h-4 mr-1" /> Load
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
              <DialogHeader>
                <DialogTitle>Load Pipeline</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Select a saved pipeline to load
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {savedPipelines.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No saved pipelines</p>
                ) : (
                  savedPipelines.map((pipeline) => (
                    <div
                      key={pipeline.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-800 hover:bg-slate-700 cursor-pointer"
                      onClick={() => loadPipeline(pipeline)}
                    >
                      <div>
                        <div className="font-medium">{pipeline.name}</div>
                        <div className="text-xs text-slate-500">
                          {pipeline.nodes.length} nodes • {new Date(pipeline.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePipeline(pipeline.id);
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
              <DropdownMenuItem onClick={exportPipeline}>
                <Download className="w-4 h-4 mr-2" /> Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <label className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" /> Import JSON
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={importPipeline}
                  />
                </label>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      
      <main className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={18} minSize={15} maxSize={25}>
            <ComponentPalette onDragStart={handleDragStart} />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={40} minSize={25}>
            <ETLCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              setNodes={setNodes}
              setEdges={setEdges}
              onNodeSelect={handleNodeSelect}
              onEdgeSelect={handleEdgeSelect}
              selectedEdgeId={selectedEdge?.id}
            />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={22} minSize={15} maxSize={30}>
            <NodeConfigPanel
              node={selectedNode}
              selectedEdge={selectedEdge}
              allNodes={nodes}
              edges={edges}
              onUpdate={handleNodeUpdate}
              onDelete={handleNodeDelete}
              onEdgeDelete={handleEdgeDelete}
              onEdgeUpdate={handleEdgeUpdate}
            />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <CodePreviewPanel nodes={nodes} edges={edges} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}
