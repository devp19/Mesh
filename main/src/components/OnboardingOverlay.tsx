import React, { useState, useRef, useEffect } from 'react';
import { DEMO_MODELS } from '@/lib/demo-config';

interface OnboardingOverlayProps {
  isDemoMode: boolean;
  onGenerate: (prompt: string) => void;
  onSelectDemo: (id: string) => void;
  onImport: () => void; // Triggers the hidden file input
  onDismiss: () => void;
}

export default function OnboardingOverlay({
  isDemoMode,
  onGenerate,
  onSelectDemo,
  onImport,
  onDismiss
}: OnboardingOverlayProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedDemo, setSelectedDemo] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleGenerateSubmit = () => {
    if (prompt.trim()) {
      onGenerate(prompt);
    }
  };

  const handleDemoSelect = (id: string, name: string) => {
    setSelectedDemo(name);
    setIsDropdownOpen(false);
    if (id) {
      onSelectDemo(id);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#E5E6DA]/95 backdrop-blur-sm animate-in fade-in duration-500">
      <div className="w-full max-w-lg p-8 text-center space-y-8">
        
        {/* Header */}
        <div className="space-y-3 text-left pl-1">
          <div className="w-16 h-16 flex items-center justify-center mb-6 overflow-hidden -ml-3">
             <img src="/logo.png" alt="Mesh Logo" className="w-10 h-10 object-contain invert" />
          </div>
          <p className="text-[#1D1E15]/60 font-mono text-xs uppercase tracking-wider max-w-md leading-relaxed">
            Advanced spatial visualization & analysis platform. <br/>
            Connect hardware or explore procedural models.
          </p>
        </div>

        {/* Actions Container */}
        <div className="bg-[#E5E6DA] border border-[#1D1E15] p-1.5 rounded-xl shadow-2xl">
          
          {/* Demo Mode: Custom Dropdown */}
          {isDemoMode ? (
            <div className="p-4 space-y-4 bg-[#1D1E15]/5 rounded-lg border border-[#1D1E15]/5">
              <div className="text-left space-y-1.5 relative" ref={dropdownRef}>
                <label className="text-[10px] font-bold uppercase text-[#1D1E15] tracking-wider">
                  Select Preloaded Model
                </label>
                
                {/* Custom Dropdown Trigger */}
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full bg-[#1D1E15] border border-[#1D1E15] text-[#E5E6DA] text-xs font-mono p-3 rounded-lg outline-none focus:border-[#DF6C42] transition-colors flex items-center justify-between hover:bg-[#1D1E15]/90"
                >
                  <span className={selectedDemo ? "text-[#E5E6DA]" : "text-[#E5E6DA]/60"}>
                    {selectedDemo || "Choose a model to inspect..."}
                  </span>
                  <svg 
                    width="12" 
                    height="12" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    className={`transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                  >
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1D1E15] border border-[#1D1E15] rounded-lg shadow-lg overflow-hidden z-50 max-h-48 overflow-y-auto">
                    {DEMO_MODELS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleDemoSelect(m.id, m.name)}
                        className="w-full text-left px-3 py-2.5 text-xs font-mono text-[#E5E6DA] hover:bg-[#DF6C42] hover:text-white transition-colors border-b border-[#E5E6DA]/10 last:border-0"
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Normal Mode: Generate Input */
            <div className="p-4 space-y-4 bg-[#1D1E15]/5 rounded-lg border border-[#1D1E15]/5">
              <div className="text-left space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-[#1D1E15] tracking-wider">
                  Generate Procedural Model
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. V8 Engine, Human Heart..."
                    className="flex-1 bg-[#1D1E15] border border-[#1D1E15] text-[#E5E6DA] text-xs font-mono p-3 rounded-lg outline-none focus:border-[#DF6C42] transition-colors placeholder:text-[#E5E6DA]/40"
                    onKeyDown={(e) => e.key === "Enter" && handleGenerateSubmit()}
                  />
                  <button
                    onClick={handleGenerateSubmit}
                    disabled={!prompt.trim()}
                    className="px-4 bg-[#1D1E15] text-[#E5E6DA] text-xs font-bold uppercase rounded-lg hover:bg-[#DF6C42] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Generate
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="relative h-8 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#1D1E15]/10"></div>
            </div>
            <span className="relative bg-[#E5E6DA] px-2 text-[10px] text-[#1D1E15]/40 font-mono uppercase tracking-widest">OR</span>
          </div>

          {/* Import Button - Orange Accent Version */}
          <button
            onClick={onImport}
            className="w-full group flex items-center justify-center gap-3 p-4 bg-[#DF6C42] border border-[#1D1E15] rounded-lg shadow-[0_8px_0_0_#1D1E15] hover:bg-[#1D1E15] hover:text-[#E5E6DA] transition-all cursor-pointer mb-3"
          >
            <div className="w-8 h-8 bg-[#E5E6DA] rounded-md flex items-center justify-center group-hover:bg-[#E5E6DA]/90 group-hover:text-[#1D1E15] transition-colors text-[#1D1E15]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-[#E5E6DA] uppercase tracking-wide group-hover:text-[#DF6C42]">Import Local File</div>
              <div className="text-[10px] text-[#E5E6DA]/80 font-mono">Supported formats: .GLB, .GLTF</div>
            </div>
          </button>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-center gap-6 text-[10px] text-[#1D1E15]/40 font-mono uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#DF6C42]"></div>
            Web Bluetooth
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#DF6C42]"></div>
            AI Analysis
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#DF6C42]"></div>
            Hardware Controls
          </div>
        </div>

      </div>
    </div>
  );
}
