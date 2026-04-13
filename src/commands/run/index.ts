export const command = "run";

import path from "node:path";
import jumpcut from "../jumpcut/index.ts";
import analyzeVideoFace from "../face-analysis/index.ts";
import generateSubtitles from "../transcribe/index.ts";
import renderFinalVideo from "../render/index.ts";
import type { GlobalContext, RunArgs, ResolvedInputs, CutResult } from "../../types.ts";
import { PROJECT_ROOT, ensureTempDir, ASSETS_DIR, TEMP_SYNC, TEMP_DENOISE } from "../../common/paths.ts";

/**
 * Main execution flow for video conversion.
 */
export default async function run(ctx: GlobalContext) {
  const { logger, argv, ui } = ctx;
  let args = parseArgs(argv);

  ui.log("🚀 Starting viralize Conversion Process");
  ensureTempDir();

  try {
    const inputs = await resolveInputs(args, ctx);
    args = await configureRunArgs(args, ui);

    console.time("Total execution time");

    ui.log("Phase 1: Synchronization");
    inputs.videoFile = await handleAudioSync(inputs, args.skipSync, ctx);

    ui.log("Phase 2: Audio Enhancement");
    inputs.videoFile = await handleNoiseRemoval(inputs.videoFile, args.skipNoise, ctx);

    ui.log("Phase 3: Visual Analysis (Face)");

    const cut = await handleFaceAnalysis(
      inputs.videoFile,
      args.skipFace,
      ctx,
    );

    ui.log("Phase 4: Content Editing (Jumpcut)");

    const jumpcutVideo = await handleJumpcut(
      inputs.videoFile,
      args.skipJumpcut,
      args.skipZoom,
      cut,
      ctx,
    );
    inputs.videoFile = jumpcutVideo;

    ui.log("Phase 5: Subtitling (Transcription)");

    const subtitleFile = await handleTranscription(
      inputs.videoFile,
      args.subtitle,
      args.skipSubs,
      ctx,
    );
    ui.log("Wait: Subtitle Review");

    await handleSubtitleReview(inputs.videoFile, subtitleFile, args, ctx);
    ui.log("Phase 6: Final Export (Rendering)");

    await handleRendering(
      inputs,
      subtitleFile,
      cut,
      args.skipRender,
      args.skipZoom,
      args.skipJumpcut,
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
    args.skipRender !== undefined ||
    args.skipZoom !== undefined;

  if (anySkipFlag) {
    return args;
  }

  const options = [
    { label: "Synchronization", value: "sync", checked: true },
    { label: "Audio Enhancement", value: "noise", checked: true },
    { label: "Silence Removal (Jumpcut)", value: "skipJumpcut", checked: true },
    { label: "Face Analysis", value: "skipFace", checked: true },
    { label: "Slow Zoom", value: "skipZoom", checked: true },
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
 * Handles the audio synchronization and combination phase.
 */
async function handleAudioSync(
  inputs: ResolvedInputs,
  skipSync: boolean | undefined,
  { $, fs, logger, PROJECT_ROOT }: GlobalContext,
): Promise<string> {
  const { videoFile, audioFile } = inputs;
  if (!audioFile || skipSync) {
    if (skipSync) logger.warn("Skipping synchronization.");
    else logger.info("No external audio provided. Skipping synchronization.");
    return videoFile;
  }

  logger.info(`🎵 Synchronizing audio: ${audioFile} with video: ${videoFile}`);

  const tempOrigAudio = path.resolve(TEMP_SYNC, "orig_audio.raw");
  const tempExtAudio = path.resolve(TEMP_SYNC, "ext_audio.raw");
  const syncScript = path.resolve(PROJECT_ROOT, "src/commands/run/sync_audio.py");
  const venvPython = path.resolve(PROJECT_ROOT, ".venv/bin/python");
  const pythonPath = fs.existsSync(venvPython) ? venvPython : "python3";

  // 1. Extract audio from video and convert external audio to raw mono 16kHz
  await $`ffmpeg -hide_banner -loglevel error -y -i ${videoFile} -vn -f s16le -ac 1 -ar 16000 ${tempOrigAudio}`;
  await $`ffmpeg -hide_banner -loglevel error -y -i ${audioFile} -f s16le -ac 1 -ar 16000 ${tempExtAudio}`;

  // 2. Find offset using Python script
  const offsetResult = await $`${pythonPath} ${syncScript} ${tempOrigAudio} ${tempExtAudio}`;
  const offset = parseFloat(offsetResult.stdout.trim());
  logger.info(`Detected audio offset: ${offset.toFixed(4)}s`);

  // 3. Combine/Replace audio
  const syncedVideo = path.resolve(TEMP_SYNC, `synced_${path.basename(videoFile)}`);

  // If offset > 0, the external audio starts AFTER the video audio (delayed). We need to delay external audio further to match? No.
  // If max_idx is positive, it means ref[k] = target[0]. So target started later.
  // We need to delay target by k.
  
  if (offset < 0) {
    // External audio starts BEFORE video. Trim the beginning of external audio.
    const trimStart = Math.abs(offset);
    await $`ffmpeg -hide_banner -loglevel error -y -i ${videoFile} -i ${audioFile} -filter_complex "[1:a]atrim=start=${trimStart},asetpts=PTS-STARTPTS[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest ${syncedVideo}`;
  } else {
    // External audio starts AFTER video. Delay the external audio.
    const delayMs = Math.abs(offset) * 1000;
    await $`ffmpeg -hide_banner -loglevel error -y -i ${videoFile} -i ${audioFile} -filter_complex "[1:a]adelay=${delayMs}|${delayMs},asetpts=PTS-STARTPTS[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest ${syncedVideo}`;
  }

  return syncedVideo;
}

/**
 * Handles the noise removal phase.
 */
async function handleNoiseRemoval(
  videoFile: string,
  skipNoise: boolean | undefined,
  { $, logger, ASSETS_DIR }: GlobalContext,
): Promise<string> {
  if (skipNoise) {
    logger.warn("Skipping noise removal.");
    return videoFile;
  }
  logger.info(`🧹 Removing noise from video: ${videoFile}`);

  const noiseFreeVideo = path.resolve(TEMP_DENOISE, `denoised_${path.basename(videoFile)}`);
  const rnnModel = path.resolve(ASSETS_DIR, "bd.rnnn");

  await $`ffmpeg -hide_banner -loglevel error -y -i ${videoFile} -af "arnndn=m=${rnnModel}:mix=0.9,loudnorm=I=-16:LRA=11:TP=-1.5" -c:v copy -c:a aac -b:a 192k ${noiseFreeVideo}`;

  return noiseFreeVideo;
}

/**
 * Handles the silence removal (jumpcut) phase.
 */
async function handleJumpcut(
  videoFile: string,
  skipJumpcut: boolean | undefined,
  skipZoom: boolean | undefined,
  cut: CutResult,
  ctx: GlobalContext,
) {
  if (skipJumpcut) {
    ctx.logger.warn("Skipping silence removal.");
    return videoFile;
  }
  return await jumpcut(videoFile, ctx, { skipZoom, cut });
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
      chalk.yellow("\n▶ Press any key to continue to Phase 6 (Rendering)... "),
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
  skipZoom: boolean | undefined,
  skipJumpcut: boolean | undefined,
  { logger, ui }: GlobalContext,
) {
  if (skipRender) {
    logger.warn("Skipping video rendering.");
    return;
  }

  // If jumpcut was not skipped, it already applied zoom and crop.
  // If jumpcut was skipped, we should apply zoom here if not skipZoom.
  const applyZoom = !skipZoom && !!skipJumpcut;
  
  // If jumpcut already cropped it, we don't want to crop again with original coordinates.
  const finalCut = !skipJumpcut ? {
    top: 0,
    left: 0,
    scaledWidth: 1080,
    scaledHeight: 1920
  } : cut;

  await renderFinalVideo({
    ...inputs,
    subtitleFile,
    cut: finalCut,
  }, applyZoom);
}

/**
 * Parses CLI arguments.
 */
function parseArgs(argv: GlobalContext["argv"]): RunArgs {
  return {
    input: argv.i || argv.input || argv._[1],
    audio: argv.a || argv.audio,
    filter: argv.f || argv.filter,
    output: argv.o || argv.output,
    subtitle: argv.s || argv.subtitle,
    skipSync: argv["skip-sync"],
    skipNoise: argv["skip-noise"],
    skipFace: argv["skip-face"],
    skipSubs: argv["skip-subs"],
    skipRender: argv["skip-render"],
    skipReview: argv["skip-review"],
    skipJumpcut: argv["skip-jumpcut"],
    skipZoom: argv["skip-zoom"],
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

  const audioFile = args.audio ? path.resolve(args.audio) : undefined;

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

  return { videoFile: path.resolve(videoFile), audioFile, filterName, outputName };
}
