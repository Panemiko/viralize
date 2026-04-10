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
) {
  const filterPath = path.resolve(ASSETS_DIR, `filters/${filterName}.CUBE`);
  let filters = `scale=w=${cut.scaledWidth}:h=${cut.scaledHeight},crop=1080:1920:${cut.left}:${cut.top},lut3d=${filterPath}`;

  if (subtitleFile) {
    filters += `,subtitles='${subtitleFile}'`;
  }

  return filters;
}
