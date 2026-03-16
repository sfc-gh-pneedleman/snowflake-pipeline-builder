"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  FolderOpen,
  Calendar,
  Clock,
  Trash2,
  ArrowRight,
  HelpCircle,
  Sparkles,
  Workflow,
} from "lucide-react";
import { PipelineConfig, ScheduledPipeline } from "@/lib/types";

const PIPELINES_KEY = "etl-pipelines";
const CURRENT_PIPELINE_KEY = "etl-current-pipeline";
const SAVED_SCHEDULES_KEY = "etl-saved-schedules";
const CURRENT_SCHEDULE_KEY = "etl-current-schedule";

interface SavedSchedule {
  id: string;
  name: string;
  scheduledPipelines: ScheduledPipeline[];
  nodePositions: { id: string; position: { x: number; y: number } }[];
  created_at: string;
  updated_at: string;
}

export default function HomePage() {
  const router = useRouter();
  const [pipelines, setPipelines] = useState<PipelineConfig[]>([]);
  const [schedules, setSchedules] = useState<SavedSchedule[]>([]);
  const [showPipelinesDialog, setShowPipelinesDialog] = useState(false);
  const [showSchedulesDialog, setShowSchedulesDialog] = useState(false);

  useEffect(() => {
    const storedPipelines = localStorage.getItem(PIPELINES_KEY);
    if (storedPipelines) {
      setPipelines(JSON.parse(storedPipelines));
    }
    
    const storedSchedules = localStorage.getItem(SAVED_SCHEDULES_KEY);
    if (storedSchedules) {
      setSchedules(JSON.parse(storedSchedules));
    }
  }, []);

  const handleNewPipeline = () => {
    localStorage.removeItem(CURRENT_PIPELINE_KEY);
    router.push("/builder");
  };

  const handleOpenPipeline = (pipeline: PipelineConfig) => {
    localStorage.setItem(CURRENT_PIPELINE_KEY, JSON.stringify(pipeline));
    router.push("/builder");
  };

  const handleDeletePipeline = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = pipelines.filter(p => p.id !== id);
    localStorage.setItem(PIPELINES_KEY, JSON.stringify(updated));
    setPipelines(updated);
  };

  const handleNewSchedule = () => {
    localStorage.removeItem(CURRENT_SCHEDULE_KEY);
    router.push("/scheduler");
  };

  const handleOpenSchedule = (schedule: SavedSchedule) => {
    localStorage.setItem(CURRENT_SCHEDULE_KEY, JSON.stringify(schedule));
    router.push("/scheduler");
  };

  const handleDeleteSchedule = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = schedules.filter(s => s.id !== id);
    localStorage.setItem(SAVED_SCHEDULES_KEY, JSON.stringify(updated));
    setSchedules(updated);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const recentPipelines = [...pipelines]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 3);

  const recentSchedules = [...schedules]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Data Pipeline Builder" className="w-8 h-8" />
          <span className="font-bold text-xl text-cyan-400">Data Pipeline Builder</span>
        </div>
        <Link href="/docs">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200">
            <HelpCircle className="w-4 h-4 mr-2" />
            Documentation
          </Button>
        </Link>
      </header>

      <main className="max-w-5xl mx-auto py-12 px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-100 mb-4">
            Build Snowflake Data Pipelines Visually
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Create ETL workflows with drag-and-drop components, generate boilerplate SQL automatically,
            and schedule automated data pipelines with ease.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Workflow className="w-5 h-5 text-cyan-400" />
            Pipeline Builder
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-slate-900/50 border-slate-700 hover:border-cyan-700 transition-colors cursor-pointer group" onClick={handleNewPipeline}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-cyan-500/20 group-hover:bg-cyan-500/30 transition-colors">
                    <Plus className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-100 mb-1 group-hover:text-cyan-400 transition-colors">
                      New Pipeline
                    </h3>
                    <p className="text-sm text-slate-400">
                      Start fresh with a blank canvas
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="bg-slate-900/50 border-slate-700 hover:border-purple-700 transition-colors cursor-pointer group"
              onClick={() => setShowPipelinesDialog(true)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                    <FolderOpen className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-100 mb-1 group-hover:text-purple-400 transition-colors">
                      Open Pipeline
                    </h3>
                    <p className="text-sm text-slate-400">
                      {pipelines.length > 0 ? (
                        <span><span className="text-purple-400">{pipelines.length}</span> saved pipelines</span>
                      ) : (
                        "No saved pipelines"
                      )}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-purple-400 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-lg font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            Scheduler
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-slate-900/50 border-slate-700 hover:border-emerald-700 transition-colors cursor-pointer group" onClick={handleNewSchedule}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-colors">
                    <Plus className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-100 mb-1 group-hover:text-emerald-400 transition-colors">
                      New Schedule
                    </h3>
                    <p className="text-sm text-slate-400">
                      Create a new task schedule
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="bg-slate-900/50 border-slate-700 hover:border-amber-700 transition-colors cursor-pointer group"
              onClick={() => setShowSchedulesDialog(true)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 group-hover:bg-amber-500/30 transition-colors">
                    <FolderOpen className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-100 mb-1 group-hover:text-amber-400 transition-colors">
                      Open Schedule
                    </h3>
                    <p className="text-sm text-slate-400">
                      {schedules.length > 0 ? (
                        <span><span className="text-amber-400">{schedules.length}</span> saved schedules</span>
                      ) : (
                        "No saved schedules"
                      )}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-amber-400 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {(recentPipelines.length > 0 || recentSchedules.length > 0) && (
          <div className="grid gap-8 md:grid-cols-2 mb-12">
            {recentPipelines.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Recent Pipelines</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-slate-500 hover:text-slate-300 text-xs"
                    onClick={() => setShowPipelinesDialog(true)}
                  >
                    View All
                  </Button>
                </div>
                <div className="space-y-2">
                  {recentPipelines.map((pipeline) => (
                    <Card 
                      key={pipeline.id}
                      className="bg-slate-900/30 border-slate-700/50 hover:border-cyan-700/50 transition-colors cursor-pointer group"
                      onClick={() => handleOpenPipeline(pipeline)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-slate-200 group-hover:text-cyan-400 transition-colors truncate text-sm">
                              {pipeline.name}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                              <span>{pipeline.nodes.length} nodes</span>
                              <span>•</span>
                              <Clock className="w-3 h-3" />
                              {formatDate(pipeline.updated_at)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {recentSchedules.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Recent Schedules</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-slate-500 hover:text-slate-300 text-xs"
                    onClick={() => setShowSchedulesDialog(true)}
                  >
                    View All
                  </Button>
                </div>
                <div className="space-y-2">
                  {recentSchedules.map((schedule) => (
                    <Card 
                      key={schedule.id}
                      className="bg-slate-900/30 border-slate-700/50 hover:border-emerald-700/50 transition-colors cursor-pointer group"
                      onClick={() => handleOpenSchedule(schedule)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-slate-200 group-hover:text-emerald-400 transition-colors truncate text-sm">
                              {schedule.name}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                              <span>{schedule.scheduledPipelines.length} tasks</span>
                              <span>•</span>
                              <Clock className="w-3 h-3" />
                              {formatDate(schedule.updated_at)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Separator className="my-12 bg-slate-800" />

        <div className="grid gap-6 md:grid-cols-3 text-center">
          <div>
            <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="font-semibold text-slate-200 mb-2">Visual Design</h3>
            <p className="text-sm text-slate-400">
              Drag-and-drop components to build data flows visually and organize your pipeline logic.
            </p>
          </div>
          <div>
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
              <Workflow className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="font-semibold text-slate-200 mb-2">Auto-Generated Boilerplate</h3>
            <p className="text-sm text-slate-400">
              Boilerplate SQL is generated automatically. Customize queries and deploy with confidence.
            </p>
          </div>
          <div>
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="font-semibold text-slate-200 mb-2">Automated Scheduling</h3>
            <p className="text-sm text-slate-400">
              Schedule pipelines with cron expressions or intervals. Create task dependencies.
            </p>
          </div>
        </div>
      </main>

      <Dialog open={showPipelinesDialog} onOpenChange={setShowPipelinesDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Saved Pipelines</DialogTitle>
          </DialogHeader>
          {pipelines.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No saved pipelines yet.</p>
              <Button 
                className="mt-4 bg-cyan-600 hover:bg-cyan-700"
                onClick={() => {
                  setShowPipelinesDialog(false);
                  handleNewPipeline();
                }}
              >
                Create Your First Pipeline
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2 pr-4">
                {pipelines
                  .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                  .map((pipeline) => (
                  <div
                    key={pipeline.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 cursor-pointer group"
                    onClick={() => {
                      setShowPipelinesDialog(false);
                      handleOpenPipeline(pipeline);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-200 truncate group-hover:text-cyan-400 transition-colors">
                        {pipeline.name}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>{pipeline.nodes.length} nodes</span>
                        <span>•</span>
                        <span>{formatDate(pipeline.updated_at)}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDeletePipeline(pipeline.id, e)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showSchedulesDialog} onOpenChange={setShowSchedulesDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Saved Schedules</DialogTitle>
          </DialogHeader>
          {schedules.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No saved schedules yet.</p>
              <Button 
                className="mt-4 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  setShowSchedulesDialog(false);
                  handleNewSchedule();
                }}
              >
                Create Your First Schedule
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2 pr-4">
                {schedules
                  .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                  .map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 cursor-pointer group"
                    onClick={() => {
                      setShowSchedulesDialog(false);
                      handleOpenSchedule(schedule);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-200 truncate group-hover:text-emerald-400 transition-colors">
                        {schedule.name}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>{schedule.scheduledPipelines.length} tasks</span>
                        <span>•</span>
                        <span>{formatDate(schedule.updated_at)}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDeleteSchedule(schedule.id, e)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
