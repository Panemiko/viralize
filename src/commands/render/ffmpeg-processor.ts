import { $ } from "zx";
import logger from "../../common/logger.ts";

/**
 * Gets video duration in seconds using ffprobe.
 */
export async function getVideoDuration(videoFile: string) {
  const result =
    await $`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${videoFile}`;
  return parseFloat(result.stdout.trim());
}

/**
 * Performs rendering with progress bar and fallback to software encoding.
 */
export async function performRendering(
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
