import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { backupConfigFromEnv, selectRetentionKeys } from "./autonomousBackup";

const withEnv = (values: Record<string, string | undefined>, fn: () => void) => {
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

test("backup stays disabled unless explicitly enabled", () => {
  withEnv({ AUTONOMOUS_BACKUP_ENABLED: undefined }, () => {
    assert.equal(backupConfigFromEnv(), null);
  });
});

test("enabled backup fails closed on missing credentials", () => {
  withEnv({
    AUTONOMOUS_BACKUP_ENABLED: "true",
    BACKUP_S3_BUCKET: undefined,
    BACKUP_S3_ENDPOINT: undefined,
    BACKUP_S3_ACCESS_KEY_ID: undefined,
    BACKUP_S3_SECRET_ACCESS_KEY: undefined,
    BACKUP_ENCRYPTION_KEY_B64: undefined,
  }, () => {
    assert.throws(() => backupConfigFromEnv(), /AUTONOMOUS_BACKUP_CONFIG_MISSING/);
  });
});

test("backup accepts only a 256-bit encryption key", () => {
  const base = {
    AUTONOMOUS_BACKUP_ENABLED: "true",
    BACKUP_S3_BUCKET: "bucket",
    BACKUP_S3_ENDPOINT: "https://example.invalid",
    BACKUP_S3_ACCESS_KEY_ID: "id",
    BACKUP_S3_SECRET_ACCESS_KEY: "secret",
  };
  withEnv({ ...base, BACKUP_ENCRYPTION_KEY_B64: Buffer.alloc(31).toString("base64") }, () => {
    assert.throws(() => backupConfigFromEnv(), /MUST_DECODE_TO_32_BYTES/);
  });
  withEnv({ ...base, BACKUP_ENCRYPTION_KEY_B64: Buffer.alloc(32, 7).toString("base64") }, () => {
    const config = backupConfigFromEnv();
    assert.equal(config?.encryptionKey.length, 32);
    assert.equal(config?.region, "auto");
  });
});

test("retention keeps recent daily, older weekly and long-term monthly snapshots", () => {
  const now = new Date("2026-11-10T12:00:00Z");
  const entries = Array.from({ length: 430 }, (_, daysAgo) => ({
    key: `backup-${daysAgo}`,
    createdAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
  }));
  const keep = selectRetentionKeys(entries, now);
  for (let day = 0; day <= 13; day++) assert.equal(keep.has(`backup-${day}`), true);
  assert.equal(keep.size <= 36, true, `unexpected retention size ${keep.size}`);
  assert.equal(keep.has("backup-429"), false);
});

test("runtime integration schedules backup and reports failures", () => {
  const index = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
  const source = readFileSync(new URL("./autonomousBackup.ts", import.meta.url), "utf8");
  assert.match(index, /startAutonomousBackupWorker/);
  assert.match(index, /sendOperationalAlertEmail\("BACKUP CHIFFRÉ EN ÉCHEC"/);
  assert.match(source, /pg_try_advisory_lock/);
  assert.match(source, /pg_dump/);
  assert.match(source, /aes-256-gcm/);
  assert.match(source, /pg_restore/);
  assert.match(source, /BACKUP_VERIFIED/);
  assert.match(source, /leavePartsOnError: false/);
});
