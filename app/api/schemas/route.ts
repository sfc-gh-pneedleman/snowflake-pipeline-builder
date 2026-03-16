import { NextResponse } from "next/server";
import { query } from "@/lib/snowflake";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const database = searchParams.get("database");

  try {
    if (!database) {
      return NextResponse.json({ error: "Database parameter is required" }, { status: 400 });
    }

    const sql = `
      SELECT SCHEMA_NAME 
      FROM ${database}.INFORMATION_SCHEMA.SCHEMATA 
      WHERE SCHEMA_NAME NOT IN ('INFORMATION_SCHEMA')
      ORDER BY SCHEMA_NAME
    `;

    const results = await query(sql);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching schemas:", error);
    return NextResponse.json({ error: "Failed to fetch schemas" }, { status: 500 });
  }
}
