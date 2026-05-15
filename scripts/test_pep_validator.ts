import { validatePeptidesReport } from "../server/peptidesReportValidator";
import * as fs from "fs";

const files = ["thomass77100", "pasqal18", "aliane", "willy", "hadi", "imd83", "afantrous", "parrinello", "baldy"];
for (const f of files) {
  const data = JSON.parse(fs.readFileSync(`/tmp/pep_audit/${f}.json`, "utf-8"));
  const v = validatePeptidesReport(data.report);
  console.log(`\n========== ${f} ==========`);
  console.log(`  ok=${v.ok} errors=${v.errors.length} warnings=${v.warnings.length}`);
  for (const e of v.errors) console.log(`    ❌ ${e}`);
}
