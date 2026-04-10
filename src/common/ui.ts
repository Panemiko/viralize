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
   * Simple multi-select prompt.
   */
  async multiSelect<T>(
    message: string,
    options: { label: string; value: T; checked?: boolean }[],
  ): Promise<T[]> {
    const stdout = process.stdout;
    const stdin = process.stdin;
    let cursor = 0;
    const items = options.map((opt) => ({ ...opt, checked: opt.checked ?? true }));

    const render = () => {
      stdout.write("\x1b[?25l"); // Hide cursor
      stdout.write(`\n\r${message}\n\r`);
      items.forEach((item, i) => {
        const checkbox = item.checked ? "[x]" : "[ ]";
        const prefix = i === cursor ? "> " : "  ";
        const color = i === cursor ? "\x1b[36m" : ""; // Cyan for current item
        const reset = "\x1b[0m";
        stdout.write(`${prefix}${color}${checkbox} ${item.label}${reset}\n\r`);
      });
    };

    const cleanup = () => {
      stdout.write(`\x1b[${items.length + 2}A`); // Move cursor up
      stdout.write("\x1b[0J"); // Clear from cursor to bottom
      stdout.write("\x1b[?25h"); // Show cursor
    };

    render();

    return new Promise((resolve) => {
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding("utf8");

      const onData = (key: string) => {
        if (key === "\u0003") {
          // Ctrl+C
          cleanup();
          process.exit();
        }
        if (key === "\r") {
          // Enter
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          cleanup();
          resolve(items.filter((i) => i.checked).map((i) => i.value));
        }
        if (key === " ") {
          // Space
          items[cursor].checked = !items[cursor].checked;
        }
        if (key === "\u001b[A") {
          // Up arrow
          cursor = (cursor - 1 + items.length) % items.length;
        }
        if (key === "\u001b[B") {
          // Down arrow
          cursor = (cursor + 1) % items.length;
        }

        stdout.write(`\x1b[${items.length + 2}A`); // Move cursor up
        stdout.write("\x1b[0J"); // Clear
        render();
      };

      stdin.on("data", onData);
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
