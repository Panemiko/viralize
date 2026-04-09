# Video to Reels 🎥

Transforme vídeos horizontais em Reels/TikToks virais automaticamente. Este script utiliza IA para detecção facial, corte inteligente, legendagem e filtros de cor.

![Example](/.github/banner.png)

## 🛠️ Requisitos do Sistema

Para rodar este projeto, você precisa ter as seguintes ferramentas instaladas e configuradas no seu PATH:

### 1. Engine
- **Node.js** (v18+) ou **Bun** (recomendado para performance)

### 2. Processamento de Vídeo & Áudio
- **FFmpeg**: Deve estar compilado com suporte a `libass` (para legendas) e `h264_nvenc` (se desejar usar GPU NVIDIA).
- **FFprobe**: (Geralmente incluído no pacote do FFmpeg).

### 3. Inteligência Artificial
- **Python 3.10+**: Necessário para o Whisper.
- **Ambiente Virtual**: Recomendado para evitar conflitos com o sistema.

#### Setup do Ambiente Python:
```bash
python -m venv .venv
./.venv/bin/pip install -r requirements.txt
```

### 🔧 Aceleração GPU (NVIDIA)

Se você tem uma RTX 4060 ou similar, garanta que o PyTorch consiga usar o CUDA:

**No Arch Linux / Manjaro:**
```bash
sudo pacman -S python-pytorch-cuda
```

**Verificar se a GPU está disponível para o Whisper:**
```bash
./.venv/bin/python -c "import torch; print(torch.cuda.is_available())"
```

## 🚀 Como usar

1.  **Inicialize o projeto (Node + Python):**
    ```bash
    bun run init
    ```

2.  **Prepare os arquivos:**
    - Coloque seus vídeos originais na pasta `./origins/`.
    - Certifique-se de que seus filtros `.CUBE` estejam em `./assets/filters/`.

3.  **Execute a conversão:**
    ```bash
    bun start -i "./origins/meu-video.mp4" -f "arabica" -o "resultado"
    ```
    *Ou use `npm start -- -i ...` se não tiver o bun.*

4.  **Parâmetros:**
    - `-i | --input`: Caminho do vídeo original.
    - `-f | --filter`: Nome do filtro LUT (sem a extensão .CUBE).
    - `-o | --output`: Nome do arquivo final (será salvo na pasta `/videos`).

## ✨ Funcionalidades

- [x] **Smart Crop**: Centralização automática baseada em detecção facial.
- [x] **Legendas**: Geração automática de legendas animadas via Whisper.
- [x] **Color Grading**: Aplicação de filtros cinemáticos (LUTs .CUBE).
- [x] **Áudio Premium**: Normalização e limpeza de ruído (via RNNN).
- [x] **Aceleração por GPU**: Suporte a NVENC para renderização ultra-rápida.
