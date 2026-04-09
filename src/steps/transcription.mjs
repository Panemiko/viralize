import { $, fs } from "zx";
import { generateAssKaraoke } from "../utils/ass-generator.mjs";
import logger from "../utils/logger.mjs";
import path from "node:path";
import { PROJECT_ROOT, INTERNAL_TEMP_DIR } from "../utils/paths.mjs";

/**
 * Generates subtitles for a video file using Whisper.
 * @param {string} videoFile Path to the input video file.
 * @returns {Promise<string>} Path to the generated subtitle file.
 */
export async function generateSubtitles(videoFile, multibar) {
  logger.info("Extracting audio for transcription...");
  const bar = multibar?.create(100, 0, { task: "Transcription: extracting audio" });

  const audioTemp = path.resolve(INTERNAL_TEMP_DIR, "audio_cut.wav");
  const jsonFile = path.resolve(INTERNAL_TEMP_DIR, "audio_cut.json");
  const assFile = path.resolve(INTERNAL_TEMP_DIR, "audio_cut.ass");

  // Extract mono audio for Whisper
  await $`ffmpeg -hide_banner -loglevel error -y -i ${videoFile} -vn -acodec pcm_s16le -ar 16000 -ac 1 ${audioTemp}`;
  bar?.update(10, { task: "Transcription: audio extracted" });

  const venvWhisper = path.resolve(PROJECT_ROOT, ".venv/bin/whisper");
  const whisperCmd = fs.existsSync(venvWhisper) ? venvWhisper : "whisper";

  // Common options for karaoke style
  const whisperArgs = [
    audioTemp,
    "--model",
    "small",
    "--language",
    "Portuguese",
    "--output_dir",
    "tmp",
    "--output_format",
    "json",
    "--word_timestamps",
    "True",
    "--max_words_per_line",
    "2",
    "--max_line_count",
    "1",
    "--max_line_width",
    "20",
  ];

  bar?.update(20, { task: "Transcription: transcribing with Whisper" });
  await performTranscription(whisperCmd, whisperArgs);
  bar?.update(80, { task: "Transcription: whisper complete" });

  if (fs.existsSync(jsonFile)) {
    logger.info("Generating Karaoke ASS subtitles...");
    const whisperData = JSON.parse(await fs.readFile(jsonFile, "utf-8"));

    processWhisperData(whisperData);

    await generateAssKaraoke(whisperData, assFile, {
      fontName: "The Bold Font",
      fontSize: 90,
      primaryColor: "&H00D400FF",
      secondaryColor: "&H00FFFFFF",
      marginV: 600,
    });
  }

  bar?.update(100, { task: "Transcription: complete" });
  logger.info("Karaoke subtitles generated successfully.");
  return assFile;
}

/**
 * Performs transcription with fallback to CPU if GPU fails.
 */
async function performTranscription(whisperCmd, whisperArgs) {
  try {
    logger.info("Transcribing with Whisper (attempting GPU/CUDA)...");
    await $`${whisperCmd} ${whisperArgs} --device cuda`;
  } catch (err) {
    logger.warn({ err }, "GPU transcription failed, falling back to CPU...");
    await $`${whisperCmd} ${whisperArgs} --device cpu`;
  }
}

/**
 * Processes whisper data (e.g., converting to uppercase).
 */
function processWhisperData(whisperData) {
  if (!whisperData.segments) return;

  whisperData.segments.forEach((seg) => {
    seg.text = seg.text.toUpperCase();
    if (seg.words) {
      seg.words.forEach((w) => {
        w.word = w.word.toUpperCase();
      });
    }
  });
}
