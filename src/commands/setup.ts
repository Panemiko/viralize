import type { GlobalContext } from "../types.ts";

/**
 * Runs the environment setup.
 */
export default async function setup({
  $,
  logger,
  PROJECT_ROOT,
}: GlobalContext) {
  logger.info("🛠️  Starting project setup...");
  try {
    await $`npm run setup --prefix ${PROJECT_ROOT}`;
    logger.info("✅ Setup completed successfully!");
  } catch (err) {
    logger.error({ err }, "❌ Setup failed.");
  }
}
