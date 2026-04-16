export const command = "face-analysis";

import { $, fs } from "zx";
import path from "node:path";
import { 
  ensureRunDirs 
} from "../../common/paths.ts";
import logger from "../../common/logger.ts";
import type { CutResult, GlobalContext } from "../../types.ts";
import { calculateCuts } from "./calculate-cuts.ts";

/**
 * Analyzes video to detect faces and calculate crop parameters.
 */
export default async function analyzeVideoFace(
  videoFile: string,
  ctx: GlobalContext,
): Promise<CutResult> {
  const { $, fs, paths } = ctx;
  ensureRunDirs(paths);

  logger.info("Extracting reference frame for face detection...");

  const frameTemp = path.resolve(paths.faceAnalysis, "frame.png");
  const faceJson = path.resolve(paths.faceAnalysis, "face.json");
  const detectionScript = path.resolve(__dirname, "face-detector.ts");

  try {
    await $`ffmpeg -hide_banner -loglevel error -y -i ${videoFile} -frames:v 1 -update 1 ${frameTemp}`;

    logger.info("Running AI face detection...");
    // Pass the run directory to the face detector script via environment variable or argument
    await $`RUN_DIR=${paths.runDir} bun ${detectionScript}`;

    logger.info("Calculating optimal crop coordinates...");
    const faceResult = await fs.readJsonSync(faceJson);
    const cut = calculateCuts(faceResult, ctx.config.face);

    logger.info({ cut }, "Face detection complete");
    return cut;
  } catch (err) {
    logger.error({ err }, "Error during face analysis");
    throw err;
  }
}
