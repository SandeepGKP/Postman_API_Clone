import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useCookieStore } from '@/store/cookieStore';

interface CookieManagerProps {
  onClose: () => void;
}

export default function CookieManager({ onClose }: CookieManagerProps) {
  const { cookies, addDomain, deleteDomain, addCookie, updateCookie, deleteCookie } = useCookieStore();
  const [selectedDomain, setSelectedDomain] = useState<string | null>(Object.keys(cookies)[0] || null);
  const [newDomain, setNewDomain] = useState('');

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDomain.trim()) {
      addDomain(newDomain.trim());
      setSelectedDomain(newDomain.trim());
      setNewDomain('');
    }
  };

  const domainCookies = selectedDomain ? cookies[selectedDomain] || [] : [];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1C1C1C] rounded-lg shadow-2xl w-full max-w-4xl h-[600px] flex flex-col border border-[#333333] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-[#333333] bg-[#212121]">
          <h2 className="text-sm font-semibold text-gray-200">Manage Cookies</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Domains Sidebar */}
          <div className="w-1/3 border-r border-[#333333] flex flex-col bg-[#1A1A1A]">
            <form onSubmit={handleAddDomain} className="p-3 border-b border-[#333333]">
              <input
                type="text"
                placeholder="Add Domain (e.g. example.com)"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="w-full bg-[#2A2A2A] text-gray-200 text-[13px] px-3 py-1.5 rounded border border-[#444] focus:border-[#0F6F99] focus:outline-none placeholder-gray-500"
              />
            </form>
            <div className="flex-1 overflow-y-auto">
              {Object.keys(cookies).length === 0 ? (
                <div className="text-center p-6 text-[13px] text-gray-500">
                  No domains configured.
                </div>
              ) : (
                <ul className="py-2">
                  {Object.keys(cookies).map(domain => (
                    <li 
                      key={domain}
                      onClick={() => setSelectedDomain(domain)}
                      className={`px-4 py-2 cursor-pointer flex justify-between items-center group transition-colors ${selectedDomain === domain ? 'bg-[#2A2A2A] border-l-2 border-orange-500 text-gray-200' : 'text-gray-400 hover:bg-[#252525] border-l-2 border-transparent'}`}
                    >
                      <span className="text-[13px] truncate pr-2 font-medium">{domain}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteDomain(domain); if(selectedDomain === domain) setSelectedDomain(null); }}
                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 p-1"
                        title="Delete Domain"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Cookies Area */}
          <div className="flex-1 flex flex-col bg-[#1E1E1E]">
            {selectedDomain ? (
              <>
                <div className="px-4 py-3 border-b border-[#333333] flex justify-between items-center">
                  <h3 className="text-[13px] font-semibold text-gray-300">Cookies for {selectedDomain}</h3>
                  <button 
                    onClick={() => addCookie(selectedDomain, { name: 'Cookie_'+(domainCookies.length+1), value: 'value', domain: selectedDomain, path: '/' })}
                    className="flex items-center gap-1 bg-[#2A2A2A] hover:bg-[#333] text-gray-300 px-2 py-1 rounded text-xs border border-[#444]"
                  >
                    <Plus className="w-3 h-3" /> Add Cookie
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {domainCookies.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-[13px] text-gray-500">
                      No cookies for this domain.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {domainCookies.map((cookie) => (
                        <div key={cookie.id} className="bg-[#212121] border border-[#333333] rounded p-3">
                          <div className="flex justify-between items-start mb-2">
                            <input 
                              className="bg-transparent text-sm font-semibold text-gray-200 focus:outline-none w-1/3" 
                              value={cookie.name} 
                              onChange={(e) => updateCookie(selectedDomain, cookie.id, { name: e.target.value })}
                            />
                            <button onClick={() => deleteCookie(selectedDomain, cookie.id)} className="text-gray-500 hover:text-red-400">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <div className="mb-2">
                            <label className="text-[11px] text-gray-500 uppercase tracking-wider block mb-1">Value</label>
                            <textarea 
                              className="w-full bg-[#1A1A1A] border border-[#333333] rounded text-[13px] text-gray-300 p-2 focus:outline-none focus:border-[#444] resize-y min-h-[60px] font-mono"
                              value={cookie.value}
                              onChange={(e) => updateCookie(selectedDomain, cookie.id, { value: e.target.value })}
                            />
                          </div>

                          <div className="flex gap-4">
                            <div className="flex-1">
                              <label className="text-[11px] text-gray-500 uppercase tracking-wider block mb-1">Path</label>
                              <input 
                                className="w-full bg-[#1A1A1A] border border-[#333333] rounded text-[12px] text-gray-300 p-1.5 focus:outline-none focus:border-[#444]"
                                value={cookie.path}
                                onChange={(e) => updateCookie(selectedDomain, cookie.id, { path: e.target.value })}
                              />
                            </div>
                            <div className="flex items-end gap-4 pb-1">
                              <label className="flex items-center gap-1.5 text-[12px] text-gray-400 cursor-pointer">
                                <input type="checkbox" checked={cookie.secure || false} onChange={(e) => updateCookie(selectedDomain, cookie.id, { secure: e.target.checked })} className="rounded bg-[#2A2A2A] border-[#444] text-orange-500 focus:ring-0" />
                                Secure
                              </label>
                              <label className="flex items-center gap-1.5 text-[12px] text-gray-400 cursor-pointer">
                                <input type="checkbox" checked={cookie.httpOnly || false} onChange={(e) => updateCookie(selectedDomain, cookie.id, { httpOnly: e.target.checked })} className="rounded bg-[#2A2A2A] border-[#444] text-orange-500 focus:ring-0" />
                                HttpOnly
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-[13px] text-gray-500">
                Select a domain to view and manage cookies.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
