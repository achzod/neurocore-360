import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, open, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const MAGIC = Buffer.from("APEXBK1", "ascii");
const IV_BYTES = 12;
const TAG_BYTES = 16;
const DEFAULT_PREFIX = "apexlabs-postgres";
const LOCK_KEY = "apexlabs-autonomous-backup-v1";
const DAY_MS = 24 * 60 * 60 * 1000;

export type BackupManifest = {
  schemaVersion: 1;
  createdAt: string;
  databaseBytes: number;
  encryptedBytes: number;
  encryptedSha256: string;
  objectKey: string;
  pgDumpFormat: "custom";
  encryption: "aes-256-gcm";
  gitCommit: string | null;
  restoreVerification: {
    verifiedAt: string;
    pgRestoreListEntries: number;
  };
};

type BackupConfig = {
  bucket: string;
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  encryptionKey: Buffer;
  prefix: string;
  maxStorageBytes: number;
};

type BackupWorkerOptions = {
  onFailure?: (message: string) => Promise<void> | void;
  onSuccess?: (manifest: BackupManifest) => Promise<void> | void;
};

const env = (name: string): string => String(process.env[name] || "").trim();

export function backupConfigFromEnv(): BackupConfig | null {
  if (env("AUTONOMOUS_BACKUP_ENABLED").toLowerCase() !== "true") return null;
  const required = {
    bucket: env("BACKUP_S3_BUCKET"),
    endpoint: env("BACKUP_S3_ENDPOINT"),
    region: env("BACKUP_S3_REGION") || "auto",
    accessKeyId: env("BACKUP_S3_ACCESS_KEY_ID"),
    secretAccessKey: env("BACKUP_S3_SECRET_ACCESS_KEY"),
    key: env("BACKUP_ENCRYPTION_KEY_B64"),
  };
  const missing = Object.entries(required).filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) throw new Error(`AUTONOMOUS_BACKUP_CONFIG_MISSING:${missing.join(",")}`);
  const encryptionKey = Buffer.from(required.key, "base64");
  if (encryptionKey.length !== 32) throw new Error("BACKUP_ENCRYPTION_KEY_B64_MUST_DECODE_TO_32_BYTES");
  const configuredMax = Number(env("BACKUP_MAX_STORAGE_BYTES") || 8_000_000_000);
  if (!Number.isFinite(configuredMax) || configuredMax < 1_000_000_000) {
    throw new Error("BACKUP_MAX_STORAGE_BYTES_INVALID");
  }
  return {
    bucket: required.bucket,
    endpoint: required.endpoint.replace(/\/+$/, ""),
    region: required.region,
    accessKeyId: required.accessKeyId,
    secretAccessKey: required.secretAccessKey,
    encryptionKey,
    prefix: env("BACKUP_S3_PREFIX") || DEFAULT_PREFIX,
    maxStorageBytes: configuredMax,
  };
}

function clientFor(config: BackupConfig): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function run(command: string, args: string[], options: { env?: NodeJS.ProcessEnv } = {}): Promise<{ stdout: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: options.env || process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", code => {
      if (code === 0) resolve({ stdout });
      else reject(new Error(`${command}_EXIT_${code}:${stderr.slice(-2000)}`));
    });
  });
}

export function selectRetentionKeys(
  entries: Array<{ key: string; createdAt: Date }>,
  now = new Date(),
): Set<string> {
  const sorted = [...entries].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const keep = new Set<string>();
  const daily = new Set<string>();
  const weekly = new Set<string>();
  const monthly = new Set<string>();
  for (const entry of sorted) {
    const ageDays = Math.floor((now.getTime() - entry.createdAt.getTime()) / DAY_MS);
    const day = entry.createdAt.toISOString().slice(0, 10);
    const mondayOffset = (entry.createdAt.getUTCDay() + 6) % 7;
    const weekStart = new Date(Date.UTC(
      entry.createdAt.getUTCFullYear(),
      entry.createdAt.getUTCMonth(),
      entry.createdAt.getUTCDate() - mondayOffset,
    )).toISOString().slice(0, 10);
    const month = entry.createdAt.toISOString().slice(0, 7);
    if (ageDays <= 13 && !daily.has(day)) {
      daily.add(day);
      keep.add(entry.key);
    } else if (ageDays <= 69 && !weekly.has(weekStart)) {
      weekly.add(weekStart);
      keep.add(entry.key);
    } else if (ageDays <= 400 && !monthly.has(month)) {
      monthly.add(month);
      keep.add(entry.key);
    }
  }
  if (sorted[0]) keep.add(sorted[0].key);
  return keep;
}

