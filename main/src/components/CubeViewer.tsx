'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function CubeViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Cleanup previous renderer if any
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    // Setup Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xE5E6DA);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    camera.position.z = 4;
    camera.position.y = 1;
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Complex Wireframe Object (Icosahedron with more detail)
    const geometry = new THREE.IcosahedronGeometry(1.2, 1);
    
    // Use LineSegments for a cleaner wireframe look
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({ 
      color: 0x1D1E15, 
      linewidth: 2 
    });
    const wireframeObject = new THREE.LineSegments(edges, material);
    scene.add(wireframeObject);

    // Animation
    const animate = () => {
      wireframeObject.rotation.x += 0.005;
      wireframeObject.rotation.y += 0.008;
      renderer.render(scene, camera);
    };
    
    renderer.setAnimationLoop(animate);

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !renderer) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.setAnimationLoop(null);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
