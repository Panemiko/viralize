import type { GlobalContext } from "../../types.ts";
import path from "node:path";
import { TEMP_JUMPCUT, ensureTempDir } from "../../common/paths.ts";

export const command = "jumpcut";

/**
 * Detects silence and removes it from the video to create a jumpcut effect.
 */
export default async function jumpcut(videoFile: string, ctx: GlobalContext) {
  const { $, logger, fs, ui } = ctx;

  ensureTempDir();

  logger.info(`🔍 Analyzing video for silence: ${videoFile}`);
  
  // 1. Detect silences
  const silenceThreshold = -30; // dB
  const silenceDuration = 0.5; // seconds
  
  const output = await $`ffmpeg -i ${videoFile} -af silencedetect=n=${silenceThreshold}dB:d=${silenceDuration} -f null - 2>&1`;
  const lines = output.stdout.split("\n");
  
  const silences: { start: number; end: number }[] = [];
  let currentSilenceStart: number | null = null;
  
  for (const line of lines) {
    const startMatch = line.match(/silence_start: ([\d.]+)/);
    const endMatch = line.match(/silence_end: ([\d.]+)/);
    
    if (startMatch && startMatch[1]) {
      currentSilenceStart = parseFloat(startMatch[1]);
    } else if (endMatch && endMatch[1] && currentSilenceStart !== null) {
      silences.push({ start: currentSilenceStart, end: parseFloat(endMatch[1]) });
      currentSilenceStart = null;
    }
  }

  if (silences.length === 0) {
    logger.info("No silence detected. Skipping jumpcut.");
    return videoFile;
  }

  logger.info(`Found ${silences.length} silent segments.`);
  
  // 2. Calculate non-silent segments (clips)
  const durationResult = await $`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${videoFile}`;
  const totalDuration = parseFloat(durationResult.stdout.trim());
  
  const clips: { start: number; end: number }[] = [];
  let lastEnd = 0;
  
  for (const silence of silences) {
    if (silence.start > lastEnd) {
      clips.push({ start: lastEnd, end: silence.start });
    }
    lastEnd = silence.end;
  }
  
  if (lastEnd < totalDuration) {
    clips.push({ start: lastEnd, end: totalDuration });
  }

  // 3. Create a filter_complex to cut and concat
  // Example: [0:v]trim=start=0:end=2,setpts=PTS-STARTPTS[v0]; [0:a]atrim=start=0:end=2,asetpts=PTS-STARTPTS[a0]; ... [v0][a0][v1][a1]concat=n=2:v=1:a=1[outv][outa]
  
  let filterComplex = "";
  let concatInputs = "";
  
  clips.forEach((clip, index) => {
    filterComplex += `[0:v]trim=start=${clip.start}:end=${clip.end},setpts=PTS-STARTPTS[v${index}]; `;
    filterComplex += `[0:a]atrim=start=${clip.start}:end=${clip.end},asetpts=PTS-STARTPTS[a${index}]; `;
    concatInputs += `[v${index}][a${index}]`;
  });
  
  filterComplex += `${concatInputs}concat=n=${clips.length}:v=1:a=1[v_out][a_out]`;
  
  const outputFilename = `jumpcut_${path.basename(videoFile)}`;
  const outputPath = path.resolve(TEMP_JUMPCUT, outputFilename);
  
  logger.info(`✂️ Creating jumpcuts...`);
  
  await $`ffmpeg -hide_banner -loglevel error -y -i ${videoFile} -filter_complex ${filterComplex} -map "[v_out]" -map "[a_out]" -c:v libx264 -preset fast -crf 18 -c:a aac -b:a 192k ${outputPath}`;
  
  logger.info(`✅ Jumpcut video saved to: ${outputPath}`);
  
  return outputPath;
}
