"use client";

import { useState, useEffect } from "react";
import { PipelineConfig } from "@/lib/types";
import { 
  FolderOpen, 
  GripVertical, 
  Search,
  Layers,
  Clock
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const STORAGE_KEY = "etl-pipelines";

interface PipelineLibraryProps {
  onDragStart: (event: React.DragEvent, pipeline: PipelineConfig) => void;
  scheduledPipelineIds: string[];
}

export default function PipelineLibrary({ onDragStart, scheduledPipelineIds }: PipelineLibraryProps) {
  const [pipelines, setPipelines] = useState<PipelineConfig[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setPipelines(JSON.parse(stored));
    }
  }, []);

  const filteredPipelines = pipelines.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDragStart = (event: React.DragEvent, pipeline: PipelineConfig) => {
    event.dataTransfer.setData("application/pipeline", JSON.stringify(pipeline));
    event.dataTransfer.effectAllowed = "move";
    onDragStart(event, pipeline);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 border-r border-slate-800">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-3">
          <FolderOpen className="w-4 h-4 text-cyan-400" />
          Pipeline Library
        </h2>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search pipelines..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 bg-slate-800 border-slate-700 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredPipelines.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              {pipelines.length === 0 
                ? "No saved pipelines. Save a pipeline from the builder first."
                : "No pipelines match your search."
              }
            </div>
          ) : (
            filteredPipelines.map((pipeline) => {
              const isScheduled = scheduledPipelineIds.includes(pipeline.id);
              return (
                <div
                  key={pipeline.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, pipeline)}
                  className={`
                    flex items-center gap-2 p-3 rounded-lg cursor-grab active:cursor-grabbing
                    transition-colors border
                    ${isScheduled 
                      ? 'bg-slate-800/50 border-slate-700/50 opacity-60' 
                      : 'bg-slate-800 border-slate-700 hover:bg-slate-750 hover:border-slate-600'
                    }
                  `}
                >
                  <GripVertical className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{pipeline.name}</span>
                      {isScheduled && (
                        <Badge variant="outline" className="text-xs bg-green-950/30 border-green-700 text-green-400">
                          <Clock className="w-3 h-3 mr-1" />
                          Scheduled
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <Layers className="w-3 h-3" />
                      <span>{pipeline.nodes.length} nodes</span>
                      <span>•</span>
                      <span>{new Date(pipeline.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-slate-800 bg-slate-900/50">
        <p className="text-xs text-slate-500 text-center">
          Drag pipelines to the canvas to schedule them
        </p>
      </div>
    </div>
  );
}
