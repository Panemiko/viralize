#!/usr/bin/env bun

import { $, argv, chalk, fs, question } from "zx";
import * as commands from "./commands/index.ts";
import type { GlobalContext } from "./types.ts";
import logger from "./common/logger.ts";
import { 
  PROJECT_ROOT, 
  ASSETS_DIR, 
  GLOBAL_CONFIG_DIR, 
  GLOBAL_CONFIG_FILE,
  getRunPaths,
  cleanupOldRuns,
  ensureRunDirs,
  getBaseTempDir
} from "./common/paths.ts";
import { getConfig } from "./common/config.ts";
import { ui } from "./common/ui.ts";

/**
 * Main execution flow for video conversion.
 */
async function main() {
  const subcommand = argv._[0] as string | undefined;

  if (argv.help || argv.h || !subcommand) {
    showHelp();
    return;
  }

  // Generate a unique ID for this run (Unix timestamp)
  const runId = Math.floor(Date.now() / 1000).toString();

  // Cleanup old runs (keep only 5)
  await cleanupOldRuns();

  const explicitConfigPath = argv.config as string | undefined;
  const config = getConfig(explicitConfigPath);

  // Initialize run-specific paths
  const runPaths = getRunPaths(runId);

  const ctx: GlobalContext = {
    $,
    argv,
    chalk,
    fs,
    question,
    logger,
    PROJECT_ROOT,
    ASSETS_DIR,
    INTERNAL_TEMP_DIR: getBaseTempDir(),
    GLOBAL_CONFIG_DIR,
    GLOBAL_CONFIG_FILE,
    config,
    ui,
    runId,
    paths: runPaths,
  };

  logger.debug(`Starting run ${runId} in ${runPaths.runDir}`);


  const subCommandMap: Record<string, (ctx: GlobalContext) => Promise<any>> = {
    [commands.list.command]: commands.list.default,
    [commands.setup.command]: commands.setup.default,
    [commands.generateConfig.command]: commands.generateConfig.default,
    [commands.clean.command]: commands.clean.default,
    [commands.check.command]: commands.check.default,
    [commands.run.command]: commands.run.default,
    [commands.jumpcut.command]: async (ctx) => {
      const videoFile = ctx.argv._[1] || ctx.argv.i || ctx.argv.input;
      if (!videoFile) throw new Error("Missing video file. Usage: viralize jumpcut <video_path>");
      return commands.jumpcut.default(videoFile, ctx);
    },
    [commands.faceAnalysis.command]: async (ctx) => {
      const videoFile = ctx.argv._[1] || ctx.argv.i || ctx.argv.input;
      if (!videoFile) throw new Error("Missing video file. Usage: viralize face-analysis <video_path>");
      return commands.faceAnalysis.default(videoFile, ctx);
    },
    [commands.transcribe.command]: async (ctx) => {
      const videoFile = ctx.argv._[1] || ctx.argv.i || ctx.argv.input;
      if (!videoFile) throw new Error("Missing video file. Usage: viralize transcribe <video_path>");
      return commands.transcribe.default(videoFile, ctx);
    },
    [commands.render.command]: async (ctx) => {
      const videoFile = ctx.argv._[1] || ctx.argv.i || ctx.argv.input;
      if (!videoFile) throw new Error("Missing video file. Usage: viralize render <video_path> [options]");
      
      const outputName = ctx.argv.o || ctx.argv.output || "output_" + Date.now();
      
      return commands.render.default({
        videoFile: videoFile,
        filterName: ctx.argv.f || ctx.argv.filter || "none",
        outputName: outputName,
        subtitleFile: ctx.argv.s || ctx.argv.subtitle || null,
        cut: { top: 0, left: 0, scaledWidth: 1080, scaledHeight: 1920 }, // Default if not provided
      });
    },
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
  ${chalk.bold.magenta("viralize")} - Automatic Video to Shorts Converter

  ${chalk.bold("Usage:")}
    viralize <subcommand> [options]

  ${chalk.bold("Subcommands:")}
    ${chalk.cyan("run")} [video]       - Run the full conversion process
    ${chalk.cyan("jumpcut")} [v]       - Remove silences from video
    ${chalk.cyan("face-analysis")} [v] - Analyze faces in video
    ${chalk.cyan("transcribe")} [v]    - Generate subtitles for video
    ${chalk.cyan("render")}            - Render final video
    ${chalk.cyan("list")}              - List available color filters (LUTs)
    ${chalk.cyan("check")}             - Check system dependencies
    ${chalk.cyan("setup")}             - Initialize project dependencies
    ${chalk.cyan("generate-config")}   - Create a local viralize.config.json in CWD
    ${chalk.cyan("clean")}             - Remove temporary files

  ${chalk.bold("Global Options:")}
    --config <path> ${chalk.gray("Path to a custom configuration file")}

  ${chalk.bold("Options for 'run':")}
    -i | --input    ${chalk.gray("Path of the video (optional if provided as positional)")}
    -a | --audio    ${chalk.gray("Path of the external audio file to synchronize")}
    -f | --filter   ${chalk.gray("Name of the .CUBE filter to apply")}
    -o | --output   ${chalk.gray("Name of the output file")}
    -s | --subtitle ${chalk.gray("Use a manual .ass subtitle file")}
    --skip-sync     ${chalk.gray("Skip audio synchronization")}
    --skip-noise    ${chalk.gray("Skip noise removal")}
    --skip-jumpcut  ${chalk.gray("Skip silence removal")}
    --skip-face     ${chalk.gray("Skip facial analysis")}
    --skip-subs     ${chalk.gray("Skip transcription")}
    --skip-zoom     ${chalk.gray("Skip slow zoom effect")}
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
