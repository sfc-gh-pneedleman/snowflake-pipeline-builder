"use client";

import { Node, Edge } from "@xyflow/react";
import { useState, useEffect } from "react";
import { ScheduledPipeline, ScheduleNodeData } from "@/lib/types";
import { CRON_PRESETS, TIMEZONES } from "@/lib/task-generator";
import { 
  Clock, 
  Play, 
  Pause, 
  Trash2, 
  Settings,
  Calendar,
  Timer,
  Server,
  AlertTriangle,
  Link,
  Layers,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface ScheduleConfigPanelProps {
  selectedNode: Node<ScheduleNodeData> | null;
  selectedEdge: Edge | null;
  allScheduledPipelines: ScheduledPipeline[];
  onUpdate: (id: string, updates: Partial<ScheduledPipeline>) => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (id: string) => void;
  onEdgeDelete: (edgeId: string) => void;
}

export default function ScheduleConfigPanel({
  selectedNode,
  selectedEdge,
  allScheduledPipelines,
  onUpdate,
  onDelete,
  onToggleEnabled,
  onEdgeDelete,
}: ScheduleConfigPanelProps) {
  if (selectedEdge) {
    const sourceNode = allScheduledPipelines.find(n => n.id === selectedEdge.source);
    const targetNode = allScheduledPipelines.find(n => n.id === selectedEdge.target);

    return (
      <div className="h-full flex flex-col bg-slate-900 border-l border-slate-800">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Link className="w-4 h-4 text-cyan-400" />
              Configure Connection
            </h2>
            <Badge variant="secondary" className="text-xs bg-cyan-950 text-cyan-400">
              <Link className="w-3 h-3 mr-1" />
              Edge
            </Badge>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="p-3 bg-slate-800/50 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="text-xs">task</Badge>
              <span className="text-slate-300 font-medium">{sourceNode?.pipelineName || 'Unknown'}</span>
            </div>
            <div className="flex justify-center">
              <ArrowRight className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="text-xs">task</Badge>
              <span className="text-slate-300 font-medium">{targetNode?.pipelineName || 'Unknown'}</span>
            </div>
          </div>
          
          <Separator className="bg-slate-700" />
          
          <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
            <p className="text-xs text-slate-400">
              This connection creates a task dependency. The target task will only run after the source task completes successfully.
            </p>
          </div>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onEdgeDelete(selectedEdge.id)}
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Connection
          </Button>
        </div>
      </div>
    );
  }

  if (!selectedNode) {
    return (
      <div className="h-full flex flex-col bg-slate-900 border-l border-slate-800">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Settings className="w-4 h-4 text-cyan-400" />
            Schedule Configuration
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Select a scheduled pipeline</p>
            <p className="text-xs mt-1">to configure its schedule</p>
          </div>
        </div>
      </div>
    );
  }

  const sp = selectedNode.data.scheduledPipeline;
  const hasDependencies = sp.dependencies.length > 0;

  const getDependencyNames = () => {
    return sp.dependencies.map(depId => {
      const dep = allScheduledPipelines.find(p => p.id === depId);
      return dep?.pipelineName || 'Unknown';
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-slate-800">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Settings className="w-4 h-4 text-cyan-400" />
            Schedule Configuration
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(sp.id)}
            className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-slate-800">
            {sp.pipelineName}
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800 border border-slate-700">
            <div className="flex items-center gap-3">
              {sp.enabled ? (
                <Play className="w-5 h-5 text-emerald-400" />
              ) : (
                <Pause className="w-5 h-5 text-slate-400" />
              )}
              <div>
                <p className="text-sm font-medium">{sp.enabled ? 'Start Active' : 'Start Suspended'}</p>
                <p className="text-xs text-slate-400">
                  {sp.enabled ? 'Task will start running after deploy' : 'Task will be suspended after deploy'}
                </p>
              </div>
            </div>
            <Switch
              checked={sp.enabled}
              onCheckedChange={() => onToggleEnabled(sp.id)}
            />
          </div>
          
          <div className="p-2 rounded bg-amber-950/30 border border-amber-800/50">
            <p className="text-xs text-amber-400/80">
              This sets the initial state when deployed. Use Snowflake to manage running tasks.
            </p>
          </div>

          {hasDependencies && (
            <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800">
              <div className="flex items-center gap-2 mb-2">
                <Link className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-cyan-300">Dependency Chain</span>
              </div>
              <p className="text-xs text-cyan-400/70 mb-2">
                This task runs after its dependencies complete. Schedule settings are inherited.
              </p>
              <div className="flex flex-wrap gap-1">
                {getDependencyNames().map((name, i) => (
                  <Badge key={i} variant="outline" className="text-xs border-cyan-600 text-cyan-300">
                    <Layers className="w-3 h-3 mr-1" />
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Tabs defaultValue="schedule" className="w-full">
            <TabsList className="w-full bg-slate-800">
              <TabsTrigger value="schedule" className="flex-1">
                <Clock className="w-4 h-4 mr-1" />
                Schedule
              </TabsTrigger>
              <TabsTrigger value="task" className="flex-1">
                <Server className="w-4 h-4 mr-1" />
                Task
              </TabsTrigger>
            </TabsList>

            <TabsContent value="schedule" className="mt-4 space-y-4">
              {!hasDependencies && (
                <>
                  <div className="space-y-2">
                    <Label>Schedule Type</Label>
                    <Select
                      value={sp.schedule.type}
                      onValueChange={(value: 'cron' | 'interval') => 
                        onUpdate(sp.id, { 
                          schedule: { ...sp.schedule, type: value }
                        })
                      }
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="cron">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            CRON Expression
                          </div>
                        </SelectItem>
                        <SelectItem value="interval">
                          <div className="flex items-center gap-2">
                            <Timer className="w-4 h-4" />
                            Interval (Minutes)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {sp.schedule.type === 'cron' && (
                    <>
                      <div className="space-y-2">
                        <Label>CRON Preset</Label>
                        <Select
                          value={sp.schedule.cron || ''}
                          onValueChange={(value) => 
                            onUpdate(sp.id, { 
                              schedule: { ...sp.schedule, cron: value }
                            })
                          }
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-700">
                            <SelectValue placeholder="Select a preset..." />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {CRON_PRESETS.map((preset) => (
                              <SelectItem key={preset.cron} value={preset.cron}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{preset.label}</span>
                                  <span className="text-xs text-slate-500 ml-2">{preset.cron}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Custom CRON</Label>
                        <Input
                          value={sp.schedule.cron || ''}
                          onChange={(e) => 
                            onUpdate(sp.id, { 
                              schedule: { ...sp.schedule, cron: e.target.value }
                            })
                          }
                          placeholder="* * * * *"
                          className="bg-slate-800 border-slate-700 font-mono"
                        />
                        <p className="text-xs text-slate-500">
                          Format: minute hour day month weekday
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Timezone</Label>
                        <Select
                          value={sp.schedule.timezone || 'UTC'}
                          onValueChange={(value) => 
                            onUpdate(sp.id, { 
                              schedule: { ...sp.schedule, timezone: value }
                            })
                          }
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {TIMEZONES.map((tz) => (
                              <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {sp.schedule.type === 'interval' && (
                    <div className="space-y-2">
                      <Label>Interval (Minutes)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={sp.schedule.intervalMinutes || ''}
                        onChange={(e) => 
                          onUpdate(sp.id, { 
                            schedule: { ...sp.schedule, intervalMinutes: parseInt(e.target.value) || undefined }
                          })
                        }
                        placeholder="60"
                        className="bg-slate-800 border-slate-700"
                      />
                    </div>
                  )}
                </>
              )}

              {hasDependencies && (
                <div className="text-center py-6 text-slate-500">
                  <Link className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Schedule inherited from parent task</p>
                  <p className="text-xs mt-1">Remove dependencies to set a custom schedule</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="task" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>Warehouse *</Label>
                <Input
                  value={sp.taskConfig.warehouse || ''}
                  onChange={(e) => 
                    onUpdate(sp.id, { 
                      taskConfig: { ...sp.taskConfig, warehouse: e.target.value }
                    })
                  }
                  placeholder="COMPUTE_WH"
                  className="bg-slate-800 border-slate-700"
                />
              </div>

              <div className="space-y-2">
                <Label>Error Integration</Label>
                <Input
                  value={sp.taskConfig.errorIntegration || ''}
                  onChange={(e) => 
                    onUpdate(sp.id, { 
                      taskConfig: { ...sp.taskConfig, errorIntegration: e.target.value }
                    })
                  }
                  placeholder="my_error_integration"
                  className="bg-slate-800 border-slate-700"
                />
                <p className="text-xs text-slate-500">
                  Notification integration for task failures
                </p>
              </div>

              <Separator className="bg-slate-700" />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Overlapping Execution</Label>
                  <p className="text-xs text-slate-500">Allow concurrent task runs</p>
                </div>
                <Switch
                  checked={sp.taskConfig.allowOverlappingExecution || false}
                  onCheckedChange={(checked) => 
                    onUpdate(sp.id, { 
                      taskConfig: { ...sp.taskConfig, allowOverlappingExecution: checked }
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Suspend After Failures</Label>
                <Input
                  type="number"
                  min={0}
                  value={sp.taskConfig.suspendTaskAfterFailures || ''}
                  onChange={(e) => 
                    onUpdate(sp.id, { 
                      taskConfig: { ...sp.taskConfig, suspendTaskAfterFailures: parseInt(e.target.value) || undefined }
                    })
                  }
                  placeholder="3"
                  className="bg-slate-800 border-slate-700"
                />
                <p className="text-xs text-slate-500">
                  Suspend task after N consecutive failures (0 = never)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Timeout (ms)</Label>
                <Input
                  type="number"
                  min={0}
                  value={sp.taskConfig.userTaskTimeoutMs || ''}
                  onChange={(e) => 
                    onUpdate(sp.id, { 
                      taskConfig: { ...sp.taskConfig, userTaskTimeoutMs: parseInt(e.target.value) || undefined }
                    })
                  }
                  placeholder="3600000"
                  className="bg-slate-800 border-slate-700"
                />
                <p className="text-xs text-slate-500">
                  Max runtime before timeout (default: 1 hour)
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
