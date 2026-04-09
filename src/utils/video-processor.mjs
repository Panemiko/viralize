import { $, chalk } from "zx";

/**
 * Renders the final video with crops, filters, and subtitles.
 * @param {object} params
 * @param {string} params.videoFile
 * @param {string} params.filterName
 * @param {string} params.subtitleFile
 * @param {object} params.cut
 * @param {string} params.outputName
 * @param {string} params.videoOutput
 */
export async function renderFinalVideo({
  videoFile,
  filterName,
  subtitleFile,
  cut,
  outputName,
  videoOutput = "videos/"
}) {
  console.log(chalk.cyan("  -> Configuring FFmpeg filter chain..."));

  let videoFilters = `scale=w=${cut.scaledWidth}:h=${cut.scaledHeight},crop=1080:1920:${cut.left}:${cut.top},lut3d=assets/filters/${filterName}.CUBE`;

  if (subtitleFile) {
    videoFilters += `,subtitles='${subtitleFile}'`;
  }

  const complexFilter = `
    [0:v]${videoFilters}[v_final];
    [0:a]arnndn=m=assets/bd.rnnn:mix=0.9,loudnorm=I=-16:LRA=11:TP=-1.5 [a_final]
  `;

  const outputPath = `${videoOutput}${outputName}.mp4`;

  try {
    console.log(chalk.cyan(`  -> Rendering with LUT [${filterName}] using NVENC (GPU)...`));
    await $`
      ffmpeg -hide_banner -loglevel error -y \
        -i ${videoFile} \
        -filter_complex ${complexFilter} \
        -map "[v_final]" \
        -map "[a_final]" \
        -c:v h264_nvenc \
        -preset fast \
        -b:v 5000k \
        "${outputPath}"`;
  } catch (e) {
    console.log(chalk.yellow("  ! GPU (NVENC) failed, switching to software encoding (CPU)..."));
    await $`
      ffmpeg -hide_banner -loglevel error -y \
        -i ${videoFile} \
        -filter_complex ${complexFilter} \
        -map "[v_final]" \
        -map "[a_final]" \
        -c:v libx264 \
        -b:v 5000k \
        "${outputPath}"`;
  }

  console.log(chalk.green(`  ✔ Video rendered successfully at ${outputPath}`));
}
