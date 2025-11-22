```markdown
# MVP Pipeline: Colored image → per-part 3D models → exploded scene

What I did for you
- I built a small end-to-end MVP (scripts and brief README) that turns a colored image (each brain part painted a different color) into separate 3D part files and a single exploded GLB scene for quick visualization.
- Below is a clear, single-page writeup of the entire pipeline you can keep as a reference: inputs, outputs, each step, commands to run, file format expectations, common problems, and suggested improvements.

Goal (one sentence)
- Given a single image with each part painted a different color, produce one 3D model per part and an assembled / exploded scene to visualize how parts interconnect.

Quick overview (pipeline flow)
1. Prepare image (colored regions) → 2. Extract per-color binary masks → 3. Run SAM 3D inference per mask → 4. Export per-part mesh (PLY/GLB) → 5. Assemble and optionally explode parts into a single GLB for viewing.

Folder layout (recommended)
- repo-root/
  - images/
    - brain_colored.png
  - masks_out/            # produced by mask_extractor.py
    - mask_part_0.png
    - mask_part_1.png
  - parts_out/            # produced by run_sam3d_per_mask.py
    - mask_part_0.ply
    - mask_part_1.ply
  - exploded_scene.glb    # produced by assemble_exploded.py
  - scripts/
    - mask_extractor.py
    - run_sam3d_per_mask.py
    - assemble_exploded.py
  - checkpoints/hf/       # SAM 3D checkpoints you download per repo doc
  - sam-3d-objects/       # cloned repo (so notebook/ is importable)

Inputs — what each file should look like
- Colored image (images/brain_colored.png)
  - PNG recommended (lossless).
  - Each part painted a consistent solid color (distinct RGB values).
  - Background should be a known color (e.g., white) or consistent so it can be ignored.
  - Size: SAM 3D demos use ~512×512; higher resolution may improve detail but increases memory/time.

- Binary masks (masks_out/*.png)
  - Single-channel (grayscale) PNG.
  - Pixel values 0 (background) and 255 (part).
  - Exact same width/height as the colored image.
  - Ideally non-overlapping between parts. If overlaps exist, decide priority or pre-process to remove overlaps.

- SAM 3D checkpoints
  - Download via Hugging Face per the repo doc/setup.md; place in checkpoints/hf with pipeline.yaml present.

Outputs — what you get
- Per-part meshes: PLY or GLB files (one per mask).
- Combined exploded scene: GLB (single file with all parts, each translated away from center for an exploded view).
- Optional intermediate artifacts: logs, per-part textures, glb bytes from SAM 3D outputs.

Step-by-step pipeline (details)

1) Prepare & verify the colored image
- Ensure the colored image has distinct, flat colors for each part.
- Save as PNG. If you need to paint: use any image editor and avoid color gradients; pure region fills work best.
- Note the background color and keep it consistent (you can pass it to the mask extractor).

2) Make per-part binary masks (mask_extractor.py)
- Purpose: convert each unique non-background color into a black/white mask.
- Behavior:
  - Finds unique colors in the RGB image.
  - Skips the background color if specified (--bg R,G,B).
  - Removes tiny islands (noise) below a default size threshold (min_size=100 pixels — adjustable).
  - Saves masks as masks_out/mask_part_N.png.
- Command:
  - python scripts/mask_extractor.py images/brain_colored.png masks_out --bg 255,255,255
- Important: Inspect produced masks visually to ensure each mask covers the intended area and that masks are non-overlapping or handled as you want.

3) Run SAM 3D per mask (run_sam3d_per_mask.py)
- Purpose: call the SAM 3D inference pipeline once per mask to produce one 3D part per mask.
- How it works:
  - Imports the repo helper (notebook/inference.py) and constructs an Inference object with checkpoints/pipeline.yaml.
  - For each mask, runs inference(image, mask) and saves output (preferably out["gs"].save_ply() or writes out["glb"] bytes if available).
- Command:
  - python scripts/run_sam3d_per_mask.py images/brain_colored.png masks_out checkpoints/hf parts_out
- Practical tips:
  - This step is GPU-heavy — use a CUDA GPU for reasonable performance.
  - Use the same seed and pipeline settings across parts to maintain alignment.
  - If a mask is small or complex, try increasing image resolution or add a small dilation to the mask to give more context.

4) Assemble and create an exploded GLB (assemble_exploded.py)
- Purpose: load all produced part meshes and create a single GLB scene where each part is slightly translated away from the scene centroid to create an "exploded" look.
- Behavior:
  - Loads PLY/GLB/OBJ meshes via trimesh.
  - Computes scene centroid and a scene radius.
  - Translates each part along the vector from centroid to part centroid scaled by offset_scale (default 0.5).
  - Exports combined scene as GLB.
- Command:
  - python scripts/assemble_exploded.py parts_out exploded_scene.glb 0.5
- Inspect final GLB in Blender, Windows 3D Viewer, or a web glTF viewer.

Common problems and fixes
- Masks misaligned with image:
  - Ensure masks have exact same dimensions as the input image. If not, resize masks using nearest-neighbor interpolation to the image size.
- Overlapping masks produce conflicting parts:
  - Option A: edit masks manually to resolve overlaps.
  - Option B: subtract overlaps according to priority (e.g., higher-priority masks keep overlapped pixels).
  - Option C: add a small overlap margin for seam blending, then perform smoothing in post.
- Tiny/noisy parts created by color bleed:
  - Increase the min_size in the mask cleaner or manually clean masks in an editor.
- Parts don't align in 3D:
  - Use the same SAM 3D pipeline settings and seed for each mask and keep masks in the same image coordinate frame.
  - For very different results across parts, add a small overlap (1–3 px) between adjacent masks to avoid seam discontinuities.
- Output textures look wrong:
  - SAM 3D bakes texture from the input image view. For consistent textures across parts, you may need to run with texture-baking enabled and ensure camera/pose consistency.

Quality & limitations
- Single-image reconstructions are inherently ambiguous for internal structure. The parts will look plausible externally but are not medically accurate for internal anatomy.
- For anatomically correct brain segmentation, use MRI volume + medical segmentation tools (FreeSurfer, nnU-Net), then extract surfaces.
- Small or highly concave regions can produce noisy geometry — consider smoothing / remeshing tools (Blender decimate/remesh, isotropic remeshing) after export.

Suggested improvements (next steps beyond MVP)
- Overlap handling: implement mask priority ordering and automatic subtraction of overlaps.
- Seam blending: add small shared overlaps and a mesh smoothing step or seam stitching to reduce visible seams.
- Batch settings: allow different SAM 3D settings per mask (e.g., different seeds, denoise levels).
- GUI: lightweight web UI to draw/refine masks on the image and preview masks live.
- Medical pipeline: if you switch to MRI-based inputs, provide a marching-cubes export step from labeled NIfTI to surface meshes.
- Automation: a single Jupyter notebook that runs everything and previews masks/meshes inline for quick iteration.

Example checklist to run the MVP
- [ ] Clone sam-3d-objects repo into repo root (so notebook/ is importable).
- [ ] Install Python deps: pip install -r requirements.txt
- [ ] Authenticate to Hugging Face and download checkpoints into checkpoints/hf (follow doc/setup.md).
- [ ] Put your colored PNG at images/brain_colored.png.
- [ ] Run mask extractor:
      python scripts/mask_extractor.py images/brain_colored.png masks_out --bg 255,255,255
- [ ] Verify masks visually (open masks_out/*.png).
- [ ] Run SAM 3D per mask:
      python scripts/run_sam3d_per_mask.py images/brain_colored.png masks_out checkpoints/hf parts_out
- [ ] Create exploded GLB:
      python scripts/assemble_exploded.py parts_out exploded_scene.glb 0.5
- [ ] Open exploded_scene.glb in Blender or a glTF viewer.

Hardware & runtime expectations
- GPU: a modern CUDA GPU (e.g., 12–24 GB VRAM) will be needed for reasonable speed. On smaller GPUs runs may be slower or OOM.
- Time: each mask inference can take from ~30s to several minutes depending on resolution, GPU, and model settings. Expect tens of minutes for many parts.
- Memory: larger images and more complex masks increase memory and processing time.

Safety / ethical note
- If these are medical images or personal data, follow appropriate privacy and consent rules. Single-photo models are not a medical diagnostic tool. For clinical use, use validated medical imaging pipelines.

Short troubleshooting Q/A
- Q: Two adjacent parts have a visible gap in 3D. 
  A: Add a 1–3 px overlap in masks before running inference, or perform seam smoothing after export.
- Q: A part looks bad/noisy.
  A: Increase mask area (dilate mask), use higher-res image, or rerun with a different seed.
- Q: Parts misaligned after export.
  A: Ensure consistent seeds and identical pipeline settings; confirm all masks were generated from the same input image and not resized.

Final note (what I prepared and why)
- I prepared the small MVP scripts and this writeup so you have a repeatable, documented process you can run, adapt, and improve. Use the writeup as a checklist while you try one run: produce masks, verify them, run SAM 3D per mask, then assemble. The scripts are intentionally simple to keep the MVP easy to understand and to let you iterate quickly.

If you want, I can:
- produce a single self-contained Jupyter notebook that runs every step and shows inline previews of masks and the exported meshes, or
- add automatic overlap-priority handling and seam-smoothing to the MVP scripts.

```