import React from 'react';
import { X, Command } from 'lucide-react';

interface KeyboardShortcutsProps {
  onClose: () => void;
}

export default function KeyboardShortcuts({ onClose }: KeyboardShortcutsProps) {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifier = isMac ? '⌘' : 'Ctrl';

  const shortcuts = [
    { name: 'Send Request', keys: [modifier, 'Enter'] },
    { name: 'Save Request', keys: [modifier, 'S'] },
    { name: 'New Request', keys: [modifier, 'N'] },
    { name: 'Close Tab', keys: [modifier, 'W'] },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1C1C1C] border border-[#333333] rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#333333] bg-[#212121]">
          <div className="flex items-center gap-2">
            <Command className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-200">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 bg-[#1E1E1E]">
          <div className="flex flex-col gap-3">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-[13px] text-gray-300 font-medium">{shortcut.name}</span>
                <div className="flex gap-1.5">
                  {shortcut.keys.map((key, i) => (
                    <kbd 
                      key={i} 
                      className="px-2 py-1 bg-[#2A2A2A] border border-[#444] rounded text-xs font-mono text-gray-200 shadow-sm"
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-4 py-3 border-t border-[#333333] bg-[#212121] text-xs text-gray-500 text-center">
          More shortcuts coming soon!
        </div>
      </div>
    </div>
  );
}
