import type { CutResult, Config } from "../../types.ts";
import { SHORTS_WIDTH, SHORTS_HEIGHT } from "../../common/constants.ts";

export interface FaceDetectionResult {
  _imageDims: { _width: number; _height: number };
  _box: { _x: number; _y: number; _width: number; _height: number };
}

/**
 * Calculates optimal crop coordinates from face detection results.
 */
export function calculateCuts(
  result: FaceDetectionResult[],
  faceConfig?: Config["face"],
): CutResult {
  const targetWidthPercent = faceConfig?.targetWidthPercent ?? 0.25;
  const desiredYPercent = faceConfig?.desiredYPercent ?? 0.3;

  const defaultCut = {
    top: 0,
    left: 0,
    scaledWidth: SHORTS_WIDTH,
    scaledHeight: SHORTS_HEIGHT,
  };

  if (!result || result.length === 0) {
    return defaultCut;
  }

  // Use the first detected face
  const faceResult = result[0]!;
  const { _width: originalWidth, _height: originalHeight } =
    faceResult._imageDims;

  const faceBox = faceResult._box;
  const faceXCenterOrig = faceBox._x + faceBox._width / 2;
  const faceYCenterOrig = faceBox._y + faceBox._height / 2;

  // We want the face to be prominent but not too zoomed in.
  // Target face width to be around the configured percentage of the shorts width.
  const targetFaceWidth = SHORTS_WIDTH * targetWidthPercent;
  const faceScale = targetFaceWidth / faceBox._width;

  // Base scale to cover the 9:16 area
  const baseScale = Math.max(
    SHORTS_WIDTH / originalWidth,
    SHORTS_HEIGHT / originalHeight,
  );

  // We also need to ensure the scale is high enough to allow the face to be
  // at the desired vertical position without hitting boundaries.
  const minScaleForVertical =
    (SHORTS_HEIGHT * (1 - desiredYPercent)) / (originalHeight - faceYCenterOrig);

  const scale = Math.max(baseScale, faceScale, minScaleForVertical);

  const scaledWidth = Math.round(originalWidth * scale);
  const scaledHeight = Math.round(originalHeight * scale);

  const faceXCenter = faceXCenterOrig * scale;
  const faceYCenter = faceYCenterOrig * scale;

  // Vertical position: face center at desired percentage from the top
  let top = faceYCenter - SHORTS_HEIGHT * desiredYPercent;
  top = Math.max(0, Math.min(top, scaledHeight - SHORTS_HEIGHT));

  // Horizontal position: face center at 50% (middle)
  let left = faceXCenter - SHORTS_WIDTH / 2;
  left = Math.max(0, Math.min(left, scaledWidth - SHORTS_WIDTH));

  return {
    top: Math.round(top),
    left: Math.round(left),
    scaledWidth,
    scaledHeight,
  };
}
