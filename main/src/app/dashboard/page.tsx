'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';

// Dynamically import ModelViewer to prevent SSR issues and multiple Three.js instances
const ModelViewer = dynamic(() => import('@/components/ModelViewer'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#E5E6DA] flex items-center justify-center">
      <div className="text-[#1D1E15]/60 font-mono text-xs uppercase tracking-wider">Loading 3D Viewer...</div>
    </div>
  ),
});

const IS_PRODUCTION_DEMO = process.env.NEXT_PUBLIC_PRODUCTION_DEMO === "true";

export default function DashboardPage() {
  const [showBanner, setShowBanner] = useState(IS_PRODUCTION_DEMO);

  return (
    <div className="min-h-screen bg-[#E5E6DA] font-mono flex flex-col overflow-hidden">
      
      {/* Demo Banner */}
      {showBanner && (
        <div className="bg-[#DF6C42] border-b border-[#1D1E15] px-4 py-2 flex items-center justify-between z-50">
          <div className="flex items-center gap-3 flex-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="shrink-0">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-white text-[10px] md:text-xs font-medium">
              <span className="font-bold">Demo Mode:</span> This version uses preloaded models. To use your own API keys and custom models, visit our{' '}
              <a 
                href="https://github.com/devp19/Mesh" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-[#E5E6DA] transition-colors font-bold"
              >
                GitHub repository
              </a>
              {' '}for setup instructions.
            </p>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="ml-4 w-6 h-6 flex items-center justify-center text-white hover:bg-[#1D1E15] transition-colors shrink-0"
            aria-label="Close banner"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}
      
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
