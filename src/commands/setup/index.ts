export const command = "setup";

import type { GlobalContext } from "../../types.ts";

import path from "node:path";
import { saveConfig, DEFAULT_CONFIG } from "../../common/config.ts";

/**
 * Runs the environment setup.
 */
export default async function setup(ctx: GlobalContext) {
  const { $, logger, PROJECT_ROOT, GLOBAL_CONFIG_FILE, fs } = ctx;
  logger.info("🛠️  Starting project setup...");
  try {
    // 1. Run NPM/Python setup
    await $`npm run setup --prefix ${PROJECT_ROOT}`;

    // 2. Initialize global config if it doesn't exist
    if (!fs.existsSync(GLOBAL_CONFIG_FILE)) {
      logger.info(`Creating default configuration: ${GLOBAL_CONFIG_FILE}`);
      // By default, use the project's internal tmp folder
      const initialConfig = {
        ...DEFAULT_CONFIG,
        tmpDir: path.resolve(PROJECT_ROOT, "tmp"),
      };
      saveConfig(initialConfig);
    }

    logger.info("✅ Setup completed successfully!");
  } catch (err) {
    logger.error({ err }, "❌ Setup failed.");
  }
}
