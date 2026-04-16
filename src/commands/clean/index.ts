export const command = "clean";

import { getBaseTempDir } from "../../common/paths.ts";
import type { GlobalContext } from "../../types.ts";
import path from "node:path";

/**
 * Cleans temporary files.
 */
export default async function clean({ fs, logger }: GlobalContext) {
  const baseTempDir = getBaseTempDir();
  logger.info(`🧹 Cleaning all temporary files in: ${baseTempDir}`);
  try {
    if (fs.existsSync(baseTempDir)) {
      await fs.emptyDir(baseTempDir);
    } else {
      await fs.mkdirp(baseTempDir);
    }
    
    // Ensure .gitkeep survives
    const gitkeep = path.resolve(baseTempDir, ".gitkeep");
    await fs.writeFile(gitkeep, "");

    logger.info("✅ Cleaned successfully!");
  } catch (err) {
    logger.error({ err }, "❌ Failed to clean temporary files.");
  }
}
