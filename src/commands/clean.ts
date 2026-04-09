import path from "node:path";
import type { GlobalContext } from "../types.ts";

/**
 * Cleans temporary files.
 */
export default async function clean({ fs, logger, PROJECT_ROOT }: GlobalContext) {
  const tmpPath = path.resolve(PROJECT_ROOT, "tmp");
  logger.info(`🧹 Cleaning temporary files in: ${tmpPath}`);
  try {
    await fs.emptyDir(tmpPath);
    // Ensure .gitkeep survives if any
    const gitkeep = path.resolve(tmpPath, ".gitkeep");
    if (!fs.existsSync(gitkeep)) {
      await fs.writeFile(gitkeep, "");
    }
    logger.info("✅ Cleaned successfully!");
  } catch (err) {
    logger.error({ err }, "❌ Failed to clean temporary files.");
  }
}
