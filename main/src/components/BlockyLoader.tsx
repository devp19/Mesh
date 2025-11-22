'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const MESSAGES = [
  'Rendering model...',
  'Fetching geospatial scene...',
  'Analyzing topology...',
  'Optimizing meshes...',
  'Computing lightmaps...',
  'Calibrating sensors...',
  'Initializing viewer...',
];

interface BlockyLoaderProps {
  onFinished?: () => void;
}

export default function BlockyLoader({ onFinished }: BlockyLoaderProps) {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % MESSAGES.length);
    }, 400);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Wrap callback in setTimeout to avoid "Cannot update a component while rendering a different component"
          // This ensures the state update happens in the next tick, not during this render cycle
          if (onFinished) {
             setTimeout(() => onFinished(), 0);
          }
          return 100;
        }
        return prev + Math.random() * 8; // Faster progress
      });
    }, 80); // Faster interval

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, [onFinished]);

  // Calculate number of filled blocks (20 total blocks for 100%)
  const totalBlocks = 20;
  const filledBlocks = Math.floor((progress / 100) * totalBlocks);

  return (
    <div className="fixed inset-0 bg-[#E5E6DA]/90 backdrop-blur-md z-[60] flex flex-col items-center justify-center font-mono">
      <div className="w-96 space-y-6">
        {/* Hexagon/Cube Animation */}
        <div className="flex justify-center mb-8">
          <div className="relative w-24 h-24 grid grid-cols-2 gap-2">
            <motion.div
              className="bg-[#1D1E15]"
              animate={{
                scale: [1, 0.8, 1],
                rotate: [0, 90, 0],
                opacity: [1, 0.5, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, 0.5, 1]
              }}
            />
            <motion.div
              className="bg-[#DF6C42]"
              animate={{
                scale: [1, 0.8, 1],
                rotate: [0, -90, 0],
                opacity: [1, 0.5, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, 0.5, 1],
                delay: 0.2
              }}
            />
             <motion.div
              className="bg-[#DF6C42]"
              animate={{
                scale: [1, 0.8, 1],
                rotate: [0, -90, 0],
                opacity: [1, 0.5, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, 0.5, 1],
                delay: 0.4
              }}
            />
             <motion.div
              className="bg-[#1D1E15]"
              animate={{
                scale: [1, 0.8, 1],
                rotate: [0, 90, 0],
                opacity: [1, 0.5, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, 0.5, 1],
                delay: 0.6
              }}
            />
          </div>
        </div>

        {/* Text Animation */}
        <div className="h-8 relative overflow-hidden text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentMessage}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3, ease: "backOut" }}
              className="absolute inset-x-0 text-[#1D1E15] text-sm uppercase tracking-widest font-bold"
            >
              {MESSAGES[currentMessage]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Blocky Progress Bar */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm font-medium text-[#1D1E15] uppercase tracking-wider">
            <span>System Status: Loading</span>
            <span className="text-3xl">{Math.min(100, Math.floor(progress))}%</span>
          </div>
          <div className="flex gap-1.5 h-8">
            {Array.from({ length: totalBlocks }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scaleY: 0 }}
                animate={{ 
                  scaleY: i < filledBlocks ? 1 : 0.2,
                  backgroundColor: i < filledBlocks ? '#DF6C42' : '#1D1E15'
                }}
                transition={{ duration: 0.2 }}
                className="flex-1 origin-bottom opacity-80"
              />
            ))}
          </div>
        </div>
        
        <div className="text-center pt-4">
             <div className="inline-block px-3 py-1 bg-[#1D1E15]/5 border border-[#1D1E15]/20 text-[#1D1E15]/60 text-[10px] uppercase tracking-widest">
                V.2.0.4 - GEOSPATIAL ENGINE
             </div>
        </div>
      </div>
    </div>
  );
}

