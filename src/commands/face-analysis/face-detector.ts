import fs from "node:fs/promises";
import path from "node:path";
import * as tf from "@tensorflow/tfjs-node";
import * as faceapi_pkg from "@vladmandic/face-api";
import { PROJECT_ROOT, getRunPaths, ensureRunDirs } from "../../common/paths.ts";

const faceapi = faceapi_pkg as any;
const modelPathRoot = "src/models";

let optionsSSDMobileNet: any;

async function image(file: Buffer) {
  const decoded = tf.node.decodeImage(file);
  const casted = decoded.toFloat();
  const result = casted.expandDims(0);

  decoded.dispose();
  casted.dispose();

  return result;
}

async function detect(tensor: any) {
  const result = await faceapi.detectAllFaces(tensor, optionsSSDMobileNet);
  return result;
}

async function searchFaceOnFile(file: Buffer) {
  await faceapi.tf.setBackend("tensorflow");
  await faceapi.tf.enableProdMode();
  await faceapi.tf.ENV.set("DEBUG", false);
  await faceapi.tf.ready();

  const modelPath = path.join(PROJECT_ROOT, modelPathRoot);
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);

  optionsSSDMobileNet = new faceapi.SsdMobilenetv1Options({
    minConfidence: 0.5,
  });

  const tensor = await image(file);
  const result = await detect(tensor);

  tensor.dispose();

  return result;
}

async function main() {
  const runDir = process.env.RUN_DIR;
  if (!runDir) {
    console.error("RUN_DIR environment variable is required.");
    process.exit(1);
  }

  // Extract runId from runDir
  const runId = path.basename(runDir);
  const runPaths = getRunPaths(runId);
  ensureRunDirs(runPaths);

  const framePath = path.resolve(runPaths.faceAnalysis, "frame.png");
  const faceJsonPath = path.resolve(runPaths.faceAnalysis, "face.json");

  const data = await fs.readFile(framePath);
  const results = await searchFaceOnFile(data);

  await fs.writeFile(faceJsonPath, JSON.stringify(results, null, 2), {
    encoding: "utf8",
  });
}

main();