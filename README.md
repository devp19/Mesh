# Mesh - The Coordination Layer for GeoSpatial Data

<img width="2920" height="1548" alt="image" src="https://github.com/user-attachments/assets/397486b0-2fa0-4e24-83b1-4fdca3e0a1cb" />

## Inspiration

3D model processing has always been a bottleneck in geospatial workflows. Traditional pipelines require complex software stacks, manual component extraction, and hours of processing time. Engineers, educators, and researchers spend countless hours breaking down 3D models, identifying components, and creating educational visualizations — all through tedious, error-prone manual processes.

We asked ourselves: What if you could process 3D meshes as easily as you process images?

What if, instead of spending hours in Blender or CAD software manually extracting components, you could upload a GLB file and have AI automatically identify, annotate, and explain every part? What if you could control 3D visualizations with physical hardware, making complex models as intuitive to explore as picking up a physical object?

That's when Mesh was born.

## What it does

Mesh is an AI-powered 3D model processing platform that automates mesh component extraction, identification, and educational visualization — without complex pipelines.

### Core Features

#### 1. AI-Powered Component Identification

**Gemini Pro Integration**: Real-time 3D mesh component identification via OpenRouter API. When users trigger AI identification, Gemini analyzes highlighted mesh components from screenshots, providing structured JSON responses with part names, descriptions, categories, and confidence scores. It also generates annotated images with wireframe overlays and labels for educational visualization.

**GPT-4 Mesh Explanation**: Processes identified mesh components to generate detailed educational explanations of individual object meshes. After component identification, GPT-4 analyzes mesh geometry, position, and context to provide comprehensive descriptions, functional explanations, and educational content about each component's role and characteristics.

**Automated Component Extraction**: Gemini Pro analyzes 3D model structures and intelligently identifies individual components within complex meshes. The model processes geometric data and contextual information to segment models into distinct parts — like identifying a helmet, chest plate, and gauntlets in a character model — without manual labeling.

#### 2. Dual Processing Pipeline

**SAM3D META Model**: Custom-built 3D segmentation model powered by Meta's SAM (Segment Anything Model) architecture, fine-tuned for geospatial mesh processing. It performs automated component extraction and mesh segmentation directly from 3D models, providing superior accuracy especially on larger meshes (>100 mesh objects).

**Sketchfab Import Pipeline**: Imports pre-processed 3D models from Sketchfab's platform, leveraging their optimized meshes and metadata for faster rendering times. This solution offers faster processing with pre-optimized assets, especially for smaller to medium-sized models.

**Performance Metrics**:

<img width="1005" height="525" alt="PerformanceMetricsChart" src="https://github.com/user-attachments/assets/63dff828-4bad-46a8-8237-db5f0081ca11" />

<img width="1005" height="230" alt="PerformaceMetricsImage" src="https://github.com/user-attachments/assets/7a12dbd4-a361-488a-9d6e-f687e5726ff8" />

#### 3. Interactive 3D Visualization

**Real-time Mesh Viewer**: Built with Three.js and React Three Fiber, featuring:

- Holo and solid view modes
- Component isolation and highlighting
- Exploded view with adjustable distance
- Mesh splitting and component extraction
- Bloom post-processing effects
- Smooth camera controls with OrbitControls

**Interactive Component Selection**: Click or hover over any mesh component to see detailed information, trigger AI identification, or isolate specific parts for closer examination.

#### 4. Arduino M5StickCPlus2 Motion Control

**Camera Stick**: Real-time 3D mesh rotation control using the M5StickCPlus2's IMU sensors. The device streams quaternion orientation data via BLE at 500Hz, enabling smooth camera rotation in the 3D viewer. Button A toggles streaming, Button B triggers mesh splitting.

**Object Stick**: Button-based controller for 3D model interactions. Sends special quaternion patterns via BLE to trigger specific actions:

- Button A: Triggers AI identification (q = {1.0, 1.0, 1.0, 0.0})
- Button B: Cycles through zoom levels (2x zoom in, 2x zoom out)

