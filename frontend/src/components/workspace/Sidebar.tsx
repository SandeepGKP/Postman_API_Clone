"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Folder, Clock, Plus, Search, Trash2, Server, Activity, FileText, Users, Edit2, Play } from 'lucide-react';
import { useWorkspaceStore, createNewTab, RequestTab } from '@/store/workspaceStore';
import { fetchCollections, fetchHistory, deleteHistory, deleteHistoryByDate, fetchEnvironments, API_BASE } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';

export default function Sidebar() {
  const { activeSidebarTab, setActiveSidebarTab, addTab } = useWorkspaceStore();
  const { addToast } = useToastStore();
  const [collections, setCollections] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [showNewDropdown, setShowNewDropdown] = useState(false);
  const newDropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (newDropdownRef.current && !newDropdownRef.current.contains(event.target as Node)) {
        setShowNewDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(300);

  const startSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const onMouseMove = (moveEvent: MouseEvent) => {
      // Primary sidebar is 64px (w-16)
      const newWidth = moveEvent.clientX - 64;
      const maxWidth = Math.min(800, window.innerWidth - 450);
      if (newWidth >= 150 && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
      }
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const loadData = () => {
    fetchCollections().then(setCollections).catch(console.error);
    fetchHistory().then(setHistory).catch(console.error);
    fetchEnvironments().then(envs => useWorkspaceStore.getState().setEnvironments(envs)).catch(console.error);
  };

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [activeSidebarTab]);

  const handleNewRequest = (protocol: 'http' | 'ws' | 'grpc' = 'http') => {
    addTab(createNewTab(protocol));
    setShowNewDropdown(false);
  };

  const openSavedRequest = (req: any) => {
    const tab: RequestTab = {
      id: `saved_${req.id}`,
      name: req.name,
      method: req.method,
      url: req.url,
      headers: req.headers || [],
      queryParams: req.query_params || [],
      bodyType: req.body_type || 'none',
      body: req.body || '',
      formData: [],
      urlencoded: [],
      authType: req.auth_type || 'none',
      authCredentials: req.auth_credentials || {},
      savedRequestId: req.id,
      collectionId: req.collection_id
    };
    addTab(tab);
  };

  const openHistoryItem = (item: any) => {
    const tab: RequestTab = {
      id: `hist_${item.id}`,
      name: item.url,
      method: item.method,
      url: item.url,
      headers: [],
      queryParams: [],
      bodyType: 'none',
      body: '',
      formData: [],
      urlencoded: [],
      authType: 'none',
      authCredentials: {}
    };
    addTab(tab);
  };

  const createCollection = async () => {
    if (!newColName) return;
    try {
      await fetch(`${API_BASE}/collections/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newColName, description: "" })
      });
      setNewColName("");
      setShowNewCollection(false);
      loadData();
      addToast("Collection created", "success");
    } catch (e) {
      addToast("Failed to create collection", "error");
    }
  };

  const deleteCollection = async (id: number) => {
    if (!confirm("Are you sure you want to delete this collection and all its requests?")) return;
    try {
      await fetch(`${API_BASE}/collections/${id}`, { method: 'DELETE' });
      loadData();
      addToast("Collection deleted", "success");
    } catch (e) {
      addToast("Failed to delete", "error");
    }
  };

  const renameCollection = async (col: any) => {
    const newName = prompt("Rename collection to:", col.name);
    if (!newName || newName === col.name) return;
    try {
      await fetch(`${API_BASE}/collections/${col.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: col.description || "" })
      });
      loadData();
      addToast("Collection renamed", "success");
    } catch (e) {
      addToast("Failed to rename", "error");
    }
  };

  const deleteRequest = async (id: number) => {
    if (!confirm("Delete this saved request?")) return;
    try {
      await fetch(`${API_BASE}/requests/${id}`, { method: 'DELETE' });
      loadData();
      addToast("Request deleted", "success");
    } catch (e) {
      addToast("Failed to delete request", "error");
    }
  };

  const exportCollection = (col: any) => {
    const postmanV2 = {
      info: {
        _postman_id: col.id ? col.id.toString() : "id",
        name: col.name,
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      item: col.requests.map((req: any) => {
        return {
          name: req.name,
          request: {
            method: req.method,
            header: req.headers ? req.headers.filter((h:any)=>h.key).map((h:any) => ({ key: h.key, value: h.value })) : [],
            url: {
              raw: req.url || "",
              host: req.url && req.url.split('://').length > 1 ? req.url.split('://')[1].split('/')[0].split('.') : req.url ? req.url.split('/')[0].split('.') : [],
              path: req.url && req.url.split('://').length > 1 ? req.url.split('://')[1].split('/').slice(1) : req.url ? req.url.split('/').slice(1) : [],
              query: req.query_params ? req.query_params.filter((q:any)=>q.key).map((q:any) => ({ key: q.key, value: q.value })) : []
            },
            body: req.body_type !== 'none' ? {
              mode: req.body_type,
              raw: req.body_type === 'raw' ? req.body : undefined,
              formdata: req.body_type === 'form-data' && req.formData ? req.formData.map((f:any) => ({ key: f.key, value: f.value, type: f.type })) : undefined,
              urlencoded: req.body_type === 'urlencoded' && req.urlencoded ? req.urlencoded.map((f:any) => ({ key: f.key, value: f.value })) : undefined
            } : undefined,
            auth: req.auth_type && req.auth_type !== 'none' ? {
              type: req.auth_type,
              [req.auth_type]: req.auth_type === 'bearer' ? [{ key: 'token', value: req.auth_credentials?.token, type: 'string' }] :
                req.auth_type === 'basic' ? [
                  { key: 'username', value: req.auth_credentials?.username, type: 'string' },
                  { key: 'password', value: req.auth_credentials?.password, type: 'string' }
                ] : []
            } : undefined
          }
        };
      })
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(postmanV2, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", `${col.name}_collection.json`);
    dl.click();
  };

  const handleDeleteHistory = async (id: number) => {
    try {
      await deleteHistory(id);
      loadData();
      addToast("History item deleted", "success");
    } catch (e) {
      addToast("Failed to delete history item", "error");
    }
  };

  const handleDeleteHistoryByDate = async (dateStr: string) => {
    if (!confirm(`Delete all history for ${dateStr}?`)) return;
    try {
      const items = groupedHistory[dateStr] || [];
      for (const item of items) {
        await deleteHistory(item.id);
      }
      loadData();
      addToast("History for date deleted", "success");
    } catch (e) {
      addToast("Failed to delete history", "error");
    }
  };

  const parseSafeDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const safeStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
    return new Date(safeStr.endsWith('Z') ? safeStr : safeStr + 'Z');
  };

  const formatIndianTime = (dateStr: string) => {
    const d = parseSafeDate(dateStr);
    let hours = d.getHours();
    let minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minStr} ${ampm}`;
  };

  const groupedHistory = history.reduce((acc: any, item: any) => {
    const d = parseSafeDate(item.created_at);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(item);
    return acc;
  }, {});

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const importCollection = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = async (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const colData = JSON.parse(event.target?.result as string);
          
          let name = "Imported Collection";
          let requests: any[] = [];
          
          if (colData.info && colData.item) {
            name = colData.info.name || name;
            
            const flattenItems = (items: any[]) => {
              for (const item of items) {
                if (item.item) {
                  flattenItems(item.item);
                } else if (item.request) {
                  const req = item.request;
                  let bodyType = 'none';
                  let body = '';
                  if (req.body && req.body.mode) {
                    bodyType = req.body.mode;
                    if (bodyType === 'raw') body = req.body.raw || '';
                  }
                  
                  let authType = 'none';
                  let authCreds = {};
                  if (req.auth && req.auth.type) {
                    authType = req.auth.type;
                    if (authType === 'bearer' && req.auth.bearer) {
                      authCreds = { token: req.auth.bearer.find((x:any)=>x.key==='token')?.value || '' };
                    } else if (authType === 'basic' && req.auth.basic) {
                      authCreds = { 
                        username: req.auth.basic.find((x:any)=>x.key==='username')?.value || '',
                        password: req.auth.basic.find((x:any)=>x.key==='password')?.value || ''
                      };
                    }
                  }

                  let urlStr = '';
                  if (typeof req.url === 'string') urlStr = req.url;
                  else if (req.url && req.url.raw) urlStr = req.url.raw;

                  requests.push({
                    name: item.name || 'Untitled Request',
                    method: req.method || 'GET',
                    url: urlStr,
                    headers: req.header ? req.header.map((h:any) => ({ key: h.key, value: h.value, enabled: true })) : [],
                    query_params: req.url?.query ? req.url.query.map((q:any) => ({ key: q.key, value: q.value, enabled: true })) : [],
                    body_type: bodyType,
                    body: body,
                    auth_type: authType,
                    auth_credentials: authCreds
                  });
                }
              }
            };
            flattenItems(colData.item);
          } else {
             name = colData.name || name;
             if (colData.requests) requests = colData.requests;
          }

          const colRes = await fetch(`${API_BASE}/collections/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name + " (Imported)", description: "" })
          });
          const newCol = await colRes.json();
          
          if (requests.length > 0) {
            for (const req of requests) {
              await fetch(`${API_BASE}/requests/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  collection_id: newCol.id,
                  name: req.name,
                  method: req.method,
                  url: req.url,
                  headers: req.headers,
                  query_params: req.query_params,
                  body_type: req.body_type,
                  body: req.body,
                  auth_type: req.auth_type,
                  auth_credentials: req.auth_credentials
                })
              });
            }
          }
          addToast("Collection Imported Successfully!", "success");
          loadData();
        } catch (err) {
          addToast("Invalid Collection Format", "error");
        }
      };
      reader.readAsText(file);
    };
    fileInput.click();
  };

  return (
    <div className="flex h-full">
      {/* Primary Vertical Navigation */}
      <nav className="w-16 bg-[#1A1A1A] border-r border-[#333333] flex flex-col items-center py-4 gap-6 text-gray-500">
        <button onClick={() => setActiveSidebarTab('collections')} className={`flex flex-col items-center gap-1 hover:text-gray-200 ${activeSidebarTab === 'collections' ? 'text-gray-200' : ''}`} title="Collections">
          <Folder className="w-5 h-5" />
          <span className="text-[9px]">Collections</span>
        </button>
        <button onClick={() => setActiveSidebarTab('mocks')} className={`flex flex-col items-center gap-1 hover:text-gray-200 ${activeSidebarTab === 'mocks' ? 'text-gray-200' : ''}`} title="Mock Servers">
          <Server className="w-5 h-5" />
          <span className="text-[9px]">Mock Servers</span>
        </button>
        <button onClick={() => setActiveSidebarTab('monitors')} className={`flex flex-col items-center gap-1 hover:text-gray-200 ${activeSidebarTab === 'monitors' ? 'text-gray-200' : ''}`} title="Monitors">
          <Activity className="w-5 h-5" />
          <span className="text-[9px]">Monitors</span>
        </button>
        <button onClick={() => setActiveSidebarTab('history')} className={`flex flex-col items-center gap-1 hover:text-gray-200 ${activeSidebarTab === 'history' ? 'text-gray-200' : ''}`} title="History">
          <Clock className="w-5 h-5" />
          <span className="text-[9px]">History</span>
        </button>
      </nav>

      {/* Secondary Sidebar Panel */}
      <aside className="flex flex-col bg-[#212121] h-full border-r border-[#333333]" style={{ width: `${sidebarWidth}px`, minWidth: '200px' }}>
        <div className="p-3 border-b border-[#333333] flex flex-col gap-3">
          <div className="flex relative" ref={newDropdownRef}>
            <button 
              onClick={() => handleNewRequest('http')} 
              className="flex-1 bg-[#0F6F99] hover:bg-[#0d6187] text-white text-sm font-medium py-1.5 rounded-l flex items-center justify-center transition-colors"
            >
              New Request
            </button>
            <div className="w-[1px] bg-[#2284b3]"></div>
            <button 
              onClick={() => setShowNewDropdown(!showNewDropdown)}
              className="bg-[#0F6F99] hover:bg-[#0d6187] text-white px-2 rounded-r flex items-center justify-center transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transform transition-transform duration-200 ${showNewDropdown ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>

            {showNewDropdown && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-[#212121] border border-[#333333] rounded shadow-lg z-50 overflow-hidden py-1">
                <button 
                  onClick={() => handleNewRequest('http')}
                  className="w-full text-center px-3 py-2 text-xs text-white hover:bg-[#333333] transition-colors"
                >
                  HTTP Request
                </button>
                <button 
                  onClick={() => handleNewRequest('ws')}
                  className="w-full text-center px-3 py-2 text-xs text-white hover:bg-[#333333] transition-colors"
                >
                  WebSocket Request
                </button>
                <button 
                  onClick={() => handleNewRequest('grpc')}
                  className="w-full text-center px-3 py-2 text-xs text-white hover:bg-[#333333] transition-colors"
                >
                  gRPC Request
                </button>
              </div>
            )}
          </div>
          
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1.5 text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-[#1E1E1E] text-xs px-7 py-1.5 rounded outline-none border border-transparent focus:border-[#444] text-gray-300"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {activeSidebarTab === 'collections' && (
            <div>
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-xs text-gray-400 font-semibold">My Collections</span>
                <div className="flex gap-2">
                  <button onClick={importCollection} className="text-gray-500 hover:text-gray-300 text-[10px] font-semibold uppercase bg-[#2A2A2A] px-1.5 py-0.5 rounded border border-[#333333]" title="Import Collection JSON">
                    Import
                  </button>
                  <button onClick={() => setShowNewCollection(!showNewCollection)} className="text-gray-500 hover:text-gray-300" title="New Collection">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              
              {showNewCollection && (
                <div className="mb-2 p-2 bg-[#2A2A2A] rounded border border-[#333333]">
                  <input 
                    type="text" 
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    placeholder="Collection Name..."
                    className="w-full bg-[#111111] text-xs px-2 py-1 outline-none text-gray-200 rounded border border-[#444] mb-2"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowNewCollection(false)} className="text-xs text-gray-500 hover:text-gray-300">Cancel</button>
                    <button onClick={createCollection} className="text-xs text-orange-500 font-semibold hover:text-orange-400">Create</button>
                  </div>
                </div>
              )}

              {collections.map(col => (
                <div key={col.id} className="mb-2">
                  <div className="flex items-center justify-between text-sm text-gray-300 font-medium p-1 hover:bg-[#2A2A2A] rounded cursor-pointer group">
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-orange-400" />
                      {col.name}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex items-center">
                      <button onClick={() => exportCollection(col)} className="p-1 hover:bg-[#333] rounded text-gray-500 hover:text-green-400" title="Export Collection">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                      </button>
                      <button onClick={() => renameCollection(col)} className="p-1 hover:bg-[#333] rounded text-gray-500 hover:text-orange-400" title="Rename Collection">
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => addToast("API Documentation Generator - Coming Soon!", "info")} className="p-1 hover:bg-[#333] rounded text-gray-500 hover:text-blue-400" title="Generate API Docs (Coming Soon)">
                        <FileText className="w-3 h-3" />
                      </button>
                      <button onClick={() => deleteCollection(col.id)} className="p-1 hover:bg-[#333] rounded text-gray-500 hover:text-red-400" title="Delete Collection">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="ml-4 mt-1 pl-2 border-l border-[#333333]">
                    {col.requests.map((req: any) => (
                      <div 
                        key={req.id} 
                        onClick={() => openSavedRequest(req)}
                        className="flex items-center justify-between text-xs text-gray-400 p-1.5 hover:bg-[#2A2A2A] rounded cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 flex-1 overflow-hidden">
                          <span className={`text-[10px] font-bold ${getMethodColor(req.method)} w-8`}>{req.method}</span>
                          <span className="truncate group-hover:text-gray-200">{req.name}</span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteRequest(req.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#333] rounded text-gray-500 hover:text-red-400" 
                          title="Delete Request"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSidebarTab === 'mocks' && (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <Server className="w-12 h-12 text-gray-600 mb-4" />
              <div className="text-gray-300 font-semibold mb-2">Mock Servers</div>
              <div className="text-gray-500 text-xs">Simulate endpoints to test your applications before they are built.</div>
              <div className="mt-6 px-3 py-1.5 bg-[#333333] text-gray-400 rounded text-xs border border-[#444]">
                Coming Soon
              </div>
            </div>
          )}

          {activeSidebarTab === 'monitors' && (
             <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <Activity className="w-12 h-12 text-gray-600 mb-4" />
              <div className="text-gray-300 font-semibold mb-2">Monitors</div>
              <div className="text-gray-500 text-xs">Stay up to date on the health and performance of your APIs.</div>
              <div className="mt-6 px-3 py-1.5 bg-[#333333] text-gray-400 rounded text-xs border border-[#444]">
                Coming Soon
              </div>
            </div>
          )}

          {activeSidebarTab === 'history' && mounted && (
            <div>
              <div className="text-xs text-gray-400 font-semibold mb-3 px-1 border-b border-[#333333] pb-2">History</div>
              {Object.keys(groupedHistory).length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-4 mt-8">
                  <Clock className="w-10 h-10 text-gray-600 mb-3" />
                  <div className="text-gray-400 text-xs">No history found. Send a request to see it here!</div>
                </div>
              ) : (
                Object.keys(groupedHistory).sort((a,b) => b.localeCompare(a)).map(dateStr => (
                  <div key={dateStr} className="mb-4">
                    <div className="flex justify-between items-center px-1 mb-1 group/date">
                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                        {dateStr === todayStr ? 'Today' : (() => {
                          const parts = dateStr.split('-');
                          if (parts.length === 3) {
                            const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                            return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
                          }
                          return dateStr;
                        })()}
                      </span>
                      <button 
                        onClick={() => handleDeleteHistoryByDate(dateStr)}
                        className="opacity-0 group-hover/date:opacity-100 p-1 hover:bg-[#333] rounded text-gray-500 hover:text-red-400 transition-opacity"
                        title="Clear history for this date"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    {groupedHistory[dateStr].map((item: any) => (
                      <div 
                        key={item.id} 
                        onClick={() => openHistoryItem(item)}
                        className="flex items-center justify-between text-xs text-gray-400 p-1.5 hover:bg-[#2A2A2A] rounded cursor-pointer group/item border-b border-[#333333] last:border-0"
                      >
                        <div className="flex items-center gap-2 flex-1 overflow-hidden">
                          <span className={`text-[10px] font-bold ${getMethodColor(item.method)} w-8`}>{item.method}</span>
                          <div className="flex-1 overflow-hidden">
                            <div className="truncate group-hover/item:text-gray-200">{item.url}</div>
                            <div className="flex gap-2 text-[10px] text-gray-500 mt-0.5">
                              <span className={item.status_code < 400 ? 'text-green-500' : 'text-red-500'}>{item.status_code}</span>
                              <span>{formatIndianTime(item.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteHistory(item.id); }}
                          className="opacity-0 group-hover/item:opacity-100 p-1.5 hover:bg-[#333] rounded text-gray-500 hover:text-red-400 transition-opacity flex-shrink-0"
                          title="Delete request"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </aside>
      
      {/* Sidebar Resize Handle */}
      <div 
        className="w-1 h-full -ml-1 cursor-col-resize hover:bg-orange-500 z-10 transition-colors"
        onMouseDown={startSidebarResize}
      />
    </div>
  );
}

function getMethodColor(method: string) {
  switch (method) {
    case 'GET': return 'text-green-500';
    case 'POST': return 'text-yellow-500';
    case 'PUT': return 'text-blue-500';
    case 'DELETE': return 'text-red-500';
    case 'PATCH': return 'text-purple-500';
    default: return 'text-gray-400';
  }
}
