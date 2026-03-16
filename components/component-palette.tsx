"use client";

import { 
  Database, 
  Code, 
  RefreshCw, 
  Clock, 
  Radio,
  FolderOpen,
  FileSpreadsheet,
  Table2,
  GripVertical,
  Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { NodeType } from "@/lib/types";

const paletteItems: Array<{
  type: NodeType;
  label: string;
  description: string;
  icon: typeof Database;
  category: string;
}> = [
  {
    type: 'source-table',
    label: 'Source Table',
    description: 'Reference existing table',
    icon: Database,
    category: 'Sources'
  },
  {
    type: 'stage',
    label: 'Stage',
    description: 'External or internal stage',
    icon: FolderOpen,
    category: 'Sources'
  },
  {
    type: 'file-format',
    label: 'File Format',
    description: 'CSV, JSON, Parquet, etc.',
    icon: FileSpreadsheet,
    category: 'Sources'
  },
  {
    type: 'copy-into',
    label: 'Copy Into',
    description: 'Load data from stage',
    icon: Download,
    category: 'Data Loading'
  },
  {
    type: 'sql-transform',
    label: 'SQL Transform',
    description: 'Custom SQL/CTE',
    icon: Code,
    category: 'Transforms'
  },
  {
    type: 'dynamic-table',
    label: 'Dynamic Table',
    description: 'Incremental pipeline',
    icon: RefreshCw,
    category: 'Transforms'
  },
  {
    type: 'stream',
    label: 'Stream',
    description: 'Change data capture',
    icon: Radio,
    category: 'CDC'
  },
  {
    type: 'task',
    label: 'Task',
    description: 'Scheduled execution',
    icon: Clock,
    category: 'CDC'
  },
  {
    type: 'target-table',
    label: 'Target Table',
    description: 'Output destination',
    icon: Table2,
    category: 'Targets'
  },
];

interface ComponentPaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: NodeType) => void;
}

export default function ComponentPalette({ onDragStart }: ComponentPaletteProps) {
  const categories = [...new Set(paletteItems.map(item => item.category))];
  
  return (
    <Card className="h-full bg-slate-900/50 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-slate-100">
          Components
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="p-4 space-y-4">
            {categories.map((category, idx) => (
              <div key={category}>
                {idx > 0 && <Separator className="mb-4 bg-slate-700" />}
                <div className="mb-2">
                  <Badge variant="outline" className="text-xs text-slate-400 border-slate-600">
                    {category}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {paletteItems
                    .filter(item => item.category === category)
                    .map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.type}
                          draggable
                          onDragStart={(e) => onDragStart(e, item.type)}
                          className="
                            flex items-center gap-3 p-3 rounded-lg
                            bg-slate-800/50 border border-slate-700
                            cursor-grab active:cursor-grabbing
                            hover:bg-slate-700/50 hover:border-slate-600
                            transition-all duration-200
                            group
                          "
                        >
                          <GripVertical className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                          <div className="p-2 rounded-md bg-slate-700/50">
                            <Icon className="w-4 h-4 text-slate-300" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-slate-200 truncate">
                              {item.label}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              {item.description}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
