import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const productionRoots = [resolve(repositoryRoot, "server"), resolve(repositoryRoot, "client/src")];
const allowedLiteralSources = new Set([
  "server/storage.ts",
]);

function productionSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return productionSourceFiles(path);
    if (!entry.isFile() || ![".ts", ".tsx"].includes(extname(entry.name))) return [];
    if (/\.test\.[^.]+$/u.test(entry.name)) return [];
    return [path];
  });
}

test("DISCOVERY20 is absent from the client bundle sources and exists only in server-owned configuration", () => {
  const occurrences = productionRoots
    .flatMap(productionSourceFiles)
    .filter((path) => readFileSync(path, "utf8").includes("DISCOVERY20"))
    .map((path) => relative(repositoryRoot, path))
    .sort();

  assert.deepEqual(occurrences, [...allowedLiteralSources].sort());
});

test("stored Discovery report templates never contain the promo code before approval", () => {
  const reportGenerator = readFileSync(resolve(repositoryRoot, "server/discovery-scan.ts"), "utf8");
  assert.equal(reportGenerator.includes("DISCOVERY20"), false);
  assert.ok(reportGenerator.includes("Laisse un avis validé pour recevoir -20 % par email."));
});
