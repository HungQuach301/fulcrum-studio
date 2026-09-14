import ts from "typescript";
import { at, files, AddedLine } from "./scope";

export interface Finding { path: string; line: number; rule: string; }
export function contentPath(path: string): boolean { return /^(?:engine\/.*\.(?:ts|yml)|\.github\/workflows\/[^/]+\.yml)$/.test(path) && !/^engine\/(?:docs|contracts)\//.test(path); }
export function tokens(root: string, base: string): string[] {
  const values: string[] = [];
  for (const path of files(root, base)) {
    if (/^genres\/[^/]+\/layouts\.json$/.test(path)) {
      const value = JSON.parse(at(root, base, path)) as Record<string, unknown>;
      for (const key of ["landscapeLayouts", "verticalLayouts"]) {
        const rows = value[key]; if (Array.isArray(rows)) for (const row of rows) if (row && typeof row.id === "string") values.push(row.id);
      }
    }
    if (/^channels\/[^/]+\/channel\.json$/.test(path)) {
      const value = JSON.parse(at(root, base, path)) as { pillars?: unknown };
      if (Array.isArray(value.pillars)) for (const x of value.pillars) if (typeof x === "string") values.push(x);
    }
  }
  return Array.from(new Set(values));
}
export function scanContent(path: string, source: string, lines: AddedLine[], domain: string[]): Finding[] {
  if (!contentPath(path)) return [];
  const result: Finding[] = []; const changed = new Set(lines.map(x => x.line));
  for (const row of lines) {
    if (/#[a-fA-F0-9]{3}(?:[a-fA-F0-9]{3})?(?:[a-fA-F0-9]{2})?\b/.test(row.text)) result.push({ path, line: row.line, rule: "content-color" });
    for (const token of domain) {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp("(?:^|[^A-Za-z0-9_-])" + escaped + "(?:$|[^A-Za-z0-9_-])").test(row.text)) { result.push({ path, line: row.line, rule: "content-domain-token" }); break; }
    }
  }
  const contentKeys = /^(?:beats?|beatCount|sceneCount|wordCount|scriptWordCount|durationMs|sceneMinDurationMs|estimatedMs|targetDurationMin|fps)$/;
  if (path.endsWith(".ts")) {
    const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
    function visit(node: ts.Node): void {
      if (ts.isPropertyAssignment(node) && contentKeys.test(node.name.getText(ast).replace(/["']/g, "")) && /\d/.test(node.initializer.getText(ast))) {
        const line = ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
        if (changed.has(line) && (ts.isNumericLiteral(node.initializer) || ts.isArrayLiteralExpression(node.initializer))) result.push({ path, line, rule: "content-number-assignment" });
      }
      if (ts.isVariableDeclaration(node) && node.initializer && contentKeys.test(node.name.getText(ast)) && ts.isNumericLiteral(node.initializer)) {
        const line = ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
        if (changed.has(line)) result.push({ path, line, rule: "content-number-assignment" });
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  } else for (const row of lines) if (/\b(?:beats?|beatCount|sceneCount|wordCount|durationMs|estimatedMs|targetDurationMin|fps)\s*[:=]\s*(?:\[\s*)?\d/.test(row.text)) result.push({ path, line: row.line, rule: "content-number-assignment" });
  return result;
}
