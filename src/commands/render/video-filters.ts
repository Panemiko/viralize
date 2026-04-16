import path from "node:path";
import { ASSETS_DIR, SHORTS_WIDTH, SHORTS_HEIGHT } from "../../common/constants.ts";
import { getConfig } from "../../common/config.ts";
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
  const config = getConfig();
  let filters = `scale=w=${cut.scaledWidth}:h=${cut.scaledHeight},crop=${SHORTS_WIDTH}:${SHORTS_HEIGHT}:${cut.left}:${cut.top}`;

  const { max: zoomMax, ratePerSecond: zoomRatePerSecond, minDuration: minDurationForZoom } = config.zoom;
  if (applyZoom && duration >= minDurationForZoom) {
    const zoomExpr = `min(${zoomMax},1.0+(${zoomRatePerSecond}*on/${fps}))`;
    const ax = SHORTS_WIDTH * 0.5;
    const ay = SHORTS_HEIGHT * 0.3;
    const xExpr = `max(0,min(${ax}-(iw/zoom/2),iw-iw/zoom))`;
    const yExpr = `max(0,min(${ay}-(ih/zoom/2),ih-ih/zoom))`;

    filters += `,format=gbrp,zoompan=z='${zoomExpr}':x='${xExpr}':y='${yExpr}':d=1:s=${SHORTS_WIDTH}x${SHORTS_HEIGHT}:fps=${fps},format=yuv420p`;
  }

  if (filterName && filterName !== "none") {
    const filterPath = path.resolve(ASSETS_DIR, `filters/${filterName}.CUBE`);
    filters += `,lut3d='${filterPath}'`;
  }

  if (subtitleFile) {
    filters += `,subtitles='${subtitleFile}'`;
  }

  return filters;
}
