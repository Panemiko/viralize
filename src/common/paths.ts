import path from "node:path";
import { fileURLToPath } from "node:url";
import { fs } from "zx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROJECT_ROOT = path.resolve(__dirname, "../..");
export const ASSETS_DIR = path.resolve(PROJECT_ROOT, "assets");
export const INTERNAL_TEMP_DIR = path.resolve(PROJECT_ROOT, "tmp");

// Phase-specific temporary directories
export const TEMP_FACE_ANALYSIS = path.resolve(INTERNAL_TEMP_DIR, "face-analysis");
export const TEMP_TRANSCRIBE = path.resolve(INTERNAL_TEMP_DIR, "transcribe");
export const TEMP_SYNC = path.resolve(INTERNAL_TEMP_DIR, "sync");
export const TEMP_DENOISE = path.resolve(INTERNAL_TEMP_DIR, "denoise");
export const TEMP_JUMPCUT = path.resolve(INTERNAL_TEMP_DIR, "jumpcut");

/**
 * Ensures the temporary directory and its subdirectories exist.
 */
export function ensureTempDir() {
  const dirs = [
    INTERNAL_TEMP_DIR,
    TEMP_FACE_ANALYSIS,
    TEMP_TRANSCRIBE,
    TEMP_SYNC,
    TEMP_DENOISE,
    TEMP_JUMPCUT,
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
