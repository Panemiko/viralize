#!/usr/bin/env bun

import { $, argv, chalk, fs, question } from "zx";
import * as commands from "./commands/index.ts";
import type { GlobalContext } from "./types.ts";
import logger from "./utils/logger.ts";
import { PROJECT_ROOT } from "./utils/paths.ts";
import { ui } from "./utils/ui.ts";

/**
 * Main execution flow for video conversion.
 */
async function main() {
  const subcommand = argv._[0] as string | undefined;

  if (argv.help || argv.h || !subcommand) {
    showHelp();
    return;
  }

  const ctx: GlobalContext = {
    $,
    argv,
    chalk,
    fs,
    question,
    logger,
    PROJECT_ROOT,
    ui,
  };

  const subCommandMap: Record<string, (ctx: GlobalContext) => Promise<void>> = {
    list: commands.list.default,
    setup: commands.setup.default,
    clean: commands.clean.default,
    check: commands.check.default,
    run: commands.run.default,
  };

  const command = subCommandMap[subcommand];

  if (!command) {
    logger.error(`Unknown subcommand: ${subcommand}`);
    showHelp();
    return;
  }

  try {
    await command(ctx);
  } catch (err) {
    logger.error({ err }, `Error executing ${subcommand}`);
    process.exit(1);
  }
}

/**
 * Displays help message.
 */
function showHelp() {
  console.log(`
  ${chalk.bold.magenta("viralize")} - Automatic Video to Reels Converter

  ${chalk.bold("Usage:")}
    viralize <subcommand> [options]

  ${chalk.bold("Subcommands:")}
    ${chalk.cyan("run")} [video] - Run the conversion process
    ${chalk.cyan("list")}        - List available color filters (LUTs)
    ${chalk.cyan("check")}       - Check system dependencies
    ${chalk.cyan("setup")}       - Initialize project dependencies
    ${chalk.cyan("clean")}       - Remove temporary files

  ${chalk.bold("Options for 'run':")}
    -i | --input    ${chalk.gray("Path of the video (optional if provided as positional)")}
    -f | --filter   ${chalk.gray("Name of the .CUBE filter to apply")}
    -o | --output   ${chalk.gray("Name of the output file")}
    -s | --subtitle ${chalk.gray("Use a manual .ass subtitle file")}
    --skip-face     ${chalk.gray("Skip facial analysis")}
    --skip-subs     ${chalk.gray("Skip transcription")}
    --skip-review   ${chalk.gray("Skip interactive review")}
    --skip-render   ${chalk.gray("Skip final video rendering")}
    -h | --help     ${chalk.gray("Show help message")}

  ${chalk.bold("Examples:")}
    viralize run video.mp4
    viralize run video.mp4 -f tweed
    viralize list
  `);
}

main();
