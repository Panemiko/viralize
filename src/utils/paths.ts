import path from "node:path";
import { fileURLToPath } from "node:url";
import { fs } from "zx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROJECT_ROOT = path.resolve(__dirname, "../..");
export const ASSETS_DIR = path.resolve(PROJECT_ROOT, "assets");
export const INTERNAL_TEMP_DIR = path.resolve(PROJECT_ROOT, "tmp");

/**
 * Ensures the temporary directory exists.
 */
export function ensureTempDir() {
  if (!fs.existsSync(INTERNAL_TEMP_DIR)) {
    fs.mkdirSync(INTERNAL_TEMP_DIR, { recursive: true });
  }
}
