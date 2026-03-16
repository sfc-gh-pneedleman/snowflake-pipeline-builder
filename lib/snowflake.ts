import snowflake from "snowflake-sdk";
import fs from "fs";

snowflake.configure({ logLevel: "ERROR" });

let connection: snowflake.Connection | null = null;
let connectionConfig: snowflake.ConnectionOptions | null = null;
let spcsConnected = false;

declare global {
  // eslint-disable-next-line no-var
  var __snowflakeConnection: snowflake.Connection | null;
  // eslint-disable-next-line no-var
  var __snowflakeConfig: snowflake.ConnectionOptions | null;
  // eslint-disable-next-line no-var
  var __spcsConnected: boolean;
}

function isRunningInSPCS(): boolean {
  return !!(process.env.SNOWFLAKE_HOST && fs.existsSync("/snowflake/session/token"));
}

function getSPCSToken(): string | null {
  try {
    return fs.readFileSync("/snowflake/session/token", "utf-8").trim();
  } catch {
    return null;
  }
}

function getStoredConfig(): snowflake.ConnectionOptions | null {
  return global.__snowflakeConfig || connectionConfig;
}

function getStoredConnection(): snowflake.Connection | null {
  return global.__snowflakeConnection || connection;
}

export function getConnectionConfig(): snowflake.ConnectionOptions | null {
  if (isRunningInSPCS() && (global.__spcsConnected || spcsConnected)) {
    return {
      account: process.env.SNOWFLAKE_ACCOUNT || "",
      host: process.env.SNOWFLAKE_HOST,
      warehouse: process.env.SNOWFLAKE_WAREHOUSE || "",
      database: process.env.SNOWFLAKE_DATABASE || "",
      schema: process.env.SNOWFLAKE_SCHEMA || "",
    } as snowflake.ConnectionOptions;
  }
  return getStoredConfig();
}

export function isInSPCS(): boolean {
  return isRunningInSPCS();
}

export function setConnectionConfig(config: snowflake.ConnectionOptions, conn?: snowflake.Connection) {
  connectionConfig = config;
  global.__snowflakeConfig = config;
  if (conn) {
    connection = conn;
    global.__snowflakeConnection = conn;
  }
}

function getDefaultConfig(): snowflake.ConnectionOptions {
  return {
    account: process.env.SNOWFLAKE_ACCOUNT || "",
    username: process.env.SNOWFLAKE_USER || "",
    password: process.env.SNOWFLAKE_PASSWORD || "",
    warehouse: process.env.SNOWFLAKE_WAREHOUSE || "",
    database: process.env.SNOWFLAKE_DATABASE || "",
    schema: process.env.SNOWFLAKE_SCHEMA || "",
  };
}

async function getConnection(): Promise<snowflake.Connection> {
  const existingConn = getStoredConnection();
  if (existingConn) {
    return existingConn;
  }

  if (isRunningInSPCS()) {
    const token = getSPCSToken();
    if (token) {
      const spcsConfig: snowflake.ConnectionOptions = {
        account: process.env.SNOWFLAKE_ACCOUNT || process.env.SNOWFLAKE_HOST?.split('.')[0] || "",
        host: process.env.SNOWFLAKE_HOST,
        authenticator: "OAUTH",
        token: token,
        warehouse: process.env.SNOWFLAKE_WAREHOUSE || "",
        database: process.env.SNOWFLAKE_DATABASE || "",
        schema: process.env.SNOWFLAKE_SCHEMA || "",
      };
      
      const conn = snowflake.createConnection(spcsConfig);
      await new Promise<void>((resolve, reject) => {
        conn.connect((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      connection = conn;
      global.__snowflakeConnection = conn;
      spcsConnected = true;
      global.__spcsConnected = true;
      return connection;
    }
  }

  const config = getStoredConfig() || getDefaultConfig();
  
  if (!config.account || !config.username) {
    throw new Error("Snowflake connection not configured. Please set up your connection.");
  }

  const conn = snowflake.createConnection(config);
  
  if (config.authenticator === "EXTERNALBROWSER") {
    await new Promise<void>((resolve, reject) => {
      conn.connectAsync((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } else {
    await new Promise<void>((resolve, reject) => {
      conn.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  
  connection = conn;
  global.__snowflakeConnection = conn;
  return connection;
}

export async function testConnection(config: snowflake.ConnectionOptions): Promise<{ success: boolean; message: string; connection?: snowflake.Connection }> {
  try {
    const conn = snowflake.createConnection(config);
    
    if (config.authenticator === "EXTERNALBROWSER") {
      await new Promise<void>((resolve, reject) => {
        conn.connectAsync((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } else {
      await new Promise<void>((resolve, reject) => {
        conn.connect((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    
    await new Promise<void>((resolve, reject) => {
      conn.execute({
        sqlText: "SELECT 1",
        complete: (err) => {
          if (err) reject(err);
          else resolve();
        }
      });
    });
    
    return { success: true, message: "Connection successful!", connection: conn };
  } catch (err) {
    return { success: false, message: (err as Error).message };
  }
}

export async function query<T>(sql: string, retries = 1): Promise<T[]> {
  try {
    const conn = await getConnection();
    return await new Promise<T[]>((resolve, reject) => {
      conn.execute({
        sqlText: sql,
        complete: (err, stmt, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve((rows || []) as T[]);
          }
        },
      });
    });
  } catch (err) {
    console.error("Query error:", (err as Error).message);
    if (retries > 0 && isRetryableError(err)) {
      connection = null;
      return query(sql, retries - 1);
    }
    throw err;
  }
}

function isRetryableError(err: unknown): boolean {
  const error = err as { message?: string; code?: number };
  return !!(
    error.message?.includes("OAuth access token expired") ||
    error.message?.includes("terminated connection") ||
    error.code === 407002
  );
}

export async function execute(sql: string): Promise<{ success: boolean; message: string; rowsAffected?: number }> {
  try {
    const conn = await getConnection();
    return await new Promise((resolve, reject) => {
      conn.execute({
        sqlText: sql,
        complete: (err, stmt) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              success: true,
              message: `Statement executed successfully`,
              rowsAffected: stmt?.getNumRows()
            });
          }
        },
      });
    });
  } catch (err) {
    return {
      success: false,
      message: (err as Error).message
    };
  }
}

export async function executeMultiple(statements: string[]): Promise<{ success: boolean; message: string; results: Array<{ sql: string; success: boolean; message: string }> }> {
  const results: Array<{ sql: string; success: boolean; message: string }> = [];
  
  for (const sql of statements) {
    const result = await execute(sql);
    results.push({ sql, ...result });
    if (!result.success) {
      return {
        success: false,
        message: `Failed at statement: ${sql.substring(0, 50)}...`,
        results
      };
    }
  }
  
  return {
    success: true,
    message: `Successfully executed ${statements.length} statements`,
    results
  };
}

export function disconnectSnowflake() {
  const conn = getStoredConnection();
  if (conn) {
    conn.destroy(() => {});
  }
  connection = null;
  connectionConfig = null;
  global.__snowflakeConnection = null;
  global.__snowflakeConfig = null;
}

export async function isConnectionAlive(): Promise<boolean> {
  const conn = getStoredConnection();
  if (!conn) {
    return false;
  }
  
  try {
    await new Promise<void>((resolve, reject) => {
      conn.execute({
        sqlText: "SELECT 1",
        complete: (err) => {
          if (err) reject(err);
          else resolve();
        }
      });
    });
    return true;
  } catch {
    connection = null;
    global.__snowflakeConnection = null;
    return false;
  }
}
