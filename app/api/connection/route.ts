import { NextResponse } from "next/server";
import { setConnectionConfig, testConnection, getConnectionConfig, disconnectSnowflake, isConnectionAlive, isInSPCS } from "@/lib/snowflake";
import snowflake from "snowflake-sdk";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { account, username, password, warehouse, database, schema, authType } = body;
    
    if (!account || !username) {
      return NextResponse.json(
        { success: false, message: "Account and username are required" },
        { status: 400 }
      );
    }
    
    if (authType === "password" && !password) {
      return NextResponse.json(
        { success: false, message: "Password is required for password authentication" },
        { status: 400 }
      );
    }
    
    const config: snowflake.ConnectionOptions = {
      account,
      username,
      warehouse: warehouse || undefined,
      database: database || undefined,
      schema: schema || undefined,
    };
    
    if (authType === "externalbrowser") {
      config.authenticator = "EXTERNALBROWSER";
    } else {
      config.password = password;
    }
    
    const result = await testConnection(config);
    
    if (result.success) {
      setConnectionConfig(config, result.connection);
    }
    
    return NextResponse.json({ success: result.success, message: result.message });
  } catch (error) {
    console.error("Connection error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const verify = searchParams.get("verify") === "true";
  
  const inSPCS = isInSPCS();
  
  if (inSPCS) {
    const alive = await isConnectionAlive();
    return NextResponse.json({
      connected: alive,
      account: process.env.SNOWFLAKE_HOST?.split('.')[0] || "SPCS",
      username: "service-account",
      warehouse: process.env.SNOWFLAKE_WAREHOUSE || null,
      database: process.env.SNOWFLAKE_DATABASE || null,
      schema: process.env.SNOWFLAKE_SCHEMA || null,
      spcs: true,
    });
  }
  
  const config = getConnectionConfig();
  
  if (!config) {
    return NextResponse.json({
      connected: false,
      account: null,
      username: null,
      warehouse: null,
      database: null,
      schema: null,
    });
  }
  
  if (verify) {
    const alive = await isConnectionAlive();
    if (!alive) {
      return NextResponse.json({
        connected: false,
        account: config.account,
        username: config.username,
        warehouse: config.warehouse,
        database: config.database,
        schema: config.schema,
        expired: true,
      });
    }
  }
  
  return NextResponse.json({
    connected: true,
    account: config.account,
    username: config.username,
    warehouse: config.warehouse,
    database: config.database,
    schema: config.schema,
  });
}

export async function DELETE() {
  disconnectSnowflake();
  return NextResponse.json({ success: true, message: "Disconnected" });
}
