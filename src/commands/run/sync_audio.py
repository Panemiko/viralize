import sys
import torch
import numpy as np

def load_raw(path):
    # Read raw 16-bit PCM data (S16LE)
    try:
        with open(path, "rb") as f:
            data = np.frombuffer(f.read(), dtype=np.int16)
        return torch.from_numpy(data.astype(np.float32))
    except Exception as e:
        raise RuntimeError(f"Failed to load raw audio {path}: {e}")

def find_offset(ref_file, target_file, sr=16000):
    # Load raw PCM data
    ref = load_raw(ref_file)
    target = load_raw(target_file)
    
    # Normalize
    ref = ref - ref.mean()
    target = target - target.mean()
    
    # Pad to power of 2 for FFT speed
    n = ref.shape[0] + target.shape[0] - 1
    N = 1 << (n-1).bit_length()
    
    # Compute cross-correlation using FFT
    REF = torch.fft.rfft(ref, n=N)
    TARGET = torch.fft.rfft(target, n=N)
    
    # Complex conjugate of TARGET for cross-correlation
    corr = torch.fft.irfft(REF * torch.conj(TARGET), n=N)
    
    # Find index of maximum correlation
    max_idx = torch.argmax(corr)
    
    # Correct for padding
    if max_idx > N // 2:
        offset_samples = max_idx - N
    else:
        offset_samples = max_idx
        
    return offset_samples.item() / sr

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python sync_audio.py <ref_raw> <target_raw>")
        sys.exit(1)
        
    try:
        # Defaulting to 16000Hz as we'll force this in ffmpeg
        offset = find_offset(sys.argv[1], sys.argv[2], sr=16000)
        print(offset)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
