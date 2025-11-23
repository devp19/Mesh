'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Zap, Scan, Box, Cpu, Activity, Search, FileText, CheckCircle } from 'lucide-react';

interface AIInferenceLoaderProps {
  onFinished?: () => void;
  objectName?: string;
  shouldClose?: boolean;
  scene?: THREE.Scene | null; // Unused
  camera?: THREE.PerspectiveCamera | null; // Unused
  renderer?: THREE.WebGLRenderer | null; // Unused
  composer?: any; // Unused
  allObjects?: THREE.Object3D[];
  controls?: OrbitControls | null;
}

const STAGES = [
  { label: 'Initializing AI Engine', icon: Zap, color: '#DF6C42' },
  { label: 'Scanning Mesh Geometry', icon: Scan, color: '#1D1E15' },
  { label: 'Extracting Features', icon: Box, color: '#DF6C42' },
  { label: 'Processing Vertices', icon: Cpu, color: '#1D1E15' },
  { label: 'Analyzing Topology', icon: Activity, color: '#DF6C42' },
  { label: 'Running Inference', icon: Search, color: '#1D1E15' },
  { label: 'Generating Annotations', icon: FileText, color: '#DF6C42' },
  { label: 'Finalizing Results', icon: CheckCircle, color: '#1D1E15' },
];

