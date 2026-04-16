import { $, fs } from "zx";
import path from "node:path";
import { 
  ensureRunDirs, 
  SHORTS_WIDTH, 
  SHORTS_HEIGHT 
} from "../../common/paths.ts";
import logger from "../../common/logger.ts";
import type { GlobalContext, CutResult } from "../../types.ts";

/**
 * Detects silence and removes it from the video to create a jumpcut effect.
 */
export default async function jumpcut(
  videoFile: string,
  ctx: GlobalContext,
  options: { skipZoom?: boolean; cut: CutResult },
) {
  const { skipZoom, cut } = options;
  const { $, paths } = ctx;

  ensureRunDirs(paths);

  logger.info(`🔍 Analyzing video for silence: ${videoFile}`);

  // 1. Detect silences
  const { silenceThreshold, silenceDuration } = ctx.config.jumpcut;
  const { max: zoomMax, ratePerSecond: zoomRatePerSecond, minDuration: minDurationForZoom } = ctx.config.zoom;

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

  // 2. Identify clips to keep
  const clips: { start: number; end: number }[] = [];
  let lastEnd = 0;
  
  for (const silence of silences) {
    if (silence.start > lastEnd) {
      clips.push({ start: lastEnd, end: silence.start });
    }
    lastEnd = silence.end;
  }
  
  // Add the last clip if it's longer than 0.1s
  const probeOutput = await $`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${videoFile}`;
  const totalDuration = parseFloat(probeOutput.stdout.trim());
  if (totalDuration > lastEnd + 0.1) {
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
    
    let clipFilters = `trim=start=${clip.start}:end=${clip.end},setpts=PTS-STARTPTS`;
    
    if (cut) {
      // Scale and crop to vertical
      clipFilters += `,scale=w=${cut.scaledWidth}:h=${cut.scaledHeight},crop=${SHORTS_WIDTH}:${SHORTS_HEIGHT}:${cut.left}:${cut.top}`;
      
      if (!skipZoom && duration >= minDurationForZoom) {
        // Apply slow zoom at a constant rate
        const zoomExpr = `min(${zoomMax},1.0+(${zoomRatePerSecond}*on/${fps}))`;
        // Anchor point is at 50% width, 30% height (face position in our crop)
        const ax = SHORTS_WIDTH * 0.5;
        const ay = SHORTS_HEIGHT * 0.3;
        
        // Ensure x and y are within bounds
        const xExpr = `max(0,min(${ax}-(iw/zoom/2),iw-iw/zoom))`;
        const yExpr = `max(0,min(${ay}-(ih/zoom/2),ih-ih/zoom))`;
        
        clipFilters += `,format=gbrp,zoompan=z='${zoomExpr}':x='${xExpr}':y='${yExpr}':d=1:s=${SHORTS_WIDTH}x${SHORTS_HEIGHT}:fps=${fps},format=yuv420p`;
      }
    }
    
    filterComplex += `[0:v]${clipFilters}[v${index}]; `;
    filterComplex += `[0:a]atrim=start=${clip.start}:end=${clip.end},asetpts=PTS-STARTPTS[a${index}]; `;
    concatInputs += `[v${index}][a${index}]`;
  });

  filterComplex += `${concatInputs}concat=n=${clips.length}:v=1:a=1[v_final][a_final]`;

  const jumpcutFile = path.resolve(paths.jumpcut, `jumpcut_${path.basename(videoFile)}`);
  
  logger.info(`✂️ Creating jumpcuts${!skipZoom ? " with slow zoom" : ""}...`);
  
  const ffmpegArgs = [
    "-hide_banner",
    "-loglevel", "error",
    "-y",
    "-i", videoFile,
    "-filter_complex", filterComplex,
    "-map", "[v_final]",
    "-map", "[a_final]",
    "-c:v", "libx264",
    "-crf", "18",
    "-preset", "fast",
    "-c:a", "aac",
    "-b:a", "192k",
    jumpcutFile
  ];

  await $`ffmpeg ${ffmpegArgs}`;

  return jumpcutFile;
}

export const command = "jumpcut";
