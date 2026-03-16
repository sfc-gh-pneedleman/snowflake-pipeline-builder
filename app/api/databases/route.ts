import { NextResponse } from "next/server";
import { query } from "@/lib/snowflake";

export async function GET() {
  try {
    const results = await query(`
      SELECT DATABASE_NAME 
      FROM INFORMATION_SCHEMA.DATABASES 
      ORDER BY DATABASE_NAME
    `);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching databases:", error);
    return NextResponse.json({ error: "Failed to fetch databases" }, { status: 500 });
  }
}
