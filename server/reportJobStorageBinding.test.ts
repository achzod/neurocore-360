import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storageSource = readFileSync(new URL("./storage.ts", import.meta.url), "utf8");
const managerSource = readFileSync(new URL("./reportJobManager.ts", import.meta.url), "utf8");

test("report job manager claim is implemented by every storage backend", () => {
  assert.match(managerSource, /storage\.claimPendingReportJob\(auditId\)/);
  assert.match(
    storageSource,
    /claimPendingReportJob\(auditId: string\): Promise<ReportJob \| undefined>;/,
  );
  assert.match(
    storageSource,
    /async claimPendingReportJob\(_auditId: string\): Promise<ReportJob \| undefined>/,
  );
  assert.match(
    storageSource,
    /async claimPendingReportJob\(auditId: string\): Promise<ReportJob \| undefined> \{[\s\S]*claimPendingGenericReportJob\(pool, auditId\)/,
  );
});
