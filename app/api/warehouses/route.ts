import { NextResponse } from "next/server";
import { query } from "@/lib/snowflake";

export async function GET() {
  try {
    const results = await query(`SHOW WAREHOUSES`);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching warehouses:", error);
    return NextResponse.json({ error: "Failed to fetch warehouses" }, { status: 500 });
  }
}
