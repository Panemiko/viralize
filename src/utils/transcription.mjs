import { $, chalk, fs } from "zx";

/**
 * Generates subtitles for a video file using Whisper.
 * @param {string} videoFile Path to the input video file.
 * @returns {Promise<string>} Path to the generated subtitle file.
 */
export async function generateSubtitles(videoFile) {
  console.log(chalk.cyan("  -> Extracting audio for transcription..."));
  
  const audioTemp = "tmp/audio_cut.wav";
  const subtitleFile = "tmp/audio_cut.srt";

  // Extract mono audio for Whisper
  await $`ffmpeg -hide_banner -loglevel error -y -i ${videoFile} -vn -acodec pcm_s16le -ar 16000 -ac 1 ${audioTemp}`;

  const whisperCmd = fs.existsSync("./.venv/bin/whisper") ? "./.venv/bin/whisper" : "whisper";

  try {
    console.log(chalk.cyan("  -> Transcribing with Whisper (attempting GPU/CUDA)..."));
    // Attempt GPU acceleration with word-level segmentation for "viral" style
    await $`${whisperCmd} ${audioTemp} --model small --language Portuguese --device cuda --output_dir tmp --output_format srt --word_timestamps True --max_words_per_line 3 --max_line_count 1 --max_line_width 24`;
  } catch (e) {
    console.log(chalk.yellow("  ! GPU transcription failed, falling back to CPU..."));
    await $`${whisperCmd} ${audioTemp} --model small --language Portuguese --device cpu --output_dir tmp --output_format srt --word_timestamps True --max_words_per_line 3 --max_line_count 1 --max_line_width 24`;
  }

  // Convert subtitle text to uppercase
  if (fs.existsSync(subtitleFile)) {
    console.log(chalk.cyan("  -> Converting subtitles to uppercase..."));
    const content = await fs.readFile(subtitleFile, "utf-8");
    await fs.writeFile(subtitleFile, content.toUpperCase());
  }

  console.log(chalk.green("  ✔ Subtitles generated successfully."));
  return subtitleFile;
}
