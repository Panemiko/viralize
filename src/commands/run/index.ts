export const command = "run";

import path from "node:path";
import jumpcut from "../jumpcut/index.ts";
import analyzeVideoFace from "../face-analysis/index.ts";
import generateSubtitles from "../transcribe/index.ts";
import renderFinalVideo from "../render/index.ts";
import type { GlobalContext, RunArgs, ResolvedInputs, CutResult } from "../../types.ts";

/**
 * Main execution flow for video conversion.
 */
export default async function run(ctx: GlobalContext) {
  const { logger, argv, ui } = ctx;
  let args = parseArgs(argv);

  ui.log("🚀 Starting viralize Conversion Process");

  try {
    const inputs = await resolveInputs(args, ctx);
    args = await configureRunArgs(args, ui);

    console.time("Total execution time");
    ui.log("Phase 0: Silence Removal");

    const jumpcutVideo = await handleJumpcut(
      inputs.videoFile,
      args.skipJumpcut,
      ctx,
    );
    inputs.videoFile = jumpcutVideo;

    ui.log("Phase 1: Face Analysis");

    const cut = await handleFaceAnalysis(
      inputs.videoFile,
      args.skipFace,
      ctx,
    );
    ui.log("Phase 2: Transcription");

    const subtitleFile = await handleTranscription(
      inputs.videoFile,
      args.subtitle,
      args.skipSubs,
      ctx,
    );
    ui.log("Wait: Subtitle Review");

    await handleSubtitleReview(inputs.videoFile, subtitleFile, args, ctx);
    ui.log("Phase 3: Rendering");

    await handleRendering(
      inputs,
      subtitleFile,
      cut,
      args.skipRender,
      ctx,
    );
    ui.log("Complete");

    ui.stop();
    logger.info("✅ Process completed successfully!");
  } catch (err) {
    ui.stop();
    logger.error({ err }, "An error occurred during the conversion process");
    process.exit(1);
  } finally {
    console.timeEnd("Total execution time");
  }
}

/**
 * Configure modules to run based on user input.
 */
async function configureRunArgs(
  args: RunArgs,
  ui: GlobalContext["ui"],
): Promise<RunArgs> {
  // Check if any skip flags were already provided
  const anySkipFlag =
    args.skipJumpcut !== undefined ||
    args.skipFace !== undefined ||
    args.skipSubs !== undefined ||
    args.skipReview !== undefined ||
    args.skipRender !== undefined;

  if (anySkipFlag) {
    return args;
  }

  const options = [
    { label: "Silence Removal (Jumpcut)", value: "skipJumpcut", checked: true },
    { label: "Face Analysis", value: "skipFace", checked: true },
    { label: "Transcription", value: "skipSubs", checked: true },
    { label: "Review Subtitles", value: "skipReview", checked: false },
    { label: "Video Rendering", value: "skipRender", checked: true },
  ];

  const selectedValues = await ui.multiSelect(
    "Select modules to activate:",
    options.map((o) => ({
      label: o.label,
      value: o.value,
      checked: o.checked,
    })),
  );

  const newArgs = { ...args };

  // Set skip flags for those NOT selected
  options.forEach((opt) => {
    if (!selectedValues.includes(opt.value)) {
      (newArgs as any)[opt.value] = true;
    } else {
      (newArgs as any)[opt.value] = false;
    }
  });

  return newArgs;
}

/**
 * Handles the silence removal (jumpcut) phase.
 */
async function handleJumpcut(
  videoFile: string,
  skipJumpcut: boolean | undefined,
  ctx: GlobalContext,
) {
  if (skipJumpcut) {
    ctx.logger.warn("Skipping silence removal.");
    return videoFile;
  }
  return await jumpcut(videoFile, ctx);
}

/**
 * Handles the face analysis phase.
 */
async function handleFaceAnalysis(
  videoFile: string,
  skipFace: boolean | undefined,
  { logger }: GlobalContext,
) {
  if (skipFace) {
    logger.warn("Skipping face analysis. Using default centering.");
    return { top: 0, left: 0, scaledWidth: 1080, scaledHeight: 1920 };
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
  { logger, ui }: GlobalContext,
) {
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
  { logger, chalk, $, ui }: GlobalContext,
) {
  const shouldReview = subtitleFile && !args.skipRender && !args.skipReview;
  if (!shouldReview) return;

  logger.info(`🎬 Opening MPV for review. Close MPV when finished.`);
  logger.info(`To edit the captions, open: ${subtitleFile}`);

  try {
    await $`mpv ${videoFile} --sub-file=${subtitleFile} --autofit=50% --title="Subtitle Review - Close to continue"`;

    process.stdout.write(
      chalk.yellow("\n▶ Press any key to continue to Phase 3 (Rendering)... "),
    );
    await ui.readKey();
    process.stdout.write("\n");
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
  cut: CutResult,
  skipRender: boolean | undefined,
  { logger, ui }: GlobalContext,
) {
  if (skipRender) {
    logger.warn("Skipping video rendering.");
    return;
  }

  await renderFinalVideo({
    ...inputs,
    subtitleFile,
    cut,
  });
}

/**
 * Parses CLI arguments.
 */
function parseArgs(argv: GlobalContext["argv"]): RunArgs {
  return {
    input: argv.i || argv.input || argv._[1],
    filter: argv.f || argv.filter,
    output: argv.o || argv.output,
    subtitle: argv.s || argv.subtitle,
    skipFace: argv["skip-face"],
    skipSubs: argv["skip-subs"],
    skipRender: argv["skip-render"],
    skipReview: argv["skip-review"],
    skipJumpcut: argv["skip-jumpcut"],
    help: argv.h || argv.help,
  };
}

/**
 * Resolves required inputs, prompting the user if necessary.
 */
async function resolveInputs(
  args: RunArgs,
  { logger, PROJECT_ROOT, question, fs }: GlobalContext,
): Promise<ResolvedInputs> {
  const videoFile = args.input;
  if (!videoFile) {
    throw new Error("No input file specified. Usage: viralize run <video_path>");
  }

  let { filter: filterName, output: outputName } = args;

  if (!filterName) {
    const filtersPath = path.resolve(PROJECT_ROOT, "assets/filters/");
    const filters = fs.readdirSync(filtersPath).filter((f: string) => f.endsWith(".CUBE"));
    logger.info("Available filters:");
    filters.forEach((f: string) => console.log(` - ${f.replace(".CUBE", "")}`));
    
    filterName = await question(
      "\nChoose a filter from the list above (without .CUBE extension): \n",
    );
  }

  if (!outputName) {
    outputName = await question("\nEnter the name for the output file: \n");
  }

  return { videoFile: path.resolve(videoFile), filterName, outputName };
}
