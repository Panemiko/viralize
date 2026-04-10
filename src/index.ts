#!/usr/bin/env bun

import { $, argv, chalk, fs, question } from "zx";
import * as commands from "./commands/index.ts";
import type { GlobalContext } from "./types.ts";
import logger from "./common/logger.ts";
import { PROJECT_ROOT } from "./common/paths.ts";
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

  const subCommandMap: Record<string, (ctx: GlobalContext) => Promise<any>> = {
    [commands.list.command]: commands.list.default,
    [commands.setup.command]: commands.setup.default,
    [commands.clean.command]: commands.clean.default,
    [commands.check.command]: commands.check.default,
    [commands.run.command]: commands.run.default,
    [commands.faceAnalysis.command]: async (ctx) => {
      const videoFile = ctx.argv._[1] || ctx.argv.i || ctx.argv.input;
      if (!videoFile) throw new Error("Missing video file. Usage: viralize face-analysis <video_path>");
      return commands.faceAnalysis.default(videoFile);
    },
    [commands.transcribe.command]: async (ctx) => {
      const videoFile = ctx.argv._[1] || ctx.argv.i || ctx.argv.input;
      if (!videoFile) throw new Error("Missing video file. Usage: viralize transcribe <video_path>");
      return commands.transcribe.default(videoFile, ctx.ui.multibar);
    },
    [commands.render.command]: async (ctx) => {
      // For direct render, we would need many args. For now, let's just warn or handle common ones.
      const videoFile = ctx.argv._[1] || ctx.argv.i || ctx.argv.input;
      if (!videoFile) throw new Error("Missing video file. Usage: viralize render <video_path> [options]");
      
      return commands.render.default({
        videoFile: videoFile,
        filterName: ctx.argv.f || ctx.argv.filter || "none",
        outputName: ctx.argv.o || ctx.argv.output || "output",
        subtitleFile: ctx.argv.s || ctx.argv.subtitle || null,
        cut: { top: 0, left: 0, scaledWidth: 1080, scaledHeight: 1920 }, // Default if not provided
        multibar: ctx.ui.multibar as any,
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
  ${chalk.bold.magenta("viralize")} - Automatic Video to Reels Converter

  ${chalk.bold("Usage:")}
    viralize <subcommand> [options]

  ${chalk.bold("Subcommands:")}
    ${chalk.cyan("run")} [video]       - Run the full conversion process
    ${chalk.cyan("face-analysis")} [v] - Analyze faces in video
    ${chalk.cyan("transcribe")} [v]    - Generate subtitles for video
    ${chalk.cyan("render")}            - Render final video
    ${chalk.cyan("list")}              - List available color filters (LUTs)
    ${chalk.cyan("check")}             - Check system dependencies
    ${chalk.cyan("setup")}             - Initialize project dependencies
    ${chalk.cyan("clean")}             - Remove temporary files

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
