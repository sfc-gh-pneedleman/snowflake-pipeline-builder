"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Node, Edge } from "@xyflow/react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Save, RefreshCw, Link, Play, Loader2, AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { ETLNodeData, SnowflakeTable, SnowflakeColumn } from "@/lib/types";

interface NodeConfigPanelProps {
  node: Node<ETLNodeData> | null;
  selectedEdge: Edge | null;
  allNodes: Node<ETLNodeData>[];
  edges: Edge[];
  onUpdate: (nodeId: string, data: Partial<ETLNodeData>) => void;
  onDelete: (nodeId: string) => void;
  onEdgeDelete: (edgeId: string) => void;
  onEdgeUpdate: (edgeId: string, newSource: string, newTarget: string) => void;
}

interface SnowflakeDatabase {
  DATABASE_NAME: string;
}

interface SnowflakeSchema {
  SCHEMA_NAME: string;
}

interface SnowflakeStage {
  name: string;
  database_name: string;
  schema_name: string;
  type: string;
  url: string;
  owner: string;
}

function StageSelector({ 
  database, 
  schema, 
  value, 
  onChange 
}: { 
  database: string; 
  schema: string; 
  value: string;
  onChange: (stage: SnowflakeStage) => void;
}) {
  const [stages, setStages] = useState<SnowflakeStage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!database || !schema) {
      setStages([]);
      return;
    }
    
    setIsLoading(true);
    fetch(`/api/stages?database=${database}&schema=${schema}`)
      .then(res => res.json())
      .then(data => setStages(data.stages || []))
      .catch(() => setStages([]))
      .finally(() => setIsLoading(false));
  }, [database, schema]);

  return (
    <div className="space-y-2">
      <label className="text-xs text-slate-400">Select Existing Stage</label>
      <Select 
        value={value || ''} 
        onValueChange={(v) => {
          const stage = stages.find(s => s.name === v);
          if (stage) onChange(stage);
        }}
        disabled={!database || !schema || isLoading}
      >
        <SelectTrigger className="bg-slate-800 border-slate-600">
          <SelectValue placeholder={isLoading ? "Loading stages..." : "Select stage..."} />
        </SelectTrigger>
        <SelectContent>
          {stages.map(stage => (
            <SelectItem key={stage.name} value={stage.name}>
              {stage.name} ({stage.type})
            </SelectItem>
          ))}
          {stages.length === 0 && !isLoading && (
            <SelectItem value="_none" disabled>No stages found</SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function NodeConfigPanel({ node, selectedEdge, allNodes, edges, onUpdate, onDelete, onEdgeDelete, onEdgeUpdate }: NodeConfigPanelProps) {
  const [tables, setTables] = useState<SnowflakeTable[]>([]);
  const [columns, setColumns] = useState<SnowflakeColumn[]>([]);
  const [warehouses, setWarehouses] = useState<Array<{ name: string }>>([]);
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>({});
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [tablesError, setTablesError] = useState<string | null>(null);
  
  const [databases, setDatabases] = useState<SnowflakeDatabase[]>([]);
  const [schemas, setSchemas] = useState<SnowflakeSchema[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [selectedSchema, setSelectedSchema] = useState<string>('');
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false);
  const [isLoadingSchemas, setIsLoadingSchemas] = useState(false);
  const [sourceColumns, setSourceColumns] = useState<Record<string, SnowflakeColumn[]>>({});
  const [isLoadingSourceColumns, setIsLoadingSourceColumns] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[] | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const sqlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);

  const sourceNodes = useMemo(() => {
    if (!node) return [];
    const incomingEdges = edges.filter(e => e.target === node.id);
    return incomingEdges
      .map(e => allNodes.find(n => n.id === e.source))
      .filter(Boolean) as Node<ETLNodeData>[];
  }, [node, edges, allNodes]);

  const targetNodes = useMemo(() => {
    if (!node) return [];
    const outgoingEdges = edges.filter(e => e.source === node.id);
    return outgoingEdges
      .map(e => allNodes.find(n => n.id === e.target))
      .filter(Boolean) as Node<ETLNodeData>[];
  }, [node, edges, allNodes]);

  const sourceRefs = useMemo(() => {
    return sourceNodes.map(n => {
      if (n.data.type === 'source-table') {
        return n.data.config.full_name as string || n.data.config.name as string || n.data.label;
      }
      return n.data.config.name as string || n.data.label;
    }).filter(Boolean);
  }, [sourceNodes]);

  const sourceAliases = useMemo(() => {
    return sourceNodes.map((n, i) => {
      if (n.data.type === 'source-table' && n.data.config.alias) {
        return n.data.config.alias as string;
      }
      return String.fromCharCode(97 + i);
    });
  }, [sourceNodes]);

  const commonColumns = useMemo(() => {
    const tableNames = Object.keys(sourceColumns);
    if (tableNames.length < 2) return [];
    
    const columnSets = tableNames.map(t => 
      new Set(sourceColumns[t].map(c => c.COLUMN_NAME))
    );
    
    const firstSet = columnSets[0];
    const common: string[] = [];
    
    firstSet.forEach(col => {
      if (columnSets.every(set => set.has(col))) {
        common.push(col);
      }
    });
    
    return common;
  }, [sourceColumns]);

  const getDefaultSQL = useCallback(() => {
    if (sourceRefs.length === 0) return '';
    if (sourceRefs.length === 1) {
      const alias = sourceAliases[0];
      if (alias !== 'a') {
        return `SELECT *\nFROM ${sourceRefs[0]} ${alias}`;
      }
      return `SELECT *\nFROM ${sourceRefs[0]}`;
    }
    const fromClause = sourceRefs.map((s, i) => `${s} ${sourceAliases[i]}`).join('\nJOIN ');
    
    let joinCondition = `-- ON ${sourceAliases[0]}.column = ${sourceAliases[1]}.column`;
    if (commonColumns.length > 0) {
      const conditions = commonColumns.map(col => 
        `${sourceAliases[0]}.${col} = ${sourceAliases[1]}.${col}`
      ).join('\n  AND ');
      joinCondition = `ON ${conditions}`;
    }
    
    return `SELECT *\nFROM ${fromClause}\n  ${joinCondition}`;
  }, [sourceRefs, sourceAliases, commonColumns]);

  const runPreview = useCallback(async (sql: string) => {
    if (!sql.trim()) return;
    setIsLoadingPreview(true);
    setPreviewError(null);
    setPreviewData(null);
    
    const cleanSql = sql.replace(/;\s*$/, '');
    const previewSql = `${cleanSql} LIMIT 10`;
    
    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: previewSql }),
      });
      
      const result = await response.json();
      
      if (result.error) {
        setPreviewError(result.error);
      } else if (Array.isArray(result)) {
        setPreviewData(result);
      } else if (result.data && Array.isArray(result.data)) {
        setPreviewData(result.data);
      } else {
        setPreviewData([]);
      }
    } catch (err) {
      setPreviewError((err as Error).message);
    } finally {
      setIsLoadingPreview(false);
    }
  }, []);
  
  useEffect(() => {
    if (node) {
      setLocalConfig(node.data.config);
      setPreviewData(null);
      setPreviewError(null);
      if (node.data.config.full_name) {
        const parts = (node.data.config.full_name as string).split('.');
        if (parts.length >= 2) {
          setSelectedDatabase(parts[0]);
          setSelectedSchema(parts[1]);
        }
      }
    }
  }, [node?.id]);

  const fetchSourceColumns = useCallback(async () => {
    if (sourceNodes.length === 0) return;
    setIsLoadingSourceColumns(true);
    const columnsMap: Record<string, SnowflakeColumn[]> = {};
    
    for (const srcNode of sourceNodes) {
      if (srcNode.data.type === 'source-table' && srcNode.data.config.full_name) {
        const fullName = srcNode.data.config.full_name as string;
        const parts = fullName.split('.');
        if (parts.length === 3) {
          try {
            const res = await fetch(`/api/columns?database=${parts[0]}&schema=${parts[1]}&table=${parts[2]}`);
            const cols = await res.json();
            if (Array.isArray(cols)) {
              columnsMap[fullName] = cols;
            }
          } catch {
            // ignore errors
          }
        }
      }
    }
    setSourceColumns(columnsMap);
    setIsLoadingSourceColumns(false);
  }, [sourceNodes]);

  useEffect(() => {
    if (node?.data.type === 'sql-transform' || node?.data.type === 'dynamic-table') {
      fetchSourceColumns();
    }
  }, [node?.id, sourceNodes.length, fetchSourceColumns]);

  useEffect(() => {
    if (node && commonColumns.length > 0 && (node.data.type === 'sql-transform' || node.data.type === 'dynamic-table')) {
      const currentJoinCols = node.data.config.suggested_join_columns as string[] || [];
      if (JSON.stringify(currentJoinCols) !== JSON.stringify(commonColumns)) {
        onUpdate(node.id, { config: { ...node.data.config, suggested_join_columns: commonColumns } });
      }
    }
  }, [commonColumns, node?.id]);

  const fetchDatabases = useCallback(() => {
    setIsLoadingDatabases(true);
    fetch('/api/databases')
      .then(res => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDatabases(data);
        } else {
          setDatabases([]);
        }
      })
      .catch(() => setDatabases([]))
      .finally(() => setIsLoadingDatabases(false));
  }, []);

  const fetchSchemas = useCallback((database: string) => {
    if (!database) return;
    setIsLoadingSchemas(true);
    setSchemas([]);
    fetch(`/api/schemas?database=${database}`)
      .then(res => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSchemas(data);
        } else {
          setSchemas([]);
        }
      })
      .catch(() => setSchemas([]))
      .finally(() => setIsLoadingSchemas(false));
  }, []);

  const fetchTablesForDbSchema = useCallback((database: string, schema: string) => {
    if (!database || !schema) return;
    setIsLoadingTables(true);
    setTablesError(null);
    fetch(`/api/tables?database=${database}&schema=${schema}`)
      .then(res => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTables(data);
          setTablesError(null);
        } else if (data.error) {
          setTablesError(data.error);
          setTables([]);
        } else {
          setTables([]);
        }
      })
      .catch((err) => {
        setTablesError(err.message);
        setTables([]);
      })
      .finally(() => setIsLoadingTables(false));
  }, []);
  
  const fetchTables = useCallback(() => {
    setIsLoadingTables(true);
    setTablesError(null);
    fetch('/api/tables')
      .then(res => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTables(data);
          setTablesError(null);
        } else if (data.error) {
          setTablesError(data.error);
          setTables([]);
        } else {
          setTables([]);
        }
      })
      .catch((err) => {
        setTablesError(err.message);
        setTables([]);
      })
      .finally(() => setIsLoadingTables(false));
  }, []);

  useEffect(() => {
    fetchDatabases();
    fetchTables();
      
    fetch('/api/warehouses')
      .then(res => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const whs = data.map((w: Record<string, string>) => ({ 
            name: w.name || w.NAME || w["name"] || Object.values(w)[0] 
          }));
          setWarehouses(whs);
        } else {
          console.warn('Warehouses API returned non-array:', data);
          setWarehouses([]);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedDatabase) {
      fetchSchemas(selectedDatabase);
    }
  }, [selectedDatabase, fetchSchemas]);

  useEffect(() => {
    if (node?.data.type === 'stage' && localConfig.database) {
      fetchSchemas(localConfig.database as string);
    }
  }, [node?.data.type, localConfig.database, fetchSchemas]);

  useEffect(() => {
    if (selectedDatabase && selectedSchema) {
      fetchTablesForDbSchema(selectedDatabase, selectedSchema);
    }
  }, [selectedDatabase, selectedSchema, fetchTablesForDbSchema]);
  
  useEffect(() => {
    if (node?.data.type === 'source-table' && localConfig.full_name) {
      const [db, schema, table] = (localConfig.full_name as string).split('.');
      if (db && schema && table) {
        fetch(`/api/columns?database=${db}&schema=${schema}&table=${table}`)
          .then(res => res.json())
          .then((data) => {
            if (Array.isArray(data)) {
              setColumns(data);
            } else {
              console.warn('Columns API returned non-array:', data);
              setColumns([]);
            }
          })
          .catch(console.error);
      }
    }
  }, [localConfig.full_name, node?.data.type]);
  
  const [edgeSource, setEdgeSource] = useState<string>('');
  const [edgeTarget, setEdgeTarget] = useState<string>('');

  useEffect(() => {
    if (selectedEdge) {
      setEdgeSource(selectedEdge.source);
      setEdgeTarget(selectedEdge.target);
    }
  }, [selectedEdge?.id]);
  
  if (selectedEdge) {
    const sourceNode = allNodes.find(n => n.id === selectedEdge.source);
    const targetNode = allNodes.find(n => n.id === selectedEdge.target);
    
    return (
      <Card className="h-full bg-slate-900/50 border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-slate-100">
              Configure Connection
            </CardTitle>
            <Badge variant="secondary" className="text-xs bg-cyan-950 text-cyan-400">
              <Link className="w-3 h-3 mr-1" />
              Edge
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="p-4 space-y-4">
              <div className="p-3 bg-slate-800/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-xs">{sourceNode?.data.type}</Badge>
                  <span className="text-slate-300 font-medium">{sourceNode?.data.label}</span>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-xs">{targetNode?.data.type}</Badge>
                  <span className="text-slate-300 font-medium">{targetNode?.data.label}</span>
                </div>
              </div>
              
              <Separator className="bg-slate-700" />
              
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Source Node</label>
                <Select value={edgeSource} onValueChange={setEdgeSource}>
                  <SelectTrigger className="bg-slate-800 border-slate-600">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {allNodes
                      .filter(n => n.id !== edgeTarget)
                      .map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          <span className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">{n.data.type}</Badge>
                            {n.data.label}
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Target Node</label>
                <Select value={edgeTarget} onValueChange={setEdgeTarget}>
                  <SelectTrigger className="bg-slate-800 border-slate-600">
                    <SelectValue placeholder="Select target" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {allNodes
                      .filter(n => n.id !== edgeSource)
                      .map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          <span className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">{n.data.type}</Badge>
                            {n.data.label}
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Separator className="bg-slate-700" />
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => onEdgeUpdate(selectedEdge.id, edgeSource, edgeTarget)}
                  disabled={!edgeSource || !edgeTarget || edgeSource === edgeTarget}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Update
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => onEdgeDelete(selectedEdge.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }
  
  if (!node) {
    return (
      <Card className="h-full bg-slate-900/50 border-slate-700">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-slate-500 text-sm">Select a node to configure</p>
        </CardContent>
      </Card>
    );
  }
  
  const updateConfig = (key: string, value: unknown) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  };
  
  const saveConfig = () => {
    onUpdate(node.id, { config: localConfig });
  };
  
  const renderConfigFields = () => {
    switch (node.data.type) {
      case 'source-table': {
        return (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">Database</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchDatabases}
                  disabled={isLoadingDatabases}
                  className="h-6 px-2 text-xs text-slate-500 hover:text-slate-300"
                >
                  {isLoadingDatabases ? <span className="animate-spin">↻</span> : "Refresh"}
                </Button>
              </div>
              <Select 
                value={selectedDatabase} 
                onValueChange={(v) => {
                  setSelectedDatabase(v);
                  setSelectedSchema('');
                  setTables([]);
                  updateConfig('full_name', '');
                  updateConfig('name', '');
                }}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue placeholder="Select database" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-60 bg-slate-800 border border-slate-600 z-[9999] shadow-xl">
                  {databases.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-slate-500 text-center">
                      No databases found. Connect to Snowflake first.
                    </div>
                  ) : (
                    databases.map((db) => (
                      <SelectItem key={db.DATABASE_NAME} value={db.DATABASE_NAME}>
                        {db.DATABASE_NAME}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400">Schema</label>
              <Select 
                value={selectedSchema} 
                onValueChange={(v) => {
                  setSelectedSchema(v);
                  setTables([]);
                  updateConfig('full_name', '');
                  updateConfig('name', '');
                }}
                disabled={!selectedDatabase}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue placeholder={selectedDatabase ? "Select schema" : "Select database first"} />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-60 bg-slate-800 border border-slate-600 z-[9999] shadow-xl">
                  {isLoadingSchemas ? (
                    <div className="px-2 py-3 text-xs text-slate-500 text-center">Loading schemas...</div>
                  ) : schemas.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-slate-500 text-center">
                      No schemas found.
                    </div>
                  ) : (
                    schemas.map((s) => (
                      <SelectItem key={s.SCHEMA_NAME} value={s.SCHEMA_NAME}>
                        {s.SCHEMA_NAME}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">Table</label>
                {selectedDatabase && selectedSchema && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchTablesForDbSchema(selectedDatabase, selectedSchema)}
                    disabled={isLoadingTables}
                    className="h-6 px-2 text-xs text-slate-500 hover:text-slate-300"
                  >
                    {isLoadingTables ? <span className="animate-spin">↻</span> : "Refresh"}
                  </Button>
                )}
              </div>
              <Select 
                value={localConfig.full_name as string || ''} 
                onValueChange={(v) => {
                  const parts = v.split('.');
                  const name = parts[parts.length - 1];
                  updateConfig('full_name', v);
                  updateConfig('name', name);
                }}
                disabled={!selectedDatabase || !selectedSchema}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue placeholder={!selectedDatabase || !selectedSchema ? "Select database & schema first" : "Select table"} />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-60 bg-slate-800 border border-slate-600 z-[9999] shadow-xl">
                  {tablesError ? (
                    <div className="px-2 py-3 text-xs text-red-400 text-center">
                      {tablesError}<br />
                      <span className="text-slate-500">Connect to Snowflake to load tables</span>
                    </div>
                  ) : isLoadingTables ? (
                    <div className="px-2 py-3 text-xs text-slate-500 text-center">Loading tables...</div>
                  ) : tables.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-slate-500 text-center">
                      No tables found in {selectedDatabase}.{selectedSchema}
                    </div>
                  ) : (
                    tables.map((t) => (
                      <SelectItem 
                        key={`${t.TABLE_CATALOG}.${t.TABLE_SCHEMA}.${t.TABLE_NAME}`}
                        value={`${t.TABLE_CATALOG}.${t.TABLE_SCHEMA}.${t.TABLE_NAME}`}
                      >
                        {t.TABLE_NAME}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {localConfig.full_name && (
              <>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Alias (optional)</label>
                  <Input
                    value={localConfig.alias as string || ''}
                    onChange={(e) => updateConfig('alias', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                    placeholder="e.g., ORDERS, CUST"
                    className="bg-slate-800 border-slate-600 font-mono"
                    maxLength={20}
                  />
                  <p className="text-[10px] text-slate-500">Used as table alias in JOINs (e.g., ORDERS.id instead of a.id)</p>
                </div>
                <div className="p-2 bg-slate-800/50 rounded text-xs text-slate-400">
                  Selected: <span className="text-cyan-400 font-mono">{localConfig.full_name as string}</span>
                  {localConfig.alias ? (
                    <span className="text-emerald-400 font-mono"> AS {localConfig.alias as string}</span>
                  ) : null}
                </div>
              </>
            )}

            {columns.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Columns</label>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {columns.map((col) => (
                    <div key={col.COLUMN_NAME} className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-[10px]">{col.DATA_TYPE}</Badge>
                      <span className="text-slate-300">{col.COLUMN_NAME}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {localConfig.full_name && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400">Data Preview</label>
                  <div className="flex items-center gap-1">
                    {previewData && previewData.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                        className="text-xs text-slate-400 hover:text-slate-300 h-7 px-2"
                      >
                        {showPreview ? <><EyeOff className="w-3 h-3 mr-1" /> Hide</> : <><Eye className="w-3 h-3 mr-1" /> Show</>}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runPreview(`SELECT * FROM ${localConfig.full_name}`)}
                      disabled={isLoadingPreview}
                      className="text-xs border-emerald-700 text-emerald-400 hover:bg-emerald-950"
                    >
                      {isLoadingPreview ? (
                        <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Loading...</>
                      ) : (
                        <><Play className="w-3 h-3 mr-1" /> Preview Data</>
                      )}
                    </Button>
                  </div>
                </div>
                {previewError && (
                  <div className="p-2 bg-red-950/30 border border-red-800 rounded text-xs text-red-400 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="break-all">{previewError}</span>
                  </div>
                )}
                {previewData && previewData.length === 0 && (
                  <div className="p-2 bg-slate-800/50 rounded text-xs text-slate-500">
                    Table is empty
                  </div>
                )}
                {previewData && previewData.length > 0 && showPreview && (
                  <div className="border border-slate-700 rounded" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                    <div className="max-h-48" style={{ overflowX: 'auto', overflowY: 'auto' }}>
                      <table className="text-xs" style={{ minWidth: '100%', width: 'max-content' }}>
                        <thead className="bg-slate-800 sticky top-0">
                          <tr>
                            {Object.keys(previewData[0]).map((col) => (
                              <th key={col} className="px-3 py-1.5 text-left text-slate-400 font-medium border-b border-slate-700 whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.map((row, i) => (
                            <tr key={i} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50">
                              {Object.values(row).map((val, j) => (
                                <td key={j} className="px-3 py-1 text-slate-300 whitespace-nowrap">
                                  {val === null ? <span className="text-slate-600">NULL</span> : String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-2 py-1 bg-slate-800/50 border-t border-slate-700 text-[10px] text-slate-500">
                      Showing {previewData.length} row{previewData.length !== 1 ? 's' : ''} (LIMIT 10)
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        );
      }
        
      case 'sql-transform': {
        const sqlValue = localConfig.sql as string || getDefaultSQL();
        const outputType = localConfig.output_type as string || 'view';
        const insertColumn = (col: string, table: string) => {
          const tableIndex = sourceRefs.indexOf(table);
          const alias = sourceRefs.length > 1 && tableIndex >= 0
            ? sourceAliases[tableIndex]
            : '';
          const colRef = alias ? `${alias}.${col}` : col;
          const currentSql = localConfig.sql as string || getDefaultSQL();
          
          const textarea = sqlTextareaRef.current;
          if (textarea && cursorPosition !== null) {
            const before = currentSql.substring(0, cursorPosition);
            const after = currentSql.substring(cursorPosition);
            const newSql = before + colRef + after;
            updateConfig('sql', newSql);
            setTimeout(() => {
              textarea.focus();
              const newPos = cursorPosition + colRef.length;
              textarea.setSelectionRange(newPos, newPos);
              setCursorPosition(newPos);
            }, 0);
          } else if (currentSql.includes('SELECT *')) {
            updateConfig('sql', currentSql.replace('SELECT *', `SELECT ${colRef}`));
          } else {
            updateConfig('sql', currentSql + colRef);
          }
        };
        return (
          <>
            {sourceRefs.length > 0 && (
              <div className="p-2 bg-cyan-950/30 border border-cyan-800 rounded text-xs">
                <div className="flex items-center gap-1 text-cyan-400 mb-1">
                  <Link className="w-3 h-3" />
                  Connected Sources:
                </div>
                <div className="text-slate-300 font-mono">
                  {sourceRefs.join(', ')}
                </div>
              </div>
            )}
            {commonColumns.length > 0 && sourceRefs.length > 1 && (
              <div className="p-2 bg-emerald-950/30 border border-emerald-800 rounded text-xs">
                <div className="text-emerald-400 mb-1">
                  Suggested Join Columns:
                </div>
                <div className="flex flex-wrap gap-1">
                  {commonColumns.map(col => (
                    <Badge key={col} variant="outline" className="text-[10px] text-emerald-300 border-emerald-700 font-mono">
                      {col}
                    </Badge>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Common columns detected - auto-applied to JOIN condition</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Output Name</label>
              <Input
                value={localConfig.name as string || ''}
                onChange={(e) => updateConfig('name', e.target.value)}
                placeholder="MY_TRANSFORM"
                className="bg-slate-800 border-slate-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Output Type</label>
              <Select 
                value={outputType} 
                onValueChange={(v) => updateConfig('output_type', v)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="table">Table</SelectItem>
                  <SelectItem value="temp_table">Temporary Table</SelectItem>
                  <SelectItem value="transient_table">Transient Table</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {Object.keys(sourceColumns).length > 0 && (
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Source Columns (click to add)</label>
                <div className="max-h-32 overflow-y-auto border border-slate-700 rounded p-2 space-y-2">
                  {isLoadingSourceColumns ? (
                    <div className="text-xs text-slate-500">Loading columns...</div>
                  ) : (
                    Object.entries(sourceColumns).map(([tableName, cols]) => (
                      <div key={tableName}>
                        <div className="text-[10px] text-slate-500 mb-1">{tableName.split('.').pop()}</div>
                        <div className="flex flex-wrap gap-1">
                          {cols.map((col) => (
                            <button
                              key={col.COLUMN_NAME}
                              onClick={() => insertColumn(col.COLUMN_NAME, tableName)}
                              className="px-1.5 py-0.5 text-[10px] bg-slate-700 hover:bg-slate-600 rounded text-slate-300 font-mono"
                              title={col.DATA_TYPE}
                            >
                              {col.COLUMN_NAME}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">SQL Query</label>
                {sourceRefs.length > 0 && !localConfig.sql && (
                  <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-700">
                    Auto-generated
                  </Badge>
                )}
              </div>
              <Textarea
                ref={sqlTextareaRef}
                value={sqlValue}
                onChange={(e) => {
                  updateConfig('sql', e.target.value);
                  setCursorPosition(e.target.selectionStart);
                }}
                onSelect={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart)}
                onClick={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart)}
                onKeyUp={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart)}
                placeholder={sourceRefs.length > 0 ? `SELECT * FROM ${sourceRefs[0]}` : "Connect a source or enter SQL"}
                className="bg-slate-800 border-slate-600 font-mono text-xs min-h-[150px]"
              />
              <div className="flex gap-2">
                {sourceRefs.length > 0 && localConfig.sql ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateConfig('sql', getDefaultSQL())}
                    className="text-xs text-slate-500 hover:text-slate-300"
                  >
                    Reset to default
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runPreview(sqlValue)}
                  disabled={isLoadingPreview || !sqlValue.trim()}
                  className="text-xs border-emerald-700 text-emerald-400 hover:bg-emerald-950 ml-auto"
                >
                  {isLoadingPreview ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Running...</>
                  ) : (
                    <><Play className="w-3 h-3 mr-1" /> Run Preview</>
                  )}
                </Button>
              </div>
            </div>
            
            {(previewData || previewError || isLoadingPreview) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400">Data Preview (LIMIT 10)</label>
                  {previewData && previewData.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                      className="text-xs text-slate-400 hover:text-slate-300 h-7 px-2"
                    >
                      {showPreview ? <><EyeOff className="w-3 h-3 mr-1" /> Hide</> : <><Eye className="w-3 h-3 mr-1" /> Show</>}
                    </Button>
                  )}
                </div>
                {previewError && (
                  <div className="p-2 bg-red-950/30 border border-red-800 rounded text-xs text-red-400 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="break-all">{previewError}</span>
                  </div>
                )}
                {previewData && previewData.length === 0 && (
                  <div className="p-2 bg-slate-800/50 rounded text-xs text-slate-500">
                    Query returned no results
                  </div>
                )}
                {previewData && previewData.length > 0 && showPreview && (
                  <div className="border border-slate-700 rounded" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                    <div className="max-h-48" style={{ overflowX: 'auto', overflowY: 'auto' }}>
                      <table className="text-xs" style={{ minWidth: '100%', width: 'max-content' }}>
                        <thead className="bg-slate-800 sticky top-0">
                          <tr>
                            {Object.keys(previewData[0]).map((col) => (
                              <th key={col} className="px-3 py-1.5 text-left text-slate-400 font-medium border-b border-slate-700 whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.map((row, i) => (
                            <tr key={i} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50">
                              {Object.values(row).map((val, j) => (
                                <td key={j} className="px-3 py-1 text-slate-300 whitespace-nowrap">
                                  {val === null ? <span className="text-slate-600">NULL</span> : String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-2 py-1 bg-slate-800/50 border-t border-slate-700 text-[10px] text-slate-500">
                      Showing {previewData.length} row{previewData.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        );
      }
        
      case 'dynamic-table': {
        const sqlValue = localConfig.sql as string || getDefaultSQL();
        return (
          <>
            {sourceRefs.length > 0 && (
              <div className="p-2 bg-cyan-950/30 border border-cyan-800 rounded text-xs">
                <div className="flex items-center gap-1 text-cyan-400 mb-1">
                  <Link className="w-3 h-3" />
                  Connected Sources:
                </div>
                <div className="text-slate-300 font-mono">
                  {sourceRefs.join(', ')}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Dynamic Table Name</label>
              <Input
                value={localConfig.name as string || ''}
                onChange={(e) => updateConfig('name', e.target.value)}
                placeholder="MY_DYNAMIC_TABLE"
                className="bg-slate-800 border-slate-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Target Lag</label>
              <Select 
                value={localConfig.target_lag as string || '1 minute'} 
                onValueChange={(v) => updateConfig('target_lag', v)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1 minute">1 minute</SelectItem>
                  <SelectItem value="5 minutes">5 minutes</SelectItem>
                  <SelectItem value="10 minutes">10 minutes</SelectItem>
                  <SelectItem value="1 hour">1 hour</SelectItem>
                  <SelectItem value="downstream">Downstream</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Warehouse</label>
              <Select 
                value={localConfig.warehouse as string || ''} 
                onValueChange={(v) => updateConfig('warehouse', v)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.name} value={w.name}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">SQL Query</label>
                {sourceRefs.length > 0 && !localConfig.sql && (
                  <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-700">
                    Auto-generated
                  </Badge>
                )}
              </div>
              <Textarea
                value={sqlValue}
                onChange={(e) => updateConfig('sql', e.target.value)}
                placeholder={sourceRefs.length > 0 ? `SELECT * FROM ${sourceRefs[0]}` : "Connect a source or enter SQL"}
                className="bg-slate-800 border-slate-600 font-mono text-xs min-h-[120px]"
              />
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runPreview(sqlValue)}
                  disabled={isLoadingPreview || !sqlValue.trim()}
                  className="text-xs border-emerald-700 text-emerald-400 hover:bg-emerald-950"
                >
                  {isLoadingPreview ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Running...</>
                  ) : (
                    <><Play className="w-3 h-3 mr-1" /> Run Preview</>
                  )}
                </Button>
              </div>
            </div>
            
            {(previewData || previewError) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400">Data Preview (LIMIT 10)</label>
                  {previewData && previewData.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                      className="text-xs text-slate-400 hover:text-slate-300 h-7 px-2"
                    >
                      {showPreview ? <><EyeOff className="w-3 h-3 mr-1" /> Hide</> : <><Eye className="w-3 h-3 mr-1" /> Show</>}
                    </Button>
                  )}
                </div>
                {previewError && (
                  <div className="p-2 bg-red-950/30 border border-red-800 rounded text-xs text-red-400 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="break-all">{previewError}</span>
                  </div>
                )}
                {previewData && previewData.length === 0 && (
                  <div className="p-2 bg-slate-800/50 rounded text-xs text-slate-500">
                    Query returned no results
                  </div>
                )}
                {previewData && previewData.length > 0 && showPreview && (
                  <div className="border border-slate-700 rounded" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                    <div className="max-h-48" style={{ overflowX: 'auto', overflowY: 'auto' }}>
                      <table className="text-xs" style={{ minWidth: '100%', width: 'max-content' }}>
                        <thead className="bg-slate-800 sticky top-0">
                          <tr>
                            {Object.keys(previewData[0]).map((col) => (
                              <th key={col} className="px-3 py-1.5 text-left text-slate-400 font-medium border-b border-slate-700 whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.map((row, i) => (
                            <tr key={i} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50">
                              {Object.values(row).map((val, j) => (
                                <td key={j} className="px-3 py-1 text-slate-300 whitespace-nowrap">
                                  {val === null ? <span className="text-slate-600">NULL</span> : String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-2 py-1 bg-slate-800/50 border-t border-slate-700 text-[10px] text-slate-500">
                      Showing {previewData.length} row{previewData.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        );
      }
        
      case 'task':
        return (
          <>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Task Name</label>
              <Input
                value={localConfig.name as string || ''}
                onChange={(e) => updateConfig('name', e.target.value)}
                placeholder="MY_TASK"
                className="bg-slate-800 border-slate-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Warehouse</label>
              <Select 
                value={localConfig.warehouse as string || ''} 
                onValueChange={(v) => updateConfig('warehouse', v)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.name} value={w.name}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Schedule</label>
              <Input
                value={localConfig.schedule as string || ''}
                onChange={(e) => updateConfig('schedule', e.target.value)}
                placeholder="1 MINUTE"
                className="bg-slate-800 border-slate-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Stream Trigger (optional)</label>
              <Input
                value={localConfig.stream_name as string || ''}
                onChange={(e) => updateConfig('stream_name', e.target.value)}
                placeholder="MY_STREAM"
                className="bg-slate-800 border-slate-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">SQL to Execute</label>
              <Textarea
                value={localConfig.sql as string || ''}
                onChange={(e) => updateConfig('sql', e.target.value)}
                placeholder="INSERT INTO target SELECT * FROM stream"
                className="bg-slate-800 border-slate-600 font-mono text-xs min-h-[100px]"
              />
            </div>
          </>
        );
        
      case 'stream':
        return (
          <>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Stream Name</label>
              <Input
                value={localConfig.name as string || ''}
                onChange={(e) => updateConfig('name', e.target.value)}
                placeholder="MY_STREAM"
                className="bg-slate-800 border-slate-600"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">Source Database</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchDatabases}
                  disabled={isLoadingDatabases}
                  className="h-6 px-2 text-xs text-slate-500 hover:text-slate-300"
                >
                  {isLoadingDatabases ? <span className="animate-spin">↻</span> : "Refresh"}
                </Button>
              </div>
              <Select 
                value={selectedDatabase} 
                onValueChange={(v) => {
                  setSelectedDatabase(v);
                  setSelectedSchema('');
                  setTables([]);
                  updateConfig('source_table', '');
                }}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue placeholder="Select database" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-60 bg-slate-800 border border-slate-600 z-[9999] shadow-xl">
                  {databases.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-slate-500 text-center">
                      No databases found. Connect to Snowflake first.
                    </div>
                  ) : (
                    databases.map((db) => (
                      <SelectItem key={db.DATABASE_NAME} value={db.DATABASE_NAME}>
                        {db.DATABASE_NAME}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400">Source Schema</label>
              <Select 
                value={selectedSchema} 
                onValueChange={(v) => {
                  setSelectedSchema(v);
                  setTables([]);
                  updateConfig('source_table', '');
                }}
                disabled={!selectedDatabase}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue placeholder={selectedDatabase ? "Select schema" : "Select database first"} />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-60 bg-slate-800 border border-slate-600 z-[9999] shadow-xl">
                  {isLoadingSchemas ? (
                    <div className="px-2 py-3 text-xs text-slate-500 text-center">Loading schemas...</div>
                  ) : schemas.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-slate-500 text-center">
                      No schemas found.
                    </div>
                  ) : (
                    schemas.map((s) => (
                      <SelectItem key={s.SCHEMA_NAME} value={s.SCHEMA_NAME}>
                        {s.SCHEMA_NAME}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">Source Table</label>
                {selectedDatabase && selectedSchema && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchTablesForDbSchema(selectedDatabase, selectedSchema)}
                    disabled={isLoadingTables}
                    className="h-6 px-2 text-xs text-slate-500 hover:text-slate-300"
                  >
                    {isLoadingTables ? <span className="animate-spin">↻</span> : "Refresh"}
                  </Button>
                )}
              </div>
              <Select 
                value={localConfig.source_table as string || ''} 
                onValueChange={(v) => updateConfig('source_table', v)}
                disabled={!selectedDatabase || !selectedSchema}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue placeholder={!selectedDatabase || !selectedSchema ? "Select database & schema first" : "Select table"} />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-60 bg-slate-800 border border-slate-600 z-[9999] shadow-xl">
                  {tablesError ? (
                    <div className="px-2 py-3 text-xs text-red-400 text-center">
                      {tablesError}<br />
                      <span className="text-slate-500">Connect to Snowflake to load tables</span>
                    </div>
                  ) : isLoadingTables ? (
                    <div className="px-2 py-3 text-xs text-slate-500 text-center">Loading tables...</div>
                  ) : tables.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-slate-500 text-center">
                      No tables found in {selectedDatabase}.{selectedSchema}
                    </div>
                  ) : (
                    tables.map((t) => (
                      <SelectItem 
                        key={`${t.TABLE_CATALOG}.${t.TABLE_SCHEMA}.${t.TABLE_NAME}`}
                        value={`${t.TABLE_CATALOG}.${t.TABLE_SCHEMA}.${t.TABLE_NAME}`}
                      >
                        {t.TABLE_NAME}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {localConfig.source_table && (
              <>
                <div className="p-2 bg-slate-800/50 rounded text-xs text-slate-400">
                  Source: <span className="text-cyan-400 font-mono">{localConfig.source_table as string}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-400">Source Data Preview</label>
                    <div className="flex items-center gap-1">
                      {previewData && previewData.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPreview(!showPreview)}
                          className="text-xs text-slate-400 hover:text-slate-300 h-7 px-2"
                        >
                          {showPreview ? <><EyeOff className="w-3 h-3 mr-1" /> Hide</> : <><Eye className="w-3 h-3 mr-1" /> Show</>}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => runPreview(`SELECT * FROM ${localConfig.source_table}`)}
                        disabled={isLoadingPreview}
                        className="text-xs border-emerald-700 text-emerald-400 hover:bg-emerald-950"
                      >
                        {isLoadingPreview ? (
                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Loading...</>
                        ) : (
                          <><Play className="w-3 h-3 mr-1" /> Preview Data</>
                        )}
                      </Button>
                    </div>
                  </div>
                  {previewError && (
                    <div className="p-2 bg-red-950/30 border border-red-800 rounded text-xs text-red-400 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span className="break-all">{previewError}</span>
                    </div>
                  )}
                  {previewData && previewData.length === 0 && (
                    <div className="p-2 bg-slate-800/50 rounded text-xs text-slate-500">
                      Table is empty
                    </div>
                  )}
                  {previewData && previewData.length > 0 && showPreview && (
                    <div className="border border-slate-700 rounded" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                      <div className="max-h-48" style={{ overflowX: 'auto', overflowY: 'auto' }}>
                        <table className="text-xs" style={{ minWidth: '100%', width: 'max-content' }}>
                          <thead className="bg-slate-800 sticky top-0">
                            <tr>
                              {Object.keys(previewData[0]).map((col) => (
                                <th key={col} className="px-3 py-1.5 text-left text-slate-400 font-medium border-b border-slate-700 whitespace-nowrap">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.map((row, i) => (
                              <tr key={i} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50">
                                {Object.values(row).map((val, j) => (
                                  <td key={j} className="px-3 py-1 text-slate-300 whitespace-nowrap">
                                    {val === null ? <span className="text-slate-600">NULL</span> : String(val)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="px-2 py-1 bg-slate-800/50 border-t border-slate-700 text-[10px] text-slate-500">
                        Showing {previewData.length} row{previewData.length !== 1 ? 's' : ''} (LIMIT 10)
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={localConfig.append_only as boolean || false}
                onChange={(e) => updateConfig('append_only', e.target.checked)}
                className="rounded"
              />
              <label className="text-xs text-slate-400">Append Only</label>
            </div>
          </>
        );
        
      case 'stage':
        return (
          <>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Mode</label>
              <Select 
                value={localConfig.mode as string || 'create'} 
                onValueChange={(v) => updateConfig('mode', v)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="create">Create New Stage</SelectItem>
                  <SelectItem value="existing">Use Existing Stage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Database</label>
              <Select 
                value={localConfig.database as string || ''} 
                onValueChange={(v) => {
                  updateConfig('database', v);
                  updateConfig('schema', '');
                  updateConfig('existing_stage', '');
                }}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue placeholder="Select database..." />
                </SelectTrigger>
                <SelectContent>
                  {databases.map(db => (
                    <SelectItem key={db.DATABASE_NAME} value={db.DATABASE_NAME}>
                      {db.DATABASE_NAME}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Schema</label>
              <Select 
                value={localConfig.schema as string || ''} 
                onValueChange={(v) => {
                  updateConfig('schema', v);
                  updateConfig('existing_stage', '');
                }}
                disabled={!localConfig.database}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue placeholder="Select schema..." />
                </SelectTrigger>
                <SelectContent>
                  {schemas.map(s => (
                    <SelectItem key={s.SCHEMA_NAME} value={s.SCHEMA_NAME}>
                      {s.SCHEMA_NAME}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {localConfig.mode === 'existing' ? (
              <StageSelector
                database={localConfig.database as string}
                schema={localConfig.schema as string}
                value={localConfig.existing_stage as string}
                onChange={(stage) => {
                  updateConfig('existing_stage', stage.name);
                  updateConfig('name', stage.name);
                  updateConfig('stage_type', stage.type === 'INTERNAL' ? 'internal' : 'external_s3');
                  if (stage.url) updateConfig('url', stage.url);
                }}
              />
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Stage Name</label>
                  <Input
                    value={localConfig.name as string || ''}
                    onChange={(e) => updateConfig('name', e.target.value)}
                    placeholder="MY_STAGE"
                    className="bg-slate-800 border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Stage Type</label>
                  <Select 
                    value={localConfig.stage_type as string || 'internal'} 
                    onValueChange={(v) => updateConfig('stage_type', v)}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal (Snowflake-managed)</SelectItem>
                      <SelectItem value="external_s3">External - Amazon S3</SelectItem>
                      <SelectItem value="external_gcs">External - Google Cloud Storage</SelectItem>
                      <SelectItem value="external_azure">External - Azure Blob Storage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(localConfig.stage_type as string)?.startsWith('external') && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs text-slate-400">URL</label>
                      <Input
                        value={localConfig.url as string || ''}
                        onChange={(e) => updateConfig('url', e.target.value)}
                        placeholder={
                          localConfig.stage_type === 'external_s3' ? 's3://bucket/path/' :
                          localConfig.stage_type === 'external_gcs' ? 'gcs://bucket/path/' :
                          'azure://account.blob.core.windows.net/container/path/'
                        }
                        className="bg-slate-800 border-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-slate-400">Storage Integration (optional)</label>
                      <Input
                        value={localConfig.storage_integration as string || ''}
                        onChange={(e) => updateConfig('storage_integration', e.target.value)}
                        placeholder="MY_STORAGE_INTEGRATION"
                        className="bg-slate-800 border-slate-600"
                      />
                      <p className="text-[10px] text-slate-500">Required for external stages with IAM role auth</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-slate-400">Credentials (if not using integration)</label>
                      {localConfig.stage_type === 'external_s3' && (
                        <>
                          <Input
                            value={localConfig.aws_key_id as string || ''}
                            onChange={(e) => updateConfig('aws_key_id', e.target.value)}
                            placeholder="AWS_KEY_ID"
                            className="bg-slate-800 border-slate-600 mb-2"
                          />
                          <Input
                            value={localConfig.aws_secret_key as string || ''}
                            onChange={(e) => updateConfig('aws_secret_key', e.target.value)}
                            placeholder="AWS_SECRET_KEY"
                            type="password"
                            className="bg-slate-800 border-slate-600"
                          />
                        </>
                      )}
                      {localConfig.stage_type === 'external_azure' && (
                        <Input
                          value={localConfig.azure_sas_token as string || ''}
                          onChange={(e) => updateConfig('azure_sas_token', e.target.value)}
                          placeholder="SAS Token"
                          type="password"
                          className="bg-slate-800 border-slate-600"
                        />
                      )}
                    </div>
                  </>
                )}
              </>
            )}
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Default File Format</label>
              <Select 
                value={localConfig.file_format as string || 'CSV'} 
                onValueChange={(v) => updateConfig('file_format', v)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CSV">CSV</SelectItem>
                  <SelectItem value="JSON">JSON</SelectItem>
                  <SelectItem value="PARQUET">Parquet</SelectItem>
                  <SelectItem value="AVRO">Avro</SelectItem>
                  <SelectItem value="ORC">ORC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={localConfig.directory_enabled as boolean || false}
                onChange={(e) => updateConfig('directory_enabled', e.target.checked)}
                className="rounded"
              />
              <label className="text-xs text-slate-400">Enable Directory Table</label>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Encryption</label>
              <Select 
                value={localConfig.encryption as string || 'SNOWFLAKE_FULL'} 
                onValueChange={(v) => updateConfig('encryption', v)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SNOWFLAKE_FULL">Snowflake Full (default)</SelectItem>
                  <SelectItem value="SNOWFLAKE_SSE">Snowflake SSE</SelectItem>
                  <SelectItem value="AWS_CSE">AWS CSE (S3)</SelectItem>
                  <SelectItem value="AWS_SSE_S3">AWS SSE-S3</SelectItem>
                  <SelectItem value="AWS_SSE_KMS">AWS SSE-KMS</SelectItem>
                  <SelectItem value="GCS_SSE_KMS">GCS SSE-KMS</SelectItem>
                  <SelectItem value="AZURE_CSE">Azure CSE</SelectItem>
                  <SelectItem value="NONE">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );
        
      case 'file-format':
        return (
          <>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Format Name</label>
              <Input
                value={localConfig.name as string || ''}
                onChange={(e) => updateConfig('name', e.target.value)}
                placeholder="MY_FORMAT"
                className="bg-slate-800 border-slate-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Type</label>
              <Select 
                value={localConfig.format_type as string || 'CSV'} 
                onValueChange={(v) => updateConfig('format_type', v)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CSV">CSV</SelectItem>
                  <SelectItem value="JSON">JSON</SelectItem>
                  <SelectItem value="PARQUET">Parquet</SelectItem>
                  <SelectItem value="AVRO">Avro</SelectItem>
                  <SelectItem value="ORC">ORC</SelectItem>
                  <SelectItem value="XML">XML</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(localConfig.format_type as string || 'CSV') === 'CSV' && (
              <>
                <Separator className="bg-slate-700" />
                <div className="text-xs text-slate-500 font-medium">CSV Options</div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Field Delimiter</label>
                  <Input
                    value={localConfig.field_delimiter as string || ','}
                    onChange={(e) => updateConfig('field_delimiter', e.target.value)}
                    placeholder=","
                    className="bg-slate-800 border-slate-600 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Record Delimiter</label>
                  <Select 
                    value={localConfig.record_delimiter as string || '\\n'} 
                    onValueChange={(v) => updateConfig('record_delimiter', v)}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="\\n">Newline (\n)</SelectItem>
                      <SelectItem value="\\r\\n">CRLF (\r\n)</SelectItem>
                      <SelectItem value="NONE">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Skip Header Lines</label>
                  <Input
                    type="number"
                    value={localConfig.skip_header as number || 0}
                    onChange={(e) => updateConfig('skip_header', parseInt(e.target.value) || 0)}
                    min={0}
                    className="bg-slate-800 border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Field Optionally Enclosed By</label>
                  <Select 
                    value={localConfig.field_enclosed_by as string || 'NONE'} 
                    onValueChange={(v) => updateConfig('field_enclosed_by', v)}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      <SelectItem value={'"'}>Double Quote (&quot;)</SelectItem>
                      <SelectItem value="'">Single Quote (&apos;)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">NULL If (comma separated)</label>
                  <Input
                    value={localConfig.null_if as string || ''}
                    onChange={(e) => updateConfig('null_if', e.target.value)}
                    placeholder="\\N, NULL, null"
                    className="bg-slate-800 border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Compression</label>
                  <Select 
                    value={localConfig.compression as string || 'AUTO'} 
                    onValueChange={(v) => updateConfig('compression', v)}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUTO">Auto Detect</SelectItem>
                      <SelectItem value="GZIP">GZIP</SelectItem>
                      <SelectItem value="BZ2">BZ2</SelectItem>
                      <SelectItem value="BROTLI">Brotli</SelectItem>
                      <SelectItem value="ZSTD">Zstandard</SelectItem>
                      <SelectItem value="DEFLATE">Deflate</SelectItem>
                      <SelectItem value="RAW_DEFLATE">Raw Deflate</SelectItem>
                      <SelectItem value="NONE">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={localConfig.error_on_column_count_mismatch as boolean ?? true}
                    onChange={(e) => updateConfig('error_on_column_count_mismatch', e.target.checked)}
                    className="rounded"
                  />
                  <label className="text-xs text-slate-400">Error on Column Count Mismatch</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={localConfig.trim_space as boolean || false}
                    onChange={(e) => updateConfig('trim_space', e.target.checked)}
                    className="rounded"
                  />
                  <label className="text-xs text-slate-400">Trim Whitespace</label>
                </div>
              </>
            )}

            {(localConfig.format_type as string) === 'JSON' && (
              <>
                <Separator className="bg-slate-700" />
                <div className="text-xs text-slate-500 font-medium">JSON Options</div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={localConfig.strip_outer_array as boolean || false}
                    onChange={(e) => updateConfig('strip_outer_array', e.target.checked)}
                    className="rounded"
                  />
                  <label className="text-xs text-slate-400">Strip Outer Array</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={localConfig.strip_null_values as boolean || false}
                    onChange={(e) => updateConfig('strip_null_values', e.target.checked)}
                    className="rounded"
                  />
                  <label className="text-xs text-slate-400">Strip Null Values</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={localConfig.allow_duplicate as boolean || false}
                    onChange={(e) => updateConfig('allow_duplicate', e.target.checked)}
                    className="rounded"
                  />
                  <label className="text-xs text-slate-400">Allow Duplicate Keys</label>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Compression</label>
                  <Select 
                    value={localConfig.compression as string || 'AUTO'} 
                    onValueChange={(v) => updateConfig('compression', v)}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUTO">Auto Detect</SelectItem>
                      <SelectItem value="GZIP">GZIP</SelectItem>
                      <SelectItem value="BZ2">BZ2</SelectItem>
                      <SelectItem value="BROTLI">Brotli</SelectItem>
                      <SelectItem value="ZSTD">Zstandard</SelectItem>
                      <SelectItem value="NONE">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {(localConfig.format_type as string) === 'PARQUET' && (
              <>
                <Separator className="bg-slate-700" />
                <div className="text-xs text-slate-500 font-medium">Parquet Options</div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Compression</label>
                  <Select 
                    value={localConfig.compression as string || 'AUTO'} 
                    onValueChange={(v) => updateConfig('compression', v)}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUTO">Auto Detect</SelectItem>
                      <SelectItem value="SNAPPY">Snappy</SelectItem>
                      <SelectItem value="LZO">LZO</SelectItem>
                      <SelectItem value="NONE">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={localConfig.binary_as_text as boolean ?? true}
                    onChange={(e) => updateConfig('binary_as_text', e.target.checked)}
                    className="rounded"
                  />
                  <label className="text-xs text-slate-400">Binary as Text</label>
                </div>
              </>
            )}
          </>
        );
        
      case 'copy-into': {
        const connectedStage = sourceNodes.find(n => n.data.type === 'stage');
        const connectedFormat = sourceNodes.find(n => n.data.type === 'file-format');
        const connectedTarget = targetNodes.find(n => n.data.type === 'target-table' || n.data.type === 'source-table');
        const autoTargetTable = connectedTarget?.data.config.full_name as string || connectedTarget?.data.config.name as string;
        
        return (
          <>
            <div className="text-xs text-slate-500 font-medium">Source Configuration</div>
            
            {connectedStage && (
              <div className="p-2 bg-yellow-950/30 border border-yellow-800 rounded text-xs">
                <div className="flex items-center gap-1 text-yellow-400 mb-1">
                  <Link className="w-3 h-3" />
                  Connected Stage:
                </div>
                <div className="text-slate-300 font-mono">
                  @{(connectedStage.data.config.name as string) || 'STAGE'}
                </div>
              </div>
            )}
            {connectedFormat && (
              <div className="p-2 bg-pink-950/30 border border-pink-800 rounded text-xs">
                <div className="flex items-center gap-1 text-pink-400 mb-1">
                  <Link className="w-3 h-3" />
                  Connected File Format:
                </div>
                <div className="text-slate-300 font-mono">
                  {(connectedFormat.data.config.name as string) || 'FORMAT'}
                </div>
              </div>
            )}
            {!connectedStage && (
              <div className="p-2 bg-amber-950/30 border border-amber-700 rounded text-xs text-amber-400">
                Connect a Stage node to specify the data source
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs text-slate-400">Path / Prefix (optional)</label>
              <Input
                value={localConfig.path as string || ''}
                onChange={(e) => updateConfig('path', e.target.value)}
                placeholder="sales/2024/ or orders/daily/"
                className="bg-slate-800 border-slate-600 font-mono"
              />
              <p className="text-[10px] text-slate-500">
                Subdirectory within the stage (e.g., @STAGE/sales/2024/)
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs text-slate-400">File Pattern (optional)</label>
              <Input
                value={localConfig.pattern as string || ''}
                onChange={(e) => updateConfig('pattern', e.target.value)}
                placeholder=".*\\.csv or data_[0-9]+\\.json"
                className="bg-slate-800 border-slate-600 font-mono"
              />
              <p className="text-[10px] text-slate-500">Regex pattern to filter files in stage</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400">Files (optional)</label>
              <Input
                value={localConfig.files as string || ''}
                onChange={(e) => updateConfig('files', e.target.value)}
                placeholder="file1.csv, file2.csv"
                className="bg-slate-800 border-slate-600"
              />
              <p className="text-[10px] text-slate-500">Comma-separated list of specific files</p>
            </div>

            <Separator className="bg-slate-700" />
            <div className="text-xs text-slate-500 font-medium">Target Configuration</div>

            {connectedTarget ? (
              <div className="p-2 bg-indigo-950/30 border border-indigo-800 rounded text-xs">
                <div className="flex items-center gap-1 text-indigo-400 mb-1">
                  <Link className="w-3 h-3" />
                  Connected Target Table:
                </div>
                <div className="text-slate-300 font-mono">
                  {autoTargetTable || 'TABLE'}
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-500">Database</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={fetchDatabases}
                      disabled={isLoadingDatabases}
                      className="h-6 px-2 text-xs text-slate-500 hover:text-slate-300"
                    >
                      {isLoadingDatabases ? <span className="animate-spin">↻</span> : "Refresh"}
                    </Button>
                  </div>
                  <Select 
                    value={selectedDatabase} 
                    onValueChange={(v) => {
                      setSelectedDatabase(v);
                      setSelectedSchema('');
                      updateConfig('target_table', '');
                    }}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue placeholder="Select database" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-60 bg-slate-800 border border-slate-600 z-[9999] shadow-xl">
                      {databases.map((db) => (
                        <SelectItem key={db.DATABASE_NAME} value={db.DATABASE_NAME}>
                          {db.DATABASE_NAME}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Schema</label>
                  <Select 
                    value={selectedSchema} 
                    onValueChange={(v) => {
                      setSelectedSchema(v);
                      updateConfig('target_table', '');
                    }}
                    disabled={!selectedDatabase}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue placeholder="Select schema" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-60 bg-slate-800 border border-slate-600 z-[9999] shadow-xl">
                      {schemas.map((s) => (
                        <SelectItem key={s.SCHEMA_NAME} value={s.SCHEMA_NAME}>
                          {s.SCHEMA_NAME}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Table</label>
                  <Select 
                    value={localConfig.target_table as string || ''} 
                    onValueChange={(v) => updateConfig('target_table', v)}
                    disabled={!selectedDatabase || !selectedSchema}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue placeholder="Select table" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-60 bg-slate-800 border border-slate-600 z-[9999] shadow-xl">
                      {tables.map((t) => (
                        <SelectItem 
                          key={`${t.TABLE_CATALOG}.${t.TABLE_SCHEMA}.${t.TABLE_NAME}`}
                          value={`${t.TABLE_CATALOG}.${t.TABLE_SCHEMA}.${t.TABLE_NAME}`}
                        >
                          {t.TABLE_NAME}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <p className="text-[10px] text-slate-500">
                  Or connect Copy Into → Target Table node to auto-detect
                </p>
              </>
            )}

            <Separator className="bg-slate-700" />
            <div className="text-xs text-slate-500 font-medium">Copy Options</div>
            
            <div className="space-y-2">
              <label className="text-xs text-slate-400">On Error</label>
              <Select 
                value={localConfig.on_error as string || 'ABORT_STATEMENT'} 
                onValueChange={(v) => updateConfig('on_error', v)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ABORT_STATEMENT">Abort Statement</SelectItem>
                  <SelectItem value="CONTINUE">Continue</SelectItem>
                  <SelectItem value="SKIP_FILE">Skip File</SelectItem>
                  <SelectItem value="SKIP_FILE_3">Skip File (3 errors)</SelectItem>
                  <SelectItem value="SKIP_FILE_5%">Skip File (5% errors)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400">Size Limit (bytes, optional)</label>
              <Input
                type="number"
                value={localConfig.size_limit as number || ''}
                onChange={(e) => updateConfig('size_limit', e.target.value ? parseInt(e.target.value) : '')}
                placeholder="e.g., 1073741824 (1GB)"
                className="bg-slate-800 border-slate-600"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={localConfig.purge as boolean || false}
                onChange={(e) => updateConfig('purge', e.target.checked)}
                className="rounded"
              />
              <label className="text-xs text-slate-400">Purge files after load</label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={localConfig.force as boolean || false}
                onChange={(e) => updateConfig('force', e.target.checked)}
                className="rounded"
              />
              <label className="text-xs text-slate-400">Force reload (ignore load history)</label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={localConfig.match_by_column_name as boolean || false}
                onChange={(e) => updateConfig('match_by_column_name', e.target.checked)}
                className="rounded"
              />
              <label className="text-xs text-slate-400">Match by Column Name</label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={localConfig.enforce_length as boolean || false}
                onChange={(e) => updateConfig('enforce_length', e.target.checked)}
                className="rounded"
              />
              <label className="text-xs text-slate-400">Enforce String Length</label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={localConfig.truncate_columns as boolean || false}
                onChange={(e) => updateConfig('truncate_columns', e.target.checked)}
                className="rounded"
              />
              <label className="text-xs text-slate-400">Truncate Columns</label>
            </div>

            {!connectedTarget && localConfig.target_table && (
              <div className="p-2 bg-slate-800/50 rounded text-xs text-slate-400">
                Target: <span className="text-indigo-400 font-mono">{localConfig.target_table as string}</span>
              </div>
            )}
          </>
        );
      }
        
      case 'target-table': {
        return (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">Database</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchDatabases}
                  disabled={isLoadingDatabases}
                  className="h-6 px-2 text-xs text-slate-500 hover:text-slate-300"
                >
                  {isLoadingDatabases ? <span className="animate-spin">↻</span> : "Refresh"}
                </Button>
              </div>
              <Select 
                value={selectedDatabase} 
                onValueChange={(v) => {
                  setSelectedDatabase(v);
                  setSelectedSchema('');
                  setTables([]);
                  updateConfig('full_name', '');
                  updateConfig('name', '');
                }}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue placeholder="Select database" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-60 bg-slate-800 border border-slate-600 z-[9999] shadow-xl">
                  {databases.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-slate-500 text-center">
                      No databases found. Connect to Snowflake first.
                    </div>
                  ) : (
                    databases.map((db) => (
                      <SelectItem key={db.DATABASE_NAME} value={db.DATABASE_NAME}>
                        {db.DATABASE_NAME}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400">Schema</label>
              <Select 
                value={selectedSchema} 
                onValueChange={(v) => {
                  setSelectedSchema(v);
                  setTables([]);
                  updateConfig('full_name', '');
                  updateConfig('name', '');
                }}
                disabled={!selectedDatabase}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue placeholder={selectedDatabase ? "Select schema" : "Select database first"} />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-60 bg-slate-800 border border-slate-600 z-[9999] shadow-xl">
                  {isLoadingSchemas ? (
                    <div className="px-2 py-3 text-xs text-slate-500 text-center">Loading schemas...</div>
                  ) : schemas.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-slate-500 text-center">
                      No schemas found.
                    </div>
                  ) : (
                    schemas.map((s) => (
                      <SelectItem key={s.SCHEMA_NAME} value={s.SCHEMA_NAME}>
                        {s.SCHEMA_NAME}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">Table (existing or new)</label>
                {selectedDatabase && selectedSchema && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchTablesForDbSchema(selectedDatabase, selectedSchema)}
                    disabled={isLoadingTables}
                    className="h-6 px-2 text-xs text-slate-500 hover:text-slate-300"
                  >
                    {isLoadingTables ? <span className="animate-spin">↻</span> : "Refresh"}
                  </Button>
                )}
              </div>
              <Select 
                value={localConfig.full_name as string || ''} 
                onValueChange={(v) => {
                  const parts = v.split('.');
                  const name = parts[parts.length - 1];
                  updateConfig('full_name', v);
                  updateConfig('name', name);
                }}
                disabled={!selectedDatabase || !selectedSchema}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue placeholder={!selectedDatabase || !selectedSchema ? "Select database & schema first" : "Select existing table"} />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-60 bg-slate-800 border border-slate-600 z-[9999] shadow-xl">
                  {tablesError ? (
                    <div className="px-2 py-3 text-xs text-red-400 text-center">
                      {tablesError}<br />
                      <span className="text-slate-500">Connect to Snowflake to load tables</span>
                    </div>
                  ) : isLoadingTables ? (
                    <div className="px-2 py-3 text-xs text-slate-500 text-center">Loading tables...</div>
                  ) : tables.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-slate-500 text-center">
                      No existing tables in {selectedDatabase}.{selectedSchema}
                    </div>
                  ) : (
                    tables.map((t) => (
                      <SelectItem 
                        key={`${t.TABLE_CATALOG}.${t.TABLE_SCHEMA}.${t.TABLE_NAME}`}
                        value={`${t.TABLE_CATALOG}.${t.TABLE_SCHEMA}.${t.TABLE_NAME}`}
                      >
                        {t.TABLE_NAME}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400">Or enter new table name</label>
              <Input
                value={localConfig.name as string || ''}
                onChange={(e) => {
                  const newName = e.target.value;
                  updateConfig('name', newName);
                  if (selectedDatabase && selectedSchema && newName) {
                    updateConfig('full_name', `${selectedDatabase}.${selectedSchema}.${newName}`);
                  } else {
                    updateConfig('full_name', '');
                  }
                }}
                placeholder="NEW_TARGET_TABLE"
                className="bg-slate-800 border-slate-600"
              />
            </div>

            {localConfig.full_name && (
              <>
                <div className="p-2 bg-slate-800/50 rounded text-xs text-slate-400">
                  Target: <span className="text-green-400 font-mono">{localConfig.full_name as string}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-400">Existing Data Preview</label>
                    <div className="flex items-center gap-1">
                      {previewData && previewData.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPreview(!showPreview)}
                          className="text-xs text-slate-400 hover:text-slate-300 h-7 px-2"
                        >
                          {showPreview ? <><EyeOff className="w-3 h-3 mr-1" /> Hide</> : <><Eye className="w-3 h-3 mr-1" /> Show</>}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => runPreview(`SELECT * FROM ${localConfig.full_name}`)}
                        disabled={isLoadingPreview}
                        className="text-xs border-emerald-700 text-emerald-400 hover:bg-emerald-950"
                      >
                        {isLoadingPreview ? (
                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Loading...</>
                        ) : (
                          <><Play className="w-3 h-3 mr-1" /> Preview Data</>
                        )}
                      </Button>
                    </div>
                  </div>
                  {previewError && (
                    <div className="p-2 bg-red-950/30 border border-red-800 rounded text-xs text-red-400 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span className="break-all">{previewError}</span>
                    </div>
                  )}
                  {previewData && previewData.length === 0 && (
                    <div className="p-2 bg-slate-800/50 rounded text-xs text-slate-500">
                      Table is empty or does not exist yet
                    </div>
                  )}
                  {previewData && previewData.length > 0 && showPreview && (
                    <div className="border border-slate-700 rounded" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                      <div className="max-h-48" style={{ overflowX: 'auto', overflowY: 'auto' }}>
                        <table className="text-xs" style={{ minWidth: '100%', width: 'max-content' }}>
                          <thead className="bg-slate-800 sticky top-0">
                            <tr>
                              {Object.keys(previewData[0]).map((col) => (
                                <th key={col} className="px-3 py-1.5 text-left text-slate-400 font-medium border-b border-slate-700 whitespace-nowrap">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.map((row, i) => (
                              <tr key={i} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50">
                                {Object.values(row).map((val, j) => (
                                  <td key={j} className="px-3 py-1 text-slate-300 whitespace-nowrap">
                                    {val === null ? <span className="text-slate-600">NULL</span> : String(val)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="px-2 py-1 bg-slate-800/50 border-t border-slate-700 text-[10px] text-slate-500">
                        Showing {previewData.length} row{previewData.length !== 1 ? 's' : ''} (LIMIT 10)
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        );
      }
        
      default:
        return null;
    }
  };
  
  return (
    <Card className="h-full bg-slate-900/50 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-slate-100">
            Configure Node
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {node.data.type.replace('-', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="p-4 space-y-4" style={{ width: 0, minWidth: '100%', overflow: 'hidden' }}>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Display Label</label>
              <Input
                value={node.data.label}
                onChange={(e) => onUpdate(node.id, { label: e.target.value })}
                className="bg-slate-800 border-slate-600"
              />
            </div>
            
            <Separator className="bg-slate-700" />
            
            {renderConfigFields()}
            
            <Separator className="bg-slate-700" />
            
            <div className="flex gap-2">
              <Button 
                onClick={saveConfig}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button 
                variant="destructive"
                onClick={() => onDelete(node.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
