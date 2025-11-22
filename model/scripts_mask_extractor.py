#!/usr/bin/env python3
"""
Make binary masks from a colored image.
Input: a PNG/JPG where each part is painted with a unique color.
Output: mask files saved to out_dir/mask_part_{i}.png (0/255 single-channel).

Usage:
    python scripts/mask_extractor.py input_colored.png out_masks_dir
"""
import sys
from pathlib import Path
from PIL import Image
import numpy as np
from skimage import morphology

def main():
    if len(sys.argv) < 3:
        print("Usage: python scripts/mask_extractor.py input_colored.png out_masks_dir [--bg R,G,B]")
        sys.exit(1)

    img_path = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)

    bg_color = None
    if "--bg" in sys.argv:
        idx = sys.argv.index("--bg")
        if idx + 1 < len(sys.argv):
            bg_color = tuple(int(x) for x in sys.argv[idx+1].split(","))
    img = Image.open(img_path).convert("RGB")
    arr = np.array(img)
    h, w, _ = arr.shape

    # flatten unique colors
    colors = np.unique(arr.reshape(-1, 3), axis=0)
    masks_saved = []
    count = 0
    for c in colors:
        c = tuple(int(x) for x in c)
        if bg_color is not None and c == bg_color:
            continue
        # create mask where pixels equal the color
        mask = np.all(arr == c, axis=2).astype(np.uint8)
        # optional: remove small objects (noise)
        mask = morphology.remove_small_objects(mask.astype(bool), min_size=100).astype(np.uint8)
        if mask.sum() == 0:
            continue
        mask_img = Image.fromarray((mask * 255).astype('uint8'), mode="L")
        out_path = out_dir / f"mask_part_{count}.png"
        mask_img.save(out_path)
        masks_saved.append(str(out_path))
        count += 1

    print(f"Saved {len(masks_saved)} masks to {out_dir}")
    for p in masks_saved:
        print("  ", p)

if __name__ == "__main__":
    main()