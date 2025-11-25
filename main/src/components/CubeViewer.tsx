'use client';

import { useRef, useEffect } from 'react';

interface CubeViewerProps {
  videoSrc?: string; // Path to video file in public folder, e.g., "/screen-recording.mp4"
}

export default function CubeViewer({ videoSrc = '/drone.mp4' }: CubeViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      // Set video to loop and autoplay
      videoRef.current.loop = true;
      videoRef.current.muted = true; // Required for autoplay in most browsers
      videoRef.current.play().catch((err) => {
        console.log('Video autoplay failed:', err);
      });
    }
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <video
        ref={videoRef}
        src={videoSrc}
        className="w-full h-full object-contain"
        autoPlay
        loop
        muted
        playsInline
      />
    </div>
  );
}
