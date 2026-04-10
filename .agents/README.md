# Project: viralize - Video to Reels Converter

Automatic tool to convert landscape or portrait videos into optimized 9:16 Reels/Shorts/TikToks.

## Core Mandates & Guidelines

- **Framing Logic**: When modifying face framing, use the `calculateCuts` function in `src/commands/face-analysis/calculate-cuts.ts`.
  - Target face width should be around **35%** of the reel width for a natural but focused look.
  - The face center should be positioned at **30% from the top** of the video.
  - Ensure the scale is sufficient to allow horizontal centering even in portrait videos.
- **Shell Commands**: Always use `zx` for shell commands (FFmpeg, Whisper, etc.).
- **Async/Await**: Use modern async/await patterns for all file and process operations.
- **Logging**: Use the internal logger (`src/common/logger.ts`) for all status updates.
- **Types**: Always update or refer to `src/types.ts` when adding new data structures.
- **Comments**: Maintain descriptive comments for all main functions and logic blocks.

## Project Structure

- `src/`: Main source code.
  - `commands/`: CLI subcommand implementations.
    - `run/`: Orchestrates the full process.
    - `jumpcut/`: Silence removal using `jumpcut` logic.
    - `face-analysis/`: Face detection (TensorFlow.js) and crop calculation.
    - `transcribe/`: Subtitle generation using Whisper and .ASS generator.
    - `render/`: FFmpeg-based video rendering with filters and subtitles.
    - `setup/`: Environment initialization.
  - `common/`: Shared utilities (logger, paths, UI).
  - `models/`: Face detection AI models.
- `assets/`:
  - `filters/`: `.CUBE` LUT files for color grading.
  - `bd.rnnn`: Model for noise reduction.
- `videos/`: Default output directory for processed videos.
- `tmp/`: Temporary workspace for frames, audio, and intermediate JSONs.

## Technologies

- **Runtime**: [Bun](https://bun.sh/) (primary) and Node.js.
- **Shell**: [zx](https://github.com/google/zx) for executing CLI tools.
- **Video/Audio**: [FFmpeg](https://ffmpeg.org/) for all processing.
- **AI/ML**:
  - [Face API (@vladmandic/face-api)](https://github.com/vladmandic/face-api): Face detection in frames.
  - [OpenAI Whisper](https://github.com/openai/whisper): Speech-to-text for subtitles.
- **Transcription**: Python-based Whisper installed in a local `.venv`.

## Commands

- `bun run setup`: Install dependencies (npm, python venv, whisper) and link the binary.
- `viralize run <video>`: Execute the full pipeline (Jumpcut -> Face Analysis -> Transcribe -> Review -> Render).
- `viralize list`: Show available color filters.
- `viralize clean`: Wipe the `tmp/` directory.
- `viralize check`: Verify if all system requirements (FFmpeg, Bun, Python) are met.

## Patterns

- **Research -> Strategy -> Execution**: Follow this lifecycle for any feature request.
- **Surgical Edits**: Use `replace` for targeted changes in large files.
- **Validation**: Always check linting (`bun run lint`) after modifications.
- **Interactive Review**: The `run` command includes a mandatory MPV-based review step before final rendering unless `--skip-review` is used.
