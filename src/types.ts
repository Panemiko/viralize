import type { $ as ZX$, argv as ZXArgv, chalk as ZXChalk, fs as ZXFs, question as ZXQuestion } from "zx";
export type { ZX$, ZXArgv, ZXChalk, ZXFs, ZXQuestion };
import type { Logger } from "pino";
import type { TerminalUI } from "./common/ui.ts";

export interface GlobalContext {
  $: typeof ZX$;
  argv: typeof ZXArgv;
  chalk: typeof ZXChalk;
  fs: typeof ZXFs;
  question: typeof ZXQuestion;
  logger: Logger;
  PROJECT_ROOT: string;
  ui: TerminalUI;
}

export interface RunArgs {
  input?: string;
  filter?: string;
  output?: string;
  subtitle?: string;
  skipFace?: boolean;
  skipSubs?: boolean;
  skipRender?: boolean;
  skipReview?: boolean;
  help?: boolean;
}

export interface ResolvedInputs {
  videoFile: string;
  filterName: string;
  outputName: string;
}

import type { MultiBar } from "cli-progress";

export interface CutResult {
  top: number;
  left: number;
  scaledWidth: number;
  scaledHeight: number;
}

export interface RenderParams extends ResolvedInputs {
  subtitleFile: string | null;
  cut: CutResult;
  videoOutput?: string;
  multibar?: MultiBar;
}

export interface WhisperWord {
  word: string;
  start: number;
  end: number;
  probability: number;
}

export interface WhisperSegment {
  id?: number;
  start: number;
  end: number;
  text: string;
  words?: WhisperWord[];
}

export interface WhisperData {
  segments: WhisperSegment[];
  text: string;
}

export interface SubtitleStyle {
  fontName?: string;
  fontSize?: number;
  primaryColor?: string;
  secondaryColor?: string;
  outlineColor?: string;
  shadowColor?: string;
  marginV?: number;
}
