import { NextResponse } from "next/server";
import { query } from "@/lib/snowflake";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const database = searchParams.get("database");
  const schema = searchParams.get("schema");

  try {
    let sql = `
      SELECT 
        TABLE_CATALOG,
        TABLE_SCHEMA,
        TABLE_NAME,
        TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA NOT IN ('INFORMATION_SCHEMA')
    `;

    if (database) {
      sql = `
        SELECT 
          TABLE_CATALOG,
          TABLE_SCHEMA,
          TABLE_NAME,
          TABLE_TYPE
        FROM ${database}.INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA NOT IN ('INFORMATION_SCHEMA')
      `;
    }
    
    if (schema) {
      sql += ` AND TABLE_SCHEMA = '${schema}'`;
    }
    
    sql += ` ORDER BY TABLE_SCHEMA, TABLE_NAME LIMIT 500`;

    const results = await query(sql);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching tables:", error);
    return NextResponse.json({ error: "Failed to fetch tables" }, { status: 500 });
  }
}
