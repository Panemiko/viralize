export function calculateCuts(result) {
  const reelsWidth = 1080;
  const reelsHeight = 1920;

  // Default values if no face is detected
  const defaultCut = { top: 0, left: 0, scaledWidth: reelsWidth, scaledHeight: reelsHeight };

  if (!result || result.length === 0) {
    return defaultCut;
  }

  const faceResult = result[0];
  const { _width: originalWidth, _height: originalHeight } = faceResult._imageDims;

  // Calculate scale to fill the Reels frame (1080x1920)
  // We add a small extra zoom (1.1x) to allow for re-centering if the video matches the aspect ratio
  const baseScale = Math.max(reelsWidth / originalWidth, reelsHeight / originalHeight);
  const zoomFactor = 1.1;
  const scale = baseScale * zoomFactor;

  const scaledWidth = Math.round(originalWidth * scale);
  const scaledHeight = Math.round(originalHeight * scale);

  // Get face center in scaled coordinates
  const faceXCenter = (faceResult._box._x + faceResult._box._width / 2) * scale;
  const faceYCenter = (faceResult._box._y + faceResult._box._height / 2) * scale;

  // Target: Face head in top half.
  // Specifically, we want the face center at around 30% of the screen height.
  const desiredYPercent = 0.3;
  let top = faceYCenter - reelsHeight * desiredYPercent;

  // Constrain top within valid range [0, scaledHeight - reelsHeight]
  top = Math.max(0, Math.min(top, scaledHeight - reelsHeight));

  // Horizontal: Center the face
  let left = faceXCenter - reelsWidth / 2;

  // Constrain left within valid range [0, scaledWidth - reelsWidth]
  left = Math.max(0, Math.min(left, scaledWidth - reelsWidth));

  return {
    top: Math.round(top),
    left: Math.round(left),
    scaledWidth,
    scaledHeight,
  };
}
