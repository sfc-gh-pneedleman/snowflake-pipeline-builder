import { NextResponse } from "next/server";
import { query } from "@/lib/snowflake";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const database = searchParams.get("database");
  const schema = searchParams.get("schema");
  const table = searchParams.get("table");

  if (!database || !schema || !table) {
    return NextResponse.json({ error: "database, schema, and table parameters required" }, { status: 400 });
  }

  try {
    const results = await query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE
      FROM ${database}.INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = '${schema}'
        AND TABLE_NAME = '${table}'
      ORDER BY ORDINAL_POSITION
    `);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching columns:", error);
    return NextResponse.json({ error: "Failed to fetch columns" }, { status: 500 });
  }
}
