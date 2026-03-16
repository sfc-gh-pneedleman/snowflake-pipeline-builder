"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Play, Check, AlertCircle, Loader2 } from "lucide-react";
import { Node, Edge } from "@xyflow/react";
import { ETLNodeData } from "@/lib/types";
import { generateSQL, topologicalSort } from "@/lib/code-generator";

interface CodePreviewPanelProps {
  nodes: Node<ETLNodeData>[];
  edges: Edge[];
}

interface DeployResult {
  success: boolean;
  message: string;
  results?: Array<{ sql: string; success: boolean; message: string }>;
}

export default function CodePreviewPanel({ nodes, edges }: CodePreviewPanelProps) {
  const [generatedSQL, setGeneratedSQL] = useState("");
  const [copied, setCopied] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  
  useEffect(() => {
    const sql = generateSQL(nodes, edges);
    setGeneratedSQL(sql);
  }, [nodes, edges]);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedSQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleDeploy = async () => {
    setDeploying(true);
    setDeployResult(null);
    
    try {
      const connCheck = await fetch('/api/connection?verify=true');
      const connStatus = await connCheck.json();
      if (!connStatus.connected) {
        setDeployResult({
          success: false,
          message: connStatus.expired 
            ? "Connection expired. Please reconnect to Snowflake."
            : "Not connected to Snowflake. Please connect first."
        });
        setShowDeployDialog(true);
        setDeploying(false);
        return;
      }
      
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: generatedSQL }),
      });
      
      const result = await response.json();
      setDeployResult(result);
      setShowDeployDialog(true);
    } catch (error) {
      setDeployResult({
        success: false,
        message: (error as Error).message
      });
      setShowDeployDialog(true);
    } finally {
      setDeploying(false);
    }
  };
  
  return (
    <>
      <Card className="h-full bg-slate-900/50 border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-slate-100">
              Generated Code
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {nodes.length} nodes
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="sql" className="w-full">
            <TabsList className="mx-4 bg-slate-800">
              <TabsTrigger value="sql">SQL</TabsTrigger>
              <TabsTrigger value="lineage">Lineage</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sql" className="mt-0">
              <div className="p-4 space-y-3">
                <ScrollArea className="h-[calc(100vh-380px)]">
                  <Textarea
                    value={generatedSQL || '-- Add components to generate SQL'}
                    readOnly
                    className="
                      bg-slate-950 border-slate-700 font-mono text-xs
                      min-h-[300px] resize-none text-slate-300
                    "
                  />
                </ScrollArea>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCopy}
                    disabled={!generatedSQL}
                    className="flex-1 border-slate-600"
                  >
                    {copied ? (
                      <><Check className="w-4 h-4 mr-2" /> Copied</>
                    ) : (
                      <><Copy className="w-4 h-4 mr-2" /> Copy</>
                    )}
                  </Button>
                  <Button
                    onClick={handleDeploy}
                    disabled={!generatedSQL || deploying}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {deploying ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deploying...</>
                    ) : (
                      <><Play className="w-4 h-4 mr-2" /> Deploy</>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="lineage" className="mt-0">
              <div className="p-4">
                <div className="space-y-2">
                  {nodes.length === 0 ? (
                    <p className="text-sm text-slate-500">No nodes added yet</p>
                  ) : (
                    topologicalSort(nodes, edges).map((node, index) => {
                      const incomingEdges = edges.filter(e => e.target === node.id);
                      const outgoingEdges = edges.filter(e => e.source === node.id);
                      const sourceNames = incomingEdges
                        .map(e => nodes.find(n => n.id === e.source))
                        .filter(Boolean)
                        .map(n => n!.data.config.name || n!.data.config.full_name || n!.data.label);
                      const targetNames = outgoingEdges
                        .map(e => nodes.find(n => n.id === e.target))
                        .filter(Boolean)
                        .map(n => n!.data.config.name || n!.data.label);
                      
                      return (
                        <div 
                          key={node.id}
                          className="p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {index + 1}
                            </Badge>
                            <span className="font-medium text-sm text-slate-200">
                              {node.data.label}
                            </span>
                            <Badge variant="secondary" className="text-xs ml-auto">
                              {node.data.type}
                            </Badge>
                          </div>
                          {sourceNames.length > 0 && (
                            <div className="text-xs text-cyan-400 mb-1">
                              ← from: {sourceNames.join(', ')}
                            </div>
                          )}
                          {targetNames.length > 0 && (
                            <div className="text-xs text-green-400">
                              → to: {targetNames.join(', ')}
                            </div>
                          )}
                          {sourceNames.length === 0 && targetNames.length === 0 && (
                            <div className="text-xs text-slate-500">
                              Not connected
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Dialog open={showDeployDialog} onOpenChange={setShowDeployDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {deployResult?.success ? (
                <><Check className="w-5 h-5 text-emerald-500" /> Deployment Successful</>
              ) : (
                <><AlertCircle className="w-5 h-5 text-red-500" /> Deployment Failed</>
              )}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {deployResult?.message}
            </DialogDescription>
          </DialogHeader>
          
          {deployResult?.results && (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {deployResult.results.map((r, i) => (
                  <div 
                    key={i}
                    className={`p-2 rounded text-xs font-mono ${
                      r.success 
                        ? 'bg-emerald-500/10 text-emerald-400' 
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    <div className="flex items-start gap-1">
                      <span>{r.success ? '✓' : '✗'}</span>
                      <span className="break-all">{r.sql.substring(0, 100)}...</span>
                    </div>
                    {!r.success && r.message && (
                      <div className="mt-2 p-2 bg-red-950/50 rounded text-red-300 break-all">
                        Error: {r.message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowDeployDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
