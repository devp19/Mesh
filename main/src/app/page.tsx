'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';

const CubeViewer = dynamic(() => import('@/components/CubeViewer'), { ssr: false });

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#E5E6DA] text-[#1D1E15] font-mono overflow-hidden flex flex-col">
      
      {/* Navigation Header */}
      <nav className="border-b border-[#1D1E15] px-0 h-16 flex justify-between items-center bg-[#E5E6DA] z-50">
        <div className="flex items-center h-full flex-1">
          {/* Logo Box - Aligned with Left Sidebar */}
          {/* Scaled down from 179px */}
          <div className="w-[134px] h-full flex items-center justify-center bg-[#E5E6DA] shrink-0">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/logo.png" alt="VisionView Logo" className="w-6 h-6 object-contain invert" />
            </div>
          </div>
          
          {/* Nav Items starting right after the box */}
          <div className="hidden md:flex h-full items-center px-6 gap-8 text-[10px] font-medium uppercase tracking-wide flex-1">
            {['Protocol', 'Developers', 'Integrations', 'Telemetry', 'Community'].map((item) => (
              <div key={item} className="flex items-center gap-8 group">
                <a 
                  href="#" 
                  className="hover:text-[#DF6C42] transition-colors"
                >
                  {item}
                </a>
                <span className="text-[#1D1E15]/20 group-last:hidden">/</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-4 px-6">
          <div className="text-[10px] uppercase tracking-widest opacity-50">v.2.0.4</div>
          <Link
            href="/dashboard"
            className="px-5 py-1.5 bg-[#DF6C42] text-[#E5E6DA] text-[10px] uppercase font-bold hover:bg-[#1D1E15] transition-colors"
          >
            Login
          </Link>
        </div>
      </nav>

      {/* Main Content Grid */}
      <main className="flex-1 grid grid-cols-12 divide-x divide-[#1D1E15]">
        
        {/* Left Sidebar (Empty/Decor) */}
        <div className="hidden lg:block col-span-1 relative bg-[#E5E6DA] overflow-hidden">
          {/* Diagonal Lines SVG Background */}
          <div className="absolute inset-0 opacity-[0.1]" style={{ 
            backgroundImage: 'repeating-linear-gradient(45deg, #1D1E15 0, #1D1E15 1px, transparent 0, transparent 50%)', 
            backgroundSize: '10px 10px' 
          }} />
          
          <div className="absolute bottom-8 left-8 -rotate-90 origin-bottom-left text-[10px] uppercase opacity-40 font-regular whitespace-nowrap z-10">
              System Status: Nominal
          </div>
        </div>

        {/* Main Hero Content */}
        <div className="col-span-12 lg:col-span-7 flex flex-col divide-y divide-[#1D1E15]">
          
           {/* Hero Section */}
           <div className="pl-10 flex flex-col justify-center gap-6 flex-1">
           <img src="/logo.png" alt="VisionView Logo" className="w-12 h-12 object-contain invert" />

             <div className="inline-flex items-center gap-2 px-2 py-0.5 border border-[#1D1E15] text-[10px] uppercase tracking-wider w-fit">
              
               <div className="w-1.5 h-1.5 bg-[#DF6C42]"></div>
               HackWestern 12
             </div>
             
             <h2 className="text-5xl font-sans font-medium leading-none tracking-tight text-[#1D1E15]">
               The Coordination<br/> Layer for GeoSpatial Data
             </h2>
             
             <p className="text-sm opacity-70 max-w-xl leading-relaxed">
               Blazing fast 3D model processing. Generate meshes, split components, and visualize geometry — without complex pipelines.
             </p>
             
             <div className="flex items-center gap-4 pt-2">
               <button className="px-6 py-3 border border-[#1D1E15] text-[10px] uppercase font-bold hover:bg-[#1D1E15] hover:text-[#E5E6DA] transition-colors">
                 Read Documentation
               </button>
               <Link
                 href="/dashboard"
                 className="px-6 py-3 bg-[#DF6C42] text-[#E5E6DA] text-[10px] uppercase font-bold hover:bg-[#1D1E15] transition-colors"
               >
                 Launch Demo
               </Link>
             </div>
           </div>

           {/* Ecosystem Partners */}
           <div className="h-18 grid grid-cols-4 divide-x divide-[#1D1E15] mt-auto mb-24 border-b border-[#1D1E15]">
             {[
               { name: 'GEMINI PRO', image: '/gemini-pro.png' },
               { name: 'SKETCHFAB', image: '/sketch.png' },
               { name: 'OPENAI', image: '/openai.png' },
               { name: 'ARDUINO', image: '/arduino.png' }
             ].map((partner) => (
               <div key={partner.name} className="flex items-center justify-center opacity-40 hover:opacity-100 hover:bg-[#1D1E15] transition-all cursor-default p-2">
                 <img 
                   src={partner.image} 
                   alt={partner.name} 
                   className="h-5 w-auto object-contain filter brightness-0"
                 />
               </div>
             ))}
           </div>
         </div>

        {/* Right Visualization Column */}
        <div className="col-span-12 lg:col-span-4 flex flex-col divide-y divide-[#1D1E15] bg-[#E5E6DA]">
          
          {/* Status Header */}
          <div className="p-4 flex justify-between items-center shrink-0">
            <div className="text-[10px] uppercase font-bold">Data Volume</div>
            <div className="text-[10px] font-mono">0h:12m:43s</div>
          </div>

          {/* 3D Visualization Box */}
          <div className="h-[50vh] border-b border-[#1D1E15] relative overflow-hidden bg-[#E5E6DA] shrink-0">
            <div className="absolute inset-0 flex items-center justify-center">
                <CubeViewer />
            </div>
            {/* Overlay UI Elements */}
            <div className="absolute top-4 left-4 text-[10px] uppercase opacity-50">Rendering...</div>
            <div className="absolute bottom-4 right-4 text-[10px] uppercase opacity-50">36GB/s</div>
          </div>

          {/* Metrics Grid */}
          <div className="flex-1 grid grid-rows-3 divide-y divide-[#1D1E15] min-h-0">
            <div className="px-6 flex flex-col justify-center group hover:bg-[#1D1E15] hover:text-[#E5E6DA] transition-colors">
                <div className="text-[10px] uppercase opacity-50 mb-1">Connected Models</div>
                <div className="text-xl font-bold">42_</div>
                <div className="w-full h-1 bg-[#DF6C42]/20 mt-2 overflow-hidden">
                  <div className="h-full w-3/4 bg-[#DF6C42]"></div>
                </div>
            </div>
            <div className="px-6 flex flex-col justify-center group hover:bg-[#1D1E15] hover:text-[#E5E6DA] transition-colors">
                <div className="text-[10px] uppercase opacity-50 mb-1">Meshes Processed</div>
                <div className="text-xl font-bold">2.1M_</div>
                <div className="w-full h-1 bg-[#DF6C42]/20 mt-2 overflow-hidden">
                  <div className="h-full w-1/2 bg-[#DF6C42]"></div>
                </div>
            </div>
            <div className="px-6 flex flex-col justify-center group hover:bg-[#1D1E15] hover:text-[#E5E6DA] transition-colors">
                <div className="text-[10px] uppercase opacity-50 mb-1">Total Vertices</div>
                <div className="text-xl font-bold">$1.72B_</div>
                <div className="w-full h-1 bg-[#DF6C42]/20 mt-2 overflow-hidden">
                  <div className="h-full w-full bg-[#DF6C42]"></div>
                </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
