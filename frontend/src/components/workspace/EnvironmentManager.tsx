import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Share, MoreHorizontal, Search, EyeOff } from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useToastStore } from '@/store/toastStore';
import { API_BASE, fetchEnvironments } from '@/lib/api';

interface EnvironmentManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EnvironmentManager({ isOpen, onClose }: EnvironmentManagerProps) {
  const { environments, setEnvironments, selectedEnvironmentId, setSelectedEnvironmentId } = useWorkspaceStore();
  const { addToast } = useToastStore();
  const [activeEnvId, setActiveEnvId] = useState<number | null>(null);
  
  const [editName, setEditName] = useState('');
  const [editVariables, setEditVariables] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [filterText, setFilterText] = useState('');

  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  
  const [colWidths, setColWidths] = useState([130, 80, 130, 130]);
  const [draggingColIndex, setDraggingColIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSidebar) {
        setSidebarWidth(prev => Math.max(150, Math.min(prev + e.movementX, 600)));
      } else if (draggingColIndex !== null) {
        setColWidths(prev => {
          const newWidths = [...prev];
          newWidths[draggingColIndex] = Math.max(60, newWidths[draggingColIndex] + e.movementX);
          return newWidths;
        });
      }
    };
    
    const handleMouseUp = () => {
      setIsDraggingSidebar(false);
      setDraggingColIndex(null);
    };

    if (isDraggingSidebar || draggingColIndex !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none'; // Prevent text selection while dragging
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDraggingSidebar, draggingColIndex]);

  useEffect(() => {
    if (isOpen) {
      if (environments.length > 0) {
        if (!activeEnvId) {
          const toSelect = selectedEnvironmentId ? parseInt(selectedEnvironmentId) : environments[0].id;
          handleSelectEnv(toSelect);
        }
      } else {
        setIsCreating(true);
        setEditName('New Environment');
        setEditVariables([{ key: '', value: '', type: 'default', initial_value: '', enabled: true }]);
      }
    }
  }, [isOpen, environments]);

  const handleSelectEnv = (id: number) => {
    setIsCreating(false);
    setActiveEnvId(id);
    const env = environments.find(e => e.id === id);
    if (env) {
      setEditName(env.name);
      setEditVariables(
        env.variables && env.variables.length > 0
          ? env.variables.map((v: any) => ({ key: v.key, value: v.value, type: v.type || 'default', initial_value: v.initial_value || '', enabled: v.enabled ?? true }))
          : [{ key: '', value: '', type: 'default', initial_value: '', enabled: true }]
      );
    }
  };

  const handleCreateNew = () => {
    setActiveEnvId(null);
    setIsCreating(true);
    setEditName('New Environment');
    setEditVariables([{ key: '', value: '', type: 'default', initial_value: '', enabled: true }]);
  };

  const handleSave = async () => {
    const validVars = editVariables.filter(v => v.key.trim() !== '');
    try {
      if (isCreating) {
        await fetch(`${API_BASE}/environments/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editName, variables: validVars })
        });
      } else if (activeEnvId) {
        await fetch(`${API_BASE}/environments/${activeEnvId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editName, variables: validVars })
        });
      }
      const newEnvs = await fetchEnvironments();
      setEnvironments(newEnvs);
      if (isCreating) {
        const newlyCreated = newEnvs.find((e: any) => e.name === editName);
        if (newlyCreated) {
          handleSelectEnv(newlyCreated.id);
        }
      }
      addToast('Environment saved successfully!', 'success');
    } catch (e) {
      addToast('Failed to save environment', 'error');
    }
  };

  const handleDelete = async () => {
    if (!activeEnvId) return;
    if (!confirm('Are you sure you want to delete this environment?')) return;
    try {
      await fetch(`${API_BASE}/environments/${activeEnvId}`, { method: 'DELETE' });
      const newEnvs = await fetchEnvironments();
      setEnvironments(newEnvs);
      if (selectedEnvironmentId === activeEnvId.toString()) {
        setSelectedEnvironmentId('');
      }
      if (newEnvs.length > 0) {
        handleSelectEnv(newEnvs[0].id);
      } else {
        handleCreateNew();
      }
      addToast('Environment deleted', 'success');
    } catch (e) {
      addToast('Failed to delete environment', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col w-[800px] h-[600px] bg-[#1E1E1E] border border-[#333] rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#252525] border-b border-[#333]">
          <h2 className="text-gray-200 font-semibold text-sm">Manage Environments</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - List */}
          <div style={{ width: sidebarWidth }} className="flex flex-col bg-[#1A1A1A] flex-shrink-0">
            <div className="p-3 border-b border-[#333]">
              <button 
                onClick={handleCreateNew}
                className="w-full flex items-center justify-center gap-2 bg-[#2A2A2A] hover:bg-[#333] text-gray-300 py-1.5 rounded text-xs transition-colors border border-[#444]"
              >
                <Plus className="w-3.5 h-3.5" /> New Environment
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {environments.map(env => (
                <div 
                  key={env.id}
                  onClick={() => handleSelectEnv(env.id)}
                  className={`px-3 py-2 text-xs cursor-pointer rounded mb-1 transition-colors ${
                    activeEnvId === env.id && !isCreating
                      ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20 font-medium'
                      : 'text-gray-400 hover:bg-[#2A2A2A]'
                  }`}
                >
                  {env.name}
                </div>
              ))}
            </div>
          </div>
          
          {/* Sidebar Resizer */}
          <div 
            onMouseDown={(e) => { e.preventDefault(); setIsDraggingSidebar(true); }}
            className={`w-1 bg-[#333] hover:bg-orange-500 cursor-col-resize flex-shrink-0 z-10 transition-colors ${isDraggingSidebar ? 'bg-orange-500' : ''}`}
          />

          {/* Right Area - Editor */}
          <div className="flex-1 flex flex-col p-6 bg-[#1A1A1A] overflow-hidden">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between mb-5">
              <input 
                type="text" 
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-transparent text-[15px] font-semibold text-gray-200 outline-none focus:border-b focus:border-gray-500 pb-1 min-w-[200px]"
                placeholder="Environment Name"
              />
              <div className="flex items-center gap-1 text-[13px] font-medium text-gray-400">
                <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#2A2A2A] rounded transition-colors text-gray-300">
                  <Save className="w-4 h-4" /> Save
                </button>
                <button onClick={() => addToast("Share coming soon!", "info")} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#2A2A2A] rounded transition-colors">
                  <Share className="w-4 h-4" /> Share
                </button>
                <button className="flex items-center justify-center px-2 py-1.5 hover:bg-[#2A2A2A] rounded transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {!isCreating && (
                  <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#2A2A2A] rounded transition-colors text-red-400 hover:text-red-300 ml-2 border-l border-[#333]">
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                )}
              </div>
            </div>

            {/* Filter Bar */}
            <div className="mb-4">
              <div className="relative w-80">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
                <input 
                  type="text"
                  placeholder="Filter variables"
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                  className="w-full bg-[#111111] border border-[#333] hover:border-[#555] focus:border-orange-500 rounded px-9 py-2 outline-none text-gray-200 placeholder-gray-500 text-[13px] transition-colors"
                />
              </div>
            </div>

            {/* Environment Variables Table */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden border border-[#333] rounded">
              <div className="flex w-max min-w-full border-b border-[#333] bg-[#222] text-gray-300 font-semibold text-[13px]">
                <div className="w-10 flex-shrink-0 border-r border-[#333] flex items-center justify-center">
                  <input type="checkbox" className="accent-orange-500" checked={editVariables.every(v => v.enabled || v.key === '')} readOnly />
                </div>
                <div style={{ width: colWidths[0] }} className="relative flex-shrink-0 px-3 py-2 border-r border-[#333]">
                  Variable
                  <div onMouseDown={(e) => { e.preventDefault(); setDraggingColIndex(0); }} className="absolute right-[-3px] top-0 bottom-0 w-[6px] cursor-col-resize hover:bg-orange-500 z-10" />
                </div>
                <div style={{ width: colWidths[1] }} className="relative flex-shrink-0 px-3 py-2 border-r border-[#333]">
                  Type
                  <div onMouseDown={(e) => { e.preventDefault(); setDraggingColIndex(1); }} className="absolute right-[-3px] top-0 bottom-0 w-[6px] cursor-col-resize hover:bg-orange-500 z-10" />
                </div>
                <div style={{ width: colWidths[2] }} className="relative flex-shrink-0 px-3 py-2 border-r border-[#333]">
                  Initial value
                  <div onMouseDown={(e) => { e.preventDefault(); setDraggingColIndex(2); }} className="absolute right-[-3px] top-0 bottom-0 w-[6px] cursor-col-resize hover:bg-orange-500 z-10" />
                </div>
                <div style={{ width: colWidths[3] }} className="relative flex-shrink-0 px-3 py-2 border-r border-[#333]">
                  Current value
                  <div onMouseDown={(e) => { e.preventDefault(); setDraggingColIndex(3); }} className="absolute right-[-3px] top-0 bottom-0 w-[6px] cursor-col-resize hover:bg-orange-500 z-10" />
                </div>
                <div className="w-10 flex-shrink-0 flex items-center justify-center">
                  <MoreHorizontal className="w-4 h-4 text-gray-500" />
                </div>
              </div>

              {/* Rows */}
              {editVariables.filter(v => v.key.toLowerCase().includes(filterText.toLowerCase())).map((item, index) => (
                <div key={index} className="flex w-max min-w-full border-b border-[#333] last:border-b-0 hover:bg-[#2A2A2A] transition-colors group bg-transparent">
                  <div className="w-10 flex-shrink-0 flex items-center justify-center border-r border-[#333]">
                    <input 
                      type="checkbox" 
                      checked={item.enabled ?? true}
                      onChange={(e) => {
                        const newVars = [...editVariables];
                        newVars[index].enabled = e.target.checked;
                        setEditVariables(newVars);
                      }}
                      className="accent-orange-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                  <div style={{ width: colWidths[0] }} className="flex-shrink-0 border-r border-[#333]">
                    <textarea 
                      placeholder={index === editVariables.length - 1 ? "Add new variable" : ""}
                      value={item.key || ''}
                      onChange={(e) => {
                        const newVars = [...editVariables];
                        newVars[index].key = e.target.value;
                        if (index === editVariables.length - 1 && e.target.value) {
                          newVars.push({ key: '', value: '', type: 'default', initial_value: '', enabled: true });
                        }
                        setEditVariables(newVars);
                      }}
                      className="w-full h-full min-h-[36px] resize-none overflow-hidden bg-transparent px-3 py-2 outline-none text-gray-200 placeholder-gray-500 font-mono text-[13px]"
                      rows={1}
                    />
                  </div>
                  <div style={{ width: colWidths[1] }} className="flex-shrink-0 border-r border-[#333] px-3 py-2 text-[13px] text-gray-400">
                    <select 
                      className="bg-[#212121] text-white text-center outline-none w-full cursor-pointer hover:text-gray-300"
                      value={item.type || 'default'}
                      onChange={(e) => {
                        const newVars = [...editVariables];
                        newVars[index].type = e.target.value;
                        setEditVariables(newVars);
                      }}
                    >
                      <option value="default" className="bg-[#2A2A2A]">default</option>
                      <option value="secret" className="bg-[#2A2A2A]">secret</option>
                    </select>
                  </div>
                  <div style={{ width: colWidths[2] }} className="flex-shrink-0 border-r border-[#333]">
                    <textarea 
                      placeholder={item.type === 'secret' ? '********' : ''}
                      value={item.type === 'secret' ? '' : (item.initial_value || '')}
                      onChange={(e) => {
                        const newVars = [...editVariables];
                        newVars[index].initial_value = e.target.value;
                        setEditVariables(newVars);
                      }}
                      disabled={item.type === 'secret'}
                      className="w-full h-full min-h-[36px] resize-none overflow-hidden bg-transparent px-3 py-2 outline-none text-gray-200 font-mono text-[13px]"
                      rows={1}
                    />
                  </div>
                  <div style={{ width: colWidths[3] }} className="flex-shrink-0 border-r border-[#333]">
                    <textarea 
                      placeholder={item.type === 'secret' ? '********' : ''}
                      value={item.type === 'secret' ? '' : (item.value || '')}
                      onChange={(e) => {
                        const newVars = [...editVariables];
                        newVars[index].value = e.target.value;
                        setEditVariables(newVars);
                      }}
                      disabled={item.type === 'secret'}
                      className="w-full h-full min-h-[36px] resize-none overflow-hidden bg-transparent px-3 py-2 outline-none text-gray-200 font-mono text-[13px]"
                      rows={1}
                    />
                  </div>
                  <div className="w-10 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        const newVars = editVariables.filter((_, i) => i !== index);
                        if (newVars.length === 0) newVars.push({ key: '', value: '', type: 'default', initial_value: '', enabled: true });
                        setEditVariables(newVars);
                      }}
                      className="p-1 hover:bg-[#444] rounded text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
