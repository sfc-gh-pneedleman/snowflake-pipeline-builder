import { ETLNodeData } from './types';
import { Node, Edge } from '@xyflow/react';

type NodeType = 'file-format' | 'stage' | 'copy-into' | 'stream' | 'sql-transform' | 'dynamic-table' | 'task' | 'target-table';

const TYPE_ORDER: NodeType[] = [
  'file-format',
  'stage', 
  'copy-into',
  'stream',
  'sql-transform',
  'dynamic-table',
  'task',
  'target-table'
];

const TYPE_HEADERS: Record<NodeType, string> = {
  'file-format': 'FILE FORMATS',
  'stage': 'STAGES',
  'copy-into': 'DATA LOADING',
  'stream': 'STREAMS',
  'sql-transform': 'TRANSFORMATIONS',
  'dynamic-table': 'DYNAMIC TABLES',
  'task': 'TASKS',
  'target-table': 'TARGET TABLES'
};

export function generateSQL(nodes: Node<ETLNodeData>[], edges: Edge[]): string {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const sorted = topologicalSort(nodes, edges);
  
  const groupedStatements: Record<NodeType, string[]> = {
    'file-format': [],
    'stage': [],
    'copy-into': [],
    'stream': [],
    'sql-transform': [],
    'dynamic-table': [],
    'task': [],
    'target-table': []
  };
  
  for (const node of sorted) {
    const sql = generateNodeSQL(node, edges, nodeMap);
    if (sql && node.data.type in groupedStatements) {
      groupedStatements[node.data.type as NodeType].push(sql);
    }
  }
  
  const sections: string[] = [];
  
  for (const type of TYPE_ORDER) {
    const statements = groupedStatements[type];
    if (statements.length > 0) {
      const header = `-- ============================================\n-- ${TYPE_HEADERS[type]}\n-- ============================================`;
      sections.push(header + '\n\n' + statements.join('\n\n'));
    }
  }
  
  return sections.join('\n\n');
}

export function topologicalSort(nodes: Node<ETLNodeData>[], edges: Edge[]): Node<ETLNodeData>[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  
  nodes.forEach(n => {
    inDegree.set(n.id, 0);
    adjacency.set(n.id, []);
  });
  
  edges.forEach(e => {
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    adjacency.get(e.source)?.push(e.target);
  });
  
  const queue = nodes.filter(n => inDegree.get(n.id) === 0);
  const result: Node<ETLNodeData>[] = [];
  
  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);
    
    for (const neighbor of adjacency.get(node.id) || []) {
      inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
      if (inDegree.get(neighbor) === 0) {
        const neighborNode = nodes.find(n => n.id === neighbor);
        if (neighborNode) queue.push(neighborNode);
      }
    }
  }
  
  return result;
}

function getSourceReferences(sourceNodes: Node<ETLNodeData>[]): string[] {
  return sourceNodes.map(n => {
    if (n.data.type === 'source-table') {
      return n.data.config.full_name as string || n.data.config.name as string || n.data.label;
    }
    if (n.data.type === 'sql-transform' || n.data.type === 'dynamic-table') {
      return n.data.config.name as string || n.data.label;
    }
    if (n.data.type === 'stream') {
      return n.data.config.name as string || n.data.label;
    }
    return n.data.config.name as string || n.data.label;
  }).filter(Boolean);
}

function getSourceAliases(sourceNodes: Node<ETLNodeData>[]): string[] {
  return sourceNodes.map((n, i) => {
    if (n.data.type === 'source-table' && n.data.config.alias) {
      return n.data.config.alias as string;
    }
    return String.fromCharCode(97 + i);
  });
}

