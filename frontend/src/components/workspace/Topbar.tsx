"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useToastStore } from '@/store/toastStore';
import { Users, ChevronDown, Check, User, Command } from 'lucide-react';
import KeyboardShortcuts from './KeyboardShortcuts';

export default function Topbar() {
  const { addToast } = useToastStore();
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (workspaceRef.current && !workspaceRef.current.contains(event.target as Node)) {
        setShowWorkspace(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-[#212121] border-b border-[#333333] text-sm gap-4">
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="font-semibold text-lg tracking-tight flex items-center gap-2 text-gray-200">
          <span className="w-6 h-6 rounded-md bg-orange-500 flex items-center justify-center text-white text-xs font-bold">P</span>
          Postman Clone
        </div>
        <nav className="flex items-center gap-6 text-gray-400 ml-6 font-medium text-[13px]">
          <div className="relative" ref={workspaceRef}>
            <button 
              onClick={() => setShowWorkspace(!showWorkspace)} 
              className={`flex items-center gap-1.5 hover:text-gray-200 transition-colors ${showWorkspace ? 'text-gray-200' : ''}`}
            >
              My Workspace
              <ChevronDown className={`w-3.5 h-3.5 transform transition-transform duration-200 ${showWorkspace ? 'rotate-180' : ''}`} />
            </button>
            
            {showWorkspace && (
              <div className="absolute top-full left-0 mt-4 w-[420px] max-w-[90vw] bg-[#1C1C1C] border border-[#2A2A2A] rounded-md shadow-2xl py-3 z-50 text-[13px]">
                <div className="flex items-center gap-3 px-3 pb-3 border-b border-[#2A2A2A]">
                  <input 
                    type="text" 
                    placeholder="Search Workspaces" 
                    className="flex-1 min-w-0 bg-transparent border border-[#333] hover:border-[#555] focus:border-[#777] rounded px-3 py-1.5 outline-none text-gray-200 placeholder-gray-500 transition-colors"
                  />
                  <button 
                    onClick={() => addToast("Create Workspace - Coming Soon!", "info")}
                    className="px-3 py-1.5 bg-[#333] hover:bg-[#444] text-gray-200 rounded transition-colors whitespace-nowrap font-medium"
                  >
                    Create Workspace
                  </button>
                </div>
                
                <div className="pt-3 pb-1">
                  <div className="px-4 py-1.5 text-xs font-semibold text-gray-300">Recently Visited</div>
                  <button 
                    onClick={() => setShowWorkspace(false)}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#2A2A2A] text-left transition-colors"
                  >
                    <Check className="w-4 h-4 text-gray-400" />
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-200">My Workspace</span>
                  </button>
                </div>
                
                <div className="pt-1">
                  <div className="px-4 py-1.5 text-xs font-semibold text-gray-300">More Workspaces</div>
                  <button 
                    onClick={() => { addToast("Team Workspace - Coming Soon!", "info"); setShowWorkspace(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#2A2A2A] text-left transition-colors"
                  >
                    <div className="w-4" /> {/* Spacer to align with checkmark */}
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300 truncate">science-participant-24315589's Team's ...</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          <button onClick={() => addToast("API Network - Coming Soon!", "info")} className="hover:text-gray-200 transition-colors">API Network</button>
          <button onClick={() => addToast("Explore - Coming Soon!", "info")} className="hover:text-gray-200 transition-colors">Explore</button>
        </nav>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <button 
          onClick={() => setShowShortcuts(true)}
          className="p-2 hover:bg-[#333] rounded text-gray-400 hover:text-gray-200 transition-colors"
          title="Keyboard Shortcuts"
        >
          <Command className="w-4 h-4" />
        </button>
        <button 
          onClick={() => addToast("Team Sharing & Collaboration - Coming Soon!", "info")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#333] border border-[#444] rounded text-gray-300 transition-colors"
        >
          <Users className="w-3.5 h-3.5 text-blue-400" />
          <span>Invite</span>
        </button>
        <button 
          onClick={() => addToast("User Profile & Settings - Coming Soon!", "info")}
          title="Default User"
          className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white text-xs font-bold border border-orange-500 hover:bg-orange-700 transition-colors cursor-pointer"
        >
          U
        </button>
      </div>
      {showShortcuts && <KeyboardShortcuts onClose={() => setShowShortcuts(false)} />}
    </header>
  );
}
