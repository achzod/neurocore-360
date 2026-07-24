import fs from "node:fs";
import path from "node:path";

const roots = ["server", "client/src", "client/public", "scripts", "dist/public"];
const extensions = new Set([".ts", ".tsx", ".js", ".cjs", ".json", ".html", ".txt"]);
const failures: string[] = [];

function scan(target: string): void {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target)) {
      if (/^(?:node_modules|\.git)$/.test(entry) || /\.bak$|backup/i.test(entry)) continue;
      scan(path.join(target, entry));
    }
    return;
  }
  if (!extensions.has(path.extname(target))) return;

  const content = fs.readFileSync(target, "utf8");
  const forbidden = Array.from(content).filter((char) => {
    const code = char.codePointAt(0);
    return code === 0x2013 || code === 0x2014;
  }).length;
  const entities = (content.match(/&(?:mdash|ndash);/gi) || []).length;
  if (forbidden + entities > 0) {
    failures.push(`${target}: ${forbidden + entities} occurrence(s) interdite(s)`);
  }
}

roots.forEach(scan);

if (failures.length > 0) {
  console.error("Client-facing style check failed");
  failures.forEach((failure) => console.error(failure));
  process.exit(1);
}

console.log("Client-facing style check: OK");
