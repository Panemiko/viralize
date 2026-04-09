import logger from "./logger.ts";

/**
 * Minimalist UI wrapper for the Viralize CLI.
 */
export const ui = {
  multibar: null,

  getBar: (id: string, total: number = 100, task: string = "") => ({
    update: () => {},
    stop: () => {},
    create: function() { return this; },
    increment: () => {},
  }),

  /**
   * Logs a message cleanly.
   */
  log: (msg: string, level: "info" | "warn" | "error" = "info") => {
    (logger as any)[level](msg);
  },

  /**
   * Reads a single keypress from the terminal.
   */
  readKey: (): Promise<string> => {
    return new Promise((resolve) => {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");
      
      const onData = (key: string) => {
        // Handle Ctrl+C
        if (key === "\u0003") {
          process.exit();
        }
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onData);
        resolve(key);
      };
      
      process.stdin.on("data", onData);
    });
  },

  /**
   * Stops the terminal interface.
   */
  stop: () => {
    // No-op
  },
};

export type TerminalUI = typeof ui;
