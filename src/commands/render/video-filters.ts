import path from "node:path";
import { ASSETS_DIR } from "../../common/paths.ts";
import type { CutResult } from "../../types.ts";

/**
 * Builds the FFmpeg video filter string.
 */
export function buildVideoFilters(
  cut: CutResult,
  filterName: string,
  subtitleFile: string | null,
  applyZoom: boolean = false,
  duration: number = 0,
  fps: number = 30,
) {
  const filterPath = path.resolve(ASSETS_DIR, `filters/${filterName}.CUBE`);
  let filters = `scale=w=${cut.scaledWidth}:h=${cut.scaledHeight},crop=1080:1920:${cut.left}:${cut.top}`;

  const minDurationForZoom = 1.5;
  if (applyZoom && duration >= minDurationForZoom) {
    const zoomRatePerSecond = 0.01; // Constant rate (1% per second)
    const zoomMax = 1.15;
    const zoomExpr = `min(${zoomMax},1.0+(${zoomRatePerSecond}*on/${fps}))`;
    const ax = 1080 * 0.5;
    const ay = 1920 * 0.3;
    const xExpr = `max(0,min(${ax}-(iw/zoom/2),iw-iw/zoom))`;
    const yExpr = `max(0,min(${ay}-(ih/zoom/2),ih-ih/zoom))`;

    filters += `,format=gbrp,zoompan=z='${zoomExpr}':x='${xExpr}':y='${yExpr}':d=1:s=1080x1920:fps=${fps},format=yuv420p`;
  }

  if (subtitleFile) {
    filters += `,subtitles='${subtitleFile}'`;
  }

  return filters;
}
