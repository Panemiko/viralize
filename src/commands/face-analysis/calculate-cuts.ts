import type { CutResult } from "../../types.ts";

export interface FaceDetectionResult {
  _imageDims: { _width: number; _height: number };
  _box: { _x: number; _y: number; _width: number; _height: number };
}

/**
 * Calculates optimal crop coordinates from face detection results.
 */
export function calculateCuts(result: FaceDetectionResult[]): CutResult {
  const reelsWidth = 1080;
  const reelsHeight = 1920;

  const defaultCut = {
    top: 0,
    left: 0,
    scaledWidth: reelsWidth,
    scaledHeight: reelsHeight,
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
  // Target face width to be around 35% of the reel width.
  const targetFaceWidth = reelsWidth * 0.35;
  const faceScale = targetFaceWidth / faceBox._width;

  // Base scale to cover the 9:16 area
  const baseScale = Math.max(
    reelsWidth / originalWidth,
    reelsHeight / originalHeight,
  );

  // We also need to ensure the scale is high enough to allow the face to be
  // at the desired vertical position (30% from top) without hitting boundaries.
  // desiredYPercent = 0.3 means faceYCenter = reelsHeight * 0.3.
  // faceYCenter = faceYCenterOrig * scale.
  // To avoid clamping 'top' at 0, we need faceYCenter >= reelsHeight * 0.3.
  // To avoid clamping 'top' at scaledHeight - reelsHeight, we need:
  // faceYCenterOrig * scale - reelsHeight * 0.3 <= originalHeight * scale - reelsHeight
  // scale * (originalHeight - faceYCenterOrig) >= reelsHeight * 0.7
  const minScaleForVertical = (reelsHeight * 0.7) / (originalHeight - faceYCenterOrig);

  const scale = Math.max(baseScale, faceScale, minScaleForVertical);

  const scaledWidth = Math.round(originalWidth * scale);
  const scaledHeight = Math.round(originalHeight * scale);

  const faceXCenter = faceXCenterOrig * scale;
  const faceYCenter = faceYCenterOrig * scale;

  // Vertical position: face center at 30% from the top
  const desiredYPercent = 0.3;
  let top = faceYCenter - reelsHeight * desiredYPercent;
  top = Math.max(0, Math.min(top, scaledHeight - reelsHeight));

  // Horizontal position: face center at 50% (middle)
  let left = faceXCenter - reelsWidth / 2;
  left = Math.max(0, Math.min(left, scaledWidth - reelsWidth));

  return {
    top: Math.round(top),
    left: Math.round(left),
    scaledWidth,
    scaledHeight,
  };
}
