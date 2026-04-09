import { $, chalk, fs } from "zx";
import { generateAssKaraoke } from "./ass-generator.mjs";

/**
 * Generates subtitles for a video file using Whisper.
 * @param {string} videoFile Path to the input video file.
 * @returns {Promise<string>} Path to the generated subtitle file.
 */
export async function generateSubtitles(videoFile) {
  console.log(chalk.cyan("  -> Extracting audio for transcription..."));
  
  const audioTemp = "tmp/audio_cut.wav";
  const jsonFile = "tmp/audio_cut.json";
  const assFile = "tmp/audio_cut.ass";

  // Extract mono audio for Whisper
  await $`ffmpeg -hide_banner -loglevel error -y -i ${videoFile} -vn -acodec pcm_s16le -ar 16000 -ac 1 ${audioTemp}`;

  const whisperCmd = fs.existsSync("./.venv/bin/whisper") ? "./.venv/bin/whisper" : "whisper";

  // Common options for karaoke style
  const whisperArgs = [
    audioTemp,
    "--model", "small",
    "--language", "Portuguese",
    "--output_dir", "tmp",
    "--output_format", "json",
    "--word_timestamps", "True",
    "--max_words_per_line", "2",
    "--max_line_count", "1",
    "--max_line_width", "20"
  ];

  try {
    console.log(chalk.cyan("  -> Transcribing with Whisper (attempting GPU/CUDA)..."));
    await $`${whisperCmd} ${whisperArgs} --device cuda`;
  } catch (e) {
    console.log(chalk.yellow("  ! GPU transcription failed, falling back to CPU..."));
    await $`${whisperCmd} ${whisperArgs} --device cpu`;
  }

  if (fs.existsSync(jsonFile)) {
    console.log(chalk.cyan("  -> Generating Karaoke ASS subtitles..."));
    const whisperData = JSON.parse(await fs.readFile(jsonFile, "utf-8"));
    
    // Convert to uppercase in memory
    if (whisperData.segments) {
      whisperData.segments.forEach(seg => {
        seg.text = seg.text.toUpperCase();
        if (seg.words) {
          seg.words.forEach(w => w.word = w.word.toUpperCase());
        }
      });
    }

    await generateAssKaraoke(whisperData, assFile, {
      fontName: "The Bold Font", // Popular for reels, fallback to Noto Sans Bold
      fontSize: 90,
      primaryColor: "&H00D400FF", // Vibrant Pink
      secondaryColor: "&H00FFFFFF", // White (base)
      marginV: 600
    });
  }

  console.log(chalk.green("  ✔ Karaoke subtitles generated successfully."));
  return assFile;
}
