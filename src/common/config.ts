import path from "node:path";
import { fs } from "zx";
import { GLOBAL_CONFIG_FILE, PROJECT_ROOT, SHORTS_WIDTH, SHORTS_HEIGHT } from "./constants.ts";
import logger from "./logger.ts";

export interface Config {
  tmpDir: string;
  zoom: {
    minDuration: number;
    ratePerSecond: number;
    max: number;
  };
  jumpcut: {
    silenceThreshold: number;
    silenceDuration: number;
  };
  face: {
    targetWidthPercent: number;
    desiredYPercent: number;
  };
  transcribe: {
    model: string;
    language: string;
  };
  subtitles: {
    fontName: string;
    fontSize: number;
    primaryColor: string;
    secondaryColor: string;
    highlightColor: string;
    outlineColor: string;
    shadowColor: string;
    outlineWidth: number;
    shadowDepth: number;
    alignment: number; // ASS alignment (2 is bottom center)
    marginV: number;
    bold: boolean;
    italic: boolean;
  };
}

export const DEFAULT_CONFIG: Config = {
  tmpDir: path.resolve(PROJECT_ROOT, "tmp"),
  zoom: {
    minDuration: 1.5,
    ratePerSecond: 0.01,
    max: 1.15,
  },
  jumpcut: {
    silenceThreshold: -30,
    silenceDuration: 0.5,
  },
  face: {
    targetWidthPercent: 0.25,
    desiredYPercent: 0.3,
  },
  transcribe: {
    model: "small",
    language: "English",
  },
  subtitles: {
    fontName: "The Bold Font",
    fontSize: 90,
    primaryColor: "&H00FFFFFF", // White
    secondaryColor: "&H00FFFFFF",
    highlightColor: "&H00FFFFFF", // White
    outlineColor: "&H00000000",
    shadowColor: "&H00000000",
    outlineWidth: 2,
    shadowDepth: 0,
    alignment: 2,
    marginV: 600,
    bold: true,
    italic: false,
  },
};

/**
 * Deep merges config objects.
 */
function mergeConfig(base: Config, override: any): Config {
  return {
    ...base,
    ...override,
    zoom: { ...base.zoom, ...(override.zoom || {}) },
    jumpcut: { ...base.jumpcut, ...(override.jumpcut || {}) },
    face: { ...base.face, ...(override.face || {}) },
    transcribe: { ...base.transcribe, ...(override.transcribe || {}) },
    subtitles: { ...base.subtitles, ...(override.subtitles || {}) },
  };
}

let cachedConfig: Config | null = null;

export function getConfig(explicitPath?: string): Config {
  if (cachedConfig && !explicitPath) return cachedConfig;

  let config = { ...DEFAULT_CONFIG };

  // 1. Load Global Config
  if (fs.existsSync(GLOBAL_CONFIG_FILE)) {
    try {
      const globalConfig = JSON.parse(fs.readFileSync(GLOBAL_CONFIG_FILE, "utf-8"));
      config = mergeConfig(config, globalConfig);
    } catch (e) {
      // Fallback
    }
  }

  // 2. Load Local Config (CWD)
  const localConfigPath = path.resolve(process.cwd(), "viralize.config.json");
  if (fs.existsSync(localConfigPath)) {
    try {
      const localConfig = JSON.parse(fs.readFileSync(localConfigPath, "utf-8"));
      config = mergeConfig(config, localConfig);
      logger.info(`Using local configuration: ${localConfigPath}`);
    } catch (e) {
      // Fallback
    }
  }

  // 3. Load Explicit Config (CLI argument)
  if (explicitPath) {
    const fullPath = path.resolve(explicitPath);
    if (fs.existsSync(fullPath)) {
      try {
        const explicitConfig = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
        config = mergeConfig(config, explicitConfig);
        logger.info(`Using explicit configuration: ${fullPath}`);
      } catch (e) {
        // Fallback
      }
    }
  }

  if (!explicitPath) cachedConfig = config;
  return config;
}

export function saveConfig(newConfig: Partial<Config>) {
  const currentConfig = getConfig();
  const mergedConfig = mergeConfig(currentConfig, newConfig);

  const configDir = path.dirname(GLOBAL_CONFIG_FILE);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  fs.writeFileSync(GLOBAL_CONFIG_FILE, JSON.stringify(mergedConfig, null, 2));
  cachedConfig = mergedConfig;
}
