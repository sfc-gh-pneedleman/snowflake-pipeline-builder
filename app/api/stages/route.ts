import { NextResponse } from "next/server";
import { query, getConnectionConfig } from "@/lib/snowflake";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const database = searchParams.get("database");
  const schema = searchParams.get("schema");
  
  const existingConfig = getConnectionConfig();
  if (!existingConfig) {
    return NextResponse.json({ stages: [] });
  }

  try {
    let sql = "SHOW STAGES";
    if (database && schema) {
      sql = `SHOW STAGES IN ${database}.${schema}`;
    } else if (database) {
      sql = `SHOW STAGES IN DATABASE ${database}`;
    }
    
    const result = await query<Record<string, unknown>>(sql);
    const stages = result.map(row => ({
      name: row.name as string,
      database_name: row.database_name as string,
      schema_name: row.schema_name as string,
      type: row.type as string,
      url: row.url as string,
      owner: row.owner as string,
    }));
    
    return NextResponse.json({ stages });
  } catch (error) {
    console.error("Error fetching stages:", error);
    return NextResponse.json({ stages: [], error: (error as Error).message });
  }
}
