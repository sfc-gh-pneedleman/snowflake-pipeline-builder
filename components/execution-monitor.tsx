"use client";

import { useState } from "react";
import { ExecutionRecord } from "@/lib/types";
import { 
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExecutionMonitorProps {
  executions: ExecutionRecord[];
  onRefresh: () => void;
}

export default function ExecutionMonitor({ executions, onRefresh }: ExecutionMonitorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredExecutions = executions.filter(exec => {
    const matchesSearch = exec.pipelineName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || exec.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: ExecutionRecord['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getStatusBadge = (status: ExecutionRecord['status']) => {
    const styles = {
      success: 'bg-emerald-950/30 border-emerald-700 text-emerald-400',
      failed: 'bg-red-950/30 border-red-700 text-red-400',
      running: 'bg-cyan-950/30 border-cyan-700 text-cyan-400',
      cancelled: 'bg-yellow-950/30 border-yellow-700 text-yellow-400',
    };
    return (
      <Badge variant="outline" className={`${styles[status]} capitalize`}>
        {getStatusIcon(status)}
        <span className="ml-1">{status}</span>
      </Badge>
    );
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleString();
  };

  const stats = {
    total: executions.length,
    success: executions.filter(e => e.status === 'success').length,
    failed: executions.filter(e => e.status === 'failed').length,
    running: executions.filter(e => e.status === 'running').length,
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Execution Monitor
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="border-slate-700"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-slate-800 border border-slate-700 text-center">
            <p className="text-2xl font-bold text-slate-200">{stats.total}</p>
            <p className="text-xs text-slate-500">Total Runs</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800 text-center">
            <p className="text-2xl font-bold text-emerald-400">{stats.success}</p>
            <p className="text-xs text-emerald-500">Success</p>
          </div>
          <div className="p-3 rounded-lg bg-red-950/30 border border-red-800 text-center">
            <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
            <p className="text-xs text-red-500">Failed</p>
          </div>
          <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800 text-center">
            <p className="text-2xl font-bold text-cyan-400">{stats.running}</p>
            <p className="text-xs text-cyan-500">Running</p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search pipelines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 bg-slate-800 border-slate-700 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8 bg-slate-800 border-slate-700">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {filteredExecutions.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-slate-500">
            <div className="text-center">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No execution history</p>
              <p className="text-xs mt-1">
                {executions.length === 0 
                  ? "Runs will appear here when tasks execute"
                  : "No runs match your filter"
                }
              </p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400">Pipeline</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Started</TableHead>
                <TableHead className="text-slate-400">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExecutions.map((exec) => (
                <TableRow key={exec.id} className="border-slate-800">
                  <TableCell className="font-medium">{exec.pipelineName}</TableCell>
                  <TableCell>{getStatusBadge(exec.status)}</TableCell>
                  <TableCell className="text-slate-400 text-sm">
                    {formatTime(exec.startTime)}
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm">
                    {formatDuration(exec.durationMs)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ScrollArea>
    </div>
  );
}
