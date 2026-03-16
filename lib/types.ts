export type NodeType = 
  | 'source-table'
  | 'sql-transform'
  | 'dynamic-table'
  | 'task'
  | 'stream'
  | 'stage'
  | 'file-format'
  | 'copy-into'
  | 'target-table';

export interface ETLNodeData extends Record<string, unknown> {
  label: string;
  type: NodeType;
  config: Record<string, unknown>;
  generated_sql?: string;
}

export interface PipelineConfig {
  id: string;
  name: string;
  description: string;
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: ETLNodeData;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface SnowflakeTable {
  TABLE_CATALOG: string;
  TABLE_SCHEMA: string;
  TABLE_NAME: string;
  TABLE_TYPE: string;
}

export interface SnowflakeColumn {
  COLUMN_NAME: string;
  DATA_TYPE: string;
  IS_NULLABLE: string;
}

export interface ScheduleConfig {
  type: 'cron' | 'interval';
  cron?: string;
  intervalMinutes?: number;
  timezone?: string;
}

export interface TaskConfig {
  warehouse: string;
  errorIntegration?: string;
  allowOverlappingExecution?: boolean;
  suspendTaskAfterFailures?: number;
  userTaskTimeoutMs?: number;
}

export interface ScheduledPipeline {
  id: string;
  pipelineId: string;
  pipelineName: string;
  schedule: ScheduleConfig;
  taskConfig: TaskConfig;
  enabled: boolean;
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleNodeData extends Record<string, unknown> {
  scheduledPipeline: ScheduledPipeline;
}

export interface ExecutionRecord {
  id: string;
  scheduledPipelineId: string;
  pipelineName: string;
  status: 'running' | 'success' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  durationMs?: number;
  errorMessage?: string;
  queryId?: string;
}
