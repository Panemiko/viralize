# 🎬 viralize

**viralize** is an automatic video-to-reels converter. It processes long-form videos (like podcasts or interviews) into a vertical format (9:16) with high-quality audio, automatic cuts, transcription, and visual enhancements.

---

## 🚀 Features

- **Audio Synchronization:** Synchronizes high-quality external audio with your video automatically using cross-correlation.
- **Noise Removal:** Enhances audio quality using the `arnndn` model for professional-sounding results.
- **Automatic Jumpcut:** Detects and removes silences to keep your content fast-paced and engaging.
- **Face Analysis:** Automatically frames the video to focus on the speaker using facial detection (TensorFlow).
- **Auto-Transcription:** Generates subtitles/captions automatically for your videos.
- **Visual Effects:**
  - Applies **LUT (.CUBE)** color filters for a professional look.
  - Adds a subtle **Slow Zoom** effect to increase visual engagement.
- **Interactive Review:** Open the processed video in `mpv` to review and edit subtitles before the final render.

---

## 📋 Requirements

Before you start, ensure you have the following installed on your system:

- **[Node.js](https://nodejs.org/):** JavaScript runtime.
- **[FFmpeg](https://ffmpeg.org/):** Essential for all video processing tasks. (Ensure it supports `arnndn` for noise removal).
- **[Python 3](https://www.python.org/):** Required for audio synchronization.

---

## 🛠️ Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/viralize.git
   cd viralize
   ```

2. **Initialize the project:**
   This will install Node dependencies, create a Python virtual environment, and install Python requirements.
   ```bash
   npm run setup
   ```

---

## 📖 Usage

### Core Command: `run`

The `run` command executes the full conversion pipeline.

```bash
# Basic usage (interactive prompts for filter and output name)
viralize run videos/my-video.mp4

# Advanced usage with all options
viralize run videos/my-video.mp4 \
  --audio high-quality-audio.wav \
  --filter tweed \
  --output final-reel \
  --subtitle manual-subs.ass
```

### Options for `run`

| Flag               | Description                                                     |
| :----------------- | :-------------------------------------------------------------- |
| `-i \| --input`    | Path to the input video file.                                   |
| `-a \| --audio`    | Path to an external high-quality audio file to sync.            |
| `-f \| --filter`   | Name of the LUT filter to apply (e.g., `tweed`, `remy`).        |
| `-o \| --output`   | Name for the output video file.                                 |
| `-s \| --subtitle` | Use a manual `.ass` subtitle file instead of auto-transcribing. |
| `--skip-sync`      | Skip audio synchronization.                                     |
| `--skip-noise`     | Skip noise removal.                                             |
| `--skip-jumpcut`   | Skip silence removal.                                           |
| `--skip-face`      | Skip face analysis (defaults to center framing).                |
| `--skip-subs`      | Skip subtitle generation.                                       |
| `--skip-zoom`      | Skip the slow zoom effect.                                      |
| `--skip-review`    | Skip interactive review before final render.                    |
| `--skip-render`    | Skip the final video rendering.                                 |

### Helper Subcommands

- **`viralize list`**: Lists all available color filters (LUTs).
- **`viralize check`**: Validates system dependencies (FFmpeg, Python, etc.).
- **`viralize clean`**: Clears the `tmp/` directory.
- **`viralize setup`**: Re-runs the project initialization.

---

## 🎨 Available Filters

Use `viralize list` to see the full list of available LUTs stored in `assets/filters/`.
Examples: `tweed`, `remy`, `django`, `neon`, `fusion`.

---

## ⚖️ License

This project is licensed under the [ISC License](LICENSE).
