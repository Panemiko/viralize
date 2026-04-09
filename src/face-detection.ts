import fs from "node:fs/promises";
import path from "node:path";
import * as tf from "@tensorflow/tfjs-node";
import * as faceapi_pkg from "@vladmandic/face-api";

const faceapi = faceapi_pkg as any;
const modelPathRoot = "models";

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
  console.log("FaceAPI single-process test");

  await faceapi.tf.setBackend("tensorflow");
  await faceapi.tf.enableProdMode();
  await faceapi.tf.ENV.set("DEBUG", false);
  await faceapi.tf.ready();

  console.log(
    `Version: TensorFlow/JS ${faceapi.tf?.version_core} FaceAPI ${
      faceapi.version.faceapi
    } Backend: ${faceapi.tf?.getBackend()}`,
  );

  console.log("Loading FaceAPI models");
  const modelPath = path.join(import.meta.dirname, modelPathRoot);
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);

  optionsSSDMobileNet = new faceapi.SsdMobilenetv1Options({
    minConfidence: 0.5,
  });

  const tensor = await image(file);
  const result = await detect(tensor);

  console.log("Detected faces:", result.length);

  tensor.dispose();

  return result;
}

async function main() {
  const framePath = path.resolve(import.meta.dirname, "../tmp/frame.png");
  const faceJsonPath = path.resolve(import.meta.dirname, "../tmp/face.json");

  const data = await fs.readFile(framePath);
  const results = await searchFaceOnFile(data);

  await fs.writeFile(faceJsonPath, JSON.stringify(results, null, 2), {
    encoding: "utf8",
  });
}

main();