export default function AIInferenceLoader({ 
  onFinished, 
  objectName = 'Object', 
  shouldClose = false,
  allObjects = [],
  controls
}: AIInferenceLoaderProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentScanningIndex, setCurrentScanningIndex] = useState(-1);
  
  const originalMaterialsRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());
  const scanningMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const ghostMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);

  // Collect all meshes
  const allMeshes = allObjects.flatMap(obj => {
    const meshes: THREE.Mesh[] = [];
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        meshes.push(child as THREE.Mesh);
      }
    });
    return meshes;
  });

  // Initialize Materials
  useEffect(() => {
    if (!scanningMaterialRef.current) {
      scanningMaterialRef.current = new THREE.MeshStandardMaterial({
        color: 0xDF6C42, 
        emissive: 0xDF6C42,
        emissiveIntensity: 2.0,
        roughness: 0.2,
        metalness: 0.8,
        depthTest: true,
        depthWrite: true,
      });
    }
    
    if (!ghostMaterialRef.current) {
      ghostMaterialRef.current = new THREE.MeshStandardMaterial({
        color: 0x1D1E15,
        transparent: true,
        opacity: 0.1,
        wireframe: true,
        wireframeLinewidth: 1,
        depthTest: true,
        depthWrite: true,
      });
    }

    return () => {
      scanningMaterialRef.current?.dispose();
      ghostMaterialRef.current?.dispose();
    };
  }, []);

  // Store Originals & Apply Ghost
  useEffect(() => {
    if (allMeshes.length === 0 || !ghostMaterialRef.current) return;

    allMeshes.forEach((mesh) => {
      if (!originalMaterialsRef.current.has(mesh)) {
        originalMaterialsRef.current.set(mesh, mesh.material);
      }
      mesh.material = ghostMaterialRef.current!;
    });

    return () => {
      // Cleanup handled in final cleanup effect
    };
  }, [allMeshes]);

  // Scanning Logic
  useEffect(() => {
    if (allMeshes.length === 0) return;

    const scanInterval = setInterval(() => {
      setCurrentScanningIndex((prev) => {
        // Restore previous
        if (prev >= 0 && prev < allMeshes.length) {
          const prevMesh = allMeshes[prev];
          if (ghostMaterialRef.current) {
            prevMesh.material = ghostMaterialRef.current;
          }
        }

        // Next
        let next = prev + 1;
        if (next >= allMeshes.length) {
          next = 0;
        }

        // Highlight
        const currentMesh = allMeshes[next];
        if (currentMesh && scanningMaterialRef.current) {
          currentMesh.material = scanningMaterialRef.current;
        }

        return next;
      });
    }, 800);

    return () => clearInterval(scanInterval);
  }, [allMeshes]);

  // Controls - Auto Rotate
  useEffect(() => {
    if (!controls) return;

    // Save state
    const initialAutoRotate = controls.autoRotate;
    const initialAutoRotateSpeed = controls.autoRotateSpeed;
    const initialEnableZoom = controls.enableZoom;
    const initialEnableRotate = controls.enableRotate;
    const initialEnablePan = controls.enablePan;

    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0; // Gentle spin
    controls.enableZoom = false;
    controls.enableRotate = false; // Disable user interaction
    controls.enablePan = false;

    return () => {
      if (controls) {
        controls.autoRotate = initialAutoRotate;
        controls.autoRotateSpeed = initialAutoRotateSpeed;
        controls.enableZoom = initialEnableZoom;
        controls.enableRotate = initialEnableRotate;
        controls.enablePan = initialEnablePan;
      }
    };
  }, [controls]);

  // Progress & Stages
  useEffect(() => {
    const stageInterval = setInterval(() => {
      setCurrentStage((prev) => (prev < STAGES.length - 1 ? prev + 1 : prev));
    }, 1200);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 99) return 99;
        const diff = 100 - prev;
        return prev + (diff * 0.02) + 0.05; // Asymptotic
      });
    }, 50);

    return () => {
      clearInterval(stageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  // Completion
  useEffect(() => {
    if (shouldClose) {
      setProgress(100);
      setCurrentStage(STAGES.length - 1);
      
      // Restore visuals immediately
      allMeshes.forEach((mesh) => {
        const original = originalMaterialsRef.current.get(mesh);
        if (original) {
          mesh.material = original;
        }
      });

      setTimeout(() => {
        if (onFinished) onFinished();
      }, 600);
    }
  }, [shouldClose, onFinished, allMeshes]);

  // Unmount Cleanup
  useEffect(() => {
    return () => {
      allMeshes.forEach((mesh) => {
        const original = originalMaterialsRef.current.get(mesh);
        if (original) {
          mesh.material = original;
        }
      });
    };
  }, [allMeshes]);

  const currentMesh = currentScanningIndex >= 0 && currentScanningIndex < allMeshes.length 
    ? allMeshes[currentScanningIndex] 
    : null;
  const currentMeshName = currentMesh ? ((currentMesh as any).userData?.name || `Mesh ${currentScanningIndex + 1}`) : 'Scanning...';

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Frame Layout - Using absolute positioning to create a 'hole' in the center */}
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-20 bg-[#1D1E15]/90 backdrop-blur-md border-b border-[#E5E6DA]/10 flex items-center justify-between px-8 pointer-events-auto">
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 bg-[#DF6C42] animate-pulse" />
          <div className="font-mono text-sm text-[#E5E6DA] tracking-widest uppercase font-light">
            AI Inference Protocol <span className="text-[#DF6C42]">//</span> V2.4
          </div>
        </div>
        <div className="font-mono text-2xl font-light text-[#E5E6DA]">
          {Math.floor(progress)}%
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#1D1E15]/90 backdrop-blur-md border-t border-[#E5E6DA]/10 flex flex-col justify-center px-8 pointer-events-auto">
         <div className="flex items-center gap-4 mb-2">
            <span className="text-[10px] font-mono text-[#E5E6DA]/50 uppercase tracking-widest">System Status</span>
            <div className="h-[1px] flex-1 bg-[#E5E6DA]/10"></div>
         </div>
         <div className="h-1 w-full bg-[#E5E6DA]/10 overflow-hidden">
           <motion.div 
             className="h-full bg-[#DF6C42]"
             initial={{ width: 0 }}
             animate={{ width: `${progress}%` }}
             transition={{ ease: "linear" }}
           />
         </div>
      </div>

      {/* Left Panel */}
      <div className="absolute top-20 bottom-16 left-0 w-80 bg-[#1D1E15]/90 backdrop-blur-md border-r border-[#E5E6DA]/10 p-6 flex flex-col gap-8 pointer-events-auto">
        <div className="space-y-2">
          <div className="text-[10px] text-[#E5E6DA]/40 uppercase tracking-widest font-mono">Target Object</div>
          <div className="text-lg font-mono text-[#E5E6DA] font-light break-words">{objectName}</div>
        </div>
        
        <div className="space-y-2">
          <div className="text-[10px] text-[#E5E6DA]/40 uppercase tracking-widest font-mono">Current Scan</div>
          <div className="text-sm font-mono text-[#DF6C42] break-all font-light">
            {currentMeshName}
          </div>
          <div className="h-[1px] w-full bg-[#E5E6DA]/10 mt-2 overflow-hidden relative">
             <motion.div 
               className="absolute inset-0 bg-[#DF6C42]"
               initial={{ x: "-100%" }}
               animate={{ x: "100%" }}
               transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
             />
          </div>
        </div>

        <div className="flex-1" />
        
        <div className="grid grid-cols-2 gap-3">
           <div className="bg-[#E5E6DA]/5 p-3 border border-[#E5E6DA]/5">
             <div className="text-[10px] text-[#E5E6DA]/40 mb-1">MESHES</div>
             <div className="text-lg font-mono text-[#E5E6DA] font-light">{allMeshes.length}</div>
           </div>
           <div className="bg-[#E5E6DA]/5 p-3 border border-[#E5E6DA]/5">
             <div className="text-[10px] text-[#E5E6DA]/40 mb-1">STAGE</div>
             <div className="text-lg font-mono text-[#E5E6DA] font-light">{currentStage + 1}/8</div>
           </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="absolute top-20 bottom-16 right-0 w-80 bg-[#1D1E15]/90 backdrop-blur-md border-l border-[#E5E6DA]/10 p-6 flex flex-col pointer-events-auto overflow-y-auto">
        <div className="text-[10px] text-[#E5E6DA]/40 uppercase tracking-widest font-mono mb-6">Processing Pipeline</div>
        <div className="space-y-4">
          {STAGES.map((stage, index) => {
            const isCompleted = index < currentStage;
            const isActive = index === currentStage;
            
            return (
              <div key={index} className={`flex items-center gap-4 ${isActive ? 'opacity-100' : 'opacity-30'}`}>
                <div className={`p-1.5 rounded-sm ${isActive ? 'bg-[#DF6C42]/20 text-[#DF6C42]' : 'bg-[#E5E6DA]/5 text-[#E5E6DA]'}`}>
                  <stage.icon size={14} />
                </div>
                <div className="text-xs font-mono uppercase text-[#E5E6DA] tracking-wide">{stage.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Center Area - Transparent, but blocks interaction via pointer-events-auto on a transparent cover? 
          Actually, we want to block interaction with the underlying canvas.
          We can put a transparent div here.
      */}
      <div className="absolute top-20 bottom-16 left-80 right-80 pointer-events-auto cursor-wait">
         {/* Reticle - Full Size */}
         <div className="w-full h-full border border-[#DF6C42]/20 relative opacity-50">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#DF6C42]" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#DF6C42]" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#DF6C42]" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#DF6C42]" />
            
            {/* Scanning Line */}
            <motion.div 
              className="absolute left-0 right-0 h-[2px] bg-[#DF6C42]/50 shadow-[0_0_15px_rgba(223,108,66,0.5)]"
              initial={{ top: 0 }}
              animate={{ top: "100%" }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
         </div>
      </div>

    </div>
  );
}
