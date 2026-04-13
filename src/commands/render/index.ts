export const command = "render";

import { $ } from "zx";
import path from "node:path";
import { ASSETS_DIR } from "../../common/paths.ts";
import logger from "../../common/logger.ts";
import type { RenderParams } from "../../types.ts";
import { buildVideoFilters } from "./video-filters.ts";
import { getVideoDuration, performRendering } from "./ffmpeg-processor.ts";

/**
 * Renders the final video with crops, filters, and subtitles.
 */
export default async function renderFinalVideo(
  params: RenderParams,
  applyZoom: boolean = false,
) {
  const {
    videoFile,
    filterName,
    subtitleFile,
    cut,
    outputName,
    videoOutput = "videos/",
  } = params;

  const duration = await getVideoDuration(videoFile);
  
  // Get FPS
  const fpsResult = await $`ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of default=noprint_wrappers=1:nokey=1 ${videoFile}`;
  const [num, den] = fpsResult.stdout.trim().split("/").map(Number);
  const fps = num / (den || 1);

  const videoFilters = buildVideoFilters(
    cut,
    filterName,
    subtitleFile,
    applyZoom,
    duration,
    fps
  );
  
  const complexFilter = `
    [0:v]${videoFilters}[v_final];
    [0:a]anull [a_final]
  `;

  const outputPath = path.resolve(process.cwd(), videoOutput, `${outputName}.mp4`);
  await $`mkdir -p ${path.dirname(outputPath)}`;

  try {
    await performRendering(videoFile, complexFilter, filterName, outputPath, duration);
  } catch (err) {
    logger.error({ err }, "Rendering failed");
    throw err;
  }
}
