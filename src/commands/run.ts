import path from "node:path";
import { analyzeVideoFace } from "../steps/face-analysis.ts";
import { generateSubtitles } from "../steps/transcription.ts";
import { renderFinalVideo } from "../steps/video-processor.ts";
import type { GlobalContext, RunArgs, ResolvedInputs, CutResult } from "../types.ts";
import type { TerminalUI } from "../utils/ui.ts";

/**
 * Main execution flow for video conversion.
 */
export default async function run(ctx: GlobalContext) {
  const { logger, argv, ui } = ctx;
  const args = parseArgs(argv);

  ui.log("🚀 Starting viralize Conversion Process");
  console.time("Total execution time");

  const progress = ui.getBar("global", 100, "Overall Progress");

  try {
    const inputs = await resolveInputs(args, ctx);
    progress.update(5, { task: "Phase 1: Face Analysis" });

    const cut = await handleFaceAnalysis(
      inputs.videoFile,
      args.skipFace,
      ctx,
    );
    progress.update(30, { task: "Phase 2: Transcription" });

    const subtitleFile = await handleTranscription(
      inputs.videoFile,
      args.subtitle,
      args.skipSubs,
      ctx,
    );
    progress.update(60, { task: "Wait: Subtitle Review" });

    await handleSubtitleReview(inputs.videoFile, subtitleFile, args, ctx);
    progress.update(70, { task: "Phase 3: Rendering" });

    await handleRendering(
      inputs,
      subtitleFile,
      cut,
      args.skipRender,
      ui,
      ctx,
    );
    progress.update(100, { task: "Complete" });

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

  return await generateSubtitles(videoFile, ui.multibar as any);
}

/**
 * Handles the subtitle review phase.
 */
async function handleSubtitleReview(
  videoFile: string,
  subtitleFile: string | null,
  args: RunArgs,
  { logger, chalk, question, $, ui }: GlobalContext,
) {
  const shouldReview = subtitleFile && !args.skipRender && !args.skipReview;
  if (!shouldReview) return;

  process.stdout.write(
    chalk.yellow(
      "\n❓ Do you want to review/revise the subtitles before rendering? (y/n): ",
    ),
  );
  
  const key = await ui.readKey();
  process.stdout.write(key + "\n");
  
  if (!["y", "Y"].includes(key)) return;

  logger.info(`🎬 Opening MPV for review. Close MPV when finished.`);
  logger.info(`To edit the captions, open: ${subtitleFile}`);

  try {
    await $`mpv ${videoFile} --sub-file=${subtitleFile} --autofit=70% --title="Subtitle Review - Close to continue"`;
    
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
  ui: TerminalUI,
  { logger }: GlobalContext,
) {
  if (skipRender) {
    logger.warn("Skipping video rendering.");
    return;
  }

  await renderFinalVideo({
    ...inputs,
    subtitleFile,
    cut,
    multibar: ui.multibar as any,
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
