import { $, fs } from "zx";
import { calculateCuts } from "../utils/calculate-cuts.mjs";
import logger from "../utils/logger.mjs";
import path from "node:path";
import { PROJECT_ROOT, INTERNAL_TEMP_DIR } from "../utils/paths.mjs";

/**
 * Analyzes video to detect faces and calculate crop parameters.
 * @param {string} videoFile Path to the input video file.
 * @returns {Promise<object>} Cut parameters { top, left, ... }.
 */
export async function analyzeVideoFace(videoFile) {
  logger.info("Extracting reference frame for face detection...");

  const frameTemp = path.resolve(INTERNAL_TEMP_DIR, "frame.png");
  const faceJson = path.resolve(INTERNAL_TEMP_DIR, "face.json");
  const detectionScript = path.resolve(PROJECT_ROOT, "src/face-detection.js");

  try {
    // Capture a single frame for face detection
    await $`ffmpeg -hide_banner -loglevel error -y -i ${videoFile} -frames:v 1 -update 1 ${frameTemp}`;

    logger.info("Running AI face detection...");
    // Run external face detection script
    await $`node ${detectionScript}`;

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
