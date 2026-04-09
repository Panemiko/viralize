#!/usr/bin/env bun

import { $, argv, chalk, fs, question } from "zx";
import logger from "./utils/logger.ts";
import { PROJECT_ROOT } from "./utils/paths.ts";
import {
  commandCheck,
  commandClean,
  commandList,
  commandRun,
  commandSetup,
} from "./commands/index.ts";
import type { GlobalContext } from "./types.ts";

/**
 * Main execution flow for video conversion.
 */
async function main() {
  const subcommand = argv._[0] as string | undefined;
  const hasSubcommand = !!subcommand;
  const hasOptions = Object.keys(argv).length > 1;

  if (argv.help || argv.h || (!hasSubcommand && !hasOptions)) {
    showHelp();
    return;
  }

  const global: GlobalContext = {
    $,
    argv,
    chalk,
    fs,
    question,
    logger,
    PROJECT_ROOT,
  };

  const subCommandMap: Record<string, (ctx: GlobalContext) => Promise<void>> = {
    list: commandList,
    "list-filters": commandList,
    setup: commandSetup,
    clean: commandClean,
    check: commandCheck,
    status: commandCheck,
    run: commandRun,
    convert: commandRun,
  };

  const command = subCommandMap[subcommand ?? ""];

  if (!command) {
    showHelp();
    return;
  }

  await command(global);
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
    ${chalk.cyan("run")}      - Run the conversion process (default)
    ${chalk.cyan("list")}     - List available color filters (LUTs)
    ${chalk.cyan("check")}    - Check if system dependencies are installed
    ${chalk.cyan("setup")}    - Initialize and install project dependencies
    ${chalk.cyan("clean")}    - Remove temporary files from the tmp folder

  ${chalk.bold("Options for 'run':")}
    -i | --input    ${chalk.gray("Path of the video to be converted")}
    -f | --filter   ${chalk.gray("Name of the .CUBE filter to apply")}
    -o | --output   ${chalk.gray("Name of the output file")}
    -s | --subtitle ${chalk.gray("Use a manual .ass subtitle file")}
    --skip-face     ${chalk.gray("Skip facial analysis")}
    --skip-subs     ${chalk.gray("Skip transcription")}
    --skip-review   ${chalk.gray("Skip interactive review")}
    --skip-render   ${chalk.gray("Skip final video rendering")}
    -h | --help     ${chalk.gray("Show this help message")}

  ${chalk.bold("Examples:")}
    viralize run -i video.mp4 -f tweed
    viralize list
    viralize clean
  `);
}

// Start the process
main();