export function applyStorageCap(
  entries: Array<{ key: string; createdAt: Date; size: number }>,
  selected: Set<string>,
  maxStorageBytes: number,
): Set<string> {
  const keep = new Set(selected);
  const retainedNewestFirst = entries
    .filter(entry => keep.has(entry.key))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  let retainedBytes = retainedNewestFirst.reduce((sum, entry) => sum + entry.size, 0);
  for (const entry of [...retainedNewestFirst].reverse()) {
    if (retainedBytes <= maxStorageBytes || entry === retainedNewestFirst[0]) break;
    keep.delete(entry.key);
    retainedBytes -= entry.size;
  }
  return keep;
}

async function encryptFile(source: string, target: PassThrough, key: Buffer): Promise<{ sha256: string; bytes: number }> {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const hash = createHash("sha256");
  let bytes = 0;
  const meter = new Transform({
    transform(chunk, _encoding, callback) {
      hash.update(chunk);
      bytes += chunk.length;
      callback(null, chunk);
    },
  });
  const header = Buffer.concat([MAGIC, iv]);
  target.write(header);
  hash.update(header);
  bytes += header.length;
  await pipeline(createReadStream(source), cipher, meter, target, { end: false });
  const tag = cipher.getAuthTag();
  target.end(tag);
  hash.update(tag);
  bytes += tag.length;
  return { sha256: hash.digest("hex"), bytes };
}

async function decryptFile(source: string, target: string, key: Buffer): Promise<void> {
  const handle = await open(source, "r");
  try {
    const info = await handle.stat();
    const headerBytes = MAGIC.length + IV_BYTES;
    if (info.size <= headerBytes + TAG_BYTES) throw new Error("BACKUP_ENVELOPE_INVALID");
    const header = Buffer.alloc(headerBytes);
    const tag = Buffer.alloc(TAG_BYTES);
    await handle.read(header, 0, header.length, 0);
    await handle.read(tag, 0, tag.length, info.size - TAG_BYTES);
    if (!header.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("BACKUP_ENVELOPE_INVALID");
    const iv = header.subarray(MAGIC.length);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    await pipeline(
      createReadStream(source, { start: headerBytes, end: info.size - TAG_BYTES - 1 }),
      decipher,
      createWriteStream(target, { mode: 0o600 }),
    );
  } finally {
    await handle.close();
  }
}

async function verifyEncryptedBackup(encryptedPath: string, key: Buffer, workDir: string): Promise<number> {
  const dumpPath = join(workDir, "restore-check.dump");
  await decryptFile(encryptedPath, dumpPath, key);
  const { stdout } = await run("pg_restore", ["--list", dumpPath]);
  const entries = stdout.split("\n").filter(line => line && !line.startsWith(";")).length;
  if (entries < 10) throw new Error(`BACKUP_RESTORE_LIST_TOO_SMALL:${entries}`);
  return entries;
}

async function latestManifest(client: S3Client, config: BackupConfig): Promise<BackupManifest | null> {
  const key = `${config.prefix}/latest.json`;
  try {
    const result = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
    const text = await result.Body?.transformToString();
    return text ? JSON.parse(text) as BackupManifest : null;
  } catch (error: any) {
    if (error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404) return null;
    throw error;
  }
}

async function uploadBackup(config: BackupConfig, client: S3Client, dumpPath: string, objectKey: string): Promise<{ sha256: string; bytes: number }> {
  const body = new PassThrough();
  const upload = new Upload({
    client,
    params: {
      Bucket: config.bucket,
      Key: objectKey,
      Body: body,
      ContentType: "application/octet-stream",
      Metadata: { format: "apexbk1", encryption: "aes-256-gcm" },
    },
    queueSize: 2,
    partSize: 8 * 1024 * 1024,
    leavePartsOnError: false,
  });
  const encrypted = encryptFile(dumpPath, body, config.encryptionKey);
  const [metrics] = await Promise.all([encrypted, upload.done()]);
  return metrics;
}

async function downloadAndVerify(
  config: BackupConfig,
  client: S3Client,
  objectKey: string,
  expectedSha256: string,
  workDir: string,
): Promise<number> {
  const encryptedPath = join(workDir, "downloaded.apexbk");
  const result = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: objectKey }));
  if (!result.Body) throw new Error("BACKUP_DOWNLOAD_EMPTY");
  await pipeline(result.Body as NodeJS.ReadableStream, createWriteStream(encryptedPath, { mode: 0o600 }));
  const digest = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(encryptedPath);
    stream.on("data", chunk => digest.update(chunk));
    stream.on("end", resolve);
    stream.on("error", reject);
  });
  const actual = digest.digest("hex");
  if (actual !== expectedSha256) throw new Error(`BACKUP_SHA256_MISMATCH:${actual}`);
  return verifyEncryptedBackup(encryptedPath, config.encryptionKey, workDir);
}

