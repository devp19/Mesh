'use client';

import dynamic from 'next/dynamic';

// Dynamically import ModelViewer to prevent SSR issues and multiple Three.js instances
const ModelViewer = dynamic(() => import('@/components/ModelViewer'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white/60">Loading 3D Viewer...</div>
    </div>
  ),
});

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-black">
      <ModelViewer />
    </div>
  );
}

