import { $ } from "zx";
import logger from "../utils/logger.ts";
import path from "node:path";
import { ASSETS_DIR } from "../utils/paths.ts";
import type { RenderParams, CutResult } from "../types.ts";

/**
 * Renders the final video with crops, filters, and subtitles.
 * @param {object} params
 */
export async function renderFinalVideo({
  videoFile,
  filterName,
  subtitleFile,
  cut,
  outputName,
  videoOutput = "videos/",
  multibar,
}: RenderParams) {
  const videoFilters = buildVideoFilters(cut, filterName, subtitleFile);
  const complexFilter = `
    [0:v]${videoFilters}[v_final];
    [0:a]arnndn=m=${path.resolve(ASSETS_DIR, "bd.rnnn")}:mix=0.9,loudnorm=I=-16:LRA=11:TP=-1.5 [a_final]
  `;

  const outputPath = path.resolve(process.cwd(), videoOutput, `${outputName}.mp4`);
  await $`mkdir -p ${path.dirname(outputPath)}`;

  try {
    const duration = await getVideoDuration(videoFile);
    await performRendering(videoFile, complexFilter, filterName, outputPath, duration, multibar as any);
  } catch (err) {
    logger.error({ err }, "Rendering failed");
    throw err;
  }
}

/**
 * Gets video duration in seconds using ffprobe.
 */
async function getVideoDuration(videoFile: string) {
  const result =
    await $`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${videoFile}`;
  return parseFloat(result.stdout.trim());
}

/**
 * Builds the FFmpeg video filter string.
 */
function buildVideoFilters(
  cut: CutResult,
  filterName: string,
  subtitleFile: string | null,
) {
  const filterPath = path.resolve(ASSETS_DIR, `filters/${filterName}.CUBE`);
  let filters = `scale=w=${cut.scaledWidth}:h=${cut.scaledHeight},crop=1080:1920:${cut.left}:${cut.top},lut3d=${filterPath}`;

  if (subtitleFile) {
    filters += `,subtitles='${subtitleFile}'`;
  }

  return filters;
}

/**
 * Performs rendering with progress bar and fallback to software encoding.
 */
async function performRendering(
  videoFile: string,
  complexFilter: string,
  filterName: string,
  outputPath: string,
  duration: number,
  multibar: any,
) {
  const bar = multibar?.create(100, 0, { task: `Rendering` });

  async function runFfmpeg(encoder: string) {
    const args = [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      videoFile,
      "-filter_complex",
      complexFilter,
      "-map",
      "[v_final]",
      "-map",
      "[a_final]",
      "-c:v",
      encoder,
      "-b:v",
      "5000k",
      "-progress",
      "pipe:1",
    ];

    if (encoder === "h264_nvenc") {
      args.push("-preset", "fast");
    }

    args.push(outputPath);

    const process = $`ffmpeg ${args}`.quiet();

    for await (const chunk of process.stdout) {
      const line = chunk.toString();
      const match = line.match(/out_time_ms=(\d+)/);
      if (match && duration > 0) {
        const ms = parseInt(match[1]);
        const percentage = Math.min(100, Math.round((ms / 1000 / duration) * 100));
        bar?.update(percentage);
      }
    }

    await process;
  }

  try {
    logger.info(`Rendering with filter [${filterName}] using NVENC...`);
    await runFfmpeg("h264_nvenc");
  } catch (err) {
    logger.warn("NVENC failed, switching to libx264...");
    await runFfmpeg("libx264");
  } finally {
    bar?.update(100);
  }
}
