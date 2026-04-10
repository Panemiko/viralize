export const command = "clean";

import { INTERNAL_TEMP_DIR } from "../../common/paths.ts";
import type { GlobalContext } from "../../types.ts";
import path from "node:path";

/**
 * Cleans temporary files.
 */
export default async function clean({ fs, logger }: GlobalContext) {
  logger.info(`🧹 Cleaning temporary files in: ${INTERNAL_TEMP_DIR}`);
  try {
    if (fs.existsSync(INTERNAL_TEMP_DIR)) {
      await fs.emptyDir(INTERNAL_TEMP_DIR);
    } else {
      await fs.mkdirp(INTERNAL_TEMP_DIR);
    }
    
    // Ensure .gitkeep survives
    const gitkeep = path.resolve(INTERNAL_TEMP_DIR, ".gitkeep");
    await fs.writeFile(gitkeep, "");
    
    logger.info("✅ Cleaned successfully!");
  } catch (err) {
    logger.error({ err }, "❌ Failed to clean temporary files.");
  }
}
