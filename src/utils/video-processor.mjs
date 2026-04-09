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

  // Subtitle styling configuration (Viral look: Yellow, Bold)
  const fontName = "Poppins";
  const fontSize = 22;
  const marginV = 300;

  const subtitleStyle = `FontName=${fontName},FontSize=${fontSize},Bold=1,Alignment=2,MarginV=${marginV},PrimaryColour=&H00FFFF,OutlineColour=&H000000,BorderStyle=1,Outline=2,Shadow=1`;

  let videoFilters = `scale=w=1080:h=1920,crop=1080:1920:0:${cut.top},lut3d=assets/filters/${filterName}.CUBE`;

  if (subtitleFile) {
    videoFilters += `,subtitles='${subtitleFile}':force_style='${subtitleStyle}'`;
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
