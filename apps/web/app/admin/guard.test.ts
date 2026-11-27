import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

function getFilesRecursively(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFilesRecursively(fullPath));
    } else if (
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".test.tsx")
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

function callsFunction(node: ts.Node, targetFn: string): boolean {
  let found = false;
  function visit(n: ts.Node) {
    if (ts.isCallExpression(n)) {
      const expr = n.expression;
      if (ts.isIdentifier(expr) && expr.text === targetFn) {
        found = true;
        return;
      }
    }
    ts.forEachChild(n, visit);
  }
  visit(node);
  return found;
}

function firstStatementCalls(stmt: ts.Statement | undefined, targetFn: string): boolean {
  if (!stmt) return false;
  if (ts.isTryStatement(stmt)) {
    const firstInTry = stmt.tryBlock.statements[0];
    return firstInTry ? callsFunction(firstInTry, targetFn) : false;
  }
  return callsFunction(stmt, targetFn);
}

describe("Admin guardrails static check", () => {
  const adminDir = path.resolve(__dirname); // apps/web/app/admin
  const apiAdminDir = path.resolve(__dirname, "../api/admin"); // apps/web/app/api/admin

  const allFiles = [...getFilesRecursively(adminDir), ...getFilesRecursively(apiAdminDir)];

  it("checks every 'use server' export, route handler, page and layout under admin", () => {
    const failures: string[] = [];

    for (const filePath of allFiles) {
      const code = fs.readFileSync(filePath, "utf8");
      const sourceFile = ts.createSourceFile(
        path.basename(filePath),
        code,
        ts.ScriptTarget.Latest,
        true,
      );

      const relPath = path.relative(path.resolve(__dirname, "../../.."), filePath).replace(/\\/g, "/");

      // 1. Check if file has "use server"
      const hasUseServer = sourceFile.statements.some(
        (s) =>
          ts.isExpressionStatement(s) &&
          ts.isStringLiteral(s.expression) &&
          s.expression.text === "use server",
      );

      if (hasUseServer) {
        for (const stmt of sourceFile.statements) {
          if (ts.isFunctionDeclaration(stmt)) {
            const isExported = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
            const isAsync = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
            if (isExported && isAsync && stmt.body) {
              const fnName = stmt.name?.text ?? "anonymous";
              const firstStmt = stmt.body.statements[0];
              if (!firstStatementCalls(firstStmt, "requireAdminAction")) {
                failures.push(`${relPath}: exported async function '${fnName}' body's first statement must call requireAdminAction`);
              }
            }
          } else if (ts.isVariableStatement(stmt)) {
            const isExported = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
            if (isExported) {
              for (const decl of stmt.declarationList.declarations) {
                if (
                  decl.initializer &&
                  (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
                ) {
                  const isAsync = decl.initializer.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
                  if (isAsync && decl.initializer.body) {
                    const fnName = decl.name.getText(sourceFile);
                    const body = decl.initializer.body;
                    const firstStmt = ts.isBlock(body) ? body.statements[0] : undefined;
                    if (!firstStatementCalls(firstStmt, "requireAdminAction")) {
                      failures.push(`${relPath}: exported async function '${fnName}' body's first statement must call requireAdminAction`);
                    }
                  }
                }
              }
            }
          }
        }
      }

      // 2. Route handlers (route.ts or route.tsx)
      const baseName = path.basename(filePath);
      if (baseName === "route.ts" || baseName === "route.tsx") {
        const httpMethods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
        for (const stmt of sourceFile.statements) {
          if (ts.isFunctionDeclaration(stmt)) {
            const isExported = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
            const fnName = stmt.name?.text ?? "";
            if (isExported && httpMethods.has(fnName) && stmt.body) {
              const firstStmt = stmt.body.statements[0];
              if (!firstStatementCalls(firstStmt, "requireAdminRequest")) {
                failures.push(`${relPath}: route handler '${fnName}' must call requireAdminRequest first`);
              }
            }
          } else if (ts.isVariableStatement(stmt)) {
            const isExported = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
            if (isExported) {
              for (const decl of stmt.declarationList.declarations) {
                const fnName = decl.name.getText(sourceFile);
                if (
                  httpMethods.has(fnName) &&
                  decl.initializer &&
                  (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
                ) {
                  const body = decl.initializer.body;
                  const firstStmt = ts.isBlock(body) ? body.statements[0] : undefined;
                  if (!firstStatementCalls(firstStmt, "requireAdminRequest")) {
                    failures.push(`${relPath}: route handler '${fnName}' must call requireAdminRequest first`);
                  }
                }
              }
            }
          }
        }
      }

      // 3. Pages and layouts (page.tsx, page.ts, layout.tsx, layout.ts)
      if (
        baseName === "page.tsx" ||
        baseName === "page.ts" ||
        baseName === "layout.tsx" ||
        baseName === "layout.ts"
      ) {
        // With cacheComponents the check cannot run at the top of the default export (session cookies are request-time
        // data and must be read inside <Suspense>), so the rule is: the file's components call requireAdminPage, and
        // the page's request-time component is the one that renders the admin content.
        const hasDefaultExport = sourceFile.statements.some(
          (stmt) =>
            (ts.isFunctionDeclaration(stmt) && stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)) ||
            ts.isExportAssignment(stmt),
        );
        if (hasDefaultExport && !callsFunction(sourceFile, "requireAdminPage")) {
          failures.push(`${relPath}: page/layout must call requireAdminPage in the component that renders its content`);
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
