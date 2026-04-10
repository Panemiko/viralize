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
export default async function renderFinalVideo({
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
