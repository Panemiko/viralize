import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROJECT_ROOT = path.resolve(__dirname, "../..");
export const ASSETS_DIR = path.resolve(PROJECT_ROOT, "assets");
export const TEMP_DIR = path.resolve(process.cwd(), "tmp"); // Keep tmp relative to where user is running? Or project root?
// User probably wants tmp files in their current directory or project root.
// Usually, for a CLI, project root is better for its own internal state, but sometimes current dir is expected.
// Given it's a video tool, project root is safer for internal temporary files.
export const INTERNAL_TEMP_DIR = path.resolve(PROJECT_ROOT, "tmp");
