'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamically import ModelViewer to prevent SSR issues and multiple Three.js instances
const ModelViewer = dynamic(() => import('@/components/ModelViewer'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#E5E6DA] flex items-center justify-center">
      <div className="text-[#1D1E15]/60 font-mono text-xs uppercase tracking-wider">Loading 3D Viewer...</div>
    </div>
  ),
});

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#E5E6DA] font-mono flex flex-col overflow-hidden">
      
      {/* Header */}
      <nav className="border-b border-[#1D1E15] px-0 h-12 flex justify-between items-center bg-[#E5E6DA] z-50">
        <div className="flex items-center h-full flex-1">
          {/* Logo Box */}
          <Link href="/" className="w-[48px] h-full flex items-center justify-center bg-[#E5E6DA] shrink-0 border-r border-[#1D1E15] hover:bg-[#1D1E15] group transition-colors">
             <div className="w-6 h-6 flex items-center justify-center">
               <img src="/logo.png" alt="Mesh Logo" className="w-4 h-4 object-contain invert group-hover:invert-0 transition-all" />
             </div>
          </Link>
          
          <div className="px-4 text-[10px] font-medium uppercase tracking-wide text-[#1D1E15]">
            Dashboard / Model Viewer
          </div>
        </div>
        
        <div className="flex items-center gap-4 px-4">
          <div className="w-1.5 h-1.5 rounded-full bg-[#DF6C42] animate-pulse"></div>
          <div className="text-[10px] uppercase tracking-widest opacity-50">Connected</div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 relative">
        <ModelViewer />
      </div>
    </div>
  );
}
