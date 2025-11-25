"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import { AnimatePresence } from "framer-motion";
import BlockyLoader from "./BlockyLoader";
import AIInferenceLoader from "./AIInferenceLoader";
import OnboardingOverlay from "./OnboardingOverlay";
import { DEMO_MODELS, getDemoAnnotation, DemoModel } from "@/lib/demo-config";

const IS_PRODUCTION_DEMO = process.env.NEXT_PUBLIC_PRODUCTION_DEMO === "true";

interface ComponentData {
  mesh: THREE.Mesh;
  originalLocalPos: THREE.Vector3;
  centroid: THREE.Vector3;
}

interface ExplodedGroupData {
  originalCenter: THREE.Vector3;
  components: ComponentData[];
}

type ViewMode = "holo" | "solid";

interface ModelViewerProps {
  onClose?: () => void;
}

export default function ModelViewer({ onClose }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("holo");
  const [prompt, setPrompt] = useState("");
  const [isExploded, setIsExploded] = useState(false);
  const [explosionDistance, setExplosionDistance] = useState(1.0);
  const [selectedObject, setSelectedObject] = useState<THREE.Object3D | null>(
    null
  );
  const [isIsolating, setIsIsolating] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [aiIdentifyActive, setAiIdentifyActive] = useState(false); // Track if AI identify modal is showing
  const [generateStarted, setGenerateStarted] = useState(false);
  const [inspectorData, setInspectorData] = useState({
    name: "",
    description: "",
    type: "",
  });
  const [showInspector, setShowInspector] = useState(false);
  const [annotationOverlay, setAnnotationOverlay] = useState<string | null>(
    null
  );
  const [showSplitSection, setShowSplitSection] = useState(false);
  const [showExplodedControls, setShowExplodedControls] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(false);
  const [showAnnotatedModal, setShowAnnotatedModal] = useState(false);
  const showAnnotatedModalRef = useRef(false);
  useEffect(() => { showAnnotatedModalRef.current = showAnnotatedModal; }, [showAnnotatedModal]);
  const [annotatedImage, setAnnotatedImage] = useState<string | null>(null);
  const [showInferenceLoader, setShowInferenceLoader] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const showInferenceLoaderRef = useRef(false);
  useEffect(() => { showInferenceLoaderRef.current = showInferenceLoader; }, [showInferenceLoader]);
  const aiIdentifyActiveRef = useRef(false);
  useEffect(() => { aiIdentifyActiveRef.current = aiIdentifyActive; }, [aiIdentifyActive]);

  const [inferenceLoaderReady, setInferenceLoaderReady] = useState(false);
  const [currentDemoModelId, setCurrentDemoModelId] = useState<string | null>(null);
  const [isBottomDropdownOpen, setIsBottomDropdownOpen] = useState(false);
  const bottomDropdownRef = useRef<HTMLDivElement>(null);
  const [showInteractionHint, setShowInteractionHint] = useState(false);
  const [objConnected, setObjConnected] = useState(false);
  const [camConnected, setCamConnected] = useState(false);
  const [objDeviceName, setObjDeviceName] = useState<string>("—");
  const [camDeviceName, setCamDeviceName] = useState<string>("—");

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const shadowPlaneRef = useRef<THREE.Mesh | null>(null);
  const generatedObjectsRef = useRef<THREE.Object3D[]>([]);
  const hoveredObjectRef = useRef<THREE.Object3D | null>(null);
  const placeholderRef = useRef<THREE.Mesh | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const explodedGroupsRef = useRef<Map<THREE.Group, ExplodedGroupData>>(
    new Map()
  );
  const animationFrameRef = useRef<number | null>(null);
  const isIsolatingRef = useRef(false);
  const selectedObjectRef = useRef<THREE.Object3D | null>(null);
  // Store AI annotations mapped by object UUID to persist session knowledge correctly
  // Key: Object UUID, Value: { annotatedImage: string, name: string, description: string, type: string }
  const annotationsCacheRef = useRef<Record<string, any>>({});
  const splitMeshLastTimeRef = useRef<number>(0); // Fix TypeScript errors
  const viewModeRef = useRef<ViewMode>("holo");
  const tooltipRef = useRef<HTMLDivElement>(null);

  // BLE stick refs
  const objDevRef = useRef<BluetoothDevice | null>(null);
  const objCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const camDevRef = useRef<BluetoothDevice | null>(null);
  const camCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const objConnectedRef = useRef(false);
  const camConnectedRef = useRef(false);

  // Camera control refs for stick-based controls
  const cameraStateRef = useRef<{
    camR: number;
    camAz: number;
    camEl: number;
    camAzT: number;
    camElT: number;
    translateT: THREE.Vector2;
    translateV: THREE.Vector2;
  }>({
    camR: 8,
    camAz: Math.PI / 4,
    camEl: Math.PI / 6,
    camAzT: Math.PI / 4,
    camElT: Math.PI / 6,
    translateT: new THREE.Vector2(0, 0),
    translateV: new THREE.Vector2(0, 0),
  });

  // Quaternion refs
  const qDevObjRef = useRef(new THREE.Quaternion());
  const qZeroObjRef = useRef(new THREE.Quaternion());
  const qZeroObjInvRef = useRef(new THREE.Quaternion());
  const objZeroSetRef = useRef(false);
  const qDevCamRef = useRef(new THREE.Quaternion());
  const qZeroCamRef = useRef(new THREE.Quaternion());
  const qZeroCamInvRef = useRef(new THREE.Quaternion());
  const camZeroSetRef = useRef(false);
  const lastRelCamRef = useRef<THREE.Quaternion | null>(null);
  const lastCamPacketTimeRef = useRef(0);
  const qAxisFixRef = useRef(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0, 'XYZ')));
  const eObjRef = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
  const eCamRef = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
  const movementPausedRef = useRef(false);

  useEffect(() => {
    isIsolatingRef.current = isIsolating;
  }, [isIsolating]);

  useEffect(() => {
    selectedObjectRef.current = selectedObject;
  }, [selectedObject]);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  // Handle clicks outside bottom dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bottomDropdownRef.current && !bottomDropdownRef.current.contains(event.target as Node)) {
        setIsBottomDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Show interaction hint when model loads
  useEffect(() => {
    if (modelReady && !showOnboarding) {
      setShowInteractionHint(true);
      // Auto-hide after 8 seconds
      const timer = setTimeout(() => {
        setShowInteractionHint(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [modelReady, showOnboarding]);

  // Hide hint when user selects an object
  useEffect(() => {
    if (selectedObject) {
      setShowInteractionHint(false);
    }
  }, [selectedObject]);

  // BLE UUIDs
  const SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
  const CHAR_UUID = "12345678-1234-5678-1234-56789abcdef1";

  // OBJ stick connection handlers
  const handleObjConnect = async () => {
    try {
      if (!navigator.bluetooth) {
        alert("Web Bluetooth is not supported in this browser");
        return;
      }

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [SERVICE_UUID],
      });

      objDevRef.current = device;
      const server = await device.gatt?.connect();
      if (!server) throw new Error("Failed to connect to GATT server");

      const service = await server.getPrimaryService(SERVICE_UUID);
      const characteristic = await service.getCharacteristic(CHAR_UUID);
      await characteristic.startNotifications();

      objCharRef.current = characteristic;
      characteristic.addEventListener(
        "characteristicvaluechanged",
        onObjQuat
      );

      objConnectedRef.current = true;
      setObjConnected(true);
      setObjDeviceName(device.name || "OBJ");

      device.addEventListener("gattserverdisconnected", () => {
        objConnectedRef.current = false;
        setObjConnected(false);
        setObjDeviceName("—");
        objDevRef.current = null;
        objCharRef.current = null;
      });

      // Set initial zero - wait for first quaternion to arrive, then user can zero if needed
      // Initialize with identity quaternion
      qZeroObjRef.current.set(0, 0, 0, 1);
      qZeroObjInvRef.current.set(0, 0, 0, 1);
      objZeroSetRef.current = false; // Don't apply zero until user clicks Zero button
      cameraStateRef.current.translateT.set(0, 0);
      cameraStateRef.current.translateV.set(0, 0);
      
      console.log("OBJ stick connected");
    } catch (error: any) {
      console.error("OBJ connect error:", error);
      alert("Failed to connect OBJ stick: " + (error.message || error));
    }
  };

  const handleObjDisconnect = () => {
    try {
      if (objDevRef.current?.gatt?.connected) {
        objDevRef.current.gatt.disconnect();
      }
    } catch (error) {
      console.error("OBJ disconnect error:", error);
    }
  };

  const handleObjZero = () => {
    qZeroObjRef.current.copy(qDevObjRef.current).normalize();
    qZeroObjInvRef.current.copy(qZeroObjRef.current).invert();
    objZeroSetRef.current = true;
    cameraStateRef.current.translateT.set(0, 0);
  };

  const handleResetTranslate = () => {
    cameraStateRef.current.translateT.set(0, 0);
  };

  // CAM stick connection handlers
  const handleCamConnect = async () => {
    try {
      if (!navigator.bluetooth) {
        alert("Web Bluetooth is not supported in this browser");
        return;
      }

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [SERVICE_UUID],
      });

      camDevRef.current = device;
      const server = await device.gatt?.connect();
      if (!server) throw new Error("Failed to connect to GATT server");

      const service = await server.getPrimaryService(SERVICE_UUID);
      const characteristic = await service.getCharacteristic(CHAR_UUID);
      await characteristic.startNotifications();

      camCharRef.current = characteristic;
      characteristic.addEventListener(
        "characteristicvaluechanged",
        onCamQuat
      );

      camConnectedRef.current = true;
      setCamConnected(true);
      setCamDeviceName(device.name || "CAM");

      device.addEventListener("gattserverdisconnected", () => {
        camConnectedRef.current = false;
        setCamConnected(false);
        setCamDeviceName("—");
        camDevRef.current = null;
        camCharRef.current = null;
      });

      // Set initial zero - wait for first quaternion to arrive, then user can zero if needed
      // Initialize with identity quaternion
      qZeroCamRef.current.set(0, 0, 0, 1);
      qZeroCamInvRef.current.set(0, 0, 0, 1);
      camZeroSetRef.current = false; // Don't apply zero until user clicks Zero button
      lastRelCamRef.current = null;
      
      console.log("CAM stick connected");
    } catch (error: any) {
      console.error("CAM connect error:", error);
      alert("Failed to connect CAM stick: " + (error.message || error));
    }
  };

  const handleCamDisconnect = () => {
    try {
      if (camDevRef.current?.gatt?.connected) {
        camDevRef.current.gatt.disconnect();
      }
    } catch (error) {
      console.error("CAM disconnect error:", error);
    }
  };

  const handleCamZero = () => {
    qZeroCamRef.current.copy(qDevCamRef.current).normalize();
    qZeroCamInvRef.current.copy(qZeroCamRef.current).invert();
    camZeroSetRef.current = true;
    lastRelCamRef.current = null;
  };

  const handleResetView = () => {
    if (cameraRef.current && controlsRef.current) {
      controlsRef.current.reset();
      cameraStateRef.current.camR = 8;
      cameraStateRef.current.camAz = Math.PI / 4;
      cameraStateRef.current.camEl = Math.PI / 6;
      cameraStateRef.current.camAzT = Math.PI / 4;
      cameraStateRef.current.camElT = Math.PI / 6;
    }
  };

  // Quaternion processing functions
  const onObjQuat = (e: Event) => {
    const characteristic = e.target as BluetoothRemoteGATTCharacteristic;
    const dv = characteristic.value;
    if (!dv || dv.byteLength < 16) return;

    const qx = dv.getFloat32(0, true);
    const qy = dv.getFloat32(4, true);
    const qz = dv.getFloat32(8, true);
    const qw = dv.getFloat32(12, true);

    // Check for AI identify trigger pattern {1.0, 1.0, 1.0, 0.0}
    if (Math.abs(qx - 1.0) < 0.01 && Math.abs(qy - 1.0) < 0.01 && 
        Math.abs(qz - 1.0) < 0.01 && Math.abs(qw - 0.0) < 0.01) {
      console.log("AI identify trigger received from OBJ stick", { qx, qy, qz, qw });
      console.log("Current selectedObject (ref):", selectedObjectRef.current ? selectedObjectRef.current.name : "none");
      console.log("AI identify modal active (state):", aiIdentifyActive);
      console.log("AI identify modal active (ref):", aiIdentifyActiveRef.current);
      console.log("Annotated modal showing (state):", showAnnotatedModal);
      console.log("Annotated modal showing (ref):", showAnnotatedModalRef.current);
      
      // If annotated modal is showing, close it on second press (but keep inspector open)
      // Use refs for synchronous check since state updates are async
      if (aiIdentifyActiveRef.current || showAnnotatedModalRef.current) {
        console.log("AI identify modal active - closing annotated modal");
        setAiIdentifyActive(false);
        setShowAnnotatedModal(false);
        setAnnotatedImage(null);
        setIsIdentifying(false);
        setShowInferenceLoader(false);
        movementPausedRef.current = false;
        return;
      }
      
      // Auto-select object: prefer object in center of view, fall back to first available
      // Use ref for selectedObject to avoid stale closure issues in event listener
      if (!selectedObjectRef.current && sceneRef.current && cameraRef.current && raycasterRef.current) {
        console.log("No object selected (checked ref), performing center-screen raycast...");
        
        // 1. Raycast from center of screen (0, 0 in normalized device coordinates)
        raycasterRef.current.setFromCamera(new THREE.Vector2(0, 0), cameraRef.current);
        
        // Filter meshes that are visible and part of the model
        const meshes: THREE.Mesh[] = [];
        sceneRef.current.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && child.visible) {
            meshes.push(child as THREE.Mesh);
          }
        });
        
        const intersects = raycasterRef.current.intersectObjects(meshes, false);
        
        if (intersects.length > 0) {
          // Pick the closest visible mesh
          const hit = intersects[0];
          console.log("Raycast hit object:", hit.object.name || "unnamed", "distance:", hit.distance);
          setSelectedObject(hit.object);
          selectedObjectRef.current = hit.object;
        } else {
          // Fallback: if nothing in center, scan for first available mesh (existing logic)
          console.log("Raycast found nothing, searching for first available mesh...");
          let foundObject = false;
          
          sceneRef.current.traverse((child) => {
            if ((child as THREE.Mesh).isMesh && !foundObject) {
              console.log("Fallback auto-select:", child.name || "unnamed");
              setSelectedObject(child);
              selectedObjectRef.current = child;
              foundObject = true;
            }
          });
        }
      }
      
      // Verify we have an object before proceeding (check ref since state update is async)
      if (!selectedObjectRef.current) {
        console.error("Still no selected object after auto-selection attempt");
        return;
      }
      
      console.log("Calling identifyPart() with object:", (selectedObjectRef.current as any).userData?.name || selectedObjectRef.current.name || "unnamed");
      
      // Mark AI identify as active and call the function
      setAiIdentifyActive(true);
      
      // Simple AI identify - just trigger the function without complex auto-selection
      try {
        identifyPart();
        console.log("AI identify function called successfully");
      } catch (error) {
        console.error("Error calling identifyPart:", error);
        setAiIdentifyActive(false); // Reset on error
      }
      
      // Resume movement after AI identify
      movementPausedRef.current = false;
      return;
    }

    // Check for zoom trigger pattern {-1.0, -1.0, -1.0, 0.0} (Zoom In)
    if (Math.abs(qx + 1.0) < 0.01 && Math.abs(qy + 1.0) < 0.01 && 
        Math.abs(qz + 1.0) < 0.01 && Math.abs(qw - 0.0) < 0.01) {
      console.log("Zoom IN trigger received from OBJ stick", { qx, qy, qz, qw });
      
      // Zoom in by reducing camera distance
      if (cameraRef.current) {
        const currentState = cameraStateRef.current;
        currentState.camR = Math.max(2.0, currentState.camR * 0.8); // Zoom in by 20%, min distance 2
        currentState.camAzT = currentState.camAz;
        currentState.camElT = currentState.camEl;
        console.log("Zoomed in, new camera distance:", currentState.camR);
      }
      
      return;
    }

    // Check for zoom out trigger pattern {-2.0, -2.0, -2.0, 0.0} (Zoom Out)
    if (Math.abs(qx + 2.0) < 0.01 && Math.abs(qy + 2.0) < 0.01 && 
        Math.abs(qz + 2.0) < 0.01 && Math.abs(qw - 0.0) < 0.01) {
      console.log("Zoom OUT trigger received from OBJ stick", { qx, qy, qz, qw });
      
      // Zoom out by increasing camera distance
      if (cameraRef.current) {
        const currentState = cameraStateRef.current;
        currentState.camR = Math.min(20.0, currentState.camR * 1.25); // Zoom out by 25%, max distance 20
        currentState.camAzT = currentState.camAz;
        currentState.camElT = currentState.camEl;
        console.log("Zoomed out, new camera distance:", currentState.camR);
      }
      
      return;
    }

    // Check for pause trigger pattern {0.0, 0.0, 0.0, 1.0} (identity quaternion)
    if (Math.abs(qx - 0.0) < 0.001 && Math.abs(qy - 0.0) < 0.001 && 
        Math.abs(qz - 0.0) < 0.001 && Math.abs(qw - 1.0) < 0.001) {
      console.log("Movement pause trigger received from OBJ stick");
      movementPausedRef.current = !movementPausedRef.current; // Toggle pause
      // Stop all movement immediately when paused
      if (movementPausedRef.current) {
        cameraStateRef.current.translateT.set(0, 0);
        cameraStateRef.current.translateV.set(0, 0);
      }
      return;
    }

    // Skip ALL movement processing if paused - don't even calculate
    if (movementPausedRef.current) {
      cameraStateRef.current.translateT.set(0, 0);
      return;
    }

    qDevObjRef.current.set(qx, qy, qz, qw).normalize();
    let qRel = qDevObjRef.current.clone();
    if (objZeroSetRef.current) qRel.premultiply(qZeroObjInvRef.current);
    qRel.premultiply(qAxisFixRef.current);

    eObjRef.current.setFromQuaternion(qRel, "YXZ");
    
    // Apply very aggressive dead zone to eliminate jitter
    const DEAD_ZONE = 0.25; // Much larger dead zone
    let tiltX = eObjRef.current.x;
    let tiltY = eObjRef.current.y;
    
    if (Math.abs(tiltX) < DEAD_ZONE) tiltX = 0;
    if (Math.abs(tiltY) < DEAD_ZONE) tiltY = 0;
    
    // Apply very strong smoothing filter for ultra-smooth movements
    const smoothedX = tiltX * 0.2; // Much stronger filtering
    const smoothedY = tiltY * 0.2; // Much stronger filtering
    
    cameraStateRef.current.translateT.set(
      smoothedY * 0.8,  // Further reduced sensitivity
      smoothedX * 0.6   // Further reduced sensitivity
    );
    
    // Debug: log first few updates
    if (!objZeroSetRef.current || Math.random() < 0.01) {
      console.log("OBJ quat update:", {
        euler: { x: eObjRef.current.x, y: eObjRef.current.y, z: eObjRef.current.z },
        filtered: { x: smoothedX, y: smoothedY },
        translateT: { x: cameraStateRef.current.translateT.x, y: cameraStateRef.current.translateT.y }
      });
    }
  };

  const onCamQuat = (e: Event) => {
    const characteristic = e.target as BluetoothRemoteGATTCharacteristic;
    const dv = characteristic.value;
    if (!dv || dv.byteLength < 16) return;

    const now = performance.now();
    const qx = dv.getFloat32(0, true);
    const qy = dv.getFloat32(4, true);
    const qz = dv.getFloat32(8, true);
    const qw = dv.getFloat32(12, true);

    // Check for split mesh trigger pattern {3.0, 3.0, 3.0, 0.0} (Split Mesh) - Button B
    if (Math.abs(qx - 3.0) < 0.01 && Math.abs(qy - 3.0) < 0.01 && 
        Math.abs(qz - 3.0) < 0.01 && Math.abs(qw - 0.0) < 0.01) {
      console.log("Split mesh trigger received from CAM stick (Button B)", { qx, qy, qz, qw });
      
      // Prevent multiple rapid triggers (use ref instead of window property)
      const now = Date.now();
      if (now - splitMeshLastTimeRef.current < 2000) {
        console.log("Split mesh trigger ignored - too soon since last trigger");
        return;
      }
      splitMeshLastTimeRef.current = now;
      
      console.log("Current selectedObject (ref):", selectedObjectRef.current ? selectedObjectRef.current.name : "none");
      
      // Auto-select object: prefer object in center of view, fall back to first available
      // Use ref for selectedObject to avoid stale closure issues in event listener
      if (!selectedObjectRef.current && sceneRef.current && cameraRef.current && raycasterRef.current) {
        console.log("No object selected (checked ref) for split mesh, performing center-screen raycast...");
        
        // 1. Raycast from center of screen (0, 0 in normalized device coordinates)
        raycasterRef.current.setFromCamera(new THREE.Vector2(0, 0), cameraRef.current);
        
        // Filter meshes that are visible and part of the model
        const meshes: THREE.Mesh[] = [];
        sceneRef.current.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && child.visible) {
            meshes.push(child as THREE.Mesh);
          }
        });
        
        const intersects = raycasterRef.current.intersectObjects(meshes, false);
        
        if (intersects.length > 0) {
          // Pick the closest visible mesh
          const hit = intersects[0];
          console.log("Raycast hit object:", hit.object.name || "unnamed", "distance:", hit.distance);
          setSelectedObject(hit.object);
          selectedObjectRef.current = hit.object;
        } else {
          // Fallback: if nothing in center, scan for first available mesh (existing logic)
          console.log("Raycast found nothing, searching for first available mesh...");
          let foundObject = false;
          
          sceneRef.current.traverse((child) => {
            if ((child as THREE.Mesh).isMesh && !foundObject) {
              console.log("Fallback auto-select:", child.name || "unnamed");
              setSelectedObject(child);
              selectedObjectRef.current = child;
              foundObject = true;
            }
          });
        }
      }
      
      // Verify we have an object before proceeding
      if (!selectedObjectRef.current) {
        console.error("Still no selected object after auto-selection attempt for split mesh");
        return;
      }
      
      // Validate the selected object for split mesh requirements
      const mesh = selectedObjectRef.current as THREE.Mesh;
      const hasGeometry = !!(mesh.geometry);
      const hasVertices = mesh.geometry?.attributes?.position?.count > 0;
      const hasFaces = !!(mesh.geometry?.index) && mesh.geometry.index.array.length > 0;
      
      console.log("Split mesh validation:", {
        objectName: (selectedObjectRef.current as any).userData?.name || selectedObjectRef.current.name || "unnamed",
        hasGeometry,
        hasVertices,
        vertexCount: mesh.geometry?.attributes?.position?.count || 0,
        hasFaces,
        faceCount: mesh.geometry?.index ? mesh.geometry.index.array.length / 3 : 0,
        geometryType: mesh.geometry?.type || "unknown"
      });
      
      if (!hasGeometry || !hasVertices || !hasFaces) {
        console.error("Selected object doesn't meet requirements for split mesh:", {
          hasGeometry,
          hasVertices,
          hasFaces
        });
        return;
      }
      
      // Safety check: don't process very large meshes that could freeze the app
      const vertexCount = mesh.geometry.attributes.position.count;
      const faceCount = mesh.geometry.index ? mesh.geometry.index.array.length / 3 : 0;
      
      if (vertexCount > 50000 || faceCount > 100000) {
        console.error("Mesh too large for split mesh - would freeze the app:", {
          vertexCount,
          faceCount,
          maxVertices: 50000,
          maxFaces: 100000
        });
        return;
      }
      
      console.log("All validations passed, calling handleSplitMesh() with object:", (selectedObjectRef.current as any).userData?.name || selectedObjectRef.current.name || "unnamed");
      
      // Trigger split mesh functionality with timeout protection
      try {
        console.log("About to call handleSplitMesh()...");
        
        // Add timeout protection
        const splitTimeout = setTimeout(() => {
          console.error("Split mesh operation timed out - preventing freeze");
          setLoading(false);
        }, 10000); // 10 second timeout
        
        handleSplitMesh().finally(() => {
          clearTimeout(splitTimeout);
        });
        
        console.log("Split mesh function called successfully");
      } catch (error) {
        console.error("Error calling handleSplitMesh:", error);
        setLoading(false); // Ensure loading state is reset on error
      }
      
      return;
    }

    qDevCamRef.current.set(qx, qy, qz, qw).normalize();
    let qRel = qDevCamRef.current.clone();
    if (camZeroSetRef.current) qRel.premultiply(qZeroCamInvRef.current);
    qRel.premultiply(qAxisFixRef.current);

    if (
      !lastRelCamRef.current ||
      now - lastCamPacketTimeRef.current > 220
    ) {
      lastRelCamRef.current = qRel.clone();
      lastCamPacketTimeRef.current = now;
      return;
    }

    const qDelta = lastRelCamRef.current.clone().invert().multiply(qRel).normalize();
    eCamRef.current.setFromQuaternion(qDelta, "YXZ");

    let dYaw = eCamRef.current.y;
    let dPitch = eCamRef.current.x;
    const db = (0.1 * Math.PI) / 180;
    if (Math.abs(dYaw) < db) dYaw = 0;
    if (Math.abs(dPitch) < db) dPitch = 0;

    cameraStateRef.current.camAzT += dYaw * 6.8;
    cameraStateRef.current.camElT = Math.max(
      -1.2,
      Math.min(1.2, cameraStateRef.current.camElT + dPitch * 4.2)
    );

    lastRelCamRef.current.copy(qRel);
    lastCamPacketTimeRef.current = now;
    
    // Debug: log first few updates
    if (!camZeroSetRef.current || Math.random() < 0.01) {
      console.log("CAM quat update:", {
        dYaw,
        dPitch,
        camAzT: cameraStateRef.current.camAzT,
        camElT: cameraStateRef.current.camElT
      });
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Cleanup any existing canvas to prevent duplicates
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe5e6da); // Match new background
    scene.fog = new THREE.FogExp2(0xe5e6da, 0.02);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.05,
      2000
    );
    // Initialize camera position to match default stick control values
    const DEFAULT_AZ = Math.PI / 4;
    const DEFAULT_EL = Math.PI / 6;
    const DEFAULT_R = 8;
    cameraStateRef.current.camR = DEFAULT_R;
    cameraStateRef.current.camAz = DEFAULT_AZ;
    cameraStateRef.current.camEl = DEFAULT_EL;
    cameraStateRef.current.camAzT = DEFAULT_AZ;
    cameraStateRef.current.camElT = DEFAULT_EL;
    
    camera.position.set(
      DEFAULT_R * Math.cos(DEFAULT_EL) * Math.sin(DEFAULT_AZ),
      DEFAULT_R * Math.sin(DEFAULT_EL),
      DEFAULT_R * Math.cos(DEFAULT_EL) * Math.cos(DEFAULT_AZ)
    );
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = false; // Disable shadows
    renderer.setClearColor(0xe5e6da, 1);
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
    dirLight.castShadow = false;
    // dirLight.shadow.mapSize.width = 2048;
    // dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const accentLight = new THREE.SpotLight(0xdf6c42, 2); // Orange accent
    accentLight.position.set(-10, 5, -5);
    accentLight.lookAt(0, 0, 0);
    scene.add(accentLight);

    // Shadow plane
    /*
    const planeGeo = new THREE.PlaneGeometry(50, 50);
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.1, color: 0x1D1E15 }); // Dark shadow on light bg
    const shadowPlane = new THREE.Mesh(planeGeo, planeMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -4;
    shadowPlane.receiveShadow = false;
    shadowPlane.visible = false; // Controlled by view mode
    scene.add(shadowPlane);
    shadowPlaneRef.current = shadowPlane;
    */

    // Post-processing
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,
      0.4,
      0.85
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

    // Placeholder spinning wireframe rounded cube
    const roundedCubeGeometry = new THREE.BoxGeometry(2, 2, 2, 4, 4, 4);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x1D1E15,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });
    const placeholder = new THREE.Mesh(roundedCubeGeometry, wireframeMaterial);
    placeholder.position.set(0, 0, 0);
    scene.add(placeholder);
    placeholderRef.current = placeholder;

    // Animation loop
    let lastT = performance.now();
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      const now = performance.now();
      const dt = Math.max(0, now - lastT);
      lastT = now;

      // Update camera based on stick inputs if connected (use refs for real-time checking)
      // Pause stick control if inference loader is active (to allow auto-rotation)
      if ((objConnectedRef.current || camConnectedRef.current) && !showInferenceLoaderRef.current) {
        const state = cameraStateRef.current;
        const camera = cameraRef.current;
        
        if (camera) {
          // Smooth interpolation for translate
          if (objConnectedRef.current) {
            const a = 1 - Math.exp(-dt / 25); // Much slower for ultra-smooth movement
            state.translateV.lerp(state.translateT, a);
          }

          // Smooth interpolation for orbit
          if (camConnectedRef.current) {
            const ac = 1 - Math.exp(-dt / 14);
            state.camAz += (state.camAzT - state.camAz) * ac;
            state.camEl += (state.camElT - state.camEl) * ac;
          }

          // Calculate base camera position from orbit
          const basePos = new THREE.Vector3(
            state.camR * Math.cos(state.camEl) * Math.sin(state.camAz),
            state.camR * Math.sin(state.camEl),
            state.camR * Math.cos(state.camEl) * Math.cos(state.camAz)
          );

          // Get camera directions for translation
          const forward = new THREE.Vector3();
          camera.getWorldDirection(forward).normalize();
          const right = new THREE.Vector3();
          right.crossVectors(forward, camera.up).normalize();
          const upVec = camera.up.clone().normalize();

          // Apply translation
          const translate = new THREE.Vector3()
            .addScaledVector(right, state.translateV.x)
            .addScaledVector(upVec, state.translateV.y);

          // Set camera position
          const camPos = new THREE.Vector3().addVectors(basePos, translate);
          camera.position.copy(camPos);

          // Look at target (origin + translate offset)
          const target = new THREE.Vector3().add(translate);
          camera.lookAt(target);
        }

        // Disable OrbitControls when sticks are active
        if (controlsRef.current) {
          controlsRef.current.enabled = false;
        }
      } else {
        // Re-enable OrbitControls when sticks are disconnected
        if (controlsRef.current) {
          controlsRef.current.enabled = true;
          controlsRef.current.update();
        }
      }

      // Rotate placeholder if no model is loaded
      if (placeholderRef.current && generatedObjectsRef.current.length === 0) {
        placeholderRef.current.rotation.x += dt * 0.001;
        placeholderRef.current.rotation.y += dt * 0.0015;
        placeholderRef.current.visible = true;
      } else if (placeholderRef.current) {
        placeholderRef.current.visible = false;
      }

      if (composerRef.current) composerRef.current.render();
    };
    animate();

    // Resize handler for window
    const onWindowResize = () => {
      if (!cameraRef.current || !rendererRef.current || !composerRef.current)
        return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      composerRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onWindowResize);

    // Ensure correct clear color immediately
    renderer.setClearColor(0x0a0a0a, 1);

    return () => {
      window.removeEventListener("resize", onWindowResize);
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      
      // Cleanup BLE connections
      try {
        if (objDevRef.current?.gatt?.connected) {
          objDevRef.current.gatt.disconnect();
        }
        if (camDevRef.current?.gatt?.connected) {
          camDevRef.current.gatt.disconnect();
        }
      } catch (error) {
        console.error("Error disconnecting BLE devices:", error);
      }
      
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const highlightMaterial = (obj: THREE.Mesh) => {
    if (!(obj as any).userData.mats) return;
    const currentMat = (obj.material as THREE.Material).clone();
    if ("emissive" in currentMat) {
      (currentMat as THREE.MeshStandardMaterial).emissive.setHex(0xffffff);
      (currentMat as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
    }
    if (viewModeRef.current === "solid" && "color" in currentMat) {
      (currentMat as THREE.MeshStandardMaterial).color.offsetHSL(0, 0, 0.2);
    }
    obj.material = currentMat;
  };

  const restoreMaterial = (obj: THREE.Mesh) => {
    if (!obj || !(obj as any).userData.mats) return;
    const mats = (obj as any).userData.mats;
    obj.material = viewModeRef.current === "solid" ? mats.solid : mats.holo;
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (
      showInferenceLoader || 
      !containerRef.current ||
      !raycasterRef.current ||
      !cameraRef.current ||
      !sceneRef.current
    )
      return;

    // Update mouse ref for click events
    mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Hover effect logic
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(
      generatedObjectsRef.current,
      true
    );

    if (intersects.length > 0) {
      const object = intersects[0].object as THREE.Mesh;
      if (
        (object as any).userData.name &&
        object !== hoveredObjectRef.current &&
        object !== selectedObjectRef.current
      ) {
        if (
          hoveredObjectRef.current &&
          hoveredObjectRef.current !== selectedObjectRef.current
        ) {
          restoreMaterial(hoveredObjectRef.current as THREE.Mesh);
        }
        hoveredObjectRef.current = object;
        highlightMaterial(object);
        containerRef.current.style.cursor = "pointer";

        if (tooltipRef.current) {
          tooltipRef.current.textContent = (object as any).userData.name;
          tooltipRef.current.style.opacity = "1";
          tooltipRef.current.style.transform = `translate(${
            event.clientX + 10
          }px, ${event.clientY + 10}px)`;
        }
      }
    } else {
      if (
        hoveredObjectRef.current &&
        hoveredObjectRef.current !== selectedObjectRef.current
      ) {
        restoreMaterial(hoveredObjectRef.current as THREE.Mesh);
        hoveredObjectRef.current = null;
      }
      containerRef.current.style.cursor = "default";

      if (tooltipRef.current) {
        tooltipRef.current.style.opacity = "0";
      }
    }
  };

  const handleClick = (event: React.MouseEvent) => {
    if (showInferenceLoader || !raycasterRef.current || !cameraRef.current || !sceneRef.current)
      return;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(
      generatedObjectsRef.current,
      true
    );

    if (intersects.length > 0) {
      const object = intersects[0].object;
      if ((object as any).userData?.name) {
        handleObjectClick(object);
      }
    }
  };

  const createDualMaterials = (
    baseColor: THREE.Color,
    roughness = 0.5,
    metalness = 0.1
  ) => {
    const holo = new THREE.MeshPhysicalMaterial({
      color: baseColor,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
      emissive: baseColor,
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide,
    });

    const solid = new THREE.MeshStandardMaterial({
      color: baseColor,
      wireframe: false,
      roughness,
      metalness,
      side: THREE.DoubleSide,
    });

    return { holo, solid };
  };

  const loadModelFromUrl = (url: string, isBlob: boolean = false) => {
    if (!sceneRef.current) return;

    setLoading(true);
    setModelReady(false);
    setAnimationFinished(false);

    const loader = new GLTFLoader();

    // Setup DRACO loader
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    dracoLoader.setDecoderConfig({ type: 'js' }); // Explicitly use JS decoder for broader compatibility
    loader.setDRACOLoader(dracoLoader);

    // Clear existing models and their cached annotation data
    generatedObjectsRef.current.forEach((obj) => {
      // Clear annotation data from all meshes in the object before removing
      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && (child as any).userData) {
          // Clear cached annotation data (this ensures old annotations don't persist)
          delete (child as any).userData.annotatedImage;
        }
      });
      sceneRef.current!.remove(obj);
    });
    generatedObjectsRef.current = [];
    explodedGroupsRef.current.clear();
    resetView();

    // Clear all annotation state and cached data when loading a new model
    console.log("Clearing all annotation state for new model");
    annotationsCacheRef.current = {}; // Clear central annotation cache
    setAiIdentifyActive(false);
    setShowAnnotatedModal(false);
    setAnnotatedImage(null);
    setShowInspector(false);
    setIsIdentifying(false);
    setShowInferenceLoader(false);
    setInspectorData({
      name: "",
      description: "",
      type: "",
    });
    setSelectedObject(null);
    selectedObjectRef.current = null;

    // Show placeholder when no models
    if (placeholderRef.current) {
      placeholderRef.current.visible = true;
    }

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
          const baseColor = originalMat.color
            ? originalMat.color
            : new THREE.Color(0x00aaff);
          const mats = createDualMaterials(baseColor, 0.5, 0.2);
          if (originalMat.map) mats.solid = originalMat;

          // Apply new material
          mesh.material = mats.solid; // Default to solid for now
          // Create fresh userData without any cached annotations from previous models
          (mesh as any).userData = {
            mats,
            name: mesh.name || `Part ${meshes.length}`,
            description: "Imported Geometry",
            type: "Imported",
            // Explicitly ensure no cached annotation data from previous models
            annotatedImage: undefined,
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

        // Hide placeholder when model is loaded
        if (placeholderRef.current) {
          placeholderRef.current.visible = false;
        }

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
        console.error("Error loading file:", error);
        alert("Error loading file. See console.");
        if (isBlob) {
          URL.revokeObjectURL(url);
        }
        setLoading(false);
      }
    );
  };

  const generateModel = async (prompt: string) => {
    // Hide onboarding if active
    if (showOnboarding) setShowOnboarding(false);

    if (!sceneRef.current || !prompt.trim()) return;

    setGenerateStarted(true);
    setLoading(true);

    try {
      console.log("Searching for:", prompt);
      const searchRes = await fetch(
        `/api/search?q=${encodeURIComponent(prompt)}`
      );
      const searchData = await searchRes.json();

      if (!searchRes.ok) {
        throw new Error(
          searchData.error +
            (searchData.details
              ? `: ${JSON.stringify(searchData.details)}`
              : "") || "Search failed"
        );
      }

      if (!searchData.uid) {
        alert("No 3D model found for this prompt.");
        setLoading(false);
        return;
      }

      console.log("Found UID:", searchData.uid);
      const downloadRes = await fetch(`/api/download?uid=${searchData.uid}`);
      const downloadData = await downloadRes.json();

      if (!downloadRes.ok || !downloadData.success) {
        if (
          downloadData.potentialUrls &&
          downloadData.potentialUrls.length > 0
        ) {
          console.log("Using potential URL fallback");
          // potentialUrls might be an array of strings. We need to find the best one.
          // Filter for .glb or .gltf if possible
          const bestUrl =
            downloadData.potentialUrls.find((u: string) =>
              u.includes(".glb")
            ) ||
            downloadData.potentialUrls.find((u: string) =>
              u.includes(".gltf")
            ) ||
            downloadData.potentialUrls[0];

          loadModelFromUrl(bestUrl, false);
          return;
        }
        throw new Error(downloadData.message || "Failed to get download URL");
      }

      // Extract URL
      let modelUrl = downloadData.data.glb?.url || downloadData.data.gltf?.url;

      // Fallback: sometimes the structure is directly inside the data if the endpoint returned different format
      if (!modelUrl && downloadData.data.gltf) {
        modelUrl = downloadData.data.gltf.url;
      }

      if (!modelUrl) {
        // If we have a successful response but no direct GLB/GLTF url in standard location
        console.warn(
          "Standard URL location failed, checking alternatives in response data...",
          downloadData
        );
        throw new Error(
          "No compatible model format (GLB/GLTF) found in API response."
        );
      }

      console.log("Loading model from:", modelUrl);
      loadModelFromUrl(modelUrl, false);
    } catch (error) {
      console.error("Generation error:", error);
      alert(
        "Failed to generate model. " +
          (error instanceof Error ? error.message : "")
      );
      setLoading(false);
      // Keep generateStarted true so the bar stays at bottom even on error
    }
  };

  const updateViewMode = () => {
    if (!sceneRef.current || !bloomPassRef.current || !rendererRef.current)
      return;

    const isSolid = viewMode === "solid";

    // Always disable bloom to maintain exact background color #E5E6DA
    bloomPassRef.current.enabled = false;

    sceneRef.current.background = new THREE.Color(0xe5e6da);
    (sceneRef.current.fog as THREE.FogExp2).color.setHex(0xe5e6da);
    rendererRef.current.setClearColor(0xe5e6da, 1);

    // Shadows only in solid mode
    if (shadowPlaneRef.current) {
      shadowPlaneRef.current.visible = false;
    }

    generatedObjectsRef.current.forEach((group) => {
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && (child as any).userData?.mats) {
          const mesh = child as THREE.Mesh;
          const mats = (mesh as any).userData.mats;

          // Update materials for light theme if needed
          if (!isSolid) {
            // For Holo mode in light theme, we want dark wireframes
            const holoMat = mats.holo as THREE.MeshPhysicalMaterial;
            if (holoMat) {
              holoMat.color.setHex(0xdf6c42); // Orange wireframe
              holoMat.emissive.setHex(0xdf6c42);
              // Reduced intensity to prevent color blowout, increased opacity for visibility
              holoMat.emissiveIntensity = 1.0;
              holoMat.opacity = 0.8;
            }
          }

          mesh.material = isSolid ? mats.solid : mats.holo;
          mesh.castShadow = false; // Shadows only in solid mode
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
        if (
          (child as THREE.Mesh).isMesh &&
          child !== shadowPlaneRef.current &&
          (child as any).userData?.mats
        ) {
          const mesh = child as THREE.Mesh;
          const mats = (mesh as any).userData.mats;
          mesh.material = viewMode === "solid" ? mats.solid : mats.holo;
          (mesh.material as THREE.Material).transparent = false;
          (mesh.material as THREE.Material).opacity = 1;
        }
      });
    }

    setSelectedObject(object);
    setIsIsolating(true);

    const userData = (object as any).userData;
    if (object.type === "Mesh") {
      setShowSplitSection(true);
    } else {
      setShowSplitSection(false);
    }

    // Dim all other meshes
    sceneRef.current.traverse((child) => {
      if (
        (child as THREE.Mesh).isMesh &&
        child !== object &&
        child !== shadowPlaneRef.current
      ) {
        const mesh = child as THREE.Mesh;
        if ((mesh as any).userData?.mats) {
          const mats = (mesh as any).userData.mats;
          mesh.material = (
            viewMode === "solid" ? mats.solid : mats.holo
          ).clone();
        }
        (mesh.material as THREE.Material).transparent = true;
        (mesh.material as THREE.Material).opacity = 0.1;
      }
    });

    // Highlight selected
    const mesh = object as THREE.Mesh;
    const mats = (mesh as any).userData.mats;
    if (viewMode === "holo") {
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
      type: userData.type,
    });

    // Load cached annotation if available
    if (userData.annotatedImage) {
      setAnnotatedImage(userData.annotatedImage);
      setShowAnnotatedModal(true);
    } else {
      setAnnotatedImage(null);
    }

    setShowInspector(true);
  };

  const resetView = () => {
    if (!sceneRef.current) return;

    sceneRef.current.traverse((child) => {
      if (
        (child as THREE.Mesh).isMesh &&
        child !== shadowPlaneRef.current &&
        (child as any).userData?.mats
      ) {
        const mesh = child as THREE.Mesh;
        const mats = (mesh as any).userData.mats;
        mesh.material = viewMode === "solid" ? mats.solid : mats.holo;
        (mesh.material as THREE.Material).transparent = false;
        (mesh.material as THREE.Material).opacity = 1;
      }
    });

    setSelectedObject(null);
    setIsIsolating(false);
    setShowInspector(false);
    setShowSplitSection(false);
    setAnnotationOverlay(null);
    setAnnotatedImage(null);
    setShowAnnotatedModal(false);
  };

  const handleSplitMesh = async () => {
    // Use ref as fallback to ensure we have the latest selected object (especially for Bluetooth triggers)
    const currentObject = selectedObject || selectedObjectRef.current;
    
    if (
      !currentObject ||
      !(currentObject as THREE.Mesh).geometry ||
      !sceneRef.current
    )
      return;

    const mesh = currentObject as THREE.Mesh;
    const parent = mesh.parent;
    const geom = mesh.geometry;

    // Check if part of multi-mesh model
    let parentGroup = parent;
    let multiMeshData: ExplodedGroupData | null = null;
    while (parentGroup) {
      if (explodedGroupsRef.current.has(parentGroup as THREE.Group)) {
        multiMeshData = explodedGroupsRef.current.get(
          parentGroup as THREE.Group
        )!;
        break;
      }
      parentGroup = parentGroup.parent;
    }

    if (multiMeshData) {
      setIsExploded(true);
      applyExplodedView(
        parentGroup as THREE.Group,
        multiMeshData.components,
        multiMeshData.originalCenter
      );
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
      const vertToFaces: number[][] = new Array(vertexCount)
        .fill(0)
        .map(() => []);
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

          [a, b, c].forEach((vIdx) => {
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
        alert(
          "Mesh is already a single continuous piece. Cannot split further."
        );
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

        faceIndices.forEach((f) => {
          const a = index[f * 3];
          const b = index[f * 3 + 1];
          const c = index[f * 3 + 2];

          newPositions.push(
            posAttr.getX(a),
            posAttr.getY(a),
            posAttr.getZ(a),
            posAttr.getX(b),
            posAttr.getY(b),
            posAttr.getZ(b),
            posAttr.getX(c),
            posAttr.getY(c),
            posAttr.getZ(c)
          );
        });

        const newGeo = new THREE.BufferGeometry();
        newGeo.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(newPositions, 3)
        );
        newGeo.computeVertexNormals();

        const mats =
          (mesh as any).userData.mats ||
          createDualMaterials(new THREE.Color(0x00aaff));
        const newMesh = new THREE.Mesh(
          newGeo,
          viewMode === "solid" ? mats.solid : mats.holo
        );
        (newMesh as any).userData = {
          name: `${(mesh as any).userData.name || "Part"} - Sub ${idx + 1}`,
          description: "Split component.",
          type: "Sub-assembly",
          mats,
        };
        newMesh.castShadow = false;
        newMesh.receiveShadow = false;

        // Calculate component centroid
        const positions = newGeo.attributes.position;
        let sumX = 0,
          sumY = 0,
          sumZ = 0;
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
        newGeo.translate(
          -geometryCenter.x,
          -geometryCenter.y,
          -geometryCenter.z
        );

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
          centroid: geometryCenter.clone(),
        });

        newMesh.position.copy(localPos);
        newGroup.add(newMesh);
      });

      // Store exploded view data
      explodedGroupsRef.current.set(newGroup, {
        originalCenter: localCenter,
        components: componentData,
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

  const applyExplodedView = (
    group: THREE.Group,
    componentData: ComponentData[],
    center: THREE.Vector3
  ) => {
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
        const elevation = ((idx % 3) - 1) * 0.3;
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
    
    // Hide onboarding if active
    if (showOnboarding) setShowOnboarding(false);

    const url = URL.createObjectURL(file);
    loadModelFromUrl(url, true);

    // Reset file input to allow re-uploading the same file
    if (event.target) {
      event.target.value = "";
    }
  };

  const setupMultiMeshExplodedView = (
    group: THREE.Group,
    meshes: THREE.Mesh[]
  ) => {
    const componentData: ComponentData[] = [];
    group.updateMatrixWorld();

    meshes.forEach((mesh) => {
      let localPos = new THREE.Vector3();

      if (mesh.parent === group) {
        localPos.copy(mesh.position);
      } else {
        const worldPos = new THREE.Vector3();
        mesh.getWorldPosition(worldPos);
        const groupInverse = new THREE.Matrix4()
          .copy(group.matrixWorld)
          .invert();
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
        centroid: meshCenter.clone(),
      });
    });

    // Calculate average local center based on component centroids
    const localCenter = new THREE.Vector3();
    if (componentData.length > 0) {
      const box = new THREE.Box3();
      componentData.forEach((c) => box.expandByPoint(c.centroid));
      box.getCenter(localCenter);
    }

    explodedGroupsRef.current.set(group, {
      originalCenter: localCenter,
      components: componentData,
    });
  };

  const exportGLB = () => {
    if (!sceneRef.current) return;
    const exporter = new GLTFExporter();
    exporter.parse(
      sceneRef.current,
      (result) => {
        const output = JSON.stringify(result, null, 2);
        const blob = new Blob([output], { type: "text/plain" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `model-${Date.now()}.glb`;
        link.click();
      },
      (err) => console.error(err)
    );
  };

  const identifyPart = async () => {
    // Use ref as fallback if state hasn't updated yet (e.g., after auto-selection)
    const currentObject = selectedObject || selectedObjectRef.current;
    
    if (
      !currentObject ||
      !rendererRef.current ||
      !sceneRef.current ||
      !cameraRef.current
    ) {
      console.error("identifyPart: Missing required references", {
        selectedObject: !!selectedObject,
        selectedObjectRef: !!selectedObjectRef.current,
        renderer: !!rendererRef.current,
        scene: !!sceneRef.current,
        camera: !!cameraRef.current,
      });
      return;
    }

    const objectName = (currentObject as any).userData?.name || currentObject.name || "Unknown";
    
    if (IS_PRODUCTION_DEMO && currentDemoModelId) {
      console.log("Production Demo: Loading preloaded annotation for", objectName);
      
      // Show loader for 5 seconds to simulate AI processing
      setIsIdentifying(true);
      setShowInferenceLoader(true);
      
      setTimeout(() => {
        // In production demo, we use the single default annotation for the model
        const annotation = getDemoAnnotation(currentDemoModelId);
        
        if (annotation) {
          setInspectorData((prev) => ({
            ...prev,
            name: annotation.name,
            description: annotation.description,
            type: annotation.category,
            annotatedImage: annotation.annotatedImage,
          }));
          setAnnotatedImage(annotation.annotatedImage);
          setShowAnnotatedModal(true);
          setAiIdentifyActive(true);
        } else {
          console.warn("No demo annotation found for model:", currentDemoModelId);
          // Fallback
           setInspectorData((prev) => ({
            ...prev,
            name: objectName,
            description: "This is a demo part without a specific preloaded annotation.",
            type: "Demo Component",
          }));
          alert("No preloaded annotation for this model in demo mode.");
        }
        
        // Hide loader
        setIsIdentifying(false);
        setShowInferenceLoader(false);
      }, 5000); // 5 second delay
      
      return;
    }

    console.log("identifyPart: Starting AI identification for", objectName);
    console.log("identifyPart: Object reference:", currentObject);
    console.log("identifyPart: Object UUID:", currentObject.uuid);

    // Verify object is still in the current scene (not from a previous model)
    let objectInScene = false;
    if (sceneRef.current) {
      sceneRef.current.traverse((child) => {
        if (child === currentObject || child.uuid === currentObject.uuid) {
          objectInScene = true;
        }
      });
    }
    console.log("identifyPart: Object is in current scene:", objectInScene);
    
    if (!objectInScene) {
      console.error("identifyPart: Object is not in current scene - may be from old model, skipping cache check");
    } else {
      // Check central cache using Object UUID
      // This is more reliable than userData which might persist or get confused
      const cachedData = annotationsCacheRef.current[currentObject.uuid];
      console.log("identifyPart: Checking central cache for UUID:", currentObject.uuid);
      console.log("identifyPart: Cached data exists:", !!cachedData);
      
      if (cachedData && cachedData.annotatedImage) {
        console.log("identifyPart: Using cached result from central store for", objectName);
        setAnnotatedImage(cachedData.annotatedImage);
        setShowAnnotatedModal(true);
        setAiIdentifyActive(true); // Mark as active so button can close it
        return;
      }
    }
    
    console.log("identifyPart: No cache found or object not in scene - will run AI identification for", objectName);

    setIsIdentifying(true);
    setShowInferenceLoader(true);

    try {
      // 1. Capture Image
      // Ensure we render the current isolated view first
      if (composerRef.current) composerRef.current.render();
      else rendererRef.current.render(sceneRef.current, cameraRef.current);

      const screenshot = rendererRef.current.domElement.toDataURL("image/jpeg", 0.8);

      console.log("identifyPart: Screenshot captured, size:", screenshot.length);

      // 2. Gather Mesh Data
      const mesh = currentObject as THREE.Mesh;
      const geometry = mesh.geometry;
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      const box = geometry.boundingBox!;
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      const meshAnalysis = {
        name: (mesh as any).userData.name || "Unknown Part",
        position: mesh.position,
        size: { width: size.x, height: size.y, depth: size.z },
        vertexCount: geometry.attributes.position.count,
        centerPoint: center,
      };

      console.log("identifyPart: Mesh analysis prepared", meshAnalysis);

      // 3. Call API
      console.log("identifyPart: Calling AI API...");
      const res = await fetch("/api/ai-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meshAnalysis,
          modelType: prompt, // Use the search prompt as model type hint
          meshImage: screenshot,
          searchQuery: prompt,
        }),
      });

      console.log("identifyPart: API response status:", res.status);

      if (!res.ok) {
        throw new Error(`API request failed with status ${res.status}`);
      }

      const data = await res.json();
      console.log("identifyPart: API response received", data);

      if (data.error) throw new Error(data.error);

      // Debug logging
      console.log("API Response received:", {
        hasAnnotatedImage: !!data.annotatedImage,
        annotatedImageLength: data.annotatedImage?.length || 0,
        annotatedImagePreview: data.annotatedImage?.substring(0, 100) || "none",
      });

      // 4. Update Inspector
      setInspectorData((prev) => ({
        ...prev,
        name: data.name,
        description: data.description,
        type: data.category,
        annotatedImage: data.annotatedImage || null,
      }));

      // 5. Cache data in central store
      if (currentObject) {
        const objectName = (currentObject as any).userData?.name || currentObject.name || "Unknown";
        console.log("identifyPart: Caching annotation data to central store for UUID:", currentObject.uuid);
        
        annotationsCacheRef.current[currentObject.uuid] = {
          name: data.name,
          description: data.description,
          type: data.category,
          annotatedImage: data.annotatedImage || null,
        };
        
        // Also update userData for fallback/inspector compatibility
        (currentObject as any).userData = {
          ...(currentObject as any).userData,
          name: data.name,
          description: data.description,
          type: data.category,
          annotatedImage: data.annotatedImage || null,
        };
        console.log("identifyPart: Cache saved - annotatedImage length:", data.annotatedImage?.length || 0);
      } else {
        console.error("identifyPart: Cannot cache - currentObject is null");
      }

      // 6. Show annotated image if available
      if (data.annotatedImage) {
        setAnnotatedImage(data.annotatedImage);
        setShowAnnotatedModal(true);
      }
    } catch (error) {
      console.error("identifyPart: Error during AI identification:", error);

      // Fallback: Show basic info without AI
      setInspectorData((prev) => ({
        ...prev,
        name: (currentObject as any).userData?.name || "Unknown Part",
        description: "AI identification failed. Please try again or check your API configuration.",
        type: "Unknown",
      }));
    } finally {
      setIsIdentifying(false);
      setShowInferenceLoader(false);
      // Note: aiIdentifyActive remains true until user presses Button A again to close modal
    }
  };

  const handleExport = () => {
    if (!sceneRef.current) return;

    // Export the scene as GLB
    new GLTFExporter().parse(
      sceneRef.current,
      (result) => {
        const output = JSON.stringify(result, null, 2);
        const blob = new Blob([output], { type: "text/plain" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `model-${Date.now()}.glb`;
        link.click();
      },
      (err) => console.error(err)
    );
  };

  const handleDemoSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const modelId = e.target.value;
    if (!modelId) return;
    
    // Hide onboarding if active
    if (showOnboarding) setShowOnboarding(false);
    
    const model = DEMO_MODELS.find(m => m.id === modelId);
    if (model) {
      console.log("Loading demo model:", model.name);
      setCurrentDemoModelId(modelId);
      loadModelFromUrl(model.path, false);
    }
  };
  
  // Helper for Onboarding overlay to trigger demo select
  const handleOnboardingDemoSelect = (modelId: string) => {
    if (!modelId) return;
    setShowOnboarding(false);
    const model = DEMO_MODELS.find(m => m.id === modelId);
    if (model) {
      console.log("Loading demo model:", model.name);
      setCurrentDemoModelId(modelId);
      loadModelFromUrl(model.path, false);
    }
  };

  return (
    <div className="absolute inset-0 bg-[#E5E6DA] z-0">
      <div className="w-full h-full relative">
        {/* Onboarding Overlay */}
        {showOnboarding && (
          <OnboardingOverlay
            isDemoMode={IS_PRODUCTION_DEMO}
            onGenerate={generateModel}
            onSelectDemo={handleOnboardingDemoSelect}
            onImport={() => {
              document.getElementById("file-input")?.click();
              // Don't dismiss immediately, wait for file selection in handleFileUpload
            }}
            onDismiss={() => setShowOnboarding(false)}
          />
        )}
        
        {/* Top Controls */}
        <div className="absolute top-0 left-0 w-full z-10 p-4 flex justify-between items-center pointer-events-none">
          {/* Top Left - BLE Stick Controls */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* OBJ Stick Controls */}
            <div className="bg-[#E5E6DA]/90 border border-[#1D1E15] rounded-lg px-2 py-1.5 flex items-center gap-1.5 backdrop-blur-md">
              <span className="text-[10px] font-bold text-[#1D1E15] uppercase">OBJ</span>
              {!objConnected ? (
                <button
                  onClick={handleObjConnect}
                  className="px-2 py-1 bg-[#DF6C42] text-[#E5E6DA] text-[10px] rounded font-bold hover:bg-[#1D1E15] transition-colors uppercase cursor-pointer"
                >
                  Connect
                </button>
              ) : (
                <>
                  <button
                    onClick={handleObjDisconnect}
                    className="px-2 py-1 bg-[#dc3545] text-white text-[10px] rounded font-bold hover:bg-[#c82333] transition-colors uppercase cursor-pointer"
                  >
                    Disconnect
                  </button>
                  <span className="text-[10px] text-[#1D1E15] font-mono">{objDeviceName}</span>
                  <button
                    onClick={handleObjZero}
                    className="px-2 py-1 bg-[#1D1E15] text-[#E5E6DA] text-[10px] rounded font-bold hover:bg-[#DF6C42] transition-colors uppercase cursor-pointer"
                  >
                    Zero
                  </button>
                  <button
                    onClick={handleResetTranslate}
                    className="px-2 py-1 bg-[#1D1E15] text-[#E5E6DA] text-[10px] rounded font-bold hover:bg-[#DF6C42] transition-colors uppercase cursor-pointer"
                  >
                    Reset
                  </button>
                </>
              )}
            </div>

            {/* CAM Stick Controls */}
            <div className="bg-[#E5E6DA]/90 border border-[#1D1E15] rounded-lg px-2 py-1.5 flex items-center gap-1.5 backdrop-blur-md">
              <span className="text-[10px] font-bold text-[#1D1E15] uppercase">CAM</span>
              {!camConnected ? (
                <button
                  onClick={handleCamConnect}
                  className="px-2 py-1 bg-[#DF6C42] text-[#E5E6DA] text-[10px] rounded font-bold hover:bg-[#1D1E15] transition-colors uppercase cursor-pointer"
                >
                  Connect
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCamDisconnect}
                    className="px-2 py-1 bg-[#dc3545] text-white text-[10px] rounded font-bold hover:bg-[#c82333] transition-colors uppercase cursor-pointer"
                  >
                    Disconnect
                  </button>
                  <span className="text-[10px] text-[#1D1E15] font-mono">{camDeviceName}</span>
                  <button
                    onClick={handleCamZero}
                    className="px-2 py-1 bg-[#1D1E15] text-[#E5E6DA] text-[10px] rounded font-bold hover:bg-[#DF6C42] transition-colors uppercase cursor-pointer"
                  >
                    Zero
                  </button>
                  <button
                    onClick={handleResetView}
                    className="px-2 py-1 bg-[#1D1E15] text-[#E5E6DA] text-[10px] rounded font-bold hover:bg-[#DF6C42] transition-colors uppercase cursor-pointer"
                  >
                    Reset
                  </button>
                </>
              )}
            </div>

            {/* M5Stick Instruction */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-[#1D1E15]/40">←</span>
              <span className="text-[9px] font-mono text-[#1D1E15]/40">
                If provisioning your own m5Stick, use these to connect!
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="flex items-center gap-1.5 bg-[#E5E6DA]/90 border border-[#1D1E15] p-1 backdrop-blur-md h-[32px]">
              <button
                onClick={() => setViewMode("holo")}
                className={`h-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors cursor-pointer flex items-center justify-center ${
                  viewMode === "holo"
                    ? "bg-[#DF6C42] text-[#E5E6DA]"
                    : "bg-transparent text-[#1D1E15] hover:bg-[#1D1E15] hover:text-[#E5E6DA]"
                }`}
              >
                Wireframe
              </button>
              <button
                onClick={() => setViewMode("solid")}
                className={`h-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors cursor-pointer flex items-center justify-center ${
                  viewMode === "solid"
                    ? "bg-[#DF6C42] text-[#E5E6DA]"
                    : "bg-transparent text-[#1D1E15] hover:bg-[#1D1E15] hover:text-[#E5E6DA]"
                }`}
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
              className="h-[32px] px-3 bg-[#E5E6DA] border border-[#1D1E15] text-[#1D1E15] text-[10px] font-bold hover:bg-[#1D1E15] hover:text-[#E5E6DA] transition-colors flex items-center gap-1.5 cursor-pointer uppercase tracking-wide"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload
            </label>
            <button
              onClick={exportGLB}
              className="h-[32px] px-3 bg-[#E5E6DA] border border-[#1D1E15] text-[#1D1E15] text-[10px] font-bold hover:bg-[#1D1E15] hover:text-[#E5E6DA] transition-colors flex items-center gap-1.5 uppercase tracking-wide cursor-pointer"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>
            <button
              onClick={resetView}
              className="h-[32px] px-3 bg-[#E5E6DA] border border-[#1D1E15] text-[#1D1E15] text-[10px] font-bold hover:bg-[#1D1E15] hover:text-[#E5E6DA] transition-colors flex items-center gap-1.5 uppercase tracking-wide cursor-pointer"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" />
              </svg>
              Reset
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="h-[42px] px-3 bg-[#1D1E15] text-[#E5E6DA] text-[10px] font-bold hover:bg-[#DF6C42] transition-colors uppercase tracking-wide cursor-pointer rounded-lg"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Generate Prompt Bar - Hidden when onboarding is active to reduce clutter */}
        {!showOnboarding && (
        <div className="absolute bottom-0 left-0 w-full z-10 p-4 pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <div className="bg-[#E5E6DA]/80 border border-[#1D1E15] backdrop-blur-md p-1.5 flex gap-2 items-center shadow-lg">
              {IS_PRODUCTION_DEMO ? (
                <div className="flex-1 relative" ref={bottomDropdownRef}>
                  <button
                    onClick={() => setIsBottomDropdownOpen(!isBottomDropdownOpen)}
                    className="w-full bg-[#1D1E15] border border-[#1D1E15] text-[#E5E6DA] text-[10px] font-mono px-3 py-2 rounded outline-none focus:border-[#DF6C42] transition-colors flex items-center justify-between hover:bg-[#1D1E15]/90"
                  >
                    <span className={currentDemoModelId ? "text-[#E5E6DA]" : "text-[#E5E6DA]/60"}>
                      {currentDemoModelId 
                        ? DEMO_MODELS.find(m => m.id === currentDemoModelId)?.name 
                        : "Select a Demo Model"}
                    </span>
                    <svg 
                      width="12" 
                      height="12" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                      className={`transition-transform duration-200 ${isBottomDropdownOpen ? "rotate-180" : ""}`}
                    >
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </button>

                  {isBottomDropdownOpen && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#1D1E15] border border-[#1D1E15] rounded shadow-lg overflow-hidden z-50 max-h-48 overflow-y-auto">
                      {DEMO_MODELS.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => {
                            handleDemoSelect({ target: { value: model.id } } as any);
                            setIsBottomDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2.5 text-[10px] font-mono text-[#E5E6DA] hover:bg-[#DF6C42] hover:text-white transition-colors border-b border-[#E5E6DA]/10 last:border-0"
                        >
                          {model.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <input
                    id="prompt-input"
                    type="text"
                    placeholder="Generate procedural model"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        generateModel(prompt);
                      }
                    }}
                    className="flex-1 bg-transparent border-none outline-none text-[#1D1E15] placeholder-[#1D1E15]/40 text-[10px] font-mono px-3"
                  />
                  <button
                    onClick={() => generateModel(prompt)}
                    disabled={!prompt.trim() || loading}
                    className="px-4 py-2 bg-[#1D1E15] text-[#E5E6DA] text-[10px] font-bold hover:bg-[#DF6C42] transition-colors flex-shrink-0 uppercase tracking-wide cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Generate
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Control Instructions */}
        {!showOnboarding && (
        <div className="absolute bottom-16 right-4 z-10 pointer-events-none">
          <div className="text-[9px] font-mono text-[#1D1E15]/40 space-y-0.5 text-right">
            <div>Left Click + Drag: Rotate</div>
            <div>Right Click + Drag: Pan</div>
            <div>Scroll: Zoom In/Out</div>
            <div>⌘ + Click + Drag: Pan (Mac)</div>
          </div>
        </div>
        )}

        {/* Inspector Panel */}
        {showInspector && (
          <div
            className={`absolute top-20 left-4 bottom-20 w-64 bg-[#E5E6DA]/90 border border-[#1D1E15] backdrop-blur-md flex flex-col overflow-hidden transition-transform duration-300 shadow-xl z-20 ${
              showInspector ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex-shrink-0 border-b border-[#1D1E15]/20 pb-3 px-4 pt-4">
              <h2 className="text-base font-bold text-[#1D1E15] mb-1.5 truncate font-sans">
                {inspectorData.name}
              </h2>
              <span className="px-1.5 py-0.5 bg-[#DF6C42]/10 border border-[#DF6C42] rounded text-[10px] text-[#DF6C42] font-mono uppercase">
                {inspectorData.type}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 font-mono">
              <div>
                <h3 className="text-[10px] text-[#1D1E15]/50 uppercase tracking-wider mb-1.5">
                  Description
                </h3>
                <p className="text-[10px] text-[#1D1E15] leading-relaxed break-words">
                  {inspectorData.description}
                </p>
                <button
                  onClick={identifyPart}
                  disabled={isIdentifying}
                  className="mt-3 w-full px-3 py-2 bg-[#E5E6DA] border border-[#1D1E15] text-[#1D1E15] text-[10px] font-bold hover:bg-[#1D1E15] hover:text-[#E5E6DA] transition-colors uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isIdentifying ? (
                    <>
                      <div className="w-2 h-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Identifying...
                    </>
                  ) : (
                    <>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                      Identify with AI
                    </>
                  )}
                </button>
              </div>
              {showSplitSection && (
                <div className="mt-2 p-3 bg-[#1D1E15]/5 border border-[#1D1E15]/10 rounded-xl">
                  <div className="text-[10px] text-[#1D1E15]/70 mb-2 font-bold uppercase tracking-wider">
                    Actions
                  </div>
                  <button
                    onClick={handleSplitMesh}
                    className="w-full px-3 py-2 bg-[#1D1E15] text-[#E5E6DA] text-[10px] font-bold flex items-center justify-center gap-1.5 mb-2 hover:bg-[#DF6C42] transition-colors uppercase tracking-wide cursor-pointer"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 8v13H3V8" />
                      <path d="M1 3h22v5H1z" />
                      <path d="M10 12h4" />
                    </svg>
                    Split Mesh
                  </button>
                  <p className="text-[10px] text-[#1D1E15]/60 mb-2 leading-relaxed break-words">
                    Separates disconnected geometry into distinct parts.
                  </p>
                  {showExplodedControls && (
                    <div className="mt-2 pt-2 border-t border-[#1D1E15]/10">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[10px] text-[#1D1E15] font-bold uppercase">
                          Exploded View
                        </label>
                        <button
                          onClick={() => {
                            setIsExploded(!isExploded);
                          }}
                          className={`px-2 py-1 text-[10px] font-bold uppercase border transition-colors cursor-pointer ${
                            isExploded
                              ? "bg-[#DF6C42] text-[#E5E6DA] border-[#DF6C42]"
                              : "bg-transparent text-[#1D1E15] border-[#1D1E15] hover:bg-[#1D1E15] hover:text-[#E5E6DA]"
                          }`}
                        >
                          {isExploded ? "On" : "Off"}
                        </button>
                      </div>
                      <div className="mt-1.5">
                        <label className="text-[10px] text-[#1D1E15]/60 block mb-1">
                          Distance: {explosionDistance.toFixed(1)}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="3"
                          step="0.1"
                          value={explosionDistance}
                          onChange={(e) =>
                            setExplosionDistance(parseFloat(e.target.value))
                          }
                          className="w-full h-1 bg-[#1D1E15]/20 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#1D1E15]/5 p-2 border border-[#1D1E15]/10">
                  <div className="text-[10px] text-[#1D1E15]/50 mb-1 uppercase">
                    Geometry
                  </div>
                  <div className="text-[#1D1E15] font-bold text-[10px]">
                    High Poly
                  </div>
                </div>
                <div className="bg-[#1D1E15]/5 p-2 border border-[#1D1E15]/10">
                  <div className="text-[10px] text-[#1D1E15]/50 mb-1 uppercase">
                    Status
                  </div>
                  <div className="text-[#1D1E15] font-bold text-[10px]">
                    Active
                  </div>
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
          className="w-full h-full relative"
          onClick={handleClick}
          onMouseMove={handleMouseMove}
        />

        {/* Interaction Hint Popup */}
        {showInteractionHint && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2 z-40 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="relative">
              {/* Pointer Arrow - pointing left now */}
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[12px] border-r-[#DF6C42]" />
              
              {/* Hint Box */}
              <div className="bg-[#DF6C42] border-2 border-[#1D1E15] px-4 py-3 shadow-2xl max-w-[240px]">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#1D1E15] rounded flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                      <path d="M2 17l10 5 10-5"/>
                      <path d="M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-xs font-bold uppercase tracking-wide mb-1">
                      Quick Tip
                    </p>
                    <p className="text-white/90 text-[10px] font-mono leading-relaxed">
                      Click on the model to open the inspector panel and explore its components
                    </p>
                  </div>
                </div>
                
                {/* Dismiss Button */}
                <button
                  onClick={() => setShowInteractionHint(false)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-[#1D1E15] text-white rounded-full flex items-center justify-center hover:bg-[#1D1E15]/80 transition-colors cursor-pointer border-2 border-[#DF6C42]"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Annotated Image Modal */}
        {showAnnotatedModal && annotatedImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#1D1E15]/80 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setShowAnnotatedModal(false)}
          >
            <div
              className="relative max-w-4xl max-h-[90vh] bg-[#E5E6DA] border-2 border-[#1D1E15] rounded-lg shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowAnnotatedModal(false)}
                className="absolute top-2 right-2 z-10 w-8 h-8 bg-[#1D1E15] text-[#E5E6DA] rounded-full flex items-center justify-center hover:bg-[#DF6C42] transition-colors cursor-pointer"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {/* Image */}
              <div className="relative w-full">
                <img
                  src={annotatedImage}
                  alt="Annotated brain part"
                  className="w-full h-auto object-contain"
                />
              </div>

              {/* Caption */}
              <div className="px-6 py-4 border-t border-[#1D1E15]/20">
                <h3 className="text-sm font-bold text-[#1D1E15] mb-2 font-sans">
                  {inspectorData.name}
                </h3>
                <p className="text-xs text-[#1D1E15]/80 leading-relaxed font-mono">
                  {inspectorData.description}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loader */}
        {loading && (
          <BlockyLoader onFinished={() => setAnimationFinished(true)} />
        )}

        {/* AI Inference Loader */}
        <AnimatePresence>
          {showInferenceLoader && (
            <AIInferenceLoader
              objectName={(selectedObject as any)?.userData?.name || "Selected Object"}
              shouldClose={inferenceLoaderReady}
              onFinished={() => setShowInferenceLoader(false)}
              scene={sceneRef.current}
              camera={cameraRef.current}
              renderer={rendererRef.current}
              composer={composerRef.current}
              allObjects={generatedObjectsRef.current}
              controls={controlsRef.current}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
