export const command = "list";

import path from "node:path";
import type { GlobalContext } from "../../types.ts";

/**
 * Lists available color filters.
 */
export default async function list({
  chalk,
  logger,
  PROJECT_ROOT,
  fs,
}: GlobalContext) {
  const filtersPath = path.resolve(PROJECT_ROOT, "assets/filters/");
  
  if (!fs.existsSync(filtersPath)) {
    logger.error(`Filters directory not found: ${filtersPath}`);
    return;
  }

  try {
    const files = fs.readdirSync(filtersPath);
    const filters = files
      .filter((f: string) => f.endsWith(".CUBE"))
      .map((f: string) => f.replace(".CUBE", ""));

    if (filters.length === 0) {
      logger.warn("No .CUBE filters found in assets/filters/");
      return;
    }

    console.log(chalk.bold.magenta("\n✨ Available Color Filters:"));
    filters.forEach((f: string) => console.log(`  - ${chalk.cyan(f)}`));
    console.log(`\nUse them with: ${chalk.green("viralize run -f <name>")}\n`);
  } catch (err) {
    logger.error({ err }, "Could not list filters.");
  }
}
