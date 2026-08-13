import { pool } from "../server/db";
import { repairSentDiscoveryFactsInPlace } from "../server/discoverySentRemediation";

const argv = process.argv.slice(2);
const valueAfter = (flag: string) => {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
};
const auditId = valueAfter("--expected-id");
const expectedCurrentHash = valueAfter("--expected-current-hash");
if (!auditId || !expectedCurrentHash) throw new Error("Exact audit id and current hash are mandatory");

try {
  console.log(JSON.stringify(await repairSentDiscoveryFactsInPlace({ auditId, expectedCurrentHash }), null, 2));
} finally {
  await pool.end();
}
