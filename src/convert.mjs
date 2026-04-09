#!/usr/bin/env zx

import { analyzeVideoFace } from "./utils/face-analysis.mjs";
import { generateSubtitles } from "./utils/transcription.mjs";
import { renderFinalVideo } from "./utils/video-processor.mjs";

/**
 * Main execution flow for video conversion.
 */
async function main() {
  const args = parseArgs();
  
  if (args.help) {
    showHelp();
    return;
  }

  console.log(chalk.bold.blue("\n🚀 Starting Video to Reels Conversion Process"));
  console.time("Total execution time");

  const { videoFile, filterName, outputName } = await resolveInputs(args);

  console.log(chalk.magenta("\n--- PHASE 1: Face Analysis ---"));
  let cut = { top: 0 };
  if (args.skipFace) {
    console.log(chalk.yellow("  -> Skipping face analysis. Using default centering (top: 0)."));
  } else {
    cut = await analyzeVideoFace(videoFile);
  }

  console.log(chalk.magenta("\n--- PHASE 2: Transcription ---"));
  let subtitleFile = null;
  if (args.skipSubs) {
    console.log(chalk.yellow("  -> Skipping transcription."));
  } else {
    subtitleFile = await generateSubtitles(videoFile);
  }

  console.log(chalk.magenta("\n--- PHASE 3: Video Processing ---"));
  if (args.skipRender) {
    console.log(chalk.yellow("  -> Skipping video rendering."));
  } else {
    await renderFinalVideo({
      videoFile,
      filterName,
      subtitleFile,
      cut,
      outputName
    });
  }

  console.log(chalk.bold.green("\n✅ Process completed successfully!"));
  console.timeEnd("Total execution time");
}

/**
 * Parses CLI arguments.
 */
function parseArgs() {
  return {
    input: argv["i"] || argv["input"],
    filter: argv["f"] || argv["filter"],
    output: argv["o"] || argv["output"],
    skipFace: argv["skip-face"],
    skipSubs: argv["skip-subs"],
    skipRender: argv["skip-render"],
    help: argv["h"] || argv["help"] || (Object.keys(argv).length === 1 && !argv["i"] && !argv["input"])
  };
}

/**
 * Resolves required inputs, prompting the user if necessary.
 */
async function resolveInputs(args) {
  const videoFile = args.input;
  if (!videoFile) {
    console.log(chalk.red("Error: No input file specified. Use -i or --input."));
    process.exit(1);
  }

  let filterName = args.filter;
  if (!filterName) {
    const filters = await $`ls ./assets/filters/`;
    console.log(chalk.yellow("\nAvailable filters:"));
    process.stdout.write(filters.stdout);

    filterName = await question(
      "\nChoose a filter from the list above (without .CUBE extension): \n"
    );
  }

  let outputName = args.output;
  if (!outputName) {
    outputName = await question("\nEnter the name for the output file: \n");
  }

  return { videoFile, filterName, outputName };
}

/**
 * Displays help message.
 */
function showHelp() {
  console.log(`
  ${chalk.bold("Video to Reels")}

  ${chalk.bold("Usage:")}
  zx convert.mjs -i video.mp4 [options]

  ${chalk.bold("Options:")}
    -h | --help         - Show help message
    -i | --input        - Path of the video to be converted
    -f | --filter       - Name of the .CUBE filter to apply
    -o | --output       - Name of the output file
    --skip-face         - Skip facial analysis and use default crop
    --skip-subs         - Skip transcription and subtitle generation
    --skip-render       - Skip final video rendering
  `);
}


// Start the process
main().catch((err) => {
  console.error(chalk.red("\nan error occurred:"), err);
  process.exit(1);
});
