'use client';

import Link from 'next/link';

export default function Home() {

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Grid Background Pattern */}
      <div 
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 135, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 135, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />
      
      {/* Diagonal Lines */}
      <div 
        className="fixed inset-0 opacity-20 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, transparent 0%, rgba(0, 255, 135, 0.02) 50%, transparent 100%)'
        }}
      />

      {/* Navigation Header */}
      <nav className="relative z-50 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-semibold text-white">VisionView</h1>
          <div className="flex items-center gap-6 text-sm text-white/60">
            <a href="#" className="hover:text-white transition-colors">PROTOCOL</a>
            <span>/</span>
            <a href="#" className="hover:text-white transition-colors">DEVELOPERS</a>
            <span>/</span>
            <a href="#" className="hover:text-white transition-colors">INTEGRATIONS</a>
            <span>/</span>
            <a href="#" className="hover:text-white transition-colors">TELEMETRY</a>
            <span>/</span>
            <a href="#" className="hover:text-white transition-colors">COMMUNITY</a>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-colors"
        >
          Dashboard
        </Link>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 pt-24 pb-32">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-2 gap-16 items-center min-h-[calc(100vh-8rem)]">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white/70">
              <span className="w-2 h-2 rounded-full bg-[#00ff87]"></span>
              Layer-0 connectivity
            </div>
            
            <h2 className="text-6xl font-semibold text-white leading-tight">
              The Coordination Layer<br/>for All Models
            </h2>
            
            <p className="text-lg text-white/70 leading-relaxed max-w-xl">
              Fast, verifiable, and trust-minimized 3D model processing. Generate meshes, split components, and visualize geometry — without complex pipelines.
            </p>
            
            <div className="flex items-center gap-4">
              <button className="px-6 py-3 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-colors">
                Read Docs
              </button>
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-[#00ff87] text-black rounded-lg text-sm font-medium hover:bg-[#00e677] transition-colors"
              >
                Launch Demo
              </Link>
            </div>
            
            <div className="flex items-center gap-8 pt-8">
              <div className="text-white/40 text-sm">SOLANA</div>
              <div className="text-white/40 text-sm">polygon</div>
              <div className="text-white/40 text-sm">ARBITRUM</div>
              <div className="text-white/40 text-sm">phantom</div>
            </div>
          </div>
          
          {/* Right Content - Metrics & Visualization */}
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="px-4 py-2 bg-[#00ff87]/20 border border-[#00ff87]/50 rounded-lg text-xs font-medium text-[#00ff87]">
                ALL SYSTEMS OPERATIONAL
              </div>
              <div className="flex gap-1">
                <div className="w-1 h-8 bg-[#00ff87] rounded"></div>
                <div className="w-1 h-6 bg-[#00ff87]/60 rounded"></div>
                <div className="w-1 h-4 bg-[#00ff87]/40 rounded"></div>
              </div>
            </div>
            
            {/* 3D Canvas Placeholder */}
            <div className="w-full h-96 bg-black/20 border border-white/10 rounded-2xl overflow-hidden relative flex items-center justify-center">
              <div className="text-white/30 text-sm">3D Visualization</div>
            </div>
            
            {/* Metrics */}
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-xs text-white/50 uppercase tracking-wider mb-2">Connected Models</div>
                <div className="text-2xl font-semibold text-white">42_</div>
              </div>
              <div>
                <div className="text-xs text-white/50 uppercase tracking-wider mb-2">Meshes Processed</div>
                <div className="text-2xl font-semibold text-white">2.1M_</div>
              </div>
              <div>
                <div className="text-xs text-white/50 uppercase tracking-wider mb-2">Total Vertices</div>
                <div className="text-2xl font-semibold text-white">$1.72B_</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
