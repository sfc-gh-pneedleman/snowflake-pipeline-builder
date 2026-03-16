import { NextResponse } from "next/server";
import { executeMultiple, getConnectionConfig } from "@/lib/snowflake";

function extractStatements(sql: string): string[] {
  const lines = sql.split('\n');
  const statements: string[] = [];
  let currentStatement = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('--')) {
      if (currentStatement.trim()) {
        currentStatement += '\n' + line;
      }
      continue;
    }
    
    currentStatement += (currentStatement ? '\n' : '') + line;
    
    if (trimmedLine.endsWith(';')) {
      const stmt = currentStatement.trim();
      if (stmt && !stmt.match(/^[\s\-;]*$/)) {
        statements.push(stmt);
      }
      currentStatement = '';
    }
  }
  
  if (currentStatement.trim() && !currentStatement.trim().match(/^[\s\-;]*$/)) {
    const stmt = currentStatement.trim();
    statements.push(stmt.endsWith(';') ? stmt : stmt + ';');
  }
  
  return statements.filter(s => {
    const withoutComments = s.replace(/--.*$/gm, '').trim();
    return withoutComments.length > 0 && 
           withoutComments !== ';' && 
           /^\s*(CREATE|ALTER|INSERT|UPDATE|DELETE|DROP|GRANT|REVOKE|USE)\s/i.test(withoutComments);
  });
}

export async function POST(request: Request) {
  try {
    const { sql } = await request.json();
    
    if (!sql) {
      return NextResponse.json({ error: "SQL required" }, { status: 400 });
    }

    const existingConfig = getConnectionConfig();
    if (!existingConfig) {
      return NextResponse.json({ 
        success: false, 
        message: "Not connected to Snowflake. Please connect first using the Connect button." 
      });
    }

    const statements = extractStatements(sql);

    if (statements.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "No executable SQL statements found" 
      });
    }

    const result = await executeMultiple(statements);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error deploying:", error);
    return NextResponse.json({ 
      success: false, 
      message: (error as Error).message 
    }, { status: 500 });
  }
}
