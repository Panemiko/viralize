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

  const defaultCut = { top: 0, left: 0, scaledWidth: reelsWidth, scaledHeight: reelsHeight };

  if (!result || result.length === 0) {
    return defaultCut;
  }

  const faceResult = result[0]!;
  const { _width: originalWidth, _height: originalHeight } = faceResult._imageDims;

  const baseScale = Math.max(reelsWidth / originalWidth, reelsHeight / originalHeight);
  const zoomFactor = 1.1;
  const scale = baseScale * zoomFactor;

  const scaledWidth = Math.round(originalWidth * scale);
  const scaledHeight = Math.round(originalHeight * scale);

  const faceXCenter = (faceResult._box._x + faceResult._box._width / 2) * scale;
  const faceYCenter = (faceResult._box._y + faceResult._box._height / 2) * scale;

  const desiredYPercent = 0.3;
  let top = faceYCenter - reelsHeight * desiredYPercent;
  top = Math.max(0, Math.min(top, scaledHeight - reelsHeight));

  let left = faceXCenter - reelsWidth / 2;
  left = Math.max(0, Math.min(left, scaledWidth - reelsWidth));

  return {
    top: Math.round(top),
    left: Math.round(left),
    scaledWidth,
    scaledHeight,
  };
}
