import { AddedLine } from "./scope";
import { Finding } from "./content";

export function secretLine(text: string): boolean {
  if (/\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[A-Z0-9]{16})\b/.test(text)) return true;
  if (text.includes("PRIVATE" + " KEY")) return true;
  // Exact hexadecimal commit/digest pins are not base64 credentials.
  return Array.from(text.matchAll(/[A-Za-z0-9+/]{80,}={0,2}/g), x => x[0]).some(x => !/^[a-fA-F0-9]+$/.test(x));
}
export function scanSecrets(path: string, lines: AddedLine[]): Finding[] {
  return lines.filter(x => secretLine(x.text)).map(x => ({ path, line: x.line, rule: "secret-pattern-redacted" }));
}
