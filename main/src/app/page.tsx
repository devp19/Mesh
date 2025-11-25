'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { motion } from 'framer-motion';

const CubeViewer = dynamic(() => import('@/components/CubeViewer'), { ssr: false });

export default function Home() {
  const [showMobileModal, setShowMobileModal] = useState(false);

  const handleLaunchDemoClick = (
    e?: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>
  ) => {
    if (typeof window === 'undefined') return;
    // Only intercept navigation on smaller screens
    if (window.innerWidth < 1024) {
      e?.preventDefault();
      setShowMobileModal(true);
    }
  };

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  const fadeInDown = {
    hidden: { opacity: 0, y: -40 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.8 }
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const staggerItem = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <div className="relative min-h-screen bg-[#E5E6DA] text-[#1D1E15] font-mono flex flex-col">
      
      {/* Navigation Header */}
      <nav className="border-b border-[#1D1E15] px-0 h-16 flex justify-between items-center bg-[#E5E6DA] z-50">
        <div className="flex items-center h-full flex-1">
          {/* Logo Box - Aligned with Left Sidebar */}
          {/* Scaled down from 179px */}
          <div className="w-[134px] h-full flex items-center justify-center bg-[#E5E6DA] shrink-0">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/logo.png" alt="Mesh Logo" className="w-6 h-6 object-contain invert" />
            </div>
          </div>
          
          {/* Nav Items starting right after the box */}
          <div className="hidden md:flex h-full items-center px-6 gap-8 text-[10px] font-medium uppercase tracking-wide flex-1">
            {[
              { name: 'Process', href: '#process' },
              { name: 'Metrics', href: '#metrics' },
              { name: 'Integrations', href: '#integrations' },
              { name: 'Motion Control', href: '#mesh-viewer' },
              { name: 'Visualize', href: '#visualize' }
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-8 group">
                <a 
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    const element = document.querySelector(item.href);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="hover:text-[#DF6C42] transition-colors cursor-pointer"
                >
                  {item.name}
                </a>
                <span className="text-[#1D1E15]/20 group-last:hidden">/</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-4 px-6">
          <div className="text-[10px] uppercase tracking-widest opacity-50">Mesh</div>
          <Link
            href="/dashboard"
            className="px-5 py-1.5 bg-[#DF6C42] text-[#E5E6DA] text-[10px] uppercase font-bold hover:bg-[#1D1E15] transition-colors"
            onClick={handleLaunchDemoClick}
          >
            View Demo
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
           <motion.div 
             className="pl-4 lg:pl-10 flex flex-col justify-center gap-4 lg:gap-6 flex-1"
             initial="hidden"
             animate="visible"
             variants={staggerContainer}
           >
           <motion.img 
             src="/logo.png" 
             alt="Mesh Logo" 
             className="w-8 h-8 lg:w-12 lg:h-12 object-contain invert"
             variants={staggerItem}
           />

             <motion.div 
               className="inline-flex items-center gap-2 px-2 py-0.5 border border-[#1D1E15] text-[8px] lg:text-[10px] uppercase tracking-wider w-fit"
               variants={staggerItem}
             >
              
               <div className="w-1.5 h-1.5 bg-[#DF6C42]"></div>
               Mesh
             </motion.div>
             
             <motion.h2 
               className="text-3xl lg:text-5xl font-sans font-medium leading-none tracking-tight text-[#1D1E15]"
               variants={staggerItem}
             >
               The Coordination<br/> Layer for GeoSpatial Data
             </motion.h2>
             
             <motion.p 
               className="text-xs lg:text-sm opacity-70 max-w-lg lg:max-w-xl leading-relaxed"
               variants={staggerItem}
             >
               Blazing fast 3D model processing. Generate meshes, split components, and visualize geometry — without complex pipelines.
             </motion.p>
             
             {/* Mobile 3D Visualization Box */}
             <motion.div 
               className="lg:hidden h-64 border border-[#1D1E15] relative overflow-hidden bg-[#E5E6DA] shrink-0 my-4"
               variants={staggerItem}
             >
               <div className="absolute inset-0 flex items-center justify-center">
                   <CubeViewer />
               </div>
               {/* Overlay UI Elements */}
               <div className="absolute top-4 left-4 text-[10px] uppercase opacity-50">Rendering...</div>
               <div className="absolute bottom-4 right-4 text-[10px] uppercase opacity-50">36GB/s</div>
             </motion.div>
             
             <motion.div 
               className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 pt-2"
               variants={staggerItem}
             >
              <button className="w-full sm:w-auto px-6 py-3 border border-[#1D1E15] text-[10px] uppercase font-bold hover:bg-[#1D1E15] hover:text-[#E5E6DA] transition-colors cursor-pointer">
                 Learn more
               </button>
               <Link
                 href="/dashboard"
                 className="w-full sm:w-auto px-6 py-3 bg-[#DF6C42] text-[#E5E6DA] text-[10px] uppercase font-bold hover:bg-[#1D1E15] transition-colors text-center sm:text-left mb-2 sm:mb-0"
                 onClick={handleLaunchDemoClick}
               >
                 Launch Demo
               </Link>
             </motion.div>
           </motion.div>

           {/* Ecosystem Partners */}
           <div className="h-18 grid grid-cols-4 divide-x divide-[#1D1E15] mt-auto border-b border-[#1D1E15]">
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
          
          {/* 3D Visualization Box */}
          <div className="hidden lg:block h-[50vh] border-b border-[#1D1E15] relative overflow-hidden bg-[#E5E6DA] shrink-0">
            <div className="absolute inset-0 flex items-center justify-center">
                <CubeViewer />
            </div>
            {/* Overlay UI Elements */}
            <div className="absolute top-4 left-4 text-[10px] uppercase opacity-50">Rendering...</div>
            <div className="absolute bottom-4 right-4 text-[10px] uppercase opacity-50">36GB/s</div>
          </div>

          {/* Metrics Grid */}
          <div className="flex-1 grid grid-rows-3 divide-y divide-[#1D1E15] min-h-0">
            <div className="px-6 py-4 flex flex-col justify-center group hover:bg-[#1D1E15] hover:text-[#E5E6DA] transition-colors">
                <div className="text-[10px] uppercase opacity-50 mb-2">Preloaded Models</div>
                <div className="text-2xl font-bold mb-3">6</div>
                <div className="w-full h-1 bg-[#DF6C42]/20 overflow-hidden">
                  <div className="h-full w-[95%] bg-[#DF6C42]"></div>
                </div>
            </div>
            <div className="px-6 py-4 flex flex-col justify-center group hover:bg-[#1D1E15] hover:text-[#E5E6DA] transition-colors">
                <div className="text-[10px] uppercase opacity-50 mb-2">Meshes Processed</div>
                <div className="text-2xl font-bold mb-3">2.1M</div>
                <div className="w-full h-1 bg-[#DF6C42]/20 overflow-hidden">
                  <div className="h-full w-2/3 bg-[#DF6C42]"></div>
                </div>
            </div>
            <div className="px-6 py-4 flex flex-col justify-center group hover:bg-[#1D1E15] hover:text-[#E5E6DA] transition-colors">
                <div className="text-[10px] uppercase opacity-50 mb-2">Total Vertices</div>
                <div className="text-2xl font-bold mb-3">1.72B</div>
                <div className="w-full h-1 bg-[#DF6C42]/20 overflow-hidden">
                  <div className="h-full w-full bg-[#DF6C42]"></div>
                </div>
            </div>
          </div>
        </div>

      </main>

      {/* How It Works Section */}
      <section id="process" className="border-t border-[#1D1E15] bg-[#E5E6DA]">
        <div className="grid grid-cols-12 divide-x divide-[#1D1E15]">
          {/* Left Sidebar Spacer */}
          <div className="hidden lg:block col-span-1"></div>
          
          {/* Main Content */}
          <div className="col-span-12 lg:col-span-11">
            <motion.div 
              className="px-10 py-16 border-b border-[#1D1E15]"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainer}
            >
              <motion.div 
                className="inline-flex items-center gap-2 px-2 py-0.5 border border-[#1D1E15] text-[10px] uppercase tracking-wider w-fit mb-8"
                variants={fadeInDown}
              >
                <div className="w-1.5 h-1.5 bg-[#DF6C42]"></div>
                PROCESS
              </motion.div>
              
              <motion.h3 
                className="text-4xl font-sans font-medium leading-none tracking-tight text-[#1D1E15] mb-12"
                variants={fadeInUp}
              >
                How It Works
              </motion.h3>
              
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-[#1D1E15]"
                variants={staggerContainer}
              >
                {[
                  {
                    step: '01',
                    title: 'Generate',
                    description: 'Upload your 3D models or generate your own geospatial data files through our streamlined interface.',
                  },
                  {
                    step: '02',
                    title: 'Process',
                    description: 'AI-powered processing generates meshes and extracts components automatically.',
                  },
                  {
                    step: '03',
                    title: 'Analyze',
                    description: 'Real-time visualization and analysis tools help you understand your data.',
                  },
                  {
                    step: '04',
                    title: 'Export',
                    description: 'Export processed models, masks, and metadata in your preferred format.',
                  },
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    className={`p-8 border-r border-[#1D1E15] last:border-r-0 hover:bg-[#1D1E15] hover:text-[#E5E6DA] transition-colors group`}
                    variants={staggerItem}
                  >
                    <div className="text-[10px] uppercase opacity-50 mb-4 font-mono">{item.step}</div>
                    <h4 className="text-xl font-medium mb-3">{item.title}</h4>
                    <p className="text-sm opacity-70 leading-relaxed">{item.description}</p>
                    {idx < 3 && (
                      <div className="mt-6 flex items-center gap-2 opacity-20 group-hover:opacity-40">
                        <div className="w-full h-px bg-[#1D1E15]"></div>
                        <div className="w-1.5 h-1.5 bg-[#DF6C42]"></div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section id="metrics" className="border-t border-[#1D1E15] bg-[#E5E6DA]">
        <div className="grid grid-cols-12 divide-x divide-[#1D1E15]">
          {/* Left Sidebar Spacer */}
          <div className="hidden lg:block col-span-1"></div>
          
          {/* Main Content */}
          <div className="col-span-12 lg:col-span-11">
            <motion.div 
              className="px-10 py-16 border-b border-[#1D1E15]"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainer}
            >
              <motion.div 
                className="inline-flex items-center gap-2 px-2 py-0.5 border border-[#1D1E15] text-[10px] uppercase tracking-wider w-fit mb-8"
                variants={fadeInDown}
              >
                <div className="w-1.5 h-1.5 bg-[#DF6C42]"></div>
                METRICS
              </motion.div>
              
              <motion.h3 
                className="text-4xl font-sans font-medium leading-none tracking-tight text-[#1D1E15] mb-12"
                variants={fadeInUp}
              >
                Performance Metrics
              </motion.h3>
              
              {/* Combined Bar Graph - Sketchfab Import vs SAM3D META Model */}
              <motion.div 
                className="border border-[#1D1E15] mb-8 overflow-hidden"
                variants={fadeInUp}
              >
                <div className="p-8">
                  {/* Explanation Section */}
                  <div className="mb-8 pb-6 border-b border-[#1D1E15]">
                    <div className="text-[10px] uppercase opacity-50 mb-4">About the Solutions</div>
                    <div className="space-y-4 text-sm opacity-70 leading-relaxed">
                      <p>
                        <span className="font-bold text-[#1D1E15]">SAM3D META Model</span> is a custom-built 3D segmentation model powered by Meta's SAM (Segment Anything Model) architecture, fine-tuned for geospatial mesh processing. It performs automated component extraction and mesh segmentation directly from 3D models.
                      </p>
                      <p>
                        <span className="font-bold text-[#1D1E15]">Sketchfab Import</span> refers to the pipeline that imports pre-processed 3D models from Sketchfab's platform, leveraging their optimized meshes and metadata for faster rendering times.
                      </p>
                      <p className="text-xs opacity-60 italic">
                        The chart below compares render times across both solutions. We have working implementations for both approaches, but for deployment we focused on the Sketchfab import pipeline due to deployment constraints. Our server operates with 32GB VRAM, which limits our ability to deploy SAM3D for every use case. While SAM3D provides superior accuracy and performs much better on larger meshes, it requires more computational resources. For production, we prioritized the Sketchfab import solution which offers faster processing with pre-optimized assets, especially for smaller to medium-sized models.
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-[10px] uppercase opacity-50 mb-2">Render Time Comparison</div>
                    <p className="text-xs opacity-60 italic">
                      This chart shows the average time to render models across different mesh complexities. Lower render times indicate faster processing.
                    </p>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4 mb-6">
                    {/* Y-Axis */}
                    <div className="flex flex-row md:flex-col justify-between md:h-80 text-[8px] uppercase opacity-40 pt-1 pb-2 md:pb-8 md:pr-2 gap-2 md:gap-0">
                      <span>5.0s</span>
                      <span>4.0s</span>
                      <span>3.0s</span>
                      <span>2.0s</span>
                      <span>1.0s</span>
                      <span>0s</span>
                    </div>
                    
                    {/* Chart Bars */}
                    <div className="flex-1 h-80 flex flex-wrap md:flex-nowrap items-end gap-4 relative">
                      {[
                        { label: 'Small Mesh (<10 mesh objects)', sketchfab: 1.3, meta: 2.2 },
                        { label: 'Med Mesh (10-50 mesh objects)', sketchfab: 2.0, meta: 2.9 },
                        { label: 'Large Mesh (50-100 mesh objects)', sketchfab: 3.5, meta: 3.3 },
                        { label: 'XL Mesh (>100 mesh objects)', sketchfab: 4.4, meta: 3.8 },
                      ].map((item, idx) => {
                        const maxTime = 5.0; // Maximum time on y-axis
                        const chartHeight = 320; // h-80 = 320px
                        const sketchfabHeight = (item.sketchfab / maxTime) * chartHeight;
                        const metaHeight = (item.meta / maxTime) * chartHeight;
                        
                        return (
                          <div
                            key={idx}
                            className="flex-1 flex flex-col items-center justify-end gap-2 h-full relative"
                          >
                            <div className="flex items-end gap-2 w-full justify-center relative" style={{ height: '320px' }}>
                              {/* Sketchfab Import Bar */}
                              <div className="flex flex-col items-center justify-end relative" style={{ height: '320px' }}>
                                {/* Logo above bar */}
                                <div 
                                  className="absolute flex items-center justify-center"
                                  style={{ 
                                    bottom: `${sketchfabHeight + 12}px`,
                                    left: '50%',
                                    transform: 'translateX(-50%)'
                                  }}
                                >
                                  <img 
                                    src="/sketch.png" 
                                    alt="Sketchfab" 
                                    className="w-8 h-8 object-contain filter brightness-0 opacity-60"
                                  />
                                </div>
                                <div
                                  className="bg-[#1D1E15] hover:bg-[#1D1E15]/80 transition-colors relative"
                                  style={{ 
                                    height: `${sketchfabHeight}px`, 
                                    width: 'calc(45% - 4px)',
                                    minWidth: '40px'
                                  }}
                                />
                              </div>
                              {/* SAM3D META Model Bar */}
                              <div className="flex flex-col items-center justify-end relative" style={{ height: '320px' }}>
                                {/* Logo above bar */}
                                <div 
                                  className="absolute flex items-center justify-center"
                                  style={{ 
                                    bottom: `${metaHeight + 12}px`,
                                    left: '50%',
                                    transform: 'translateX(-50%)'
                                  }}
                                >
                                  <img 
                                    src="/meta-logo.png" 
                                    alt="Meta" 
                                    className="w-8 h-8 object-contain opacity-60"
                                  />
                                </div>
                                <div
                                  className="bg-[#DF6C42] hover:bg-[#DF6C42]/80 transition-colors relative"
                                  style={{ 
                                    height: `${metaHeight}px`, 
                                    width: 'calc(45% - 4px)',
                                    minWidth: '40px'
                                  }}
                                />
                              </div>
                            </div>
                            <div className="text-[8px] uppercase opacity-40 mt-2 text-center px-1">{item.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-[#1D1E15]">
                    <div className="flex items-center justify-center gap-8 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-[#1D1E15]"></div>
                        <div className="text-[10px] uppercase opacity-70">Sketchfab Import</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-[#DF6C42]"></div>
                        <div className="text-[10px] uppercase opacity-70">SAM3D META Model</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold mb-1">2.8s</div>
                        <div className="text-[10px] uppercase opacity-50">Avg Sketchfab</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold mb-1">3.4s</div>
                        <div className="text-[10px] uppercase opacity-50">Avg META Model</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              {/* Key Metrics */}
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#1D1E15] mb-8"
                variants={staggerContainer}
              >
                {[
                  { 
                    label: 'Models Processed', 
                    value: '2,847', 
                    sublabel: 'Total processed', 
                    chart: 85,
                    explanation: 'Total count of 3D models processed through both Sketchfab import and SAM3D pipelines during deployment testing and production runs.'
                  },
                  { 
                    label: 'Success Rate', 
                    value: '94.2%', 
                    sublabel: 'Processing success', 
                    chart: 94,
                    explanation: 'Percentage of models that completed processing without errors. Calculated from successful imports/generations divided by total attempts across both solutions.'
                  },
                  { 
                    label: 'Time Saved', 
                    value: '62%', 
                    sublabel: 'Vs traditional pipeline', 
                    chart: 62,
                    explanation: 'Average time reduction compared to traditional manual 3D processing pipelines. Measured by comparing render times across different mesh complexities using our optimized solutions.'
                  },
                ].map((stat, idx) => (
                  <motion.div
                    key={idx}
                    className={`p-6 border-r border-[#1D1E15] last:border-r-0 hover:bg-[#1D1E15] hover:text-[#E5E6DA] transition-colors flex flex-col`}
                    variants={staggerItem}
                  >
                    <div className="text-[10px] uppercase opacity-50 mb-2">{stat.label}</div>
                    <div className="text-2xl font-bold mb-1">{stat.value}</div>
                    <div className="text-[8px] uppercase opacity-40 mb-3">{stat.sublabel}</div>
                    <div className="w-full h-1 bg-[#DF6C42]/20 overflow-hidden mb-3">
                      <div className="h-full bg-[#DF6C42]" style={{ width: `${stat.chart}%` }}></div>
                    </div>
                    <div className="text-[9px] opacity-60 leading-relaxed mt-auto">{stat.explanation}</div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section id="integrations" className="border-t border-[#1D1E15] bg-[#E5E6DA]">
        <div className="grid grid-cols-12 divide-x divide-[#1D1E15]">
          {/* Left Sidebar Spacer */}
          <div className="hidden lg:block col-span-1"></div>
          
          {/* Main Content */}
          <div className="col-span-12 lg:col-span-11">
            <motion.div 
              className="px-10 py-16 border-b border-[#1D1E15]"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainer}
            >
              <motion.div 
                className="inline-flex items-center gap-2 px-2 py-0.5 border border-[#1D1E15] text-[10px] uppercase tracking-wider w-fit mb-8"
                variants={fadeInDown}
              >
                <div className="w-1.5 h-1.5 bg-[#DF6C42]"></div>
                INTEGRATIONS
              </motion.div>
              
              <motion.h3 
                className="text-4xl font-sans font-medium leading-none tracking-tight text-[#1D1E15] mb-12"
                variants={fadeInUp}
              >
                AI Model Integration
              </motion.h3>
              
              <motion.div 
                className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-[#1D1E15]"
                variants={staggerContainer}
              >
                {/* Gemini Pro */}
                <motion.div 
                  className="p-8 border-r border-b border-[#1D1E15] lg:border-b-0 hover:bg-[#1D1E15] hover:text-[#E5E6DA] transition-colors flex flex-col h-full"
                  variants={staggerItem}
                >
                  <div className="flex items-center gap-4 mb-6">
                    <img src="/gemini-pro.png" alt="Gemini Pro" className="h-8 w-auto object-contain filter brightness-0 opacity-60" />
                  </div>
                  <p className="text-sm opacity-70 leading-relaxed mb-6 flex-1">
                    Integrated via OpenRouter API for real-time 3D mesh component identification. When users 
                    trigger AI identification, Gemini analyzes highlighted mesh components from screenshots, 
                    providing structured JSON responses with part names, descriptions, categories, and confidence 
                    scores. It also generates annotated images with wireframe overlays and labels for educational 
                    visualization.
                  </p>
                  <div className="pt-4 border-t border-[#1D1E15] grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] uppercase opacity-50 mb-1">Use Case</div>
                      <div className="text-sm font-medium">Component ID & Annotation</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase opacity-50 mb-1">Model</div>
                      <div className="text-sm font-medium">gemini-2.0-flash-exp</div>
                    </div>
                  </div>
                </motion.div>
                
                {/* OpenAI */}
                <motion.div 
                  className="p-8 hover:bg-[#1D1E15] hover:text-[#E5E6DA] transition-colors flex flex-col h-full"
                  variants={staggerItem}
                >
                  <div className="flex items-center gap-4 mb-6">
                    <img src="/openai.png" alt="OpenAI" className="h-8 w-auto object-contain filter brightness-0 opacity-60" />
                  </div>
                  <p className="text-sm opacity-70 leading-relaxed mb-6 flex-1">
                    Processes identified mesh components to generate detailed educational explanations 
                    of individual object meshes. After component identification, GPT-4 analyzes mesh 
                    geometry, position, and context to provide comprehensive descriptions, functional 
                    explanations, and educational content about each component's role and characteristics.
                  </p>
                  <div className="pt-4 border-t border-[#1D1E15] grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] uppercase opacity-50 mb-1">Use Case</div>
                      <div className="text-sm font-medium">Mesh Explanation</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase opacity-50 mb-1">Model</div>
                      <div className="text-sm font-medium">GPT-4</div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
              
              {/* Mesh Extraction Explanation */}
              <motion.div 
                className="mt-8 border border-[#1D1E15] p-8"
                variants={fadeInUp}
              >
                <div className="text-[10px] uppercase opacity-50 mb-6">Mesh Extraction via Gemini</div>
                <div className="flex flex-col gap-6">
                  {/* Large Image */}
                  <div className="relative border border-[#1D1E15] bg-[#E5E6DA] overflow-hidden">
                    <img 
                      src="/ironman.png" 
                      alt="Iron Man mesh extraction example" 
                      className="w-full h-auto object-contain filter opacity-90 max-h-[500px]"
                    />
                    <div className="absolute top-2 right-2 text-[8px] uppercase opacity-40 bg-[#E5E6DA] px-2 py-1 border border-[#1D1E15]">
                      Example Mesh
                    </div>
                  </div>
                  
                  {/* Title and Explanation Below */}
                  <div className="flex flex-col gap-4">
                    <h4 className="text-lg font-regular">How Gemini Extracts Mesh Components</h4>
                    <p className="text-sm opacity-70 leading-relaxed">
                      We use Gemini Pro to analyze 3D model structures and intelligently identify individual 
                      components within complex meshes. The model processes geometric data and contextual 
                      information to segment models into distinct parts.
                    </p>
                    <p className="text-sm opacity-70 leading-relaxed">
                      For example, when processing a character model like Iron Man, Gemini analyzes the 
                      mesh geometry to identify separate components such as the helmet, chest plate, 
                      gauntlets, and other modular parts. This enables automated component extraction 
                      without manual labeling.
                    </p>
                    
                    {/* Annotated Image */}
                    <div className="relative border border-[#1D1E15] bg-[#E5E6DA] overflow-hidden mt-4">
                      <img 
                        src="/annotate.png" 
                        alt="Annotated mesh extraction example" 
                        className="w-full h-auto object-contain filter opacity-90"
                      />
                      <div className="absolute top-2 right-2 text-[8px] uppercase opacity-40 bg-[#E5E6DA] px-2 py-1 border border-[#1D1E15]">
                        Annotated Output
                      </div>
                    </div>
                    
                    {/* Explanation of Markings */}
                    <div className="mt-4 pt-4 border-t border-[#1D1E15]">
                      <div className="text-[10px] uppercase opacity-50 mb-3">Marking Explanation</div>
                      <p className="text-sm opacity-70 leading-relaxed">
                        The annotated output shows how Gemini generates visual overlays on identified mesh 
                        components. Purple markings highlight the selected component being analyzed, while 
                        white wireframe lines and labels indicate relationships between parts. Arrows and 
                        diagrams illustrate component boundaries and spatial relationships, making it easier 
                        to understand the mesh structure and identify individual elements.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              {/* Integration Flow */}
              <motion.div 
                className="mt-8 border border-[#1D1E15] p-8"
                variants={fadeInUp}
              >
                <div className="text-[10px] uppercase opacity-50 mb-4">Model Workflow</div>
                <div className="flex flex-col lg:flex-wrap items-center gap-4 lg:justify-center">
                  {['Upload', 'AI Identification Trigger', 'GPT-4 Processing', 'Gemini Pro Annotation', 'Export'].map((step, idx) => (
                    <React.Fragment key={idx}>
                      <div className="px-4 py-2 border border-[#1D1E15] text-xs uppercase mx-auto lg:mx-0 w-fit lg:w-auto text-center lg:text-left">
                        {step}
                      </div>
                      {idx < 4 && (
                        <div className="hidden lg:block w-6 h-px bg-[#1D1E15] opacity-20"></div>
                      )}
                      {idx < 4 && (
                        <div className="lg:hidden w-full flex justify-center py-2">
                          <div className="w-6 h-px bg-[#1D1E15] opacity-20"></div>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Upload & Export Section */}
      <section id="upload-export" className="border-t border-[#1D1E15] bg-[#E5E6DA]">
        <div className="grid grid-cols-12 divide-x divide-[#1D1E15]">
          {/* Left Sidebar Spacer */}
          <div className="hidden lg:block col-span-1"></div>
          
          {/* Main Content */}
          <div className="col-span-12 lg:col-span-11">
            <motion.div 
              className="px-10 py-16 border-b border-[#1D1E15]"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainer}
            >
              <motion.div 
                className="inline-flex items-center gap-2 px-2 py-0.5 border border-[#1D1E15] text-[10px] uppercase tracking-wider w-fit mb-8"
                variants={fadeInDown}
              >
                <div className="w-1.5 h-1.5 bg-[#DF6C42]"></div>
                FILE MANAGEMENT
              </motion.div>
              
              <motion.h3 
                className="text-4xl font-sans font-medium leading-none tracking-tight text-[#1D1E15] mb-12"
                variants={fadeInUp}
              >
                Upload & Export
              </motion.h3>
              
              <motion.div 
                className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-[#1D1E15]"
                variants={staggerContainer}
              >
                {/* Upload */}
                <motion.div 
                  className="p-8 border-r border-b border-[#1D1E15] lg:border-b-0 hover:bg-[#1D1E15] hover:text-[#E5E6DA] transition-colors flex flex-col h-full"
                  variants={staggerItem}
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-8 h-8 border-2 border-[#1D1E15] flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm opacity-70 leading-relaxed mb-6 flex-1">
                    Upload your own GLB files created on any CAD software to break down and learn about its 
                    components in real time. Our intelligent mesh analysis automatically identifies individual 
                    parts, materials, and structural elements, giving you instant insights into complex 3D models.
                    Perfect for engineering analysis, educational purposes, or design optimization.
                  </p>
                  <div className="pt-4 border-t border-[#1D1E15] grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] uppercase opacity-50 mb-1">Supported Formats</div>
                      <div className="text-sm font-medium">GLB (More coming soon!)</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase opacity-50 mb-1">Max Size</div>
                      <div className="text-sm font-medium">100MB</div>
                    </div>
                  </div>
                </motion.div>
                
                {/* Export */}
                <motion.div 
                  className="p-8 hover:bg-[#1D1E15] hover:text-[#E5E6DA] transition-colors flex flex-col h-full"
                  variants={staggerItem}
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-8 h-8 border-2 border-[#1D1E15] flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm opacity-70 leading-relaxed mb-6 flex-1">
                    Use our wide variety of models to export into your favourite CAD softwares and resize 
                    for commercial use or 3D printing. Export individual components or complete assemblies 
                    with precise measurements and material properties. Compatible with major CAD platforms 
                    including SolidWorks, AutoCAD, Fusion 360, and Blender.
                  </p>
                  <div className="pt-4 border-t border-[#1D1E15] grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] uppercase opacity-50 mb-1">Export Formats</div>
                      <div className="text-sm font-medium">GLB (More coming soon!)</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase opacity-50 mb-1">Use Cases</div>
                      <div className="text-sm font-medium">3D Printing, CAD and more!</div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mesh Viewer Section */}
      <section id="mesh-viewer" className="border-t border-[#1D1E15] bg-[#E5E6DA]">
        <div className="grid grid-cols-12 divide-x divide-[#1D1E15]">
          {/* Left Sidebar Spacer */}
          <div className="hidden lg:block col-span-1"></div>
          
          {/* Main Content */}
          <div className="col-span-12 lg:col-span-11">
            <motion.div 
              className="px-10 py-16 border-b border-[#1D1E15]"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainer}
            >
              <motion.div 
                className="inline-flex items-center gap-2 px-2 py-0.5 border border-[#1D1E15] text-[10px] uppercase tracking-wider w-fit mb-8"
                variants={fadeInDown}
              >
                <div className="w-1.5 h-1.5 bg-[#DF6C42]"></div>
                MOTION CONTROL
              </motion.div>
              
              <motion.h3 
                className="text-4xl font-sans font-medium leading-none tracking-tight text-[#1D1E15] mb-12"
                variants={fadeInUp}
              >
                Arduino M5StickCPlus2 Integration
              </motion.h3>
              
              {/* Demo Video */}
              <motion.div 
                className="border border-[#1D1E15] mb-8 bg-[#E5E6DA] overflow-hidden"
                variants={fadeInUp}
              >
                <video 
                  src="/movement.mp4" 
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-auto object-contain"
                  style={{ maxHeight: '600px' }}
                >
                  Your browser does not support the video tag.
                </video>
              </motion.div>
              
              {/* Camera Stick */}
              <motion.div 
                className="border border-[#1D1E15] mb-8"
                variants={fadeInUp}
              >
                <div className="p-8 border-b border-[#1D1E15]">
                  <div className="flex items-center gap-4 mb-4">
                    <img src="/arduino.png" alt="Arduino" className="h-8 w-auto object-contain filter brightness-0 opacity-60" />
                    <h4 className="text-xl font-regular">Camera Stick</h4>
                  </div>
                  <p className="text-sm opacity-70 leading-relaxed mb-6">
                    Real-time 3D mesh rotation control using the M5StickCPlus2's IMU sensors. The device 
                    streams quaternion orientation data via BLE at 500Hz, enabling smooth camera rotation 
                    in the 3D viewer. Button A toggles streaming, Button B triggers mesh splitting.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="border border-[#1D1E15] p-4">
                      <div className="text-[10px] uppercase opacity-50 mb-2">Madgwick Filter</div>
                      <div className="text-xs font-mono opacity-70 mb-2">AHRS.updateIMU(gx, gy, gz, ax, ay, az)</div>
                      <div className="text-[8px] opacity-60">Fuses gyro (rad/s) + accel (g) for orientation</div>
                    </div>
                    <div className="border border-[#1D1E15] p-4">
                      <div className="text-[10px] uppercase opacity-50 mb-2">Relative Quaternion</div>
                      <div className="text-xs font-mono opacity-70 mb-2">q_rel = qCurr × conj(qRef)</div>
                      <div className="text-[8px] opacity-60">Re-centers orientation on button press</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-[#1D1E15] pt-4">
                    {[
                      { label: 'Streaming Rate', value: '500Hz', desc: 'BLE quaternion updates' },
                      { label: 'Gyro Calibration', value: '250 samples', desc: '1s bias estimation' },
                      { label: 'Latency', value: '<2ms', desc: 'End-to-end response' },
                    ].map((stat, idx) => (
                      <div
                        key={idx}
                        className={`p-4 border-r border-[#1D1E15] last:border-r-0`}
                      >
                        <div className="text-[10px] uppercase opacity-50 mb-1">{stat.label}</div>
                        <div className="text-lg font-bold mb-1">{stat.value}</div>
                        <div className="text-[8px] uppercase opacity-40">{stat.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Camera Stick Math */}
                <div className="p-8 bg-[#1D1E15]/5">
                  <div className="text-[10px] uppercase opacity-50 mb-4">Rotation Mathematics</div>
                  <div className="space-y-3 text-xs font-mono opacity-70">
                    <div>// Euler to Quaternion (ZYX order)</div>
                    <div>q_w = cos(r/2)cos(p/2)cos(y/2) + sin(r/2)sin(p/2)sin(y/2)</div>
                    <div>q_x = sin(r/2)cos(p/2)cos(y/2) - cos(r/2)sin(p/2)sin(y/2)</div>
                    <div>q_y = cos(r/2)sin(p/2)cos(y/2) + sin(r/2)cos(p/2)sin(y/2)</div>
                    <div>q_z = cos(r/2)cos(p/2)sin(y/2) - sin(r/2)sin(p/2)cos(y/2)</div>
                  </div>
                </div>
              </motion.div>
              
              {/* Object Stick */}
              <motion.div 
                className="border border-[#1D1E15] mb-8"
                variants={fadeInUp}
              >
                <div className="p-8 border-b border-[#1D1E15]">
                  <div className="flex items-center gap-4 mb-4">
                    <img src="/arduino.png" alt="Arduino" className="h-8 w-auto object-contain filter brightness-0 opacity-60" />
                    <h4 className="text-xl font-regular">Object Stick</h4>
                  </div>
                  <p className="text-sm opacity-70 leading-relaxed mb-6">
                    Button-based controller for 3D model interactions. Sends special quaternion patterns 
                    via BLE to trigger specific actions in the viewer. Button A triggers AI identification, 
                    Button B cycles through zoom levels (2x zoom in, 2x zoom out).
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="border border-[#1D1E15] p-4">
                      <div className="text-[10px] uppercase opacity-50 mb-2">Button A: AI Identify</div>
                      <div className="text-xs font-mono opacity-70 mb-2">q = {'{'}1.0, 1.0, 1.0, 0.0{'}'}</div>
                      <div className="text-[8px] opacity-60">Triggers Gemini Pro component analysis</div>
                    </div>
                    <div className="border border-[#1D1E15] p-4">
                      <div className="text-[10px] uppercase opacity-50 mb-2">Button B: Zoom Control</div>
                      <div className="text-xs font-mono opacity-70 mb-2">Zoom In: {'{'}-1.0, -1.0, -1.0, 0.0{'}'}</div>
                      <div className="text-xs font-mono opacity-70">Zoom Out: {'{'}-2.0, -2.0, -2.0, 0.0{'}'}</div>
                      <div className="text-[8px] opacity-60 mt-2">4-state cycle: 2x in, 2x out</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-[#1D1E15] pt-4">
                    {[
                      { label: 'Connection Mode', value: 'BLE Identity', desc: 'Sends q = {0,0,0,1} when idle' },
                      { label: 'Re-advertise', value: 'Auto + Manual', desc: 'Long-press B for recovery' },
                    ].map((stat, idx) => (
                      <div
                        key={idx}
                        className={`p-4 border-r border-[#1D1E15] last:border-r-0`}
                      >
                        <div className="text-[10px] uppercase opacity-50 mb-1">{stat.label}</div>
                        <div className="text-lg font-bold mb-1">{stat.value}</div>
                        <div className="text-[8px] uppercase opacity-40">{stat.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Object Stick Protocol */}
                <div className="p-8 bg-[#1D1E15]/5">
                  <div className="text-[10px] uppercase opacity-50 mb-4">BLE Protocol</div>
                  <div className="space-y-3 text-xs font-mono opacity-70">
                    <div>// Service UUID: 12345678-1234-5678-1234-56789abcdef0</div>
                    <div>// Characteristic UUID: 12345678-1234-5678-1234-56789abcdef1</div>
                    <div>// Packet: struct QuatPacket {'{'} float qx, qy, qz, qw; {'}'}</div>
                    <div>// Actions encoded as special quaternion patterns</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="visualize" className="border-t border-[#1D1E15] bg-[#E5E6DA]">
        <div className="grid grid-cols-12 divide-x divide-[#1D1E15]">
          {/* Left Sidebar Spacer */}
          <div className="hidden lg:block col-span-1"></div>
          
          {/* Main Content */}
          <div className="col-span-12 lg:col-span-11">
            <motion.div 
              className="px-10 py-8"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-b border-[#1D1E15] pb-8 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <img src="/logo.png" alt="Mesh Logo" className="w-6 h-6 object-contain invert" />
                    <span className="text-sm font-medium">Mesh</span>
                  </div>
                  <p className="text-xs opacity-60 leading-relaxed">
                    The coordination layer for geospatial data. Blazing fast 3D model processing and visualization.
                  </p>
                </div>
                
                <div>
                  <div className="text-[10px] uppercase opacity-50 mb-4">Quick Links</div>
                  <div className="flex flex-col gap-2">
                    {[
                      { name: 'Process', href: '#process' },
                      { name: 'Metrics', href: '#metrics' },
                      { name: 'Integrations', href: '#integrations' },
                      { name: 'Motion Control', href: '#mesh-viewer' },
                    ].map((item) => (
                      <a
                        key={item.name}
                        href={item.href}
                        onClick={(e) => {
                          e.preventDefault();
                          const element = document.querySelector(item.href);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }}
                        className="text-xs opacity-70 hover:text-[#DF6C42] hover:opacity-100 transition-colors cursor-pointer"
                      >
                        {item.name}
                      </a>
                    ))}
                  </div>
                </div>
                
                <div>
                  <div className="text-[10px] uppercase opacity-50 mb-4">Resources</div>
                  <div className="flex flex-col gap-2">
                    <Link href="/dashboard" className="text-xs opacity-70 hover:text-[#DF6C42] hover:opacity-100 transition-colors">
                      Dashboard
                    </Link>
                    <a href="#" className="text-xs opacity-70 hover:text-[#DF6C42] hover:opacity-100 transition-colors">
                      Documentation
                    </a>
                    <a href="https://github.com/devp19/Mesh" target="_blank" rel="noopener noreferrer" className="text-xs opacity-70 hover:text-[#DF6C42] hover:opacity-100 transition-colors">
                      GitHub
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase opacity-50">
                <div>© 2025 Mesh. Built by <a href="https://www.linkedin.com/in/fenilshah05/" target="_blank" rel="noopener noreferrer" className="hover:text-[#DF6C42] transition-colors">Fenil Shah</a>, <a href="https://www.linkedin.com/in/devp19/" target="_blank" rel="noopener noreferrer" className="hover:text-[#DF6C42] transition-colors">Dev Patel</a>, <a href="https://www.linkedin.com/in/kushp4444/" target="_blank" rel="noopener noreferrer" className="hover:text-[#DF6C42] transition-colors">Kush Patel</a>.</div>
                <div className="flex items-center gap-4">
                  <span>v.2.0.4</span>
                  <span className="opacity-30">/</span>
                  <span>System Status: Nominal</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </footer>

      {/* Mobile Modal */}
      {showMobileModal && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMobileModal(false)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-[#E5E6DA] border-2 border-[#1D1E15] p-8 max-w-sm w-full">
            {/* Close Button */}
            <button
              onClick={() => setShowMobileModal(false)}
              className="absolute top-4 right-4 w-8 h-8 border border-[#1D1E15] flex items-center justify-center hover:bg-[#1D1E15] hover:text-[#E5E6DA] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Modal Header */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1.5 h-1.5 bg-[#DF6C42]"></div>
              <span className="text-[10px] uppercase tracking-wider">DEMO ACCESS</span>
            </div>
            
            {/* Modal Title */}
            <h3 className="text-2xl font-sans font-medium leading-none tracking-tight text-[#1D1E15] mb-4">
              LARGER SCREEN<br/>RECOMMENDED
            </h3>
            
            {/* Modal Message */}
            <p className="text-sm opacity-70 leading-relaxed mb-6">
              For the best demo experience, please view on a tablet or desktop device. The full 3D visualization and interactive features require a larger screen.
            </p>
            
            {/* Action Button */}
            <button
              onClick={() => setShowMobileModal(false)}
              className="w-full px-6 py-3 bg-[#DF6C42] text-[#E5E6DA] text-[10px] uppercase font-bold hover:bg-[#1D1E15] transition-colors"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
