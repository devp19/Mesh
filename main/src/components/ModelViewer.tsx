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
import { SimpleNoise } from '@/lib/three/SimpleNoise';

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
  const noiseGenRef = useRef<SimpleNoise>(new SimpleNoise());
  const animationFrameRef = useRef<number>();
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
    scene.background = new THREE.Color(0x0a0a0a);
    scene.fog = new THREE.FogExp2(0x0a0a0a, 0.02);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(8, 5, 8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = false;
    // Ensure correct clear color immediately
    renderer.setClearColor(0x0a0a0a, 1);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 100;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x222222, 2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 3);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = false;
    scene.add(dirLight);

    const blueLight = new THREE.SpotLight(0x00aaff, 5);
    blueLight.position.set(-10, 5, -5);
    blueLight.lookAt(0, 0, 0);
    scene.add(blueLight);

    // Shadow plane - FIX: Ensure proper depth testing/writing
    const planeGeo = new THREE.PlaneGeometry(50, 50);
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.3 });
    const shadowPlane = new THREE.Mesh(planeGeo, planeMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -4;
    shadowPlane.receiveShadow = true;
    shadowPlane.visible = false;
    scene.add(shadowPlane);
    shadowPlaneRef.current = shadowPlane;

    // Post-processing
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5, 0.4, 0.85
    );
    bloomPass.threshold = 0.1;
    bloomPass.strength = 0.5;
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
    setTimeout(() => generateModel('Brain'), 0);

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      if (composerRef.current) composerRef.current.render();
      
      if (!isIsolatingRef.current && generatedObjectsRef.current.length > 0) {
        generatedObjectsRef.current[0].rotation.y += 0.001;
      }
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

  const generateModel = (prompt: string) => {
    if (!sceneRef.current) return;

    generatedObjectsRef.current.forEach(obj => sceneRef.current!.remove(obj));
    generatedObjectsRef.current = [];
    resetView();

    const lowerPrompt = prompt.toLowerCase();
    let archetype = 'default';
    if (['brain', 'neuron', 'mind', 'cortex', 'lobe'].some(k => lowerPrompt.includes(k))) archetype = 'brain';
    else if (['engine', 'motor', 'machine', 'piston', 'gear'].some(k => lowerPrompt.includes(k))) archetype = 'mechanical';
    else if (['cell', 'nucleus', 'bacteria', 'virus'].some(k => lowerPrompt.includes(k))) archetype = 'cellular';

    const mainGroup = new THREE.Group();
    sceneRef.current.add(mainGroup);
    generatedObjectsRef.current.push(mainGroup);

    if (archetype === 'brain') createHighResBrain(mainGroup);
    else if (archetype === 'mechanical') createSolidEngine(mainGroup);
    else if (archetype === 'cellular') createSolidCell(mainGroup);
    else createDefaultAbstract(mainGroup);

    updateViewMode();
  };

  const createHighResBrain = (group: THREE.Group) => {
    const lobes = [
      { name: 'Frontal Left', col: 0xddaa88, xMult: -1, zOff: 0.8, yOff: 0.2, scale: [1, 1.1, 1.2], type: 'Cognition' },
      { name: 'Frontal Right', col: 0xddaa88, xMult: 1, zOff: 0.8, yOff: 0.2, scale: [1, 1.1, 1.2], type: 'Cognition' },
      { name: 'Parietal Left', col: 0xcc9988, xMult: -1, zOff: -0.5, yOff: 0.8, scale: [0.9, 1, 1], type: 'Sensation' },
      { name: 'Parietal Right', col: 0xcc9988, xMult: 1, zOff: -0.5, yOff: 0.8, scale: [0.9, 1, 1], type: 'Sensation' },
      { name: 'Temporal Left', col: 0xbb8877, xMult: -1, zOff: 0.2, yOff: -0.8, scale: [0.8, 0.8, 1.4], type: 'Memory' },
      { name: 'Temporal Right', col: 0xbb8877, xMult: 1, zOff: 0.2, yOff: -0.8, scale: [0.8, 0.8, 1.4], type: 'Memory' },
      { name: 'Occipital Left', col: 0xaa7766, xMult: -1, zOff: -1.8, yOff: 0, scale: [0.9, 0.9, 0.9], type: 'Vision' },
      { name: 'Occipital Right', col: 0xaa7766, xMult: 1, zOff: -1.8, yOff: 0, scale: [0.9, 0.9, 0.9], type: 'Vision' },
    ];

    lobes.forEach(lobe => {
      const geometry = new THREE.SphereGeometry(1.4, 64, 64);
      const pos = geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
        if (Math.sign(v.x) !== Math.sign(lobe.xMult)) v.x *= 0.05;
        const coarse = noiseGenRef.current.fbm(v.x * 0.5, v.y * 0.5, v.z * 0.5, 1);
        const fine = noiseGenRef.current.fbm(v.x * 3, v.y * 3, v.z * 3, 3);
        v.multiplyScalar(1 + (coarse * 0.1) + (fine * 0.05));
        v.x *= lobe.scale[0];
        v.y *= lobe.scale[1];
        v.z *= lobe.scale[2];
        v.x += lobe.xMult * 0.4;
        v.y += lobe.yOff;
        v.z += lobe.zOff;
        pos.setXYZ(i, v.x, v.y, v.z);
      }
      geometry.computeVertexNormals();
      const mats = createDualMaterials(new THREE.Color(lobe.col), 0.6, 0.0);
      const mesh = new THREE.Mesh(geometry, mats.holo);
      (mesh as any).userData = {
        name: lobe.name,
        description: `Key region for ${lobe.type.toLowerCase()} processing.`,
        type: 'Cortex',
        mats
      };
      group.add(mesh);
    });

    const stemGeo = new THREE.CylinderGeometry(0.6, 0.5, 3, 32);
    const stemMats = createDualMaterials(new THREE.Color(0xdddddd), 0.5, 0);
    const stem = new THREE.Mesh(stemGeo, stemMats.holo);
    stem.position.set(0, -2.5, -0.5);
    stem.rotation.x = 0.2;
    (stem as any).userData = { name: 'Brain Stem', description: 'Central Trunk.', type: 'Stem', mats: stemMats };
    group.add(stem);

    const cerGeo = new THREE.SphereGeometry(1.2, 48, 48);
    const cerPos = cerGeo.attributes.position;
    for (let i = 0; i < cerPos.count; i++) {
      const x = cerPos.getX(i), y = cerPos.getY(i), z = cerPos.getZ(i);
      const ridges = Math.sin(y * 20 + x * 5);
      cerPos.setXYZ(i, x * (1 + ridges * 0.02), y * 0.6, z * (1 + ridges * 0.02));
    }
    cerGeo.computeVertexNormals();
    const cerMats = createDualMaterials(new THREE.Color(0xcc8866), 0.7, 0);
    const cer = new THREE.Mesh(cerGeo, cerMats.holo);
    cer.position.set(0, -2, -1.5);
    (cer as any).userData = { name: 'Cerebellum', description: 'Motor control center.', type: 'Hindbrain', mats: cerMats };
    group.add(cer);
  };

  const createSolidEngine = (group: THREE.Group) => {
    const blockGeo = new THREE.BoxGeometry(3.5, 2.5, 5.5);
    const blockMats = createDualMaterials(new THREE.Color(0x8899aa), 0.3, 0.8);
    const block = new THREE.Mesh(blockGeo, blockMats.holo);
    (block as any).userData = { name: 'Engine Block', description: 'Cast aluminum housing.', type: 'Chassis', mats: blockMats };
    group.add(block);

    for (let i = 0; i < 4; i++) {
      const cylGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 32);
      const cylMats = createDualMaterials(new THREE.Color(0xffffff), 0.1, 1.0);
      const cyl = new THREE.Mesh(cylGeo, cylMats.holo);
      cyl.position.set(0, 1.5, -1.5 + i);
      (cyl as any).userData = { name: `Piston #${i + 1}`, description: 'Forged steel piston.', type: 'Moving Part', mats: cylMats };
      group.add(cyl);
    }

    const pipeGeo = new THREE.TorusKnotGeometry(1, 0.2, 64, 8, 2, 3);
    const pipeMats = createDualMaterials(new THREE.Color(0xaa4422), 0.8, 0.4);
    const pipe = new THREE.Mesh(pipeGeo, pipeMats.holo);
    pipe.position.set(2, 0, 0);
    pipe.scale.set(0.5, 1, 1);
    (pipe as any).userData = { name: 'Exhaust Manifold', description: 'High temp alloy.', type: 'Exhaust', mats: pipeMats };
    group.add(pipe);
  };

  const createSolidCell = (group: THREE.Group) => {
    const memGeo = new THREE.IcosahedronGeometry(3, 4);
    const pos = memGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      v.multiplyScalar(1 + noiseGenRef.current.noise(v.x, v.y, v.z) * 0.1);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    memGeo.computeVertexNormals();
    const memHolo = new THREE.MeshPhysicalMaterial({ color: 0x00ffaa, wireframe: true, transparent: true, opacity: 0.2 });
    const memSolid = new THREE.MeshPhysicalMaterial({
      color: 0x44ffbb, transmission: 0.8, thickness: 1.0, roughness: 0.2, ior: 1.33, transparent: true, opacity: 1
    });
    const membrane = new THREE.Mesh(memGeo, memHolo);
    (membrane as any).userData = { name: 'Cell Membrane', description: 'Phospholipid bilayer.', type: 'Membrane', mats: { holo: memHolo, solid: memSolid } };
    group.add(membrane);

    const nucGeo = new THREE.SphereGeometry(1, 32, 32);
    const nucMats = createDualMaterials(new THREE.Color(0xff0088), 0.4, 0.1);
    const nuc = new THREE.Mesh(nucGeo, nucMats.holo);
    (nuc as any).userData = { name: 'Nucleus', description: 'Genetic center.', type: 'Organelle', mats: nucMats };
    group.add(nuc);
  };

  const createDefaultAbstract = (group: THREE.Group) => {
    const geo = new THREE.IcosahedronGeometry(2, 1);
    const mats = createDualMaterials(new THREE.Color(0x00ffff));
    const mesh = new THREE.Mesh(geo, mats.holo);
    (mesh as any).userData = { name: 'Data Node', description: 'Abstract representation.', type: 'Node', mats };
    group.add(mesh);
  };

  const updateViewMode = () => {
    if (!sceneRef.current || !bloomPassRef.current || !shadowPlaneRef.current || !rendererRef.current) return;

    const isSolid = viewMode === 'solid';
    if (isSolid) {
      bloomPassRef.current.enabled = false;
      sceneRef.current.background = new THREE.Color(0x1a1a1a);
      (sceneRef.current.fog as THREE.FogExp2).color.setHex(0x1a1a1a);
      rendererRef.current.setClearColor(0x1a1a1a, 1);
      shadowPlaneRef.current.visible = true;
    } else {
      bloomPassRef.current.enabled = true;
      sceneRef.current.background = new THREE.Color(0x0a0a0a);
      (sceneRef.current.fog as THREE.FogExp2).color.setHex(0x0a0a0a);
      rendererRef.current.setClearColor(0x0a0a0a, 1);
      shadowPlaneRef.current.visible = false;
    }

    generatedObjectsRef.current.forEach(group => {
      group.traverse(child => {
        if ((child as THREE.Mesh).isMesh && (child as any).userData?.mats) {
          const mesh = child as THREE.Mesh;
          const mats = (mesh as any).userData.mats;
          mesh.material = isSolid ? mats.solid : mats.holo;
          mesh.castShadow = false;
          mesh.receiveShadow = false;
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

      // Calculate original mesh center
      const originalBox = new THREE.Box3().setFromObject(mesh);
      const originalCenter = new THREE.Vector3();
      originalBox.getCenter(originalCenter);

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
        originalCenter,
        components: componentData
      });

      // Enable exploded view
      setIsExploded(true);
      applyExplodedView(newGroup, componentData, originalCenter);
      setShowExplodedControls(true);

      // Cleanup
      const rootIdx = generatedObjectsRef.current.indexOf(mesh);
      if (rootIdx > -1) generatedObjectsRef.current[rootIdx] = newGroup;

      setLoading(false);
      resetView();
    }, 100);
  };

  const applyExplodedView = (group: THREE.Group, componentData: ComponentData[], center: THREE.Vector3) => {
    // If not exploded OR distance is near zero, reset to original positions
    if (!isExploded || explosionDistance <= 0.05) {
      componentData.forEach(data => {
        data.mesh.position.copy(data.originalLocalPos);
      });
      return;
    }

    componentData.forEach((data, idx) => {
      // Calculate direction from center
      // Use centroid if available, else fallback to original position as vector
      let direction = data.originalLocalPos.clone();
      if (data.centroid && data.centroid.lengthSq() > 0.0001) {
          direction.copy(data.centroid);
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

      const offset = direction.multiplyScalar(explosionDistance);
      // Use clone() to avoid mutating originalLocalPos by accident if it was referenced
      data.mesh.position.copy(data.originalLocalPos).add(offset);
    });
  };

  useEffect(() => {
    explodedGroupsRef.current.forEach((data, group) => {
      applyExplodedView(group, data.components, data.originalCenter);
    });
  }, [isExploded, explosionDistance]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !sceneRef.current) return;

    const url = URL.createObjectURL(file);
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

        // Calculate bounding box and center
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        // Center the model at origin
        model.position.x = -center.x;
        model.position.y = -center.y;
        model.position.z = -center.z;

        // Scale to fit
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 4 / maxDim;
        model.scale.set(scale, scale, scale);

        const meshes: THREE.Mesh[] = [];
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            meshes.push(mesh);
            const originalMat = mesh.material as THREE.MeshStandardMaterial;
            const baseColor = originalMat.color ? originalMat.color : new THREE.Color(0x00aaff);

            const mats = createDualMaterials(baseColor, 0.5, 0.2);
            if (originalMat.map) mats.solid = originalMat;

            (mesh as any).userData = {
              mats,
              name: mesh.name || `Imported Part ${meshes.length}`,
              description: 'Imported Mesh Geometry',
              type: 'Imported'
            };

            mesh.castShadow = false;
            mesh.receiveShadow = false;
          }
        });

        sceneRef.current!.add(model);
        generatedObjectsRef.current.push(model);
        updateViewMode();

        // Setup multi-mesh exploded view if needed
        if (meshes.length > 1) {
          setupMultiMeshExplodedView(model as THREE.Group, meshes);
        }

        URL.revokeObjectURL(url);
        
        // Reset file input to allow re-uploading the same file
        if (event.target) {
          event.target.value = '';
        }
      },
      undefined,
      (error) => {
        console.error('Error loading file:', error);
        alert('Error loading file. Please check the console for details.');
        URL.revokeObjectURL(url);
        // Reset file input on error too
        if (event.target) {
          event.target.value = '';
        }
      }
    );
  };

  const setupMultiMeshExplodedView = (group: THREE.Group, meshes: THREE.Mesh[]) => {
    const overallBox = new THREE.Box3().setFromObject(group);
    const overallCenter = new THREE.Vector3();
    overallBox.getCenter(overallCenter);

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

      componentData.push({
        mesh,
        originalLocalPos: localPos.clone(),
        centroid: meshCenter.clone()
      });
    });

    explodedGroupsRef.current.set(group, {
      originalCenter: overallCenter,
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
    <div className="fixed inset-0 bg-black z-50">
      <div className="w-full h-full relative">
        {/* Top Controls */}
        <div className="absolute top-0 left-0 w-full z-10 p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-white">VisionView</h1>
            <span className="px-2 py-1 bg-[#00ff87]/20 border border-[#00ff87]/50 rounded text-xs text-[#00ff87]">Beta</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setViewMode('holo')}
                className={`px-3 py-1.5 text-xs rounded ${viewMode === 'holo' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'}`}
              >
                Wireframe
              </button>
              <button
                onClick={() => setViewMode('solid')}
                className={`px-3 py-1.5 text-xs rounded ${viewMode === 'solid' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'}`}
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
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer"
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
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs hover:bg-white/10 transition-colors"
              >
                Close
              </button>
            )}
            {!onClose && (
              <Link
                href="/"
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs hover:bg-white/10 transition-colors"
              >
                Home
              </Link>
            )}
          </div>
        </div>

        {/* Bottom Prompt Bar */}
        <div className="absolute bottom-0 left-0 w-full z-10 p-6">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-3 items-center backdrop-blur-sm">
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
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/40 text-sm"
              />
              <button
                onClick={() => generateModel(prompt)}
                className="px-6 py-3 bg-[#00ff87] text-black rounded-xl text-sm font-medium hover:bg-[#00e677] transition-colors flex-shrink-0"
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
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" />
              </svg>
              Reset
            </button>
          )}
          <button
            onClick={exportGLB}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs hover:bg-white/10 transition-colors flex items-center gap-2"
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
            className={`absolute top-24 left-6 bottom-24 w-80 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm flex flex-col overflow-hidden transition-transform duration-300 ${
              showInspector ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex-shrink-0 border-b border-white/10 pb-4 px-6 pt-6">
              <h2 className="text-xl font-semibold text-white mb-2 truncate">{inspectorData.name}</h2>
              <span className="px-2 py-1 bg-[#00ff87]/20 border border-[#00ff87]/50 rounded text-xs text-[#00ff87]">
                {inspectorData.type}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div>
                <h3 className="text-xs text-white/50 uppercase tracking-wider mb-2">Description</h3>
                <p className="text-sm text-white/80 leading-relaxed break-words">{inspectorData.description}</p>
              </div>
              {showSplitSection && (
                <div className="mt-2 p-4 bg-[#00ff87]/10 border border-[#00ff87]/30 rounded-xl">
                  <div className="text-xs text-white/70 mb-3 font-medium uppercase tracking-wider">Actions</div>
                  <button
                    onClick={handleSplitMesh}
                    className="w-full px-4 py-3 bg-[#00ff87] text-black rounded-xl text-sm font-medium flex items-center justify-center gap-2 mb-3 hover:bg-[#00e677] transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 8v13H3V8" />
                      <path d="M1 3h22v5H1z" />
                      <path d="M10 12h4" />
                    </svg>
                    Split Mesh
                  </button>
                  <p className="text-xs text-white/60 mb-3 leading-relaxed break-words">
                    Separates disconnected geometry into distinct parts.
                  </p>
                  {showExplodedControls && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-white/70 font-medium">Exploded View</label>
                        <button
                          onClick={() => {
                            setIsExploded(!isExploded);
                          }}
                          className={`px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 ${
                            isExploded ? 'bg-[#00ff87]/20 border-[#00ff87]/50' : ''
                          }`}
                        >
                          {isExploded ? 'On' : 'Off'}
                        </button>
                      </div>
                      <div className="mt-2">
                        <label className="text-xs text-white/60 block mb-1.5">
                          Distance: {explosionDistance.toFixed(1)}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="3"
                          step="0.1"
                          value={explosionDistance}
                          onChange={(e) => setExplosionDistance(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="text-xs text-white/50 mb-1.5">Geometry</div>
                  <div className="text-white font-semibold text-sm">High Poly</div>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="text-xs text-white/50 mb-1.5">Status</div>
                  <div className="text-white font-semibold text-sm">Active</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tooltip */}
        <div 
          ref={tooltipRef}
          className="fixed z-50 px-3 py-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-sm text-white pointer-events-none opacity-0 transition-opacity duration-150"
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
        {loading && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex flex-col justify-center items-center text-white">
            <div className="text-lg font-medium mb-2">Processing geometry...</div>
            <div className="text-sm text-white/50">Analyzing connectivity & splitting meshes</div>
          </div>
        )}
      </div>
    </div>
  );
}

