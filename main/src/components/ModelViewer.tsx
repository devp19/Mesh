'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import BlockyLoader from './BlockyLoader';

interface ComponentData {
  mesh: THREE.Mesh;
  originalLocalPos: THREE.Vector3;
  centroid: THREE.Vector3;
}

interface ExplodedGroupData {
  originalCenter: THREE.Vector3;
  components: ComponentData[];
}

type ViewMode = 'holo' | 'solid';

interface ModelViewerProps {
  onClose?: () => void;
}

export default function ModelViewer({ onClose }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('holo');
  const [prompt, setPrompt] = useState('Brain');
  const [isExploded, setIsExploded] = useState(false);
  const [explosionDistance, setExplosionDistance] = useState(1.0);
  const [selectedObject, setSelectedObject] = useState<THREE.Object3D | null>(null);
  const [isIsolating, setIsIsolating] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [inspectorData, setInspectorData] = useState({ name: '', description: '', type: '' });
  const [showSplitSection, setShowSplitSection] = useState(false);
  const [showExplodedControls, setShowExplodedControls] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(false);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const shadowPlaneRef = useRef<THREE.Mesh | null>(null);
  const generatedObjectsRef = useRef<THREE.Object3D[]>([]);
  const hoveredObjectRef = useRef<THREE.Object3D | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const explodedGroupsRef = useRef<Map<THREE.Group, ExplodedGroupData>>(new Map());
  const animationFrameRef = useRef<number | null>(null);
  const isIsolatingRef = useRef(false);
  const selectedObjectRef = useRef<THREE.Object3D | null>(null);
  const viewModeRef = useRef<ViewMode>('holo');
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isIsolatingRef.current = isIsolating;
  }, [isIsolating]);

  useEffect(() => {
    selectedObjectRef.current = selectedObject;
  }, [selectedObject]);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);


  useEffect(() => {
    if (!containerRef.current) return;

    // Cleanup any existing canvas to prevent duplicates
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xE5E6DA); // Match new background
    scene.fog = new THREE.FogExp2(0xE5E6DA, 0.02);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(8, 5, 8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true; // Enable shadows for depth
    renderer.setClearColor(0xE5E6DA, 1);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 100;
    controlsRef.current = controls;

    // Lighting - Adjusted for light theme
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const accentLight = new THREE.SpotLight(0xDF6C42, 2); // Orange accent
    accentLight.position.set(-10, 5, -5);
    accentLight.lookAt(0, 0, 0);
    scene.add(accentLight);

    // Shadow plane
    const planeGeo = new THREE.PlaneGeometry(50, 50);
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.1, color: 0x1D1E15 }); // Dark shadow on light bg
    const shadowPlane = new THREE.Mesh(planeGeo, planeMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -4;
    shadowPlane.receiveShadow = true;
    shadowPlane.visible = false; // Controlled by view mode
    scene.add(shadowPlane);
    shadowPlaneRef.current = shadowPlane;

    // Post-processing
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5, 0.4, 0.85
    );
    bloomPass.threshold = 0.95; // High threshold to avoid blooming the light background
    bloomPass.strength = 0.4; 
    bloomPass.radius = 0.5;
    bloomPass.enabled = true;
    bloomPassRef.current = bloomPass;

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composerRef.current = composer;



    // Raycaster
    const raycaster = new THREE.Raycaster();
    raycasterRef.current = raycaster;

    // Initial model
    // generateModel is defined below, but available in useEffect due to closure scope if defined with var/function or const in outer scope?
    // Actually const functions are not hoisted. BUT useEffect runs after render, so generateModel will be defined.
    // setTimeout(() => generateModel('Brain'), 0);

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      if (composerRef.current) composerRef.current.render();
      
      // Auto-rotation removed to prevent interference with inspection
    };
    animate();

    // Resize handler for window
    const onWindowResize = () => {
       if (!cameraRef.current || !rendererRef.current || !composerRef.current) return;
       cameraRef.current.aspect = window.innerWidth / window.innerHeight;
       cameraRef.current.updateProjectionMatrix();
       rendererRef.current.setSize(window.innerWidth, window.innerHeight);
       composerRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onWindowResize);

    // Ensure correct clear color immediately
    renderer.setClearColor(0x0a0a0a, 1);

    return () => {
      window.removeEventListener('resize', onWindowResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const highlightMaterial = (obj: THREE.Mesh) => {
      if (!(obj as any).userData.mats) return;
      const currentMat = (obj.material as THREE.Material).clone();
      if ('emissive' in currentMat) {
        (currentMat as THREE.MeshStandardMaterial).emissive.setHex(0xffffff);
        (currentMat as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
      }
      if (viewModeRef.current === 'solid' && 'color' in currentMat) {
        (currentMat as THREE.MeshStandardMaterial).color.offsetHSL(0, 0, 0.2);
      }
      obj.material = currentMat;
  };

  const restoreMaterial = (obj: THREE.Mesh) => {
      if (!obj || !(obj as any).userData.mats) return;
      const mats = (obj as any).userData.mats;
      obj.material = viewModeRef.current === 'solid' ? mats.solid : mats.holo;
  };

  const handleMouseMove = (event: React.MouseEvent) => {
      if (!containerRef.current || !raycasterRef.current || !cameraRef.current || !sceneRef.current) return;

      // Update mouse ref for click events
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Hover effect logic
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(generatedObjectsRef.current, true);

      if (intersects.length > 0) {
        const object = intersects[0].object as THREE.Mesh;
        if ((object as any).userData.name && object !== hoveredObjectRef.current && object !== selectedObjectRef.current) {
          if (hoveredObjectRef.current && hoveredObjectRef.current !== selectedObjectRef.current) {
            restoreMaterial(hoveredObjectRef.current as THREE.Mesh);
          }
          hoveredObjectRef.current = object;
          highlightMaterial(object);
          containerRef.current.style.cursor = 'pointer';
          
          if (tooltipRef.current) {
            tooltipRef.current.textContent = (object as any).userData.name;
            tooltipRef.current.style.opacity = '1';
            tooltipRef.current.style.transform = `translate(${event.clientX + 10}px, ${event.clientY + 10}px)`;
          }
        }
      } else {
        if (hoveredObjectRef.current && hoveredObjectRef.current !== selectedObjectRef.current) {
          restoreMaterial(hoveredObjectRef.current as THREE.Mesh);
          hoveredObjectRef.current = null;
        }
        containerRef.current.style.cursor = 'default';
        
        if (tooltipRef.current) {
          tooltipRef.current.style.opacity = '0';
        }
      }
  };

  const handleClick = (event: React.MouseEvent) => {
      if (!raycasterRef.current || !cameraRef.current || !sceneRef.current) return;
      
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(generatedObjectsRef.current, true);
      
      if (intersects.length > 0) {
        const object = intersects[0].object;
        if ((object as any).userData?.name) {
          handleObjectClick(object);
        }
      }
  };



  const createDualMaterials = (baseColor: THREE.Color, roughness = 0.5, metalness = 0.1) => {
    const holo = new THREE.MeshPhysicalMaterial({
      color: baseColor,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
      emissive: baseColor,
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide
    });

    const solid = new THREE.MeshStandardMaterial({
      color: baseColor,
      wireframe: false,
      roughness,
      metalness,
      side: THREE.DoubleSide
    });

    return { holo, solid };
  };

  const loadModelFromUrl = (url: string, isBlob: boolean = false) => {
    if (!sceneRef.current) return;

    setLoading(true);
    setModelReady(false);
    setAnimationFinished(false);

    const loader = new GLTFLoader();

    // Clear existing models
    generatedObjectsRef.current.forEach(obj => sceneRef.current!.remove(obj));
    generatedObjectsRef.current = [];
    explodedGroupsRef.current.clear();
    resetView();

    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;
        
        // Flatten hierarchy to ensure Split Mesh works correctly
        const flatGroup = new THREE.Group();
        const meshes: THREE.Mesh[] = [];

        // 1. Update world matrices to capture current transforms
        model.updateMatrixWorld(true);

        // 2. Collect all meshes
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
             meshes.push(child as THREE.Mesh);
          }
        });

        // 3. Move meshes to flat group, preserving world transform
        meshes.forEach((mesh) => {
           const worldMatrix = mesh.matrixWorld.clone();
           
           // Create dual materials while we're here
           const originalMat = mesh.material as THREE.MeshStandardMaterial;
           const baseColor = originalMat.color ? originalMat.color : new THREE.Color(0x00aaff);
           const mats = createDualMaterials(baseColor, 0.5, 0.2);
           if (originalMat.map) mats.solid = originalMat;

           // Apply new material
           mesh.material = mats.solid; // Default to solid for now
           (mesh as any).userData = {
              mats,
              name: mesh.name || `Part ${meshes.length}`,
              description: 'Imported Geometry',
              type: 'Imported'
           };
           mesh.castShadow = false;
           mesh.receiveShadow = false;

           // Add to flat group
           flatGroup.add(mesh);
           
           // Apply world transform
           // Since flatGroup is at identity (0,0,0), setting local matrix to world matrix works
           mesh.matrix.copy(worldMatrix);
           mesh.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
           mesh.updateMatrixWorld();
        });

        // 4. Center and scale the flat group
        const box = new THREE.Box3().setFromObject(flatGroup);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        // Scale to fit (Target size ~4 units)
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 4 / (maxDim || 1);
        flatGroup.scale.set(scale, scale, scale);

        // Center the model at origin
        flatGroup.position.copy(center).multiplyScalar(-scale);
        flatGroup.updateMatrixWorld(true);

        sceneRef.current!.add(flatGroup);
        generatedObjectsRef.current.push(flatGroup);
        
        if (controlsRef.current) {
            controlsRef.current.reset();
        }
        
        updateViewMode();

        if (meshes.length > 1) {
          setupMultiMeshExplodedView(flatGroup, meshes);
        }

        if (isBlob) {
          URL.revokeObjectURL(url);
        }
        
        setModelReady(true);
      },
      (progress) => {
         // Optional logging
      },
      (error) => {
        console.error('Error loading file:', error);
        alert('Error loading file. See console.');
        if (isBlob) {
          URL.revokeObjectURL(url);
        }
        setLoading(false);
      }
    );
  };

  const generateModel = async (prompt: string) => {
    if (!sceneRef.current || !prompt.trim()) return;

    setLoading(true);
    
    try {
      console.log('Searching for:', prompt);
      const searchRes = await fetch(`/api/search?q=${encodeURIComponent(prompt)}`);
      const searchData = await searchRes.json();
      
      if (!searchRes.ok) {
        throw new Error(searchData.error + (searchData.details ? `: ${JSON.stringify(searchData.details)}` : '') || 'Search failed');
      }
      
      if (!searchData.uid) {
        alert('No 3D model found for this prompt.');
        setLoading(false);
        return;
      }
      
      console.log('Found UID:', searchData.uid);
      const downloadRes = await fetch(`/api/download?uid=${searchData.uid}`);
      const downloadData = await downloadRes.json();
      
      if (!downloadRes.ok || !downloadData.success) {
         if (downloadData.potentialUrls && downloadData.potentialUrls.length > 0) {
             console.log('Using potential URL fallback');
             // potentialUrls might be an array of strings. We need to find the best one.
             // Filter for .glb or .gltf if possible
             const bestUrl = downloadData.potentialUrls.find((u: string) => u.includes('.glb')) || 
                             downloadData.potentialUrls.find((u: string) => u.includes('.gltf')) || 
                             downloadData.potentialUrls[0];
             
             loadModelFromUrl(bestUrl, false);
             return;
         }
         throw new Error(downloadData.message || 'Failed to get download URL');
      }
      
      // Extract URL
      let modelUrl = downloadData.data.glb?.url || downloadData.data.gltf?.url;
      
      // Fallback: sometimes the structure is directly inside the data if the endpoint returned different format
      if (!modelUrl && downloadData.data.gltf) {
          modelUrl = downloadData.data.gltf.url;
      }
      
      if (!modelUrl) {
         // If we have a successful response but no direct GLB/GLTF url in standard location
         console.warn('Standard URL location failed, checking alternatives in response data...', downloadData);
         throw new Error('No compatible model format (GLB/GLTF) found in API response.');
      }
      
      console.log('Loading model from:', modelUrl);
      loadModelFromUrl(modelUrl, false);
      
    } catch (error) {
      console.error('Generation error:', error);
      alert('Failed to generate model. ' + (error instanceof Error ? error.message : ''));
      setLoading(false);
    }
  };

  const updateViewMode = () => {
    if (!sceneRef.current || !bloomPassRef.current || !shadowPlaneRef.current || !rendererRef.current) return;

    const isSolid = viewMode === 'solid';
    
    // Always disable bloom to maintain exact background color #E5E6DA
    bloomPassRef.current.enabled = false;
    
    sceneRef.current.background = new THREE.Color(0xE5E6DA); 
    (sceneRef.current.fog as THREE.FogExp2).color.setHex(0xE5E6DA);
    rendererRef.current.setClearColor(0xE5E6DA, 1);
    
    // Shadows only in solid mode
    shadowPlaneRef.current.visible = isSolid;

    generatedObjectsRef.current.forEach(group => {
      group.traverse(child => {
        if ((child as THREE.Mesh).isMesh && (child as any).userData?.mats) {
          const mesh = child as THREE.Mesh;
          const mats = (mesh as any).userData.mats;
          
          // Update materials for light theme if needed
          if (!isSolid) {
             // For Holo mode in light theme, we want dark wireframes
             const holoMat = mats.holo as THREE.MeshPhysicalMaterial;
             if (holoMat) {
                 holoMat.color.setHex(0xDF6C42); // Orange wireframe
                 holoMat.emissive.setHex(0xDF6C42);
                 // Reduced intensity to prevent color blowout, increased opacity for visibility
                 holoMat.emissiveIntensity = 1.0; 
                 holoMat.opacity = 0.8; 
             }
          }

          mesh.material = isSolid ? mats.solid : mats.holo;
          mesh.castShadow = isSolid; // Shadows only in solid mode
          mesh.receiveShadow = isSolid;
        }
      });
    });
  };

  useEffect(() => {
    updateViewMode();
  }, [viewMode]);

  const handleObjectClick = (object: THREE.Object3D) => {
    if (!sceneRef.current) return;

    const userData = (object as any).userData;
    if (!userData?.name) return;

    if (isIsolating && selectedObject !== object) {
      resetView();
      setTimeout(() => isolateComponent(object), 100);
    } else {
      isolateComponent(object);
    }
  };

  const isolateComponent = (object: THREE.Object3D) => {
    if (!sceneRef.current) return;

    if (selectedObject === object && isIsolating) return;

    // Restore all materials first if switching
    if (isIsolating && selectedObject) {
      sceneRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && child !== shadowPlaneRef.current && (child as any).userData?.mats) {
          const mesh = child as THREE.Mesh;
          const mats = (mesh as any).userData.mats;
          mesh.material = viewMode === 'solid' ? mats.solid : mats.holo;
          (mesh.material as THREE.Material).transparent = false;
          (mesh.material as THREE.Material).opacity = 1;
        }
      });
    }

    setSelectedObject(object);
    setIsIsolating(true);

    const userData = (object as any).userData;
    if (object.type === 'Mesh') {
      setShowSplitSection(true);
    } else {
      setShowSplitSection(false);
    }

    // Dim all other meshes
    sceneRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && child !== object && child !== shadowPlaneRef.current) {
        const mesh = child as THREE.Mesh;
        if ((mesh as any).userData?.mats) {
          const mats = (mesh as any).userData.mats;
          mesh.material = (viewMode === 'solid' ? mats.solid : mats.holo).clone();
        }
        (mesh.material as THREE.Material).transparent = true;
        (mesh.material as THREE.Material).opacity = 0.1;
      }
    });

    // Highlight selected
    const mesh = object as THREE.Mesh;
    const mats = (mesh as any).userData.mats;
    if (viewMode === 'holo') {
      mesh.material = mats.holo.clone();
      (mesh.material as THREE.MeshPhysicalMaterial).color.setHex(0x667eea);
      (mesh.material as THREE.Material).opacity = 1;
    } else {
      mesh.material = mats.solid.clone();
      (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x667eea);
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3;
    }

    setInspectorData({
      name: userData.name,
      description: userData.description,
      type: userData.type
    });
    setShowInspector(true);
  };

  const resetView = () => {
    if (!sceneRef.current) return;

    sceneRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && child !== shadowPlaneRef.current && (child as any).userData?.mats) {
        const mesh = child as THREE.Mesh;
        const mats = (mesh as any).userData.mats;
        mesh.material = viewMode === 'solid' ? mats.solid : mats.holo;
        (mesh.material as THREE.Material).transparent = false;
        (mesh.material as THREE.Material).opacity = 1;
      }
    });

    setSelectedObject(null);
    setIsIsolating(false);
    setShowInspector(false);
    setShowSplitSection(false);
  };

  const handleSplitMesh = async () => {
    if (!selectedObject || !(selectedObject as THREE.Mesh).geometry || !sceneRef.current) return;

    const mesh = selectedObject as THREE.Mesh;
    const parent = mesh.parent;
    const geom = mesh.geometry;

    // Check if part of multi-mesh model
    let parentGroup = parent;
    let multiMeshData: ExplodedGroupData | null = null;
    while (parentGroup) {
      if (explodedGroupsRef.current.has(parentGroup as THREE.Group)) {
        multiMeshData = explodedGroupsRef.current.get(parentGroup as THREE.Group)!;
        break;
      }
      parentGroup = parentGroup.parent;
    }

    if (multiMeshData) {
      setIsExploded(true);
      applyExplodedView(parentGroup as THREE.Group, multiMeshData.components, multiMeshData.originalCenter);
      setShowExplodedControls(true);
      return;
    }

    setLoading(true);

    setTimeout(() => {
      // Ensure indexed
      let indexedGeom = geom;
      if (!geom.index) {
        indexedGeom = BufferGeometryUtils.mergeVertices(geom);
      }

      const index = indexedGeom.index!.array;
      const vertexCount = indexedGeom.attributes.position.count;
      const facesCount = index.length / 3;

      // Build vertex-to-faces map
      const vertToFaces: number[][] = new Array(vertexCount).fill(0).map(() => []);
      for (let i = 0; i < facesCount; i++) {
        vertToFaces[index[i * 3]].push(i);
        vertToFaces[index[i * 3 + 1]].push(i);
        vertToFaces[index[i * 3 + 2]].push(i);
      }

      // BFS to find connected components
      const visitedFaces = new Uint8Array(facesCount);
      const components: number[][] = [];

      for (let i = 0; i < facesCount; i++) {
        if (visitedFaces[i]) continue;

        const component: number[] = [];
        const stack = [i];
        visitedFaces[i] = 1;

        while (stack.length > 0) {
          const f = stack.pop()!;
          component.push(f);

          const a = index[f * 3];
          const b = index[f * 3 + 1];
          const c = index[f * 3 + 2];

          [a, b, c].forEach(vIdx => {
            const neighbors = vertToFaces[vIdx];
            for (const n of neighbors) {
              if (!visitedFaces[n]) {
                visitedFaces[n] = 1;
                stack.push(n);
              }
            }
          });
        }
        components.push(component);
      }

      if (components.length <= 1) {
        alert('Mesh is already a single continuous piece. Cannot split further.');
        setLoading(false);
        return;
      }

      // Calculate local geometry center for explosion origin
      let localCenter = new THREE.Vector3();
      if (indexedGeom.boundingBox) {
         indexedGeom.boundingBox.getCenter(localCenter);
      } else {
         indexedGeom.computeBoundingBox();
         indexedGeom.boundingBox!.getCenter(localCenter);
      }

      // Reconstruct meshes
      const newGroup = new THREE.Group();
      newGroup.position.copy(mesh.position);
      newGroup.rotation.copy(mesh.rotation);
      newGroup.scale.copy(mesh.scale);

      const componentData: ComponentData[] = [];

      if (parent) parent.remove(mesh);
      if (parent) parent.add(newGroup);

      const posAttr = indexedGeom.attributes.position;

      components.forEach((faceIndices, idx) => {
        const newPositions: number[] = [];

        faceIndices.forEach(f => {
          const a = index[f * 3];
          const b = index[f * 3 + 1];
          const c = index[f * 3 + 2];

          newPositions.push(
            posAttr.getX(a), posAttr.getY(a), posAttr.getZ(a),
            posAttr.getX(b), posAttr.getY(b), posAttr.getZ(b),
            posAttr.getX(c), posAttr.getY(c), posAttr.getZ(c)
          );
        });

        const newGeo = new THREE.BufferGeometry();
        newGeo.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
        newGeo.computeVertexNormals();

        const mats = (mesh as any).userData.mats || createDualMaterials(new THREE.Color(0x00aaff));
        const newMesh = new THREE.Mesh(newGeo, viewMode === 'solid' ? mats.solid : mats.holo);
        (newMesh as any).userData = {
          name: `${(mesh as any).userData.name || 'Part'} - Sub ${idx + 1}`,
          description: 'Split component.',
          type: 'Sub-assembly',
          mats
        };
        newMesh.castShadow = false;
        newMesh.receiveShadow = false;

        // Calculate component centroid
        const positions = newGeo.attributes.position;
        let sumX = 0, sumY = 0, sumZ = 0;
        for (let i = 0; i < positions.count; i++) {
          sumX += positions.getX(i);
          sumY += positions.getY(i);
          sumZ += positions.getZ(i);
        }
        const geometryCenter = new THREE.Vector3(
          sumX / positions.count,
          sumY / positions.count,
          sumZ / positions.count
        );

        // Center the geometry to its own origin so rotation/scaling works from center
        newGeo.translate(-geometryCenter.x, -geometryCenter.y, -geometryCenter.z);

        // mats is already defined above (line 694), reusing it.
        
        // newMesh is already defined above (line 695). We are modifying it, but since it was created with newGeo BEFORE translation,
        // the geometry update (translate) will reflect in the mesh.
        // However, we need to update the userData if we wanted to change it, but the previous code set it up correctly.
        // The issue with the previous code was that newMesh was at (0,0,0) relative to parent, but geometry was offset.
        // Now geometry is centered at (0,0,0), and we will move newMesh to the centroid position.

        const localPos = geometryCenter.clone();

        componentData.push({
          mesh: newMesh,
          originalLocalPos: localPos.clone(),
          centroid: geometryCenter.clone()
        });

        newMesh.position.copy(localPos);
        newGroup.add(newMesh);
      });

      // Store exploded view data
      explodedGroupsRef.current.set(newGroup, {
        originalCenter: localCenter,
        components: componentData
      });

      // Enable exploded view
      setIsExploded(true);
      applyExplodedView(newGroup, componentData, localCenter);
      setShowExplodedControls(true);

      // Cleanup
      const rootIdx = generatedObjectsRef.current.indexOf(mesh);
      if (rootIdx > -1) generatedObjectsRef.current[rootIdx] = newGroup;

      setLoading(false);
      resetView();
    }, 100);
  };

  const applyExplodedView = (group: THREE.Group, componentData: ComponentData[], center: THREE.Vector3) => {
    // Center the model at origin
    if (isExploded || explosionDistance <= 0.05) {
      // If exploded view is active, we might need to be careful, but this function is mostly loop/animate
      // For now, relying on the stored data.
    }

    componentData.forEach((data, idx) => {
      // Calculate direction from center
      let direction = new THREE.Vector3();
      if (data.centroid) {
        direction.subVectors(data.centroid, center);
      } else {
        direction.subVectors(data.originalLocalPos, center);
      }
      
      const dist = direction.length();

      if (dist < 0.001) {
        const angle = (idx / componentData.length) * Math.PI * 2;
        const elevation = (idx % 3 - 1) * 0.3;
        direction.set(
          Math.cos(angle) * Math.cos(elevation),
          Math.sin(elevation),
          Math.sin(angle) * Math.cos(elevation)
        );
      } else {
        direction.normalize();
      }

      // Adjust explosion distance by model scale to ensure consistent visual displacement
      // regardless of the model's original size or the applied normalization scale.
      const scale = group.scale.x || 1;
      const adjustedDistance = explosionDistance / scale;

      const offset = direction.multiplyScalar(adjustedDistance);
      data.mesh.position.copy(data.originalLocalPos).add(offset);
    });
  };

  useEffect(() => {
    explodedGroupsRef.current.forEach((data, group) => {
      applyExplodedView(group, data.components, data.originalCenter);
    });
  }, [isExploded, explosionDistance]);

  useEffect(() => {
    if (modelReady && animationFinished) {
      setLoading(false);
      // Reset states for next load
      setModelReady(false);
      setAnimationFinished(false);
    }
  }, [modelReady, animationFinished]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !sceneRef.current) return;

    const url = URL.createObjectURL(file);
    loadModelFromUrl(url, true);

    // Reset file input to allow re-uploading the same file
    if (event.target) {
      event.target.value = '';
    }
  };

  const setupMultiMeshExplodedView = (group: THREE.Group, meshes: THREE.Mesh[]) => {
    const componentData: ComponentData[] = [];
    group.updateMatrixWorld();

    meshes.forEach((mesh) => {
      let localPos = new THREE.Vector3();

      if (mesh.parent === group) {
        localPos.copy(mesh.position);
      } else {
        const worldPos = new THREE.Vector3();
        mesh.getWorldPosition(worldPos);
        const groupInverse = new THREE.Matrix4().copy(group.matrixWorld).invert();
        localPos = worldPos.clone().applyMatrix4(groupInverse);
      }

      const meshBox = new THREE.Box3().setFromObject(mesh);
      const meshCenter = new THREE.Vector3();
      meshBox.getCenter(meshCenter);
      
      // Convert world center to local center relative to group
      // This ensures that when we use it for direction, it respects the group's transform
      group.worldToLocal(meshCenter);

      componentData.push({
        mesh,
        originalLocalPos: localPos.clone(),
        centroid: meshCenter.clone()
      });
    });

    // Calculate average local center based on component centroids
    const localCenter = new THREE.Vector3();
    if (componentData.length > 0) {
       const box = new THREE.Box3();
       componentData.forEach(c => box.expandByPoint(c.centroid));
       box.getCenter(localCenter);
    }

    explodedGroupsRef.current.set(group, {
      originalCenter: localCenter,
      components: componentData
    });
  };

  const exportGLB = () => {
    if (!sceneRef.current) return;
    const exporter = new GLTFExporter();
    exporter.parse(
      sceneRef.current,
      (result) => {
        const output = JSON.stringify(result, null, 2);
        const blob = new Blob([output], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `model-${Date.now()}.glb`;
        link.click();
      },
      (err) => console.error(err)
    );
  };

  return (
    <div className="absolute inset-0 bg-[#E5E6DA] z-0">
      <div className="w-full h-full relative">
        {/* Top Controls */}
        <div className="absolute top-0 left-0 w-full z-10 p-6 flex justify-between items-center pointer-events-none">
           {/* Top Left is empty now as nav is in dashboard layout */}
           <div></div>
           
          <div className="flex items-center gap-3 pointer-events-auto">
            <div className="flex items-center gap-1.5 bg-[#1D1E15]/5 border border-[#1D1E15]/10 rounded-lg p-1">
              <button
                onClick={() => setViewMode('holo')}
                className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${viewMode === 'holo' ? 'bg-[#1D1E15] text-[#E5E6DA]' : 'text-[#1D1E15]/60 hover:text-[#1D1E15]'}`}
              >
                Wireframe
              </button>
              <button
                onClick={() => setViewMode('solid')}
                className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${viewMode === 'solid' ? 'bg-[#1D1E15] text-[#E5E6DA]' : 'text-[#1D1E15]/60 hover:text-[#1D1E15]'}`}
              >
                Solid
              </button>
            </div>
            <input
              type="file"
              id="file-input"
              accept=".glb,.gltf"
              className="hidden"
              onChange={handleFileUpload}
            />
            <label
              htmlFor="file-input"
              className="px-4 py-2 bg-[#DF6C42] text-[#E5E6DA] rounded-lg text-xs font-bold hover:bg-[#1D1E15] transition-colors flex items-center gap-2 cursor-pointer uppercase tracking-wide"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload
            </label>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-[#1D1E15] text-[#E5E6DA] rounded-lg text-xs font-bold hover:bg-[#DF6C42] transition-colors uppercase tracking-wide"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Bottom Prompt Bar */}
        <div className="absolute bottom-0 left-0 w-full z-10 p-6 pointer-events-none">
          <div className="max-w-3xl mx-auto pointer-events-auto">
            <div className="bg-[#E5E6DA]/80 border border-[#1D1E15] backdrop-blur-md p-2 flex gap-3 items-center shadow-lg">
              <input
                id="prompt-input"
                type="text"
                placeholder="Generate procedural model (e.g., 'Brain')"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    generateModel(prompt);
                  }
                }}
                className="flex-1 bg-transparent border-none outline-none text-[#1D1E15] placeholder-[#1D1E15]/40 text-sm font-mono px-4"
              />
              <button
                onClick={() => generateModel(prompt)}
                className="px-6 py-3 bg-[#1D1E15] text-[#E5E6DA] text-sm font-bold hover:bg-[#DF6C42] transition-colors flex-shrink-0 uppercase tracking-wide"
              >
                Generate
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="absolute bottom-24 right-6 z-10 flex flex-col gap-3">
          {isIsolating && (
            <button
              onClick={resetView}
              className="px-4 py-2 bg-[#E5E6DA] border border-[#1D1E15] text-[#1D1E15] rounded-lg text-xs font-bold hover:bg-[#1D1E15] hover:text-[#E5E6DA] transition-colors flex items-center gap-2 uppercase tracking-wide shadow-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" />
              </svg>
              Reset
            </button>
          )}
          <button
            onClick={exportGLB}
            className="px-4 py-2 bg-[#E5E6DA] border border-[#1D1E15] text-[#1D1E15] rounded-lg text-xs font-bold hover:bg-[#1D1E15] hover:text-[#E5E6DA] transition-colors flex items-center gap-2 uppercase tracking-wide shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
        </div>

        {/* Inspector Panel */}
        {showInspector && (
          <div
            className={`absolute top-24 left-6 bottom-24 w-80 bg-[#E5E6DA]/90 border border-[#1D1E15] backdrop-blur-md flex flex-col overflow-hidden transition-transform duration-300 shadow-xl ${
              showInspector ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex-shrink-0 border-b border-[#1D1E15]/20 pb-4 px-6 pt-6">
              <h2 className="text-xl font-bold text-[#1D1E15] mb-2 truncate font-sans">{inspectorData.name}</h2>
              <span className="px-2 py-1 bg-[#DF6C42]/10 border border-[#DF6C42] rounded text-xs text-[#DF6C42] font-mono uppercase">
                {inspectorData.type}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 font-mono">
              <div>
                <h3 className="text-xs text-[#1D1E15]/50 uppercase tracking-wider mb-2">Description</h3>
                <p className="text-sm text-[#1D1E15] leading-relaxed break-words">{inspectorData.description}</p>
              </div>
              {showSplitSection && (
                <div className="mt-2 p-4 bg-[#1D1E15]/5 border border-[#1D1E15]/10 rounded-xl">
                  <div className="text-xs text-[#1D1E15]/70 mb-3 font-bold uppercase tracking-wider">Actions</div>
                  <button
                    onClick={handleSplitMesh}
                    className="w-full px-4 py-3 bg-[#1D1E15] text-[#E5E6DA] text-sm font-bold flex items-center justify-center gap-2 mb-3 hover:bg-[#DF6C42] transition-colors uppercase tracking-wide"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 8v13H3V8" />
                      <path d="M1 3h22v5H1z" />
                      <path d="M10 12h4" />
                    </svg>
                    Split Mesh
                  </button>
                  <p className="text-xs text-[#1D1E15]/60 mb-3 leading-relaxed break-words">
                    Separates disconnected geometry into distinct parts.
                  </p>
                  {showExplodedControls && (
                    <div className="mt-3 pt-3 border-t border-[#1D1E15]/10">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-[#1D1E15] font-bold uppercase">Exploded View</label>
                        <button
                          onClick={() => {
                            setIsExploded(!isExploded);
                          }}
                          className={`px-3 py-1.5 text-xs font-bold uppercase border transition-colors ${
                            isExploded 
                              ? 'bg-[#DF6C42] text-[#E5E6DA] border-[#DF6C42]' 
                              : 'bg-transparent text-[#1D1E15] border-[#1D1E15] hover:bg-[#1D1E15] hover:text-[#E5E6DA]'
                          }`}
                        >
                          {isExploded ? 'On' : 'Off'}
                        </button>
                      </div>
                      <div className="mt-2">
                        <label className="text-xs text-[#1D1E15]/60 block mb-1.5">
                          Distance: {explosionDistance.toFixed(1)}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="3"
                          step="0.1"
                          value={explosionDistance}
                          onChange={(e) => setExplosionDistance(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-[#1D1E15]/20 rounded-lg appearance-none cursor-pointer accent-[#DF6C42]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1D1E15]/5 p-3 border border-[#1D1E15]/10">
                  <div className="text-xs text-[#1D1E15]/50 mb-1.5 uppercase">Geometry</div>
                  <div className="text-[#1D1E15] font-bold text-sm">High Poly</div>
                </div>
                <div className="bg-[#1D1E15]/5 p-3 border border-[#1D1E15]/10">
                  <div className="text-xs text-[#1D1E15]/50 mb-1.5 uppercase">Status</div>
                  <div className="text-[#1D1E15] font-bold text-sm">Active</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tooltip */}
        <div 
          ref={tooltipRef}
          className="fixed z-50 px-3 py-2 bg-[#1D1E15] text-[#E5E6DA] border border-[#1D1E15] text-xs font-mono uppercase tracking-wide pointer-events-none opacity-0 transition-opacity duration-150 shadow-lg"
          style={{ top: 0, left: 0 }}
        />

        {/* Canvas Container */}
        <div 
          ref={containerRef} 
          className="w-full h-full" 
          onClick={handleClick}
          onMouseMove={handleMouseMove}
        />

        {/* Loader */}
        {loading && <BlockyLoader onFinished={() => setAnimationFinished(true)} />}
      </div>
    </div>
  );
}

