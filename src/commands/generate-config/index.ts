export const command = "generate-config";

import path from "node:path";
import { fs } from "zx";
import type { GlobalContext } from "../../types.ts";
import { DEFAULT_CONFIG } from "../../common/config.ts";

/**
 * Creates a local configuration file in the current working directory.
 */
export default async function init(ctx: GlobalContext) {
  const { logger, PROJECT_ROOT } = ctx;
  const localConfigPath = path.resolve(process.cwd(), "viralize.config.json");

  if (fs.existsSync(localConfigPath)) {
    logger.warn(`Local configuration already exists at: ${localConfigPath}`);
    return;
  }

  logger.info(`✨ Creating local configuration: ${localConfigPath}`);

  // Default to project's internal 'tmp' folder if not specified
  const config = {
    ...DEFAULT_CONFIG,
    tmpDir: path.resolve(PROJECT_ROOT, "tmp"),
  };

  try {
    fs.writeFileSync(localConfigPath, JSON.stringify(config, null, 2));
    logger.info("✅ Created viralize.config.json successfully!");
  } catch (err) {
    logger.error({ err }, "❌ Failed to create local configuration.");
  }
}
