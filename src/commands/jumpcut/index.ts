import type { GlobalContext, CutResult } from "../../types.ts";
import path from "node:path";
import { TEMP_JUMPCUT, ensureTempDir } from "../../common/paths.ts";

export const command = "jumpcut";

interface JumpcutOptions {
  skipZoom?: boolean;
  cut?: CutResult;
}

/**
 * Detects silence and removes it from the video to create a jumpcut effect.
 */
export default async function jumpcut(
  videoFile: string,
  ctx: GlobalContext,
  options: JumpcutOptions = {},
) {
  const { $, logger, fs, ui } = ctx;
  const { skipZoom, cut } = options;

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

  // Get frame rate for zoompan
  const fpsResult = await $`ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of default=noprint_wrappers=1:nokey=1 ${videoFile}`;
  const [num, den] = fpsResult.stdout.trim().split("/").map(Number);
  const fps = num / (den || 1);

  // 3. Create a filter_complex to cut, scale, crop, zoom and concat
  let filterComplex = "";
  let concatInputs = "";
  
  clips.forEach((clip, index) => {
    const duration = clip.end - clip.start;
    const totalFrames = Math.max(1, Math.floor(duration * fps));
    
    let clipFilters = `trim=start=${clip.start}:end=${clip.end},setpts=PTS-STARTPTS`;
    
    if (cut) {
      // Scale and crop to vertical 1080x1920
      clipFilters += `,scale=w=${cut.scaledWidth}:h=${cut.scaledHeight},crop=1080:1920:${cut.left}:${cut.top}`;
      
      const minDurationForZoom = 1.5;
      if (!skipZoom && duration >= minDurationForZoom) {
        // Apply slow zoom at a constant rate (1% per second)
        // This ensures a 10s clip reaches 110% and a 5s clip reaches 105%
        // We cap the maximum zoom at 115% (1.15)
        const zoomRatePerSecond = 0.01;
        const zoomMax = 1.15;
        const zoomExpr = `min(${zoomMax},1.0+(${zoomRatePerSecond}*on/${fps}))`;
        // Anchor point is at 50% width, 30% height (face position in our crop)
        const ax = 1080 * 0.5;
        const ay = 1920 * 0.3;
        
        // Ensure x and y are within bounds
        const xExpr = `max(0,min(${ax}-(iw/zoom/2),iw-iw/zoom))`;
        const yExpr = `max(0,min(${ay}-(ih/zoom/2),ih-ih/zoom))`;
        
        clipFilters += `,format=gbrp,zoompan=z='${zoomExpr}':x='${xExpr}':y='${yExpr}':d=1:s=1080x1920:fps=${fps},format=yuv420p`;
      }
    }
    
    filterComplex += `[0:v]${clipFilters}[v${index}]; `;
    filterComplex += `[0:a]atrim=start=${clip.start}:end=${clip.end},asetpts=PTS-STARTPTS[a${index}]; `;
    concatInputs += `[v${index}][a${index}]`;
  });
  
  filterComplex += `${concatInputs}concat=n=${clips.length}:v=1:a=1[v_out][a_out]`;
  
  const outputFilename = `jumpcut_${path.basename(videoFile)}`;
  const outputPath = path.resolve(TEMP_JUMPCUT, outputFilename);
  
  logger.info(`✂️ Creating jumpcuts${!skipZoom ? " with slow zoom" : ""}...`);
  
  await $`ffmpeg -hide_banner -loglevel error -y -i ${videoFile} -filter_complex ${filterComplex} -map "[v_out]" -map "[a_out]" -c:v libx264 -preset fast -crf 18 -c:a aac -b:a 192k ${outputPath}`;
  
  logger.info(`✅ Jumpcut video saved to: ${outputPath}`);
  
  return outputPath;
}
