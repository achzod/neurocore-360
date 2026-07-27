import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["client/src", "client/public"];
const forbidden = [
  /peptaura/i,
  /peptaura\.com\/coas/i,
];
const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".html", ".xml", ".txt"]);
const leaks: string[] = [];

function extension(path: string): string {
  const index = path.lastIndexOf(".");
  return index === -1 ? "" : path.slice(index);
}

function scan(path: string): void {
  const stats = statSync(path);
  if (stats.isDirectory()) {
    for (const entry of readdirSync(path)) scan(join(path, entry));
    return;
  }
  if (!allowedExtensions.has(extension(path))) return;
  const content = readFileSync(path, "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(content)) leaks.push(`${path}: ${pattern}`);
  }
}

for (const root of roots) scan(root);

if (leaks.length > 0) {
  console.error("Secret supplier leak detected in public frontend:");
  for (const leak of leaks) console.error(`- ${leak}`);
  process.exit(1);
}

console.log("Secret supplier frontend scan: OK");
