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
  // WP-001 3b.3: these literals are content ranges even under an unfamiliar key.
  const contentNumbers = new Set([180, 220, 3200, 3600, 1200]);
  const numberLines = new Set<number>();
  const record = (offset: number, value: number, named: boolean): void => {
    const line = source.slice(0, offset).split("\n").length;
    if (changed.has(line) && (named || contentNumbers.has(value))) numberLines.add(line);
  };
  if (path.endsWith(".ts")) {
    const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
    function values(node: ts.Node, named: boolean): void {
      if (ts.isNumericLiteral(node)) { record(node.getStart(ast), Number(node.text), named); return; }
      // Property names, function bodies and call/index arguments are not assigned values.
      if (ts.isFunctionLike(node) || ts.isTypeNode(node) || ts.isCallExpression(node) || ts.isNewExpression(node) || ts.isElementAccessExpression(node)) return;
      if (ts.isPropertyAssignment(node)) { values(node.initializer, named || contentKeys.test(node.name.getText(ast).replace(/["']/g, ""))); return; }
      ts.forEachChild(node, child => values(child, named));
    }
    function visit(node: ts.Node): void {
      if ((ts.isPropertyAssignment(node) || ts.isVariableDeclaration(node) || ts.isPropertyDeclaration(node) || ts.isParameter(node)) && node.initializer) {
        values(node.initializer, contentKeys.test(node.name.getText(ast).replace(/["']/g, "")));
      } else if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
        const name = ts.isPropertyAccessExpression(node.left) ? node.left.name.text : node.left.getText(ast);
        values(node.right, contentKeys.test(name));
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  } else {
    // Mask comments and string values without moving offsets. Block scalars are strings.
    let quote = "", blockIndent: number | undefined;
    const masked = source.split("\n").map(raw => {
      const indent = raw.search(/\S/);
      if (blockIndent !== undefined) {
        if (indent < 0 || indent > blockIndent) return " ".repeat(raw.length);
        blockIndent = undefined;
      }
      const chars = raw.split("");
      for (let i = 0; i < chars.length; i++) {
        const c = raw[i];
        if (quote) {
          chars[i] = " ";
          if (quote === '"' && c === "\\") { if (i + 1 < chars.length) chars[++i] = " "; }
          else if (c === quote) {
            if (quote === "'" && raw[i + 1] === "'") chars[++i] = " "; else quote = "";
          }
        } else if (c === "#" && (i === 0 || /\s/.test(raw[i - 1]))) { chars.fill(" ", i); break; }
        else if (c === '"' || c === "'") {
          const key = /^(["'])([A-Za-z_][\w.-]*)\1(?=\s*:)/.exec(raw.slice(i));
          if (key) { chars[i] = " "; chars[i + key[0].length - 1] = " "; i += key[0].length - 1; }
          else { quote = c; chars[i] = " "; }
        }
      }
      const line = chars.join("");
      if (/:\s*[|>][+-]?[1-9]?\s*$/.test(line)) blockIndent = Math.max(0, indent);
      return line;
    }).join("\n");
    const assignments = /(?:^|[\s,{])([A-Za-z_][\w.-]*)[ \t]*[:=][ \t]*/g;
    for (const match of masked.matchAll(assignments)) {
      const valueStart = match.index! + match[0].length;
      const start = valueStart + /^\s*/.exec(masked.slice(valueStart))![0].length;
      const named = contentKeys.test(match[1]);
      const scalar = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?(?=$|[\s,}\]])/.exec(masked.slice(start));
      if (scalar) record(start, Number(scalar[0]), named);
      else if (masked[start] === "[") {
        const end = masked.indexOf("]", start);
        if (end >= 0) for (const n of masked.slice(start + 1, end).matchAll(/(?:^|[\s,])([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)(?=$|[\s,])/g)) {
          record(start + 1 + n.index! + n[0].indexOf(n[1]), Number(n[1]), named);
        }
      }
    }
  }
  for (const line of numberLines) result.push({ path, line, rule: "content-number-assignment" });
  return result;
}
