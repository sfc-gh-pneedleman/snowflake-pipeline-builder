import { NextResponse } from "next/server";
import { query } from "@/lib/snowflake";

export async function POST(request: Request) {
  try {
    const { sql } = await request.json();
    
    if (!sql) {
      return NextResponse.json({ error: "SQL required" }, { status: 400 });
    }

    const result = await query(sql);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Query error:", error);
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 });
  }
}