**Technical Specifications**:

- Streaming Rate: 500Hz BLE quaternion updates
- Gyro Calibration: 250 samples (1s bias estimation)
- Latency: <2ms end-to-end response
- Madgwick Filter: Fuses gyro (rad/s) + accel (g) for orientation
- Relative Quaternion: q_rel = qCurr × conj(qRef) for re-centering

#### 5. File Management & Export

**Upload Support**: Upload your own GLB files created on any CAD software to break down and learn about its components in real time. Our intelligent mesh analysis automatically identifies individual parts, materials, and structural elements.

**Export Capabilities**: Export individual components or complete assemblies with precise measurements and material properties. Compatible with major CAD platforms including SolidWorks, AutoCAD, Fusion 360, and Blender.

**Supported Formats**: GLB (with more formats coming soon!)

**Max File Size**: 100MB

#### 6. Sketchfab Integration

**Model Search**: Search Sketchfab's extensive library of downloadable 3D models directly from the interface. Intelligent scoring algorithm prioritizes exact matches, then partial matches, then tag-based results.

**Automatic Import**: Selected models are automatically downloaded and processed, with optimized mesh extraction and component identification.

**Filtering**: Automatically filters for downloadable models with reasonable polygon counts (100-100k faces) to ensure smooth processing.

## 🛠️ How we built it

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Frontend (Next.js 16)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │Three.js  │  │React 19  │  │TypeScript│  │Tailwind  │ │
│  │R3F       │  │          │  │          │  │CSS       │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                API Layer (Next.js API Routes)           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │AI Explain│  │Search    │  │Model     │  │Download  │ │
│  │(Gemini)  │  │(Sketchfab│  │Details   │  │Handler   │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    ▼               ▼
┌──────────────────────┐    ┌──────────────────────┐
│   External Services  │    │   Hardware Layer     │
│  ┌──────────────────┐│    │  ┌────────────────┐  │
│  │OpenRouter        ││    │  │Arduino         │  │
│  │- Gemini Pro      ││    │  │M5StickCPlus2   │  │
│  │- GPT-4           ││    │  │- IMU Sensors   │  │
│  └──────────────────┘│    │  │- BLE Streaming │  │
│  ┌──────────────────┐│    │  └────────────────┘  │
│  │Sketchfab API     ││    └──────────────────────┘
│  │- Model Search    ││
│  │- Download URLs   ││
│  └──────────────────┘│
└──────────────────────┘
```

### Technical Implementation

#### Frontend Magic

- **Next.js 16** with React 19 for cutting-edge performance and server-side rendering
- **Three.js + React Three Fiber**: Custom WebGL rendering with post-processing effects (bloom, shadows)
- **Framer Motion**: Orchestrated animations for seamless state transitions and modal interactions
- **Tailwind CSS**: Utility-first styling with custom color palette (#E5E6DA, #1D1E15, #DF6C42)
- **Dynamic Imports**: Code-split ModelViewer to prevent SSR issues and reduce initial bundle size

#### AI Pipeline Architecture

```typescript
// Multi-stage AI processing pipeline
1. Component Selection → User clicks/hovers mesh component
2. Screenshot Capture → Canvas-to-image conversion with highlighted component
3. Gemini Analysis → OpenRouter API call with image + geometric data
4. JSON Parsing → Structured extraction with fallback error handling
5. Image Annotation → Gemini generates annotated wireframe overlay
6. GPT-4 Explanation → Detailed educational content generation
7. UI Update → Real-time display of results with loading states
```

#### 3D Rendering Pipeline

- **GLTFLoader**: Loads GLB/GLTF models with automatic texture and material handling
- **BufferGeometryUtils**: Merges geometries for efficient rendering
- **EffectComposer**: Post-processing pipeline with RenderPass and UnrealBloomPass
- **OrbitControls**: Smooth camera manipulation with damping and constraints
- **Raycasting**: Precise mouse-to-3D coordinate conversion for component selection

#### BLE Integration

- **Web Bluetooth API**: Browser-native BLE communication (Chrome/Edge)
- **Quaternion Streaming**: 500Hz updates for smooth camera rotation
- **Madgwick Filter**: AHRS algorithm fusing gyroscope and accelerometer data
- **Relative Orientation**: Quaternion multiplication for re-centerable controls
- **Action Encoding**: Special quaternion patterns for button-triggered actions

#### Performance Optimizations

- **Lazy Loading**: Dynamic imports for heavy components (ModelViewer, CubeViewer)
- **Geometry Merging**: Combines small meshes to reduce draw calls
- **Frustum Culling**: Only renders visible objects
- **Request Animation Frame**: Smooth 60fps rendering loop
- **Debounced Auto-Save**: Prevents excessive API calls during rapid interactions
- **Image Optimization**: Canvas-to-base64 conversion with quality control

## What's next for Mesh

#### Enhanced AI Capabilities

- **Multi-Component Analysis**: Identify and explain relationships between multiple selected components
- **Custom Model Training**: Fine-tune component identification for specific domains (medical, automotive, etc.)
- **Voice Explanations**: Text-to-speech for hands-free learning
- **Comparison Mode**: Side-by-side analysis of similar components

#### Expanded Format Support

- **OBJ, FBX, STL**: Support for additional 3D file formats
- **Point Cloud Processing**: Handle LiDAR and photogrammetry data
- **CAD Format Import**: Direct import from SolidWorks, Fusion 360, etc.

#### Advanced Visualization

- **AR Mode**: View models in augmented reality on mobile devices
- **VR Support**: Full VR exploration with hand tracking
- **Collaborative Viewing**: Multiple users exploring the same model simultaneously
- **Animation Support**: Play back model animations and transformations

### Ultimate Goal

Make 3D model analysis as accessible as image analysis. Enable anyone — students, engineers, researchers — to understand complex 3D structures through AI-powered visualization and explanation, without requiring specialized software or expertise.

## Built With

**Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, Three.js, React Three Fiber

**Backend**: Node.js, Next.js API Routes

**AI/ML**: OpenRouter (Gemini Pro, GPT-4), Sketchfab API

**Hardware**: Arduino M5StickCPlus2, Web Bluetooth API, Madgwick AHRS Filter

**Infrastructure**: Vercel, Sketchfab

**Tools**: Framer Motion, GLTFLoader, EffectComposer, NimBLE-Arduino

## Hardware Deep Dive

### Arduino M5StickCPlus2 - Hardware Control

The M5StickCPlus2 provides physical control over 3D visualizations:

#### Camera Stick Firmware

- **IMU Sensors**: 6-axis gyroscope + accelerometer
- **Madgwick Filter**: AHRS algorithm fusing sensor data at 500Hz
- **Quaternion Math**: Euler-to-quaternion conversion (ZYX order)
- **Relative Orientation**: q_rel = qCurr × conj(qRef) for re-centerable controls
- **BLE Streaming**: 500Hz quaternion updates via NimBLE

#### Object Stick Firmware

- **Button Actions**: Encoded as special quaternion patterns
- **AI Identify**: q = {1.0, 1.0, 1.0, 0.0}
- **Zoom Control**: {-1.0, -1.0, -1.0, 0.0} for zoom in, {-2.0, -2.0, -2.0, 0.0} for zoom out
- **4-State Cycle**: 2x zoom in, 2x zoom out
- **Auto Re-advertise**: Automatic BLE reconnection on disconnect

#### Web Bluetooth Integration

- **Service UUID**: `12345678-1234-5678-1234-56789abcdef0`
- **Characteristic UUID**: `12345678-1234-5678-1234-56789abcdef1`
- **Packet Format**: `struct QuatPacket { float qx, qy, qz, qw; }`
- **Connection Management**: Device name-based identification, connection state monitoring

---

**Mesh** - Because understanding 3D shouldn't require a PhD in CAD software.

Built by Fenil Shah, Dev Patel, Kush Patel at HackWestern 12.

v.2.0.4 / System Status: Nominal