function generateNodeSQL(
  node: Node<ETLNodeData>, 
  edges: Edge[], 
  nodeMap: Map<string, Node<ETLNodeData>>
): string | null {
  const data = node.data;
  const config = data.config;
  
  const sourceEdges = edges.filter(e => e.target === node.id);
  const sourceNodes = sourceEdges.map(e => nodeMap.get(e.source)).filter(Boolean) as Node<ETLNodeData>[];
  const sourceRefs = getSourceReferences(sourceNodes);
  const sourceAliases = getSourceAliases(sourceNodes);
  
  switch (data.type) {
    case 'source-table':
      return null;
      
    case 'sql-transform': {
      const name = config.name as string || 'TRANSFORM_VIEW';
      let sql = config.sql as string || '';
      const outputType = config.output_type as string || 'view';
      const suggestedJoinColumns = config.suggested_join_columns as string[] || [];
      
      if (!sql && sourceRefs.length > 0) {
        if (sourceRefs.length === 1) {
          const alias = sourceAliases[0];
          if (alias !== 'a') {
            sql = `SELECT *\nFROM ${sourceRefs[0]} ${alias}`;
          } else {
            sql = `SELECT *\nFROM ${sourceRefs[0]}`;
          }
        } else {
          const fromClause = sourceRefs.map((s, i) => `${s} ${sourceAliases[i]}`).join('\nJOIN ');
          let joinCondition = `-- ON ${sourceAliases[0]}.column = ${sourceAliases[1]}.column`;
          if (suggestedJoinColumns.length > 0) {
            const conditions = suggestedJoinColumns.map(col => 
              `${sourceAliases[0]}.${col} = ${sourceAliases[1]}.${col}`
            ).join('\n  AND ');
            joinCondition = `ON ${conditions}`;
          }
          sql = `SELECT *\nFROM ${fromClause}\n  ${joinCondition}`;
        }
      } else if (!sql) {
        sql = 'SELECT * FROM source_table -- TODO: connect a source node';
      } else if (sourceRefs.length > 0 && sql.includes('{{SOURCE}}')) {
        sql = sql.replace(/\{\{SOURCE\}\}/g, sourceRefs[0]);
      } else if (sourceRefs.length > 0 && sql.includes('{{source}}')) {
        sql = sql.replace(/\{\{source\}\}/g, sourceRefs[0]);
      }
      
      const comment = sourceRefs.length > 0 
        ? `-- Sources: ${sourceRefs.join(', ')}\n` 
        : '';
      
      switch (outputType) {
        case 'table':
          return `${comment}CREATE OR REPLACE TABLE ${name} AS\n${sql};`;
        case 'temp_table':
          return `${comment}CREATE OR REPLACE TEMPORARY TABLE ${name} AS\n${sql};`;
        case 'transient_table':
          return `${comment}CREATE OR REPLACE TRANSIENT TABLE ${name} AS\n${sql};`;
        case 'view':
        default:
          return `${comment}CREATE OR REPLACE VIEW ${name} AS\n${sql};`;
      }
    }
    
    case 'dynamic-table': {
      const name = config.name as string || 'MY_DYNAMIC_TABLE';
      const targetLag = config.target_lag as string || '1 minute';
      const warehouse = config.warehouse as string || 'COMPUTE_XS_WH';
      let sql = config.sql as string || '';
      
      if (!sql && sourceRefs.length > 0) {
        sql = `SELECT * FROM ${sourceRefs[0]}`;
      } else if (!sql) {
        sql = 'SELECT * FROM source_table -- TODO: connect a source node';
      } else if (sourceRefs.length > 0 && sql.includes('{{SOURCE}}')) {
        sql = sql.replace(/\{\{SOURCE\}\}/g, sourceRefs[0]);
      }
      
      const comment = sourceRefs.length > 0 
        ? `-- Sources: ${sourceRefs.join(', ')}\n` 
        : '';
      
      return `${comment}CREATE OR REPLACE DYNAMIC TABLE ${name}
  TARGET_LAG = '${targetLag}'
  WAREHOUSE = ${warehouse}
AS
${sql};`;
    }
    
    case 'task': {
      const name = config.name as string || 'MY_TASK';
      const warehouse = config.warehouse as string || 'COMPUTE_XS_WH';
      const schedule = config.schedule as string || '1 MINUTE';
      let sql = config.sql as string || '';
      const streamName = config.stream_name as string;
      
      const streamSource = sourceNodes.find(n => n.data.type === 'stream');
      const resolvedStreamName = streamName || (streamSource?.data.config.name as string) || '';
      
      if (!sql && sourceRefs.length > 0) {
        const targetEdges = edges.filter(e => e.source === node.id);
        const targetNodes = targetEdges.map(e => nodeMap.get(e.target)).filter(Boolean) as Node<ETLNodeData>[];
        const targetName = targetNodes.length > 0 
          ? (targetNodes[0].data.config.name as string || 'TARGET_TABLE')
          : 'TARGET_TABLE';
        
        if (resolvedStreamName) {
          sql = `INSERT INTO ${targetName}\nSELECT * FROM ${resolvedStreamName}`;
        } else {
          sql = `INSERT INTO ${targetName}\nSELECT * FROM ${sourceRefs[0]}`;
        }
      } else if (!sql) {
        sql = 'SELECT 1 -- TODO: configure task SQL';
      }
      
      let taskDef = `CREATE OR REPLACE TASK ${name}
  WAREHOUSE = ${warehouse}
  SCHEDULE = '${schedule}'`;
      
      if (resolvedStreamName) {
        taskDef += `\n  WHEN SYSTEM$STREAM_HAS_DATA('${resolvedStreamName}')`;
      }
      
      taskDef += `\nAS\n${sql};

-- Remember to resume the task:
-- ALTER TASK ${name} RESUME;`;
      
      return taskDef;
    }
    
    case 'stream': {
      const name = config.name as string || 'MY_STREAM';
      const sourceTable = config.source_table as string || (sourceRefs.length > 0 ? sourceRefs[0] : 'SOURCE_TABLE');
      const appendOnly = config.append_only as boolean;
      
      return `CREATE OR REPLACE STREAM ${name}
  ON TABLE ${sourceTable}${appendOnly ? '\n  APPEND_ONLY = TRUE' : ''};`;
    }
    
    case 'stage': {
      const name = config.name as string || 'MY_STAGE';
      const stageType = config.stage_type as string || 'internal';
      const url = config.url as string || '';
      const fileFormat = config.file_format as string || 'CSV';
      const storageIntegration = config.storage_integration as string || '';
      const encryption = config.encryption as string || 'SNOWFLAKE_FULL';
      const directoryEnabled = config.directory_enabled as boolean || false;
      const awsKeyId = config.aws_key_id as string || '';
      const awsSecretKey = config.aws_secret_key as string || '';
      const azureSasToken = config.azure_sas_token as string || '';
      
      let stageDef = `CREATE STAGE IF NOT EXISTS ${name}`;
      
      if (stageType !== 'internal' && url) {
        stageDef += `\n  URL = '${url}'`;
        
        if (storageIntegration) {
          stageDef += `\n  STORAGE_INTEGRATION = ${storageIntegration}`;
        } else if (stageType === 'external_s3' && awsKeyId && awsSecretKey) {
          stageDef += `\n  CREDENTIALS = (AWS_KEY_ID = '${awsKeyId}' AWS_SECRET_KEY = '${awsSecretKey}')`;
        } else if (stageType === 'external_azure' && azureSasToken) {
          stageDef += `\n  CREDENTIALS = (AZURE_SAS_TOKEN = '${azureSasToken}')`;
        }
      }
      
      if (directoryEnabled) {
        stageDef += `\n  DIRECTORY = (ENABLE = TRUE)`;
      }
      
      if (encryption && encryption !== 'SNOWFLAKE_FULL') {
        stageDef += `\n  ENCRYPTION = (TYPE = '${encryption}')`;
      }
      
      stageDef += `\n  FILE_FORMAT = (TYPE = ${fileFormat});`;
      
      return stageDef;
    }
    
    case 'file-format': {
      const name = config.name as string || 'MY_FORMAT';
      const formatType = config.format_type as string || 'CSV';
      
      const options: string[] = [];
      options.push(`TYPE = ${formatType}`);
      
      if (formatType === 'CSV') {
        if (config.field_delimiter && config.field_delimiter !== ',') {
          options.push(`FIELD_DELIMITER = '${config.field_delimiter}'`);
        }
        if (config.record_delimiter && config.record_delimiter !== '\\n') {
          options.push(`RECORD_DELIMITER = '${config.record_delimiter}'`);
        }
        if (config.skip_header && (config.skip_header as number) > 0) {
          options.push(`SKIP_HEADER = ${config.skip_header}`);
        }
        if (config.field_enclosed_by && config.field_enclosed_by !== 'NONE') {
          options.push(`FIELD_OPTIONALLY_ENCLOSED_BY = '${config.field_enclosed_by}'`);
        }
        if (config.null_if) {
          const nullValues = (config.null_if as string).split(',').map(v => `'${v.trim()}'`).join(', ');
          options.push(`NULL_IF = (${nullValues})`);
        }
        if (config.compression && config.compression !== 'AUTO') {
          options.push(`COMPRESSION = ${config.compression}`);
        }
        if (config.error_on_column_count_mismatch === false) {
          options.push(`ERROR_ON_COLUMN_COUNT_MISMATCH = FALSE`);
        }
        if (config.trim_space) {
          options.push(`TRIM_SPACE = TRUE`);
        }
      } else if (formatType === 'JSON') {
        if (config.strip_outer_array) {
          options.push(`STRIP_OUTER_ARRAY = TRUE`);
        }
        if (config.strip_null_values) {
          options.push(`STRIP_NULL_VALUES = TRUE`);
        }
        if (config.allow_duplicate) {
          options.push(`ALLOW_DUPLICATE = TRUE`);
        }
        if (config.compression && config.compression !== 'AUTO') {
          options.push(`COMPRESSION = ${config.compression}`);
        }
      } else if (formatType === 'PARQUET') {
        if (config.compression && config.compression !== 'AUTO') {
          options.push(`COMPRESSION = ${config.compression}`);
        }
        if (config.binary_as_text === false) {
          options.push(`BINARY_AS_TEXT = FALSE`);
        }
      }
      
      return `CREATE OR REPLACE FILE FORMAT ${name}\n  ${options.join('\n  ')};`;
    }
    
    case 'copy-into': {
      const path = config.path as string || '';
      const pattern = config.pattern as string || '';
      const files = config.files as string || '';
      const onError = config.on_error as string || 'ABORT_STATEMENT';
      const sizeLimit = config.size_limit as number;
      const purge = config.purge as boolean || false;
      const force = config.force as boolean || false;
      const matchByColumnName = config.match_by_column_name as boolean || false;
      const enforceLength = config.enforce_length as boolean || false;
      const truncateColumns = config.truncate_columns as boolean || false;
      
      const stageNode = sourceNodes.find(n => n.data.type === 'stage');
      const formatNode = sourceNodes.find(n => n.data.type === 'file-format');
      
      const targetEdges = edges.filter(e => e.source === node.id);
      const targetNodes = targetEdges.map(e => nodeMap.get(e.target)).filter(Boolean) as Node<ETLNodeData>[];
      const connectedTarget = targetNodes.find(n => n.data.type === 'target-table' || n.data.type === 'source-table');
      const autoTargetTable = connectedTarget?.data.config.full_name as string || connectedTarget?.data.config.name as string;
      
      const targetTable = autoTargetTable || config.target_table as string || 'TARGET_TABLE';
      const stageName = stageNode?.data.config.name as string || 'MY_STAGE';
      const formatName = formatNode?.data.config.name as string || '';
      
      const stagePath = path ? `@${stageName}/${path.replace(/^\/+/, '')}` : `@${stageName}`;
      let copySQL = `COPY INTO ${targetTable}\n  FROM ${stagePath}`;
      
      if (files) {
        const fileList = files.split(',').map(f => `'${f.trim()}'`).join(', ');
        copySQL += `\n  FILES = (${fileList})`;
      }
      
      if (pattern) {
        copySQL += `\n  PATTERN = '${pattern}'`;
      }
      
      if (formatName) {
        copySQL += `\n  FILE_FORMAT = (FORMAT_NAME = '${formatName}')`;
      }
      
      const copyOptions: string[] = [];
      if (onError !== 'ABORT_STATEMENT') {
        if (onError === 'SKIP_FILE_3') {
          copyOptions.push(`ON_ERROR = SKIP_FILE_3`);
        } else if (onError === 'SKIP_FILE_5%') {
          copyOptions.push(`ON_ERROR = 'SKIP_FILE_5%'`);
        } else {
          copyOptions.push(`ON_ERROR = ${onError}`);
        }
      }
      if (sizeLimit) {
        copyOptions.push(`SIZE_LIMIT = ${sizeLimit}`);
      }
      if (purge) {
        copyOptions.push(`PURGE = TRUE`);
      }
      if (force) {
        copyOptions.push(`FORCE = TRUE`);
      }
      if (matchByColumnName) {
        copyOptions.push(`MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE`);
      }
      if (enforceLength) {
        copyOptions.push(`ENFORCE_LENGTH = TRUE`);
      }
      if (truncateColumns) {
        copyOptions.push(`TRUNCATECOLUMNS = TRUE`);
      }
      
      if (copyOptions.length > 0) {
        copySQL += `\n  ${copyOptions.join('\n  ')}`;
      }
      
      copySQL += ';';
      
      const comment = stageNode 
        ? `-- Load data from stage: @${stageName}\n` 
        : '-- TODO: Connect a Stage node\n';
      
      return comment + copySQL;
    }
    
    case 'target-table': {
      const name = config.full_name as string || config.name as string || 'TARGET_TABLE';
      const columns = config.columns as Array<{ name: string; type: string }> || [];
      
      let sourceSQL = '';
      if (sourceRefs.length === 1) {
        sourceSQL = `SELECT * FROM ${sourceRefs[0]}`;
      } else if (sourceRefs.length > 1) {
        sourceSQL = sourceRefs.map((s, i) => 
          `SELECT * FROM ${s}${i < sourceRefs.length - 1 ? '\nUNION ALL' : ''}`
        ).join('\n');
      } else {
        sourceSQL = 'SELECT * FROM source_table -- TODO: connect a source node';
      }
      
      const comment = sourceRefs.length > 0 
        ? `-- Sources: ${sourceRefs.join(', ')}\n` 
        : '';
      
      if (columns.length > 0) {
        const colDefs = columns.map(c => `  ${c.name} ${c.type}`).join(',\n');
        return `${comment}CREATE TABLE IF NOT EXISTS ${name} (\n${colDefs}\n);

INSERT INTO ${name}
${sourceSQL};`;
      }
      
      return `${comment}CREATE OR REPLACE TABLE ${name} AS
${sourceSQL};`;
    }
    
    default:
      return null;
  }
}

function getSourceSQL(sourceNodes: Node<ETLNodeData>[]): string {
  if (sourceNodes.length === 0) {
    return 'SELECT * FROM source_table';
  }
  
  const sources = sourceNodes.map(n => {
    if (n.data.type === 'source-table') {
      return n.data.config.full_name as string || n.data.label;
    }
    return n.data.config.name as string || n.data.label;
  });
  
  if (sources.length === 1) {
    return `SELECT * FROM ${sources[0]}`;
  }
  
  return sources.map((s, i) => `SELECT * FROM ${s}${i < sources.length - 1 ? '\nUNION ALL' : ''}`).join('\n');
}

function getSourceTableName(sourceNodes: Node<ETLNodeData>[]): string {
  if (sourceNodes.length === 0) {
    return 'SOURCE_TABLE';
  }
  
  const source = sourceNodes[0];
  if (source.data.type === 'source-table') {
    return source.data.config.full_name as string || source.data.label;
  }
  return source.data.config.name as string || source.data.label;
}
