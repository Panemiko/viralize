import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROJECT_ROOT = path.resolve(__dirname, "../..");
export const ASSETS_DIR = path.resolve(PROJECT_ROOT, "assets");

// Global configuration
export const GLOBAL_CONFIG_DIR = path.resolve(os.homedir(), ".config", "viralize");
export const GLOBAL_CONFIG_FILE = path.resolve(GLOBAL_CONFIG_DIR, "config.json");

// Video Dimensions (Shorts)
export const SHORTS_WIDTH = 1080;
export const SHORTS_HEIGHT = 1920;

// File Extensions
export const VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
export const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"];

// Audio Settings
export const AUDIO_SAMPLE_RATE = 16000;
export const AUDIO_CHANNELS = 1;
export const AUDIO_CODEC = "aac";
export const AUDIO_BITRATE = "192k";

// AI Settings
export const FACE_MIN_CONFIDENCE = 0.5;
