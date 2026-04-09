import type { GlobalContext } from "../types.ts";

/**
 * Checks system dependencies.
 */
export default async function check({ $, chalk, logger }: GlobalContext) {
  logger.info("🔍 Checking system dependencies...");

  async function verify(cmd: string, label: string) {
    try {
      await $`which ${cmd}`.quiet();
      console.log(`  [${chalk.green("OK")}] ${label}`);
      return true;
    } catch {
      console.log(`  [${chalk.red("ERROR")}] ${label} (not found)`);
      return false;
    }
  }

  const results = [
    await verify("ffmpeg", "FFmpeg (Video Engine)"),
    await verify("ffprobe", "FFprobe (Metadata Engine)"),
    await verify("mpv", "MPV (Reviewing Tool)"),
    await verify("python", "Python (AI Engine)"),
  ];

  if (results.every(function (r) { return r; })) {
    console.log(chalk.bold.green("\n✨ System is ready for viralize!\n"));
  } else {
    console.log(
      chalk.bold.red(
        "\n❌ Some dependencies are missing. Check requirements in README.\n",
      ),
    );
  }
}
