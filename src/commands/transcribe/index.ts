export const command = "transcribe";

import { $, fs } from "zx";
import path from "node:path";
import { PROJECT_ROOT, INTERNAL_TEMP_DIR, ensureTempDir } from "../../common/paths.ts";
import logger from "../../common/logger.ts";
import type { WhisperData, WhisperSegment, WhisperWord } from "../../types.ts";
import { generateAssKaraoke } from "./ass-generator.ts";

/**
 * Generates subtitles for a video file using Whisper.
 * @param videoFile Path to the input video file.
 * @param multibar CLI progress multibar.
 * @returns Path to the generated subtitle file.
 */
export default async function generateSubtitles(
  videoFile: string,
  multibar?: any,
) {
  ensureTempDir();
  const bar = multibar?.create(100, 0, {
    task: "Transcription",
  });

  const audioTemp = path.resolve(INTERNAL_TEMP_DIR, "audio_cut.wav");
  const jsonFile = path.resolve(INTERNAL_TEMP_DIR, "audio_cut.json");
  const assFile = path.resolve(INTERNAL_TEMP_DIR, "audio_cut.ass");

  // Extract mono audio for Whisper
  await $`ffmpeg -hide_banner -loglevel error -y -i ${videoFile} -vn -acodec pcm_s16le -ar 16000 -ac 1 ${audioTemp}`;
  bar?.update(10);

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
    INTERNAL_TEMP_DIR,
    "--output_format",
    "json",
    "--word_timestamps",
    "True",
    "--max_line_count",
    "1",
    "--max_line_width",
    "20",
  ];

  bar?.update(20);
  await performTranscription(whisperCmd, whisperArgs);
  bar?.update(80);

  if (fs.existsSync(jsonFile)) {
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

  bar?.update(100);
  return assFile;
}

/**
 * Performs transcription with fallback to GPU if GPU fails.
 */
async function performTranscription(whisperCmd: string, whisperArgs: string[]) {
  try {
    await $`${whisperCmd} ${whisperArgs} --device cuda`;
  } catch (err) {
    logger.warn("GPU transcription failed, falling back to CPU...");
    await $`${whisperCmd} ${whisperArgs} --device cpu`;
  }
}

/**
 * Processes whisper data (e.g., converting to uppercase).
 */
function processWhisperData(whisperData: WhisperData) {
  if (!whisperData.segments) return;

  whisperData.segments.forEach((seg: WhisperSegment) => {
    seg.text = seg.text.toUpperCase();
    if (seg.words) {
      seg.words.forEach((w: WhisperWord) => {
        w.word = w.word.toUpperCase();
      });
    }
  });
}
