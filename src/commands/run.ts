import cliProgress from "cli-progress";
import path from "node:path";
import { analyzeVideoFace } from "../steps/face-analysis.ts";
import { generateSubtitles } from "../steps/transcription.ts";
import { renderFinalVideo } from "../steps/video-processor.ts";
import type { GlobalContext, RunArgs, ResolvedInputs } from "../types.ts";

/**
 * Main execution flow for video conversion.
 */
export default async function run(global: GlobalContext) {
  const { logger, argv, chalk, question, $, PROJECT_ROOT } = global;
  const args = parseArgs(argv);

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
    const inputs = await resolveInputs(args, global);
    globalBar.update(5, { task: "Overall Progress: Phase 1" });

    const cut = await handleFaceAnalysis(
      inputs.videoFile,
      args.skipFace,
      global,
    );
    globalBar.update(30, { task: "Overall Progress: Phase 2" });

    const subtitleFile = await handleTranscription(
      inputs.videoFile,
      args.subtitle,
      args.skipSubs,
      global,
    );
    globalBar.update(60, { task: "Overall Progress: Review" });

    await handleSubtitleReview(inputs.videoFile, subtitleFile, args, global);
    globalBar.update(70, { task: "Overall Progress: Phase 3" });

    await handleRendering(
      inputs,
      subtitleFile,
      cut,
      args.skipRender,
      multibar,
      global,
    );
    globalBar.update(100, { task: "Overall Progress: Complete" });

    multibar.stop();
    logger.info("✅ Process completed successfully!");
  } catch (err) {
    if (multibar) multibar.stop();
    logger.error({ err }, "An error occurred during the conversion process");
    process.exit(1);
  } finally {
    console.timeEnd("Total execution time");
  }
}

/**
 * Handles the face analysis phase.
 */
async function handleFaceAnalysis(
  videoFile: string,
  skipFace: boolean | undefined,
  { logger }: GlobalContext,
) {
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
async function handleTranscription(
  videoFile: string,
  manualSubtitle: string | undefined,
  skipSubs: boolean | undefined,
  { logger }: GlobalContext,
) {
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
async function handleSubtitleReview(
  videoFile: string,
  subtitleFile: string | null,
  args: RunArgs,
  { logger, chalk, question, $ }: GlobalContext,
) {
  const shouldReview = subtitleFile && !args.skipRender && !args.skipReview;
  if (!shouldReview) return;

  const revision = await question(
    chalk.yellow(
      "\n❓ Do you want to review/revise the subtitles before rendering? (y/n): ",
    ),
  );

  const confirmed =
    revision.toLowerCase() === "y" || revision.toLowerCase() === "yes";
  if (!confirmed) return;

  logger.info("🎬 Opening MPV for review. Close MPV when finished.");
  logger.info(`To edit the captions, open: ${subtitleFile}`);

  try {
    await $`mpv ${videoFile} --sub-file=${subtitleFile} --autofit=70% --title="Subtitle Review - Close to continue"`;
    logger.info(
      `📝 Note: If you made changes to ${subtitleFile}, they will be applied now.`,
    );
    await question(
      chalk.yellow("   Press Enter to continue to Phase 3 (Rendering)... "),
    );
  } catch {
    logger.error("❌ Could not open MPV. Make sure it is installed.");
  }
}

/**
 * Handles the video rendering phase.
 */
async function handleRendering(
  inputs: ResolvedInputs,
  subtitleFile: string | null,
  cut: any,
  skipRender: boolean | undefined,
  multibar: any,
  { logger }: GlobalContext,
) {
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
function parseArgs(argv: any): RunArgs {
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
async function resolveInputs(
  args: RunArgs,
  { logger, PROJECT_ROOT, question, $ }: GlobalContext,
): Promise<ResolvedInputs> {
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
