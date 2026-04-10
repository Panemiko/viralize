import { MultiBar, Presets } from "cli-progress";
import logger from "./logger.ts";

/**
 * UI wrapper for the Viralize CLI.
 */
class ViralizeUI {
  public multibar: MultiBar | null = null;

  constructor() {
    if (process.stdout.isTTY) {
      this.multibar = new MultiBar({
        clearOnComplete: false,
        hideCursor: true,
        format: "{bar} | {percentage}% | {task} | {value}/{total}",
      }, Presets.shades_grey);
    }
  }

  getBar(id: string, total: number = 100, task: string = "") {
    if (!this.multibar) {
      // Fallback for non-TTY or when multibar is disabled
      return {
        update: () => {},
        stop: () => {},
        create: function() { return this; },
        increment: () => {},
      };
    }
    return this.multibar.create(total, 0, { task });
  }

  /**
   * Logs a message cleanly.
   */
  log(msg: string, level: "info" | "warn" | "error" = "info") {
    if (this.multibar) {
      // If multibar is active, we should use its logging or suspend it
      // For now, let's just use logger
      (logger as any)[level](msg);
    } else {
      (logger as any)[level](msg);
    }
  }

  /**
   * Reads a single keypress from the terminal.
   */
  async readKey(): Promise<string> {
    return new Promise((resolve) => {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");
      
      const onData = (key: string) => {
        // Handle Ctrl+C
        if (key === "\u0003") {
          this.stop();
          process.exit();
        }
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onData);
        resolve(key);
      };
      
      process.stdin.on("data", onData);
    });
  }

  /**
   * Stops the terminal interface.
   */
  stop() {
    if (this.multibar) {
      this.multibar.stop();
    }
  }
}

export const ui = new ViralizeUI();
export type TerminalUI = ViralizeUI;