async function pruneOldBackups(config: BackupConfig, client: S3Client): Promise<number> {
  const listed = await client.send(new ListObjectsV2Command({
    Bucket: config.bucket,
    Prefix: `${config.prefix}/backups/`,
  }));
  const entries = (listed.Contents || [])
    .filter(item => item.Key?.endsWith(".dump.apexbk") && item.LastModified)
    .map(item => ({ key: item.Key!, createdAt: item.LastModified!, size: Number(item.Size || 0) }));
  const keep = applyStorageCap(
    entries,
    selectRetentionKeys(entries),
    config.maxStorageBytes,
  );
  const obsolete = entries.filter(entry => !keep.has(entry.key));
  const remove = obsolete.flatMap(entry => [{ Key: entry.key }, { Key: `${entry.key}.json` }]);
  if (!remove.length) return 0;
  await client.send(new DeleteObjectsCommand({ Bucket: config.bucket, Delete: { Objects: remove, Quiet: true } }));
  return obsolete.length;
}

export async function runAutonomousBackup(force = false): Promise<BackupManifest | null> {
  const config = backupConfigFromEnv();
  if (!config) return null;
  const client = clientFor(config);
  const latest = await latestManifest(client, config);
  if (!force && latest && Date.now() - Date.parse(latest.createdAt) < 20 * 60 * 60 * 1000) return null;

  const { pool } = await import("./db");
  const dbClient = await pool.connect();
  const lock = await dbClient.query<{ locked: boolean }>("SELECT pg_try_advisory_lock(hashtext($1)) locked", [LOCK_KEY]);
  if (!lock.rows[0]?.locked) {
    dbClient.release();
    return null;
  }
  const workDir = await mkdtemp(join(tmpdir(), "apexlabs-backup-"));
  try {
    const sizeResult = await dbClient.query<{ bytes: string }>("SELECT pg_database_size(current_database())::text bytes");
    const databaseBytes = Number(sizeResult.rows[0]?.bytes || 0);
    const dumpPath = join(workDir, "database.dump");
    await run("pg_dump", [
      "--format=custom",
      "--compress=9",
      "--no-owner",
      "--no-acl",
      "--file", dumpPath,
    ], {
      env: { ...process.env, PGDATABASE: String(process.env.DATABASE_URL) },
    });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const objectKey = `${config.prefix}/backups/${stamp}.dump.apexbk`;
    const encrypted = await uploadBackup(config, client, dumpPath, objectKey);
    await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: objectKey }));
    const pgRestoreListEntries = await downloadAndVerify(config, client, objectKey, encrypted.sha256, workDir);
    const manifest: BackupManifest = {
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      databaseBytes,
      encryptedBytes: encrypted.bytes,
      encryptedSha256: encrypted.sha256,
      objectKey,
      pgDumpFormat: "custom",
      encryption: "aes-256-gcm",
      gitCommit: env("RENDER_GIT_COMMIT") || null,
      restoreVerification: {
        verifiedAt: new Date().toISOString(),
        pgRestoreListEntries,
      },
    };
    const manifestBody = JSON.stringify(manifest, null, 2);
    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: `${objectKey}.json`,
      Body: manifestBody,
      ContentType: "application/json",
    }));
    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: `${config.prefix}/latest.json`,
      Body: manifestBody,
      ContentType: "application/json",
      CacheControl: "no-store",
    }));
    const pruned = await pruneOldBackups(config, client);
    console.log(`[Backup] BACKUP_VERIFIED object=${objectKey} bytes=${encrypted.bytes} entries=${pgRestoreListEntries} pruned=${pruned}`);
    return manifest;
  } finally {
    await dbClient.query("SELECT pg_advisory_unlock(hashtext($1))", [LOCK_KEY]).catch(() => undefined);
    dbClient.release();
    await rm(workDir, { recursive: true, force: true });
    client.destroy();
  }
}

export function startAutonomousBackupWorker(options: BackupWorkerOptions = {}): (() => void) | null {
  if (env("AUTONOMOUS_BACKUP_ENABLED").toLowerCase() !== "true") {
    console.log("[Backup] autonomous encrypted backup disabled");
    return null;
  }
  let running = false;
  let lastFailureAlertAt = 0;
  const execute = async () => {
    if (running) return;
    running = true;
    try {
      const manifest = await runAutonomousBackup(false);
      if (manifest) await options.onSuccess?.(manifest);
    } catch (error: any) {
      const message = String(error?.stack || error?.message || error).slice(0, 6000);
      console.error("[Backup] BACKUP_FAILED", message);
      if (Date.now() - lastFailureAlertAt >= 24 * 60 * 60 * 1000) {
        lastFailureAlertAt = Date.now();
        await options.onFailure?.(message);
      }
    } finally {
      running = false;
    }
  };
  const initial = setTimeout(() => void execute(), 60_000);
  const timer = setInterval(() => void execute(), 6 * 60 * 60 * 1000);
  return () => {
    clearTimeout(initial);
    clearInterval(timer);
  };
}
