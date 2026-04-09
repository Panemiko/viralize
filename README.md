# Video to Reels 🎥

Transform horizontal videos into viral Reels/TikToks automatically. This script uses AI for face detection, smart cropping, subtitling, and color filters.

![Example](/.github/banner.png)

## 🛠️ System Requirements

To run this project, you need the following tools installed and configured in your PATH:

### 1. Engine
- **Node.js** (v18+) or **Bun** (recommended for performance)

### 2. Video & Audio Processing
- **FFmpeg**: Must be compiled with `libass` support (for subtitles) and `h264_nvenc` (if you want to use NVIDIA GPU).
- **FFprobe**: (Usually included with the FFmpeg package).
- **MPV**: Required for previewing and reviewing subtitles before rendering.

### 3. Artificial Intelligence
- **Python 3.10+**: Required for Whisper.
- **Virtual Environment**: Recommended to avoid system conflicts.

#### Python Environment Setup:
```bash
python -m venv .venv
./.venv/bin/pip install -r requirements.txt
```

### 🔧 GPU Acceleration (NVIDIA)

If you have an RTX 4060 or similar, ensure that PyTorch can use CUDA:

**On Arch Linux / Manjaro:**
```bash
sudo pacman -S python-pytorch-cuda
```

**Verify if GPU is available for Whisper:**
```bash
./.venv/bin/python -c "import torch; print(torch.cuda.is_available())"
```

## 🚀 How to use

1.  **Initialize the project (Node + Python):**
    ```bash
    bun run init
    ```

2.  **Prepare the files:**
    - Place your original videos in the `./origins/` folder.
    - Ensure your `.CUBE` filters are in `./assets/filters/`.

3.  **Run the conversion:**
    ```bash
    bun start -i "./origins/my-video.mp4" -f "arabica" -o "result"
    ```
    *Or use `npm start -- -i ...` if you don't have bun.*

4.  **Parameters:**
    - `-i | --input`: Path to the original video.
    - `-f | --filter`: Name of the LUT filter (without the .CUBE extension).
    - `-o | --output`: Name of the final file (will be saved in the `/videos` folder).

## ✨ Features

- [x] **Smart Crop**: Automatic centering based on face detection.
- [x] **Subtitles**: Automatic generation of animated subtitles via Whisper.
- [x] **Color Grading**: Application of cinematic filters (.CUBE LUTs).
- [x] **Premium Audio**: Normalization and noise removal (via RNNN).
- [x] **GPU Acceleration**: NVENC support for ultra-fast rendering.

