import { $, chalk, fs } from "zx";
import { calculateCuts } from "./calculate-cuts.mjs";

/**
 * Analyzes video to detect faces and calculate crop parameters.
 * @param {string} videoFile Path to the input video file.
 * @returns {Promise<object>} Cut parameters { top, left, ... }.
 */
export async function analyzeVideoFace(videoFile) {
  console.log(chalk.cyan("  -> Extracting reference frame for face detection..."));
  
  const frameTemp = "tmp/frame.png";
  const faceJson = "./tmp/face.json";

  // Capture a single frame for face detection
  await $`ffmpeg -hide_banner -loglevel error -y -i ${videoFile} -frames:v 1 -update 1 ${frameTemp}`;
  
  console.log(chalk.cyan("  -> Running AI face detection..."));
  // Run external face detection script
  await $`node src/face-detection.js`;
  
  console.log(chalk.cyan("  -> Calculating optimal crop coordinates..."));
  const faceResult = await fs.readJsonSync(faceJson);
  const cut = calculateCuts(faceResult);
  
  console.log(chalk.green(`  ✔ Face detection complete. Offset: top ${cut.top}px, left ${cut.left}px`));
  return cut;
}
