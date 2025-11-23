# Demo Models Directory

This directory contains the demo models and their pre-stored annotations for demo mode.

## Directory Structure

```
demo-models/
├── demo-config.json          # Configuration file listing all demo models
├── models/                    # GLB/GLTF model files
│   ├── brain.glb
│   ├── heart.glb
│   ├── engine.glb
│   ├── skull.glb
│   └── robot-arm.glb
├── annotations/              # Pre-generated annotation images
│   ├── brain-frontal-lobe.png
│   ├── heart-left-ventricle.png
│   ├── engine-piston.png
│   ├── skull-mandible.png
│   └── robot-arm-end-effector.png
└── previews/                 # Preview thumbnails (optional)
    ├── brain-preview.png
    ├── heart-preview.png
    ├── engine-preview.png
    ├── skull-preview.png
    └── robot-arm-preview.png
```

## How to Enable Demo Mode

Set the environment variable in your `.env.local` file:

```
NEXT_PUBLIC_DEMO_MODE=true
```

## Adding Demo Models

1. Add your GLB/GLTF model files to the `models/` directory
2. Generate annotation images for specific parts and save them to `annotations/`
3. Update `demo-config.json` with:
   - Model metadata (name, description, modelUrl)
   - Annotated parts with mesh name matching and annotation image paths

## Mesh Name Matching

The `meshName` field in `demo-config.json` should match the `name` property of meshes in your GLB/GLTF file. You can specify:
- A single string: `"meshName": "Frontal_Lobe"`
- An array of possible names: `"meshName": ["Frontal_Lobe", "FrontalLobe", "frontal_lobe"]`

The system will try to match the mesh name (case-insensitive, partial matching supported).

