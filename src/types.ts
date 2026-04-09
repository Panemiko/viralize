import type { $ as ZX$, argv as ZXArgv, chalk as ZXChalk, fs as ZXFs, question as ZXQuestion } from "zx";
import type { Logger } from "pino";

export interface GlobalContext {
  $: typeof ZX$;
  argv: typeof ZXArgv;
  chalk: typeof ZXChalk;
  fs: typeof ZXFs;
  question: typeof ZXQuestion;
  logger: Logger;
  PROJECT_ROOT: string;
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

export interface RenderParams extends ResolvedInputs {
  subtitleFile: string | null;
  cut: any;
  videoOutput?: string;
  multibar?: any;
}
