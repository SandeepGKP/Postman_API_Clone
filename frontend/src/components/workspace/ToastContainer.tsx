"use client";

import React from 'react';
import { useToastStore } from '@/store/toastStore';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div 
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded shadow-lg min-w-[280px] max-w-sm text-sm border 
            ${toast.type === 'success' ? 'bg-[#1a2e22] border-green-800 text-green-100' : 
              toast.type === 'error' ? 'bg-[#3b1919] border-red-800 text-red-100' : 
              'bg-[#1e1e1e] border-[#444] text-gray-200'
            }`}
        >
          {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />}
          
          <span className="flex-1 font-medium">{toast.message}</span>
          
          <button onClick={() => removeToast(toast.id)} className="opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
