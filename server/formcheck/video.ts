/**
 * FormCheck V2 : lecture de la vidéo et extraction des frames avec ffmpeg.
 * Ordre de résolution du binaire : FFMPEG_PATH, ffmpeg système, ffmpeg-static.
 */
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { computeFrameTimestamps } from "./config";

let cachedFfmpeg: string | null = null;

export function resolveFfmpegPath(): string {
  if (cachedFfmpeg) return cachedFfmpeg;
  const candidates: string[] = [];
  if (process.env.FFMPEG_PATH) candidates.push(process.env.FFMPEG_PATH);
  candidates.push("ffmpeg");
  try {
    // Bundle CJS en production (require natif), ESM sous tsx en dev/tests.
    const req = typeof require === "function" ? require : createRequire(import.meta.url);
    const staticPath = req("ffmpeg-static") as string | null;
    if (staticPath) candidates.push(staticPath);
  } catch {
    // ffmpeg-static absent : on garde les autres candidats
  }
  for (const candidate of candidates) {
    try {
      const probe = spawnSync(candidate, ["-version"], { stdio: "ignore", timeout: 10_000 });
      if (probe.status === 0) {
        cachedFfmpeg = candidate;
        return candidate;
      }
    } catch {
      // candidat suivant
    }
  }
  throw new Error("FFMPEG_NOT_AVAILABLE");
}

function runFfmpeg(args: string[], timeoutMs = 60_000): Promise<{ code: number | null; stdout: Buffer; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(resolveFfmpegPath(), args, { stdio: ["ignore", "pipe", "pipe"] });
    const out: Buffer[] = [];
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("FFMPEG_TIMEOUT"));
    }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => out.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => {
      if (err.length < 200_000) err += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout: Buffer.concat(out), stderr: err });
    });
  });
}

/** Lit "Duration: 00:00:21.53" dans la sortie de ffmpeg -i (ffprobe n'est pas livré par ffmpeg-static). */
export function parseFfmpegProbe(stderr: string): { durationS: number | null; hasVideo: boolean; width: number | null; height: number | null } {
  const duration = stderr.match(/Duration:\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/);
  const durationS = duration
    ? Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3])
    : null;
  const videoLine = stderr.split("\n").find((line) => /Stream #.*Video:/.test(line)) || "";
  const size = videoLine.match(/,\s*(\d{2,5})x(\d{2,5})[,\s]/);
  return {
    durationS: durationS !== null && Number.isFinite(durationS) ? durationS : null,
    hasVideo: Boolean(videoLine),
    width: size ? Number(size[1]) : null,
    height: size ? Number(size[2]) : null,
  };
}

export async function probeVideo(filePath: string) {
  const { stderr } = await runFfmpeg(["-hide_banner", "-i", filePath], 30_000);
  return parseFfmpegProbe(stderr);
}

export interface ExtractedFrame { index: number; timestampS: number; jpeg: Buffer }

/**
 * Extrait 8 à 12 frames JPEG réparties sur la série, côté le plus long à 1024 px.
 * ffmpeg applique la rotation des vidéos iPhone automatiquement.
 */
export async function extractFrames(filePath: string, durationS: number): Promise<ExtractedFrame[]> {
  const timestamps = computeFrameTimestamps(durationS);
  const frames: ExtractedFrame[] = [];
  for (let index = 0; index < timestamps.length; index++) {
    const timestampS = timestamps[index];
    const { code, stdout } = await runFfmpeg([
      "-hide_banner", "-loglevel", "error",
      "-ss", timestampS.toFixed(3),
      "-i", filePath,
      "-frames:v", "1",
      "-vf", "scale='if(gt(iw,ih),1024,-2)':'if(gt(iw,ih),-2,1024)'",
      "-q:v", "4",
      "-f", "image2pipe", "-vcodec", "mjpeg", "pipe:1",
    ]);
    if (code === 0 && stdout.length > 1000) {
      frames.push({ index: frames.length, timestampS, jpeg: stdout });
    }
  }
  return frames;
}
