#!/usr/bin/env python3
"""
Make binary masks from a colored image.
Input: a PNG/JPG where each part is painted with a unique color.
Output: mask files saved to out_dir/mask_part_{i}.png (0/255 single-channel).

Usage:
    python scripts/mask_extractor.py input_colored.png out_masks_dir [--bg R,G,B] [--quantize N] [--tolerance T]
"""
import sys
from pathlib import Path
from PIL import Image
import numpy as np
from skimage import morphology
from collections import Counter

def quantize_colors(arr, n_colors=16):
    """Quantize colors to reduce the number of unique colors."""
    # Reshape to list of pixels
    pixels = arr.reshape(-1, 3)
    # Quantize each channel
    quantized = (pixels // n_colors) * n_colors
    # Get unique quantized colors
    unique_colors = np.unique(quantized, axis=0)
    return unique_colors, quantized.reshape(arr.shape)

def get_color_tolerance_mask(arr, target_color, tolerance=10):
    """Create mask for colors within tolerance of target color."""
    diff = np.abs(arr.astype(np.int16) - np.array(target_color))
    return np.all(diff <= tolerance, axis=2)

def main():
    if len(sys.argv) < 3:
        print("Usage: python scripts/mask_extractor.py input_colored.png out_masks_dir [--bg R,G,B] [--quantize N] [--tolerance T]")
        sys.exit(1)

    img_path = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)

    # Parse arguments
    bg_color = None
    quantize_level = 32  # Default: quantize to 32 levels per channel
    tolerance = 10  # Default tolerance for color matching
    
    if "--bg" in sys.argv:
        idx = sys.argv.index("--bg")
        if idx + 1 < len(sys.argv):
            bg_color = tuple(int(x) for x in sys.argv[idx+1].split(","))
    
    if "--quantize" in sys.argv:
        idx = sys.argv.index("--quantize")
        if idx + 1 < len(sys.argv):
            quantize_level = int(sys.argv[idx+1])
    
    if "--tolerance" in sys.argv:
        idx = sys.argv.index("--tolerance")
        if idx + 1 < len(sys.argv):
            tolerance = int(sys.argv[idx+1])
    
    print(f"Loading image: {img_path}")
    img = Image.open(img_path).convert("RGB")
    arr = np.array(img)
    h, w, _ = arr.shape
    print(f"Image size: {w}x{h}")

    # Quantize colors to reduce unique color count
    print(f"Quantizing colors (level={quantize_level})...")
    unique_colors, quantized_arr = quantize_colors(arr, quantize_level)
    print(f"Found {len(unique_colors)} unique colors after quantization")
    
    if len(unique_colors) > 100:
        print(f"WARNING: Still {len(unique_colors)} colors found. Consider:")
        print(f"  - Using --quantize with a larger value (e.g., 64 or 128)")
        print(f"  - Using --tolerance to group similar colors")
        print(f"  - Ensuring your image has solid/flat colors per region")
    
    masks_saved = []
    count = 0
    total = len(unique_colors)
    
    for i, c in enumerate(unique_colors):
        c = tuple(int(x) for x in c)
        if bg_color is not None:
            # Check if this color is close to background (use larger tolerance for background)
            bg_tolerance = max(tolerance, 30)  # At least 30 pixel difference for background
            if np.all(np.abs(np.array(c) - np.array(bg_color)) <= bg_tolerance):
                print(f"Skipping background color RGB{c}...")
                continue
        
        print(f"Processing color {i+1}/{total}: RGB{c}...", end=" ", flush=True)
        
        # Create mask using tolerance for better matching
        mask = get_color_tolerance_mask(quantized_arr, c, tolerance)
        mask = mask.astype(np.uint8)
        
        # Remove small objects (noise)
        mask = morphology.remove_small_objects(mask.astype(bool), min_size=100).astype(np.uint8)
        
        if mask.sum() == 0:
            print("(skipped - empty after cleanup)")
            continue
        
        mask_img = Image.fromarray((mask * 255).astype('uint8'), mode="L")
        out_path = out_dir / f"mask_part_{count}.png"
        mask_img.save(out_path)
        masks_saved.append(str(out_path))
        print(f"✓ saved ({mask.sum()} pixels)")
        count += 1

    print(f"\n✓ Saved {len(masks_saved)} masks to {out_dir}")
    for p in masks_saved:
        print("  ", p)

if __name__ == "__main__":
    main()