import path from "node:path";
import { fs } from "zx";
import { PROJECT_ROOT, ASSETS_DIR, SHORTS_WIDTH, SHORTS_HEIGHT, GLOBAL_CONFIG_DIR, GLOBAL_CONFIG_FILE } from "./constants.ts";
import { getConfig } from "./config.ts";
import type { RunPaths } from "../types.ts";
import logger from "./logger.ts";

export { PROJECT_ROOT, ASSETS_DIR, SHORTS_WIDTH, SHORTS_HEIGHT, GLOBAL_CONFIG_DIR, GLOBAL_CONFIG_FILE };
export { 
  VIDEO_EXTENSIONS, 
  AUDIO_EXTENSIONS,
  AUDIO_SAMPLE_RATE,
  AUDIO_CHANNELS,
  AUDIO_CODEC,
  AUDIO_BITRATE,
  FACE_MIN_CONFIDENCE
} from "./constants.ts";

/**
 * Gets the base temporary directory from configuration.
 */
export function getBaseTempDir(): string {
  return getConfig().tmpDir;
}

/**
 * Calculates paths for a specific run.
 */
export function getRunPaths(runId: string): RunPaths {
  const baseTempDir = getBaseTempDir();
  const runDir = path.resolve(baseTempDir, runId);
  
  return {
    runDir,
    faceAnalysis: path.resolve(runDir, "face-analysis"),
    transcribe: path.resolve(runDir, "transcribe"),
    sync: path.resolve(runDir, "sync"),
    denoise: path.resolve(runDir, "denoise"),
    jumpcut: path.resolve(runDir, "jumpcut"),
  };
}

/**
 * Ensures the temporary directories for a specific run exist.
 */
export function ensureRunDirs(paths: RunPaths) {
  const dirs = [
    paths.runDir,
    paths.faceAnalysis,
    paths.transcribe,
    paths.sync,
    paths.denoise,
    paths.jumpcut,
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Cleans up old run directories, keeping only the 5 most recent.
 */
export async function cleanupOldRuns() {
  const baseTempDir = getBaseTempDir();
  if (!fs.existsSync(baseTempDir)) return;

  try {
    const entries = await fs.readdir(baseTempDir);
    const runDirs = entries
      .filter(name => /^\d+$/.test(name)) // Only numeric names (timestamps)
      .map(name => ({
        name,
        path: path.resolve(baseTempDir, name),
        time: parseInt(name, 10)
      }))
      .sort((a, b) => b.time - a.time); // Newest first

    if (runDirs.length > 5) {
      const toDelete = runDirs.slice(5);
      for (const dir of toDelete) {
        logger.info(`Cleaning up old run directory: ${dir.path}`);
        await fs.remove(dir.path);
      }
    }
  } catch (err) {
    logger.error({ err }, "Failed to cleanup old runs");
  }
}

// Legacy export for compatibility during transition
export const INTERNAL_TEMP_DIR = getBaseTempDir();
