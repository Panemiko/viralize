import path from "node:path";
import type { GlobalContext } from "../types.ts";

export const commandName = "list";

/**
 * Lists available color filters.
 */
export default async function list({
  $,
  chalk,
  logger,
  PROJECT_ROOT,
}: GlobalContext) {
  const filtersPath = path.resolve(PROJECT_ROOT, "assets/filters/");
  logger.info(`Checking filters in: ${filtersPath}`);
  try {
    const filters = await $`ls ${filtersPath} | grep .CUBE`.quiet();
    const list = filters.stdout
      .split("\n")
      .filter((f) => f)
      .map((f) => f.replace(".CUBE", ""));

    console.log(chalk.bold("\n✨ Available Color Filters:"));
    list.forEach((f) => console.log(`  - ${chalk.cyan(f)}`));
    console.log(`\nUse them with: ${chalk.green("viralize run -f <name>")}\n`);
  } catch {
    logger.error("Could not find and list filters.");
  }
}
