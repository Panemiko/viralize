#!/usr/bin/env zx

import cliProgress from "cli-progress";
import { analyzeVideoFace } from "./steps/face-analysis.mjs";
import { generateSubtitles } from "./steps/transcription.mjs";
import { renderFinalVideo } from "./steps/video-processor.mjs";
import logger from "./utils/logger.mjs";
import path from "node:path";
import { PROJECT_ROOT } from "./utils/paths.mjs";

/**
 * Main execution flow for video conversion.
 */
async function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    return;
  }

  logger.info("🚀 Starting viralize Conversion Process");
  console.time("Total execution time");

  // MultiBar initialization
  const multibar = new cliProgress.MultiBar(
    {
      clearOnComplete: false,
      hideCursor: true,
      format: " {bar} | {percentage}% | {task}",
    },
    cliProgress.Presets.shades_classic,
  );

  const globalBar = multibar.create(100, 0, { task: "Overall Progress" });

  try {
    const inputs = await resolveInputs(args);
    globalBar.update(5, { task: "Overall Progress: Phase 1" });

    const cut = await handleFaceAnalysis(inputs.videoFile, args.skipFace);
    globalBar.update(30, { task: "Overall Progress: Phase 2" });

    const subtitleFile = await handleTranscription(inputs.videoFile, args.subtitle, args.skipSubs);
    globalBar.update(60, { task: "Overall Progress: Review" });

    await handleSubtitleReview(inputs.videoFile, subtitleFile, args);
    globalBar.update(70, { task: "Overall Progress: Phase 3" });

    await handleRendering(inputs, subtitleFile, cut, args.skipRender, multibar);
    globalBar.update(100, { task: "Overall Progress: Complete" });

    multibar.stop();
    logger.info("✅ Process completed successfully!");
  } catch (err) {
    multibar.stop();
    logger.error({ err }, "An error occurred during the conversion process");
    process.exit(1);
  } finally {
    console.timeEnd("Total execution time");
  }
}

/**
 * Handles the face analysis phase.
 */
async function handleFaceAnalysis(videoFile, skipFace) {
  logger.info("--- PHASE 1: Face Analysis ---");
  if (skipFace) {
    logger.warn("Skipping face analysis. Using default centering (top: 0).");
    return { top: 0 };
  }
  return await analyzeVideoFace(videoFile);
}

/**
 * Handles the transcription phase.
 */
async function handleTranscription(videoFile, manualSubtitle, skipSubs) {
  logger.info("--- PHASE 2: Transcription ---");

  if (manualSubtitle) {
    logger.info(`Using manual subtitle file: ${manualSubtitle}`);
    return manualSubtitle;
  }

  if (skipSubs) {
    logger.warn("Skipping transcription.");
    return null;
  }

  return await generateSubtitles(videoFile);
}

/**
 * Handles the subtitle review phase.
 */
async function handleSubtitleReview(videoFile, subtitleFile, args) {
  const shouldReview = subtitleFile && !args.skipRender && !args.skipReview;
  if (!shouldReview) return;

  const revision = await question(
    chalk.yellow("\n❓ Do you want to review/revise the subtitles before rendering? (y/n): "),
  );

  const confirmed = revision.toLowerCase() === "y" || revision.toLowerCase() === "yes";
  if (!confirmed) return;

  logger.info("🎬 Opening MPV for review. Close MPV when finished.");
  logger.info(`To edit the captions, open: ${subtitleFile}`);

  try {
    await $`mpv ${videoFile} --sub-file=${subtitleFile} --autofit=70% --title="Subtitle Review - Close to continue"`;
    logger.info(`📝 Note: If you made changes to ${subtitleFile}, they will be applied now.`);
    await question(chalk.yellow("   Press Enter to continue to Phase 3 (Rendering)... "));
  } catch (err) {
    logger.error("❌ Could not open MPV. Make sure it is installed.");
  }
}

/**
 * Handles the video rendering phase.
 */
async function handleRendering(inputs, subtitleFile, cut, skipRender, multibar) {
  logger.info("--- PHASE 3: Video Processing ---");

  if (skipRender) {
    logger.warn("Skipping video rendering.");
    return;
  }

  await renderFinalVideo({
    ...inputs,
    subtitleFile,
    cut,
    multibar,
  });
}

/**
 * Parses CLI arguments.
 */
function parseArgs() {
  return {
    input: argv["i"] || argv["input"],
    filter: argv["f"] || argv["filter"],
    output: argv["o"] || argv["output"],
    subtitle: argv["s"] || argv["subtitle"],
    skipFace: argv["skip-face"],
    skipSubs: argv["skip-subs"],
    skipRender: argv["skip-render"],
    skipReview: argv["skip-review"],
    help:
      argv["h"] ||
      argv["help"] ||
      (Object.keys(argv).length === 1 && !argv["i"] && !argv["input"]),
  };
}

/**
 * Resolves required inputs, prompting the user if necessary.
 */
async function resolveInputs(args) {
  const videoFile = args.input;
  if (!videoFile) {
    throw new Error("No input file specified. Use -i or --input.");
  }

  let { filter: filterName, output: outputName } = args;

  if (!filterName) {
    const filtersPath = path.resolve(PROJECT_ROOT, "assets/filters/");
    const filtersListing = await $`ls ${filtersPath}`;
    logger.info("Available filters:");
    process.stdout.write(filtersListing.stdout);
    filterName = await question(
      "\nChoose a filter from the list above (without .CUBE extension): \n",
    );
  }

  if (!outputName) {
    outputName = await question("\nEnter the name for the output file: \n");
  }

  return { videoFile: path.resolve(videoFile), filterName, outputName };
}

/**
 * Displays help message.
 */
function showHelp() {
  console.log(`
  ${chalk.bold("viralize")}

  ${chalk.bold("Usage:")}
  viralize -i video.mp4 [options]

  ${chalk.bold("Options:")}
    -h | --help         - Show help message
    -i | --input        - Path of the video to be converted
    -f | --filter       - Name of the .CUBE filter to apply
    -o | --output       - Name of the output file
    -s | --subtitle     - Use a manual .ass subtitle file instead of transcribing
    --skip-face         - Skip facial analysis and use default crop
    --skip-subs         - Skip transcription and subtitle generation
    --skip-review       - Skip interactive subtitle review step
    --skip-render       - Skip final video rendering
  `);
}

// Start the process
main();
