export const command = "render";

import { $, fs } from "zx";
import path from "node:path";
import { ASSETS_DIR, SHORTS_WIDTH, SHORTS_HEIGHT } from "../../common/paths.ts";
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
    originalVideoPath,
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

  const outputDir = path.resolve(process.cwd(), outputName);
  const outputPath = path.resolve(outputDir, `${outputName}.mp4`);
  
  // Ensure the output directory exists
  await $`mkdir -p ${outputDir}`;

  try {
    await performRendering(videoFile, complexFilter, filterName, outputPath, duration);

    // Copy original video to the export folder
    const sourcePath = originalVideoPath || videoFile;
    if (fs.existsSync(sourcePath)) {
      const originalFileName = path.basename(sourcePath);
      const targetPath = path.resolve(outputDir, `original-${originalFileName}`);
      logger.info(`Copying original video to: ${targetPath}`);
      await fs.copy(sourcePath, targetPath, { overwrite: true });
    }
  } catch (err) {
    logger.error({ err }, "Rendering failed");
    throw err;
  }
}
