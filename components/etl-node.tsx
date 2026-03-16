"use client";

import { memo } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { 
  Database, 
  Code, 
  RefreshCw, 
  Clock, 
  Radio,
  FolderOpen,
  FileSpreadsheet,
  Table2,
  Download
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ETLNodeData } from "@/lib/types";

const iconMap = {
  'source-table': Database,
  'sql-transform': Code,
  'dynamic-table': RefreshCw,
  'task': Clock,
  'stream': Radio,
  'stage': FolderOpen,
  'file-format': FileSpreadsheet,
  'copy-into': Download,
  'target-table': Table2,
};

const colorMap = {
  'source-table': 'bg-blue-500/10 border-blue-500/50 text-blue-400',
  'sql-transform': 'bg-purple-500/10 border-purple-500/50 text-purple-400',
  'dynamic-table': 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400',
  'task': 'bg-orange-500/10 border-orange-500/50 text-orange-400',
  'stream': 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400',
  'stage': 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400',
  'file-format': 'bg-pink-500/10 border-pink-500/50 text-pink-400',
  'copy-into': 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400',
  'target-table': 'bg-green-500/10 border-green-500/50 text-green-400',
};

const handleStyle = {
  width: 10,
  height: 10,
  background: '#64748b',
  border: '2px solid #1e293b',
};

function ETLNode({ data, selected }: NodeProps<Node<ETLNodeData>>) {
  const Icon = iconMap[data.type];
  const colorClass = colorMap[data.type];
  
  return (
    <div 
      className={`
        min-w-[180px] rounded-lg border-2 p-3 shadow-lg backdrop-blur-sm
        transition-all duration-200 cursor-pointer
        ${colorClass}
        ${selected ? 'ring-2 ring-white/50 scale-105' : 'hover:scale-102'}
      `}
    >
      <Handle 
        type="target" 
        position={Position.Left} 
        style={handleStyle}
      />
      
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-md bg-white/10">
          <Icon className="w-4 h-4" />
        </div>
        <span className="font-semibold text-sm truncate">{data.label}</span>
      </div>
      
      <Badge variant="secondary" className="text-xs opacity-80">
        {data.type.replace('-', ' ')}
      </Badge>
      
      {data.config.name ? (
        <div className="mt-2 text-xs opacity-60 truncate">
          {String(data.config.name)}
        </div>
      ) : null}
      
      <Handle 
        type="source" 
        position={Position.Right} 
        style={handleStyle}
      />
    </div>
  );
}

export default memo(ETLNode);
