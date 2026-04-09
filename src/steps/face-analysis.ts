import { $, fs } from "zx";
import { calculateCuts } from "../utils/calculate-cuts.ts";
import logger from "../utils/logger.ts";
import path from "node:path";
import { PROJECT_ROOT, INTERNAL_TEMP_DIR } from "../utils/paths.ts";

/**
 * Analyzes video to detect faces and calculate crop parameters.
 * @param videoFile Path to the input video file.
 * @returns Cut parameters { top, left, ... }.
 */
export async function analyzeVideoFace(videoFile: string) {
  logger.info("Extracting reference frame for face detection...");

  const frameTemp = path.resolve(INTERNAL_TEMP_DIR, "frame.png");
  const faceJson = path.resolve(INTERNAL_TEMP_DIR, "face.json"); // Fixed extension if it was a typo
  const detectionScript = path.resolve(PROJECT_ROOT, "src/face-detection.ts");

  try {
    // Capture a single frame for face detection
    await $`ffmpeg -hide_banner -loglevel error -y -i ${videoFile} -frames:v 1 -update 1 ${frameTemp}`;

    logger.info("Running AI face detection...");
    // Run external face detection script with Bun
    await $`bun ${detectionScript}`;

    logger.info("Calculating optimal crop coordinates...");
    const faceResult = await fs.readJsonSync(faceJson);
    const cut = calculateCuts(faceResult);

    logger.info({ cut }, "Face detection complete");
    return cut;
  } catch (err) {
    logger.error({ err }, "Error during face analysis");
    throw err;
  }
}
