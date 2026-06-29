"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useWorkspaceStore, RequestTab, KeyValuePair, FormDataKeyValuePair } from '@/store/workspaceStore';
import { X, Play, ChevronDown, Save, Code } from 'lucide-react';
import KeyValueEditor from './KeyValueEditor';
import FormDataEditor from './FormDataEditor';
import ResponseViewer from './ResponseViewer';
import EnvironmentManager from './EnvironmentManager';
import SnippetGenerator from './SnippetGenerator';
import CookieManager from './CookieManager';
import WebSocketBuilder from './WebSocketBuilder';
import GrpcBuilder from './GrpcBuilder';
import { useCookieStore } from '@/store/cookieStore';
import { API_BASE, fetchCollections } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';
import { createSandboxContext, executeScript } from '@/lib/sandbox';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const COMMON_HEADERS = [
  'Accept', 'Accept-Charset', 'Accept-Encoding', 'Accept-Language',
  'Authorization', 'Cache-Control', 'Connection', 'Content-Length',
  'Content-Type', 'Cookie', 'Date', 'Expect', 'Forwarded', 'From',
  'Host', 'If-Match', 'If-Modified-Since', 'If-None-Match', 'If-Range',
  'If-Unmodified-Since', 'Max-Forwards', 'Origin', 'Pragma',
  'Proxy-Authorization', 'Range', 'Referer', 'TE', 'User-Agent',
  'Upgrade', 'Via', 'Warning'
];

const COMMON_CONTENT_TYPES = [
  'application/json',
  'application/xml',
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'text/html',
  'text/plain'
];

const SETTINGS_LIST = [
  { id: 'ssl', title: 'Enable SSL certificate verification', desc: 'Verify SSL certificates when sending a request. Verification failures will result in the request being aborted.', default: false },
  { id: 'redirects', title: 'Automatically follow redirects', desc: 'Follow HTTP 3xx responses as redirects.', default: true },
  { id: 'original_method', title: 'Follow original HTTP Method', desc: 'Redirect with the original HTTP method instead of the default behavior of redirecting with GET.', default: false },
  { id: 'auth_header', title: 'Follow Authorization header', desc: 'Retain authorization header when a redirect happens to a different hostname.', default: false },
  { id: 'referer', title: 'Remove referer header on redirect', desc: 'Remove the referer header when a redirect happens.', default: false },
  { id: 'strict_parser', title: 'Enable strict HTTP parser', desc: 'Restrict responses with invalid HTTP headers.', default: false },
  { id: 'encode_url', title: 'Encode URL automatically', desc: "Encode the URL's path, query parameters, and authentication fields.", default: true },
  { id: 'cookie_jar', title: 'Disable cookie jar', desc: 'Prevent cookies used in this request from being stored in the cookie jar. Existing cookies in the cookie jar will not be added as headers for this request.', default: false }
];

const INITIAL_AUTO_HEADERS = [
  { key: 'Cache-Control', value: 'no-cache', enabled: true },
  { key: 'Postman-Token', value: '<calculated when request is sent>', enabled: true },
  { key: 'Host', value: '<calculated when request is sent>', enabled: true },
  { key: 'User-Agent', value: 'PostmanRuntime/7.39.1', enabled: true },
  { key: 'Accept', value: '*/*', enabled: true },
  { key: 'Accept-Encoding', value: 'gzip, deflate, br', enabled: true },
  { key: 'Connection', value: 'keep-alive', enabled: true },
];

export default function RequestBuilder() {
  const { openTabs, activeTabId, setActiveTab, closeTab, updateTab, environments, selectedEnvironmentId, setSelectedEnvironmentId, triggerSendCount, addTab, setEnvironments } = useWorkspaceStore();
  const activeTab = openTabs.find(t => t.id === activeTabId);
  
  const [configTab, setConfigTab] = useState<'params' | 'headers' | 'body' | 'auth' | 'scripts' | 'tests' | 'settings'>('params');
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEnvManager, setShowEnvManager] = useState(false);
  const [showSnippetModal, setShowSnippetModal] = useState(false);
  const [showAutoHeaders, setShowAutoHeaders] = useState(false);
  const [autoHeaders, setAutoHeaders] = useState(INITIAL_AUTO_HEADERS);
  const { addToast } = useToastStore();
  const [showCookieManager, setShowCookieManager] = useState(false);
  const { cookies, parseAndSaveSetCookie } = useCookieStore();
  const [responseHeight, setResponseHeight] = useState(45);
  const [layoutMode, setLayoutMode] = useState<'vertical' | 'horizontal'>('vertical');
  const [isResponseCollapsed, setIsResponseCollapsed] = useState(false);
  const isResponseMaximized = responseHeight >= 95;
  const [showConfigDropdown, setShowConfigDropdown] = useState(false);
  const [showSendDropdown, setShowSendDropdown] = useState(false);
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const configDropdownRef = useRef<HTMLDivElement>(null);
  const sendDropdownRef = useRef<HTMLDivElement>(null);
  const saveDropdownRef = useRef<HTMLDivElement>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveCollectionId, setSaveCollectionId] = useState("");
  const [collections, setCollections] = useState<any[]>([]);
  const [openNativeSelect, setOpenNativeSelect] = useState<string | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [settingsState, setSettingsState] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    SETTINGS_LIST.forEach(s => { initialState[s.id] = s.default; });
    return initialState;
  });

  const toggleSetting = (id: string) => {
    setSettingsState(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const onMouseMove = (moveEvent: MouseEvent) => {
      if (layoutMode === 'vertical') {
        const newWidth = ((window.innerWidth - moveEvent.clientX) / window.innerWidth) * 100;
        if (newWidth >= 20 && newWidth <= 85) setResponseHeight(newWidth);
      } else {
        const newHeight = ((window.innerHeight - moveEvent.clientY) / window.innerHeight) * 100;
        if (newHeight >= 20 && newHeight <= 85) setResponseHeight(newHeight);
      }
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Keyboard Shortcuts (Ctrl+Enter to Send)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (configDropdownRef.current && !configDropdownRef.current.contains(event.target as Node)) {
        setShowConfigDropdown(false);
      }
      if (sendDropdownRef.current && !sendDropdownRef.current.contains(event.target as Node)) {
        setShowSendDropdown(false);
      }
      if (saveDropdownRef.current && !saveDropdownRef.current.contains(event.target as Node)) {
        setShowSaveDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (activeTab && !isLoading) {
            handleSend();
          }
        } else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          if (activeTab) {
            document.getElementById('save-request-btn')?.click();
          }
        } else if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          addTab({
            id: crypto.randomUUID(),
            name: "Untitled Request",
            method: "GET",
            url: "",
            headers: [],
            queryParams: [],
            bodyType: 'none',
            body: "",
            formData: [],
            urlencoded: [],
            authType: 'none',
            authCredentials: {}
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, activeTabId, isLoading, addTab, closeTab]);

  useEffect(() => {
    if (triggerSendCount > 0 && activeTab) {
      handleSend();
    }
  }, [triggerSendCount]);

  if (openTabs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 bg-[#1E1E1E]">
        <div className="text-center">
          <p className="mb-4">Open a request from the sidebar or create a new one.</p>
        </div>
      </div>
    );
  }

  if (!activeTab) return null;

  const resolveVariables = (text: string) => {
    if (!text || !selectedEnvironmentId) return text;
    const env = environments.find(e => e.id.toString() === selectedEnvironmentId.toString());
    if (!env || !env.variables) return text;
    
    let resolvedText = text;
    env.variables.forEach((v: any) => {
      const regex = new RegExp(`{{${v.key}}}`, 'g');
      resolvedText = resolvedText.replace(regex, v.value);
    });
    return resolvedText;
  };

  const handleSend = async (isDownload = false) => {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    const resolvedUrl = resolveVariables(activeTab.url);
    if (resolvedUrl.includes('{{') && resolvedUrl.includes('}}')) {
      addToast("Warning: Unresolved variables in URL. Please select the correct environment.", "error");
    }


    const headersObj: Record<string, string> = {};
    
    autoHeaders.forEach(ah => {
      if (ah.enabled) {
        let val = ah.value;
        if (val === '<calculated when request is sent>') {
          if (ah.key === 'Host') {
            try { val = new URL(resolveVariables(activeTab.url)).host; } catch (e) {}
          } else if (ah.key === 'Postman-Token') {
            val = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'mock-token';
          }
        }
        if (val !== '<calculated when request is sent>') {
          headersObj[ah.key] = val;
        }
      }
    });

    activeTab.headers.forEach(h => {
      if (h.enabled && h.key) headersObj[resolveVariables(h.key)] = resolveVariables(h.value);
    });

    if (activeTab.authType === 'bearer' && activeTab.authCredentials.token) {
      headersObj['Authorization'] = `Bearer ${resolveVariables(activeTab.authCredentials.token)}`;
    } else if (activeTab.authType === 'basic' && activeTab.authCredentials.username) {
      const u = resolveVariables(activeTab.authCredentials.username);
      const p = resolveVariables(activeTab.authCredentials.password || '');
      headersObj['Authorization'] = `Basic ${btoa(`${u}:${p}`)}`;
    }

    let finalBody: any = undefined;
    let contentTypeHeader: string | undefined = undefined;

    if (activeTab.bodyType === 'raw') {
      finalBody = resolveVariables(activeTab.body);
      
      let effectiveRawType = activeTab.rawType || 'Auto';
      if (effectiveRawType === 'Auto') {
        const bodyStr = finalBody.trim();
        if (bodyStr.startsWith('{') || bodyStr.startsWith('[')) {
          try {
            JSON.parse(bodyStr);
            effectiveRawType = 'JSON';
          } catch(e) {
            effectiveRawType = 'Text';
          }
        } else if (bodyStr.toLowerCase().startsWith('<html') || bodyStr.toLowerCase().startsWith('<!doctype html')) {
          effectiveRawType = 'HTML';
        } else if (bodyStr.startsWith('<?xml') || bodyStr.startsWith('<')) {
          effectiveRawType = 'XML';
        } else {
          effectiveRawType = 'Text';
        }
      }

      const mimeTypes: Record<string, string> = {
        'JSON': 'application/json',
        'Text': 'text/plain',
        'HTML': 'text/html',
        'XML': 'application/xml',
        'JavaScript': 'application/javascript'
      };
      if (!headersObj['Content-Type']) {
        headersObj['Content-Type'] = mimeTypes[effectiveRawType] || 'text/plain';
      }
      contentTypeHeader = headersObj['Content-Type'];
    } else if (activeTab.bodyType === 'form-data') {
      finalBody = new FormData();
      activeTab.formData.forEach(fd => {
        if (fd.enabled && fd.key) {
          if (fd.type === 'file' && fd.file) {
            finalBody.append(resolveVariables(fd.key), fd.file);
          } else {
            finalBody.append(resolveVariables(fd.key), resolveVariables(fd.value));
          }
        }
      });
      delete headersObj['Content-Type'];
      contentTypeHeader = undefined; // Let browser set boundary
    } else if (activeTab.bodyType === 'urlencoded') {
      const searchParams = new URLSearchParams();
      activeTab.urlencoded.forEach(kv => {
        if (kv.enabled && kv.key) {
          searchParams.append(resolveVariables(kv.key), resolveVariables(kv.value));
        }
      });
      finalBody = searchParams.toString();
      headersObj['Content-Type'] = 'application/x-www-form-urlencoded';
      contentTypeHeader = 'application/x-www-form-urlencoded';
    } else if (activeTab.bodyType === 'graphql') {
      let vars = {};
      try {
        vars = activeTab.graphqlVariables?.trim() ? JSON.parse(activeTab.graphqlVariables) : {};
      } catch (e) {
        addToast("Invalid GraphQL Variables JSON", "error");
        setIsLoading(false);
        return;
      }
      finalBody = JSON.stringify({ query: activeTab.graphqlQuery || '', variables: vars });
      headersObj['Content-Type'] = 'application/json';
      contentTypeHeader = 'application/json';
    }

    if (!settingsState['cookie_jar']) {
      try {
        const urlObj = new URL(resolveVariables(activeTab.url));
        const domainCookies = cookies[urlObj.hostname] || [];
        if (domainCookies.length > 0) {
          const cookieString = domainCookies.map(c => `${c.name}=${c.value}`).join('; ');
          if (headersObj['Cookie']) {
             headersObj['Cookie'] += `; ${cookieString}`;
          } else {
             headersObj['Cookie'] = cookieString;
          }
        }
      } catch (e) {}
    }

    const proxyHeaders: Record<string, string> = {
      'x-postman-target-url': resolveVariables(activeTab.url),
      'x-postman-target-method': activeTab.method,
      'x-postman-target-headers': JSON.stringify(headersObj),
      'x-postman-settings': JSON.stringify(settingsState)
    };

    if (contentTypeHeader) {
      proxyHeaders['Content-Type'] = contentTypeHeader;
    }

    try {
      // Bonus: Pre-request script execution
      if (activeTab.preRequestScript) {
        try {
          const envVars: Record<string, string> = {};
          let currentEnv = undefined;
          if (selectedEnvironmentId) {
            currentEnv = environments.find(e => e.id.toString() === selectedEnvironmentId.toString());
            if (currentEnv) {
              currentEnv.variables.forEach((v: any) => {
                envVars[v.key] = v.value;
              });
            }
          }

          const setEnvVar = (k: string, v: string) => {
            if (!currentEnv) return;
            const newEnvs = [...environments];
            const envIndex = newEnvs.findIndex(e => e.id.toString() === selectedEnvironmentId!.toString());
            if (envIndex >= 0) {
              const env = { ...newEnvs[envIndex], variables: [...newEnvs[envIndex].variables] };
              const existingVarIndex = env.variables.findIndex((varObj:any) => varObj.key === k);
              if (existingVarIndex >= 0) {
                env.variables[existingVarIndex] = { ...env.variables[existingVarIndex], value: v };
              } else {
                env.variables.push({ key: k, value: v, type: 'default', initial_value: v, enabled: true });
              }
              newEnvs[envIndex] = env;
              setEnvironments(newEnvs);
              fetch(`${API_BASE}/environments/${env.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(env)
              }).catch(() => {});
            }
          };

          const ctx = createSandboxContext(envVars, setEnvVar);
          executeScript(activeTab.preRequestScript, ctx);
        } catch (e) {
          console.error("Pre-request script error:", e);
        }
      }

      const res = await fetch(`${API_BASE}/proxy/send`, {
        method: 'POST',
        headers: proxyHeaders,
        body: finalBody,
      });

      if (!res.ok) {
        let errMsg = res.statusText;
        try {
          const errJson = await res.json();
          if (errJson.detail) errMsg = errJson.detail;
        } catch(e) {}
        throw new Error(`Proxy error: ${errMsg}`);
      }
      
      const result = await res.json();
      useWorkspaceStore.getState().triggerHistoryRefresh();
      
      // Handle incoming Set-Cookie
      if (!settingsState['cookie_jar'] && result.headers) {
        // Find set-cookie header (case-insensitive)
        const setCookieKey = Object.keys(result.headers).find(k => k.toLowerCase() === 'set-cookie');
        if (setCookieKey) {
          try {
            const urlObj = new URL(resolveVariables(activeTab.url));
            const setCookieHeader = result.headers[setCookieKey];
            const headersArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
            parseAndSaveSetCookie(urlObj.hostname, headersArray);
          } catch(e) {}
        }
      }

      // Bonus: Test script execution
      if (activeTab.testScript) {
        result.testResults = [];
        try {
          const envVars: Record<string, string> = {};
          let currentEnv = undefined;
          if (selectedEnvironmentId) {
            currentEnv = environments.find(e => e.id.toString() === selectedEnvironmentId.toString());
            if (currentEnv) {
              currentEnv.variables.forEach((v: any) => {
                envVars[v.key] = v.value;
              });
            }
          }

          const setEnvVar = (k: string, v: string) => {
            if (!currentEnv) return;
            const newEnvs = [...environments];
            const envIndex = newEnvs.findIndex(e => e.id.toString() === selectedEnvironmentId!.toString());
            if (envIndex >= 0) {
              const env = { ...newEnvs[envIndex], variables: [...newEnvs[envIndex].variables] };
              const existingVarIndex = env.variables.findIndex((varObj:any) => varObj.key === k);
              if (existingVarIndex >= 0) {
                env.variables[existingVarIndex] = { ...env.variables[existingVarIndex], value: v };
              } else {
                env.variables.push({ key: k, value: v, type: 'default', initial_value: v, enabled: true });
              }
              newEnvs[envIndex] = env;
              setEnvironments(newEnvs);
              fetch(`${API_BASE}/environments/${env.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(env)
              }).catch(() => {});
            }
          };

          const ctx = createSandboxContext(envVars, setEnvVar, result, (testRes) => {
            result.testResults.push(testRes);
            if (testRes.passed) addToast(`Test Passed: ${testRes.name}`, "success");
            else addToast(`Test Failed: ${testRes.name}`, "error");
          });
          executeScript(activeTab.testScript, ctx);
        } catch (e: any) {
          console.error("Test script error:", e);
          addToast(`Test Script Error: ${e.message}`, "error");
        }
      }

      setResponse(result);

      if (isDownload) {
        try {
          const blob = new Blob([typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)], { type: result.headers['content-type'] || 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          // try parsing content-disposition
          let filename = 'response';
          const cd = result.headers['content-disposition'];
          if (cd && cd.includes('filename=')) {
            const matches = cd.match(/filename="?([^"]+)"?/);
            if (matches && matches[1]) {
              filename = matches[1];
            }
          }
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        } catch (e) {
          console.error("Failed to download", e);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlChange = (newUrl: string) => {
    updateTab(activeTab.id, { url: newUrl });
    try {
      const urlObj = new URL(newUrl.startsWith('http') || newUrl.startsWith('{{') ? newUrl : `http://${newUrl}`);
      const params = new URLSearchParams(urlObj.search);
      const newQueryParams: KeyValuePair[] = [];
      params.forEach((value, key) => {
        newQueryParams.push({ key, value, enabled: true });
      });
      const disabledParams = activeTab.queryParams.filter(p => !p.enabled && (p.key || p.value));
      updateTab(activeTab.id, { queryParams: [...newQueryParams, ...disabledParams] });
    } catch (e) {}
  };

  const handleParamsChange = (newParams: KeyValuePair[]) => {
    updateTab(activeTab.id, { queryParams: newParams });
    try {
      const baseUrl = activeTab.url.split('?')[0];
      const searchParams = new URLSearchParams();
      newParams.forEach(p => {
        if (p.enabled && p.key) {
          searchParams.append(p.key, p.value);
        }
      });
      const queryStr = searchParams.toString();
      updateTab(activeTab.id, { url: queryStr ? `${baseUrl}?${queryStr}` : baseUrl });
    } catch (e) {}
  };

  const handleSave = async () => {
    if (!activeTab) return;
    const isEditing = !!activeTab.savedRequestId;
    
    if (isEditing) {
      // Silently save existing request
      try {
        const url = `${API_BASE}/requests/${activeTab.savedRequestId}`;
        const res = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collection_id: activeTab.collectionId || 1,
            name: activeTab.name,
            method: activeTab.method,
            url: activeTab.url,
            headers: activeTab.headers,
            query_params: activeTab.queryParams,
            body_type: activeTab.bodyType,
            body: activeTab.body,
            auth_type: activeTab.authType,
            auth_credentials: activeTab.authCredentials
          })
        });
        if (res.ok) {
          addToast("Saved successfully!", "success");
        } else {
          addToast("Failed to save.", "error");
        }
      } catch (e) {
        addToast("Save failed.", "error");
      }
    } else {
      // New request, open the professional modal
      setSaveName(activeTab.name);
      setSaveCollectionId("1");
      
      try {
        const cols = await fetchCollections();
        setCollections(cols);
        if (cols.length > 0) {
          setSaveCollectionId(cols[0].id.toString());
        }
      } catch (e) {
        console.error("Failed to fetch collections", e);
      }
      
      setShowSaveModal(true);
    }
  };

  const handleSaveAs = async () => {
    setShowSaveDropdown(false);
    if (!activeTab) return;
    
    setSaveName(activeTab.name + " Copy");
    setSaveCollectionId(activeTab.collectionId ? activeTab.collectionId.toString() : "1");
    
    try {
      const cols = await fetchCollections();
      setCollections(cols);
      if (cols.length > 0 && !activeTab.collectionId) {
        setSaveCollectionId(cols[0].id.toString());
      }
    } catch (e) {
      console.error("Failed to fetch collections", e);
    }
    
    setShowSaveModal(true);
  };

  const handleSaveModalSubmit = async () => {
    if (!saveName || !saveCollectionId) return;

    try {
      const url = `${API_BASE}/requests/`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection_id: parseInt(saveCollectionId),
          name: saveName,
          method: activeTab!.method,
          url: activeTab!.url,
          headers: activeTab!.headers,
          query_params: activeTab!.queryParams,
          body_type: activeTab!.bodyType,
          body: activeTab!.body,
          auth_type: activeTab!.authType,
          auth_credentials: activeTab!.authCredentials
        })
      });
      if (res.ok) {
        addToast("Saved As successfully!", "success");
        const savedData = await res.json();
        updateTab(activeTab!.id, { savedRequestId: savedData.id, collectionId: parseInt(saveCollectionId), name: saveName });
        setShowSaveModal(false);
      } else {
        addToast("Failed to save as. Ensure collection ID exists.", "error");
      }
    } catch (e) {
      addToast("Save failed.", "error");
    }
  };

  const generateSnippet = () => {
    setShowSnippetModal(true);
  };

  return (
    <div className="flex flex-col h-full bg-[#1E1E1E] overflow-hidden min-w-0">
      {showCookieManager && <CookieManager onClose={() => setShowCookieManager(false)} />}

      {/* Custom Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C1C1C] border border-[#333] rounded-lg w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-[#333] bg-[#212121]">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Save className="w-4 h-4 text-orange-500" /> Save Request
              </h2>
              <button 
                onClick={() => setShowSaveModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#333] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Request Name</label>
                <input 
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-full bg-[#121212] border border-[#333] rounded px-3 py-2 text-white text-sm outline-none focus:border-orange-500 transition-colors"
                  placeholder="e.g. Get User Profile"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Save to Collection</label>
                <div className="relative group">
                  <select
                    value={saveCollectionId}
                    onChange={(e) => { setSaveCollectionId(e.target.value); setOpenNativeSelect(null); e.target.blur(); }}
                    onClick={() => setOpenNativeSelect(openNativeSelect === 'save' ? null : 'save')}
                    onBlur={() => setOpenNativeSelect(null)}
                    className="w-full bg-[#121212] border border-[#333] rounded px-3 py-2 text-white text-sm outline-none focus:border-orange-500 transition-colors appearance-none cursor-pointer"
                  >
                    {collections.length === 0 ? (
                      <option value="1">Default Collection (1)</option>
                    ) : (
                      collections.map(col => (
                        <option key={col.id} value={col.id}>
                          {col.name} (ID: {col.id})
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown className={`w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transform transition-transform duration-200 ${openNativeSelect === 'save' ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-[#333] bg-[#212121]">
              <button 
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#333] rounded transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveModalSubmit}
                disabled={!saveName || !saveCollectionId}
                className="px-6 py-2 text-sm font-medium bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:hover:bg-orange-600 text-white rounded transition-colors shadow-lg"
              >
                Save As
              </button>
            </div>
          </div>
        </div>
      )}

      <div 
        ref={tabsContainerRef}
        onWheel={(e) => {
          if (tabsContainerRef.current) {
            tabsContainerRef.current.scrollLeft += e.deltaY;
          }
        }}
        className="flex bg-[#212121] border-b border-[#333333] overflow-x-auto overflow-y-hidden no-scrollbar min-w-0 w-full"
      >
        {openTabs.map(tab => (
          <div 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`group flex items-center gap-2 px-3 py-2 border-r border-[#333333] min-w-[120px] max-w-[200px] cursor-pointer text-xs ${
              activeTabId === tab.id ? 'bg-[#1E1E1E] text-gray-200 border-t-2 border-t-orange-500' : 'text-gray-500 hover:bg-[#2A2A2A]'
            }`}
          >
            <span className={`font-semibold ${getMethodColor(tab.method)}`}>{tab.method}</span>
            <span className="truncate flex-1">{tab.name}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#333] rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      
      <div className="flex flex-col flex-1 overflow-hidden">
        
        {/* Header Row: Title, Save, Environment */}
        <div className="flex justify-between items-center p-3 border-b border-[#333333]">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
              activeTab.protocol === 'ws' ? 'text-blue-400 border-blue-400/30' : 
              activeTab.protocol === 'grpc' ? 'text-purple-400 border-purple-400/30' : 
              'text-green-400 border-green-400/30'
            }`}>
              {activeTab.protocol === 'ws' ? 'WS' : activeTab.protocol === 'grpc' ? 'gRPC' : 'HTTP'}
            </span>
            <span className="font-semibold text-gray-200 text-sm">{activeTab.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center relative" ref={saveDropdownRef}>
              <button id="save-request-btn" onClick={handleSave} className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-[#333] transition-colors rounded-l">
                <Save className="w-3.5 h-3.5" /> Save
              </button>
              <button onClick={() => setShowSaveDropdown(!showSaveDropdown)} className="px-1.5 py-1.5 text-gray-400 hover:text-white hover:bg-[#333] transition-colors border-l border-[#444] rounded-r">
                <ChevronDown className={`w-3.5 h-3.5 transform transition-transform duration-200 ${showSaveDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showSaveDropdown && (
                <div className="absolute top-full right-0 mt-1 w-32 bg-[#212121] border border-[#333333] rounded shadow-2xl z-50 py-1">
                  <button onClick={handleSaveAs} className="w-full text-center px-4 py-2 text-[13px] hover:bg-[#333333] text-white transition-colors">
                    Save As
                  </button>
                </div>
              )}
            </div>
            
            <div className="relative group flex items-center">
              <select 
                className="bg-[#212121] border border-[#333333] rounded pl-3 pr-8 py-1.5 text-xs text-white text-center outline-none hover:border-[#555] transition-colors cursor-pointer appearance-none"
                value={selectedEnvironmentId || ""}
                onChange={(e) => { setSelectedEnvironmentId(e.target.value); setOpenNativeSelect(null); e.target.blur(); }}
                onClick={() => setOpenNativeSelect(openNativeSelect === 'env' ? null : 'env')}
                onBlur={() => setOpenNativeSelect(null)}
              >
                <option value="">No Environment</option>
                {environments.map(env => (
                  <option key={env.id} value={env.id}>{env.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transform transition-transform duration-200 ${openNativeSelect === 'env' ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
            
            <button 
              onClick={() => setShowEnvManager(true)}
              className="text-gray-400 hover:text-gray-200 p-1.5 rounded hover:bg-[#333] transition-colors"
              title="Manage Environments"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
          </div>
        </div>

        {activeTab.protocol === 'ws' ? (
          <WebSocketBuilder activeTab={activeTab} />
        ) : activeTab.protocol === 'grpc' ? (
          <GrpcBuilder activeTab={activeTab} />
        ) : (
          <>
            {/* URL Bar Row */}
            {!isResponseMaximized && (
            <div className="p-3 pb-0">
          <div className="flex gap-2 mb-3 min-w-0">
            <div className="flex bg-[#1E1E1E] rounded border border-[#333333] focus-within:border-gray-500 flex-1 h-[36px] min-w-0">
              <div className="relative group flex items-center h-full border-r border-[#333333]">
                <select 
                  value={activeTab.method}
                  onChange={(e) => { updateTab(activeTab.id, { method: e.target.value }); setOpenNativeSelect(null); e.target.blur(); }}
                  onClick={() => setOpenNativeSelect(openNativeSelect === 'method' ? null : 'method')}
                  onBlur={() => setOpenNativeSelect(null)}
                  className={`bg-[#212121] text-white text-center outline-none pl-3 pr-7 text-xs font-semibold cursor-pointer ${getMethodColor(activeTab.method)} h-full appearance-none`}
                >
                  {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <div className="pointer-events-none absolute right-2 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transform transition-transform duration-200 ${openNativeSelect === 'method' ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </div>
              <input 
                type="text" 
                placeholder="Enter URL or paste text"
                value={activeTab.url}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-gray-200 text-sm px-3 outline-none font-mono"
              />
            </div>
            <div className="flex h-[36px] shadow-sm relative" ref={sendDropdownRef}>
              <button 
                onClick={() => handleSend(false)}
                disabled={isLoading}
                className="bg-[#0F6F99] hover:bg-[#0d6187] disabled:opacity-50 text-white px-5 text-sm font-medium transition-colors flex items-center justify-center h-full rounded-l"
                title="Ctrl+Enter to Send"
              >
                {isLoading ? 'Sending...' : 'Send'}
              </button>
              <button onClick={() => setShowSendDropdown(!showSendDropdown)} className="bg-[#0F6F99] hover:bg-[#0d6187] disabled:opacity-50 text-white px-2 border-l border-[#2284b3] transition-colors flex items-center justify-center h-full rounded-r">
                <ChevronDown className={`w-4 h-4 transform transition-transform duration-200 ${showSendDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showSendDropdown && (
                <div className="absolute top-full right-0 mt-1 w-40 bg-[#1C1C1C] border border-[#333333] rounded shadow-2xl z-50 py-1">
                  <button onClick={() => { setShowSendDropdown(false); handleSend(true); }} className="w-full text-left px-4 py-2 text-[13px] hover:bg-[#2A2A2A] text-gray-300 transition-colors">
                    Send and Download
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
            )}

        <div className={`flex flex-1 overflow-hidden ${layoutMode === 'vertical' ? 'flex-row' : 'flex-col'}`}>
          {/* Request Pane */}
          {!isResponseMaximized && (
          <div className="flex flex-col flex-1 overflow-hidden border-r border-transparent min-w-0">
            
            {/* Sub-tabs Row */}
            <div className="flex justify-between items-center border-b border-[#333333] px-3 relative" ref={configDropdownRef}>
              {(layoutMode === 'horizontal' || isResponseCollapsed) ? (
                <div className="flex gap-0 text-[13px] font-medium -ml-1">
                  {['Params', 'Authorization', 'Headers', 'Body', 'Scripts', 'Tests', 'Settings'].map((tab) => {
                    let label = tab;
                    if (tab === 'Headers') {
                      const activeCount = activeTab.headers.filter(h => h.key && h.enabled).length;
                      const autoCount = 7;
                      label = `Headers (${activeCount + autoCount})`;
                    } else if (tab === 'Params') {
                      const activeCount = activeTab.queryParams.filter(h => h.key && h.enabled).length;
                      if (activeCount > 0) label = `Params (${activeCount})`;
                    }
                    const tabKey = tab === 'Authorization' ? 'auth' : tab.toLowerCase();
                    return (
                      <button
                        key={tab}
                        onClick={() => setConfigTab(tabKey as any)}
                        className={`px-4 py-2 border-b-2 transition-colors ${
                          configTab === tabKey ? 'border-orange-500 text-gray-200' : 'border-transparent text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center">
                  <button 
                    onClick={() => setShowConfigDropdown(!showConfigDropdown)}
                    className="flex items-center gap-2 px-1 py-2 text-gray-200 font-medium text-[13px] hover:text-white transition-colors"
                  >
                    {configTab === 'params' ? `Params` :
                     configTab === 'headers' ? `Headers` :
                     configTab === 'auth' ? 'Authorization' :
                     configTab.charAt(0).toUpperCase() + configTab.slice(1)}
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transform transition-transform duration-200 ${showConfigDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showConfigDropdown && (
                    <div className="absolute top-full left-3 mt-0 w-48 bg-[#1C1C1C] border border-[#333333] rounded shadow-2xl z-50 py-1">
                      {['Params', 'Authorization', 'Headers', 'Body', 'Scripts', 'Tests', 'Settings'].map((tab) => {
                        const tabKey = tab === 'Authorization' ? 'auth' : tab.toLowerCase();
                        return (
                          <button
                            key={tab}
                            onClick={() => { setConfigTab(tabKey as any); setShowConfigDropdown(false); }}
                            className={`w-full text-left px-4 py-2 text-[13px] hover:bg-[#2A2A2A] transition-colors ${configTab === tabKey ? 'text-white font-medium bg-[#2A2A2A]' : 'text-gray-400'}`}
                          >
                            {tab}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-4 text-[12px]">
                <button onClick={generateSnippet} className="text-[#2b88d8] hover:text-[#429bed] font-medium">Code</button>
                <button onClick={() => setShowCookieManager(true)} className="text-[#2b88d8] hover:text-[#429bed] font-medium">Cookies</button>
              </div>
          </div>

        <div className="flex-1 overflow-y-auto mb-0 bg-[#1E1E1E]">
          {configTab === 'params' && (
            <div className="p-4 pt-3">
              <div className="text-gray-300 font-semibold text-xs mb-3">Query Params</div>
              <KeyValueEditor items={activeTab.queryParams} onChange={handleParamsChange} />
            </div>
          )}
          {configTab === 'headers' && (
            <div className="p-2 h-full flex flex-col">
              <div className="flex items-center mb-2 gap-3">
                <span className="text-xs text-gray-300 font-semibold">Headers</span>
                <button 
                  onClick={() => setShowAutoHeaders(!showAutoHeaders)}
                  className="flex items-center gap-1.5 px-2 py-1 bg-[#2A2A2A] hover:bg-[#333] text-gray-300 text-[11px] rounded border border-[#444] transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showAutoHeaders 
                      ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></>
                      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></>
                    }
                  </svg>
                  {showAutoHeaders ? "Hide auto-generated headers" : "7 hidden"}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <KeyValueEditor 
                  items={activeTab.headers} 
                  onChange={(newHeaders) => updateTab(activeTab.id, { headers: newHeaders })} 
                  suggestions={COMMON_HEADERS}
                  valueSuggestions={COMMON_CONTENT_TYPES}
                  autoItems={autoHeaders}
                  showAutoItems={showAutoHeaders}
                  onAutoItemToggle={(index, enabled) => {
                    const newAutoHeaders = [...autoHeaders];
                    newAutoHeaders[index].enabled = enabled;
                    setAutoHeaders(newAutoHeaders);
                  }}
                />
              </div>
            </div>
          )}
          {configTab === 'scripts' && (
            <div className="p-2 h-full flex flex-col">
              <div className="text-gray-400 text-xs mb-2">Pre-request Script (Javascript)</div>
              <textarea 
                  className="w-full flex-1 bg-[#111111] border border-[#333333] rounded p-2 text-gray-200 font-mono text-xs outline-none focus:border-gray-500 resize-none"
                  value={activeTab.preRequestScript || ''}
                  onChange={(e) => updateTab(activeTab.id, { preRequestScript: e.target.value })}
                  placeholder="// Example: pm.environment.set('token', '12345');"
              />
            </div>
          )}
          {configTab === 'tests' && (
            <div className="p-2 h-full flex flex-col">
              <div className="text-gray-400 text-xs mb-2">Tests (Javascript)</div>
              <textarea 
                  className="w-full flex-1 bg-[#111111] border border-[#333333] rounded p-2 text-gray-200 font-mono text-xs outline-none focus:border-gray-500 resize-none"
                  value={activeTab.testScript || ''}
                  onChange={(e) => updateTab(activeTab.id, { testScript: e.target.value })}
                  placeholder="// Example: pm.test('Status code is 200', function () { pm.response.to.have.status(200); });"
              />
            </div>
          )}
          {configTab === 'body' && (
            <div className="p-2 h-full flex flex-col">
              <div className="flex gap-4 mb-2 text-xs">
                {['none', 'raw', 'graphql', 'form-data', 'urlencoded'].map(type => (
                  <label key={type} className="flex items-center gap-1 cursor-pointer text-gray-400 hover:text-gray-200">
                    <input 
                      type="radio" 
                      name={`bodyType-${activeTab.id}`}
                      checked={activeTab.bodyType === type}
                      onChange={() => updateTab(activeTab.id, { bodyType: type as any })}
                      className="accent-orange-500"
                    />
                    {type === 'urlencoded' ? 'x-www-form-urlencoded' : type}
                  </label>
                ))}
                {activeTab.bodyType === 'raw' && (
                  <div className="relative group ml-2 flex items-center">
                    <select 
                      value={activeTab.rawType || 'Auto'}
                      onChange={(e) => { updateTab(activeTab.id, { rawType: e.target.value as any }); setOpenNativeSelect(null); e.target.blur(); }}
                      onClick={() => setOpenNativeSelect(openNativeSelect === 'rawType' ? null : 'rawType')}
                      onBlur={() => setOpenNativeSelect(null)}
                      className="bg-[#212121] text-white text-center text-[11px] pl-2 pr-6 py-0.5 rounded border border-[#333333] cursor-pointer hover:bg-[#2A2A2A] outline-none appearance-none"
                    >
                      <option value="Auto" className="bg-[#212121] text-white text-center">Auto</option>
                      <option value="JSON" className="bg-[#212121] text-white text-center">JSON</option>
                      <option value="Text" className="bg-[#212121] text-white text-center">Text</option>
                      <option value="HTML" className="bg-[#212121] text-white text-center">HTML</option>
                      <option value="XML" className="bg-[#212121] text-white text-center">XML</option>
                      <option value="JavaScript" className="bg-[#212121] text-white text-center">JavaScript</option>
                    </select>
                    <div className="pointer-events-none absolute right-1.5 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transform transition-transform duration-200 ${openNativeSelect === 'rawType' ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                  </div>
                )}
              </div>
              {activeTab.bodyType === 'raw' && (
                <textarea 
                  className="w-full flex-1 bg-[#111111] border border-[#333333] rounded p-2 text-gray-200 font-mono text-xs outline-none focus:border-gray-500 resize-none"
                  value={activeTab.body}
                  onChange={(e) => updateTab(activeTab.id, { body: e.target.value })}
                  placeholder="Enter body content here..."
                />
              )}
              {activeTab.bodyType === 'form-data' && (
                <FormDataEditor 
                  items={activeTab.formData || []} 
                  onChange={(newData) => updateTab(activeTab.id, { formData: newData })} 
                />
              )}
              {activeTab.bodyType === 'urlencoded' && (
                <KeyValueEditor 
                  items={activeTab.urlencoded || []} 
                  onChange={(newData) => updateTab(activeTab.id, { urlencoded: newData })} 
                />
              )}
              {activeTab.bodyType === 'none' && (
                <div className="flex-1 flex items-center justify-center text-gray-500 text-xs italic">This request does not have a body</div>
              )}
              {activeTab.bodyType === 'graphql' && (
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex-1 flex flex-col">
                    <div className="text-gray-400 text-xs mb-1 font-semibold">QUERY</div>
                    <textarea 
                      className="w-full flex-1 bg-[#111111] border border-[#333333] rounded p-2 text-gray-200 font-mono text-xs outline-none focus:border-gray-500 resize-none min-h-[100px]"
                      value={activeTab.graphqlQuery || ''}
                      onChange={(e) => updateTab(activeTab.id, { graphqlQuery: e.target.value })}
                      placeholder="query { ... }"
                    />
                  </div>
                  <div className="h-1/3 flex flex-col">
                    <div className="text-gray-400 text-xs mb-1 font-semibold">GRAPHQL VARIABLES</div>
                    <textarea 
                      className="w-full flex-1 bg-[#111111] border border-[#333333] rounded p-2 text-gray-200 font-mono text-xs outline-none focus:border-gray-500 resize-none min-h-[60px]"
                      value={activeTab.graphqlVariables || ''}
                      onChange={(e) => updateTab(activeTab.id, { graphqlVariables: e.target.value })}
                      placeholder='{"key": "value"}'
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          {configTab === 'auth' && (
            <div className="p-4 flex gap-4 h-full">
               <div className="w-48 border-r border-[#333333] pr-4">
                  <div className="text-gray-300 font-semibold text-xs mb-3">Type</div>
                  <div className="relative group flex items-center">
                    <select 
                      className="w-full bg-[#212121] text-white text-center border border-[#333333] rounded pl-2 pr-6 py-1.5 text-xs outline-none appearance-none cursor-pointer"
                      value={activeTab.authType}
                      onChange={(e) => { updateTab(activeTab.id, { authType: e.target.value as any }); setOpenNativeSelect(null); e.target.blur(); }}
                      onClick={() => setOpenNativeSelect(openNativeSelect === 'authType' ? null : 'authType')}
                      onBlur={() => setOpenNativeSelect(null)}
                    >
                      <option value="none">No Auth</option>
                      <option value="bearer">Bearer Token</option>
                      <option value="basic">Basic Auth</option>
                    </select>
                    <div className="pointer-events-none absolute right-2 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transform transition-transform duration-200 ${openNativeSelect === 'authType' ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                  </div>
               </div>
               <div className="flex-1 pl-4 h-full">
                  {activeTab.authType === 'none' && (
                    <div className="flex items-center justify-center h-full text-gray-500 text-xs italic">
                      This request does not use any authorization.
                    </div>
                  )}
                  {activeTab.authType === 'bearer' && (
                    <div className="mt-2">
                       <div className="text-gray-400 text-xs mb-1">Token</div>
                       <input 
                         type="text" 
                         className="w-full bg-[#111111] border border-[#333333] rounded px-2 py-1.5 text-xs text-gray-300 outline-none font-mono"
                         placeholder="Token"
                         value={activeTab.authCredentials.token || ''}
                         onChange={(e) => updateTab(activeTab.id, { 
                           authCredentials: { ...activeTab.authCredentials, token: e.target.value } 
                         })}
                       />
                    </div>
                  )}
                  {activeTab.authType === 'basic' && (
                    <div className="mt-2 space-y-3">
                       <div>
                         <div className="text-gray-400 text-xs mb-1">Username</div>
                         <input 
                           type="text" 
                           className="w-full bg-[#111111] border border-[#333333] rounded px-2 py-1.5 text-xs text-gray-300 outline-none font-mono"
                           value={activeTab.authCredentials.username || ''}
                           onChange={(e) => updateTab(activeTab.id, { 
                             authCredentials: { ...activeTab.authCredentials, username: e.target.value } 
                           })}
                         />
                       </div>
                       <div>
                         <div className="text-gray-400 text-xs mb-1">Password</div>
                         <input 
                           type="password" 
                           className="w-full bg-[#111111] border border-[#333333] rounded px-2 py-1.5 text-xs text-gray-300 outline-none font-mono"
                           value={activeTab.authCredentials.password || ''}
                           onChange={(e) => updateTab(activeTab.id, { 
                             authCredentials: { ...activeTab.authCredentials, password: e.target.value } 
                           })}
                         />
                       </div>
                    </div>
                  )}
               </div>
            </div>
          )}
          {configTab === 'scripts' && (
            <div className="p-2 h-full flex flex-col">
              <div className="text-xs text-gray-400 mb-2">Pre-request Script (JavaScript)</div>
              <textarea 
                className="flex-1 bg-[#111111] border border-[#333333] rounded p-2 text-xs text-green-400 font-mono outline-none resize-none"
                placeholder="pm.environment.set('variable_key', 'variable_value');"
                value={activeTab.preRequestScript || ''}
                onChange={(e) => updateTab(activeTab.id, { preRequestScript: e.target.value })}
              ></textarea>
            </div>
          )}
          {configTab === 'tests' && (
            <div className="p-2 h-full flex flex-col">
              <div className="text-xs text-gray-400 mb-2">Test Script (JavaScript)</div>
              <textarea 
                className="flex-1 bg-[#111111] border border-[#333333] rounded p-2 text-xs text-green-400 font-mono outline-none resize-none"
                placeholder="pm.test('Status code is 200', function () { pm.response.to.have.status(200); });"
                value={activeTab.testScript || ''}
                onChange={(e) => updateTab(activeTab.id, { testScript: e.target.value })}
              ></textarea>
            </div>
          )}
          {configTab === 'settings' && (
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {SETTINGS_LIST.map((setting) => {
                const checked = settingsState[setting.id];
                return (
                  <div key={setting.id} className="flex items-start justify-between py-3 border-b border-[#2A2A2A] hover:bg-[#252525] px-2 rounded -mx-2 transition-colors">
                    <div className="flex flex-col pr-8 max-w-[85%]">
                      <span className="text-[13px] text-gray-200 mb-0.5">{setting.title}</span>
                      <span className="text-[11px] text-gray-400 leading-relaxed">{setting.desc}</span>
                    </div>
                    <div 
                      className={`w-8 h-4 mt-1 flex items-center rounded-full p-0.5 cursor-pointer flex-shrink-0 transition-colors ${checked ? 'bg-[#007acc]' : 'bg-[#555]'}`}
                      onClick={() => toggleSetting(setting.id)}
                    >
                      <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform duration-200 ${checked ? 'translate-x-4' : ''}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>
          )}
        {/* Resize Handler */}
        {!isResponseCollapsed && (
          <div 
            className={`bg-[#1a1a1a] hover:bg-orange-500 z-10 transition-colors border-[#333333] ${layoutMode === 'vertical' ? 'w-1 cursor-col-resize border-x' : 'h-1 cursor-row-resize border-y'}`}
            onMouseDown={startResize}
          />
        )}

        {/* Response Pane */}
        <div 
          className={`flex flex-col bg-[#1E1E1E] min-w-0 ${!isResponseCollapsed ? 'w-full' : (layoutMode === 'vertical' ? 'w-10' : 'h-[36px]')}`}
          style={!isResponseCollapsed ? (layoutMode === 'vertical' ? { width: `${responseHeight}%` } : { height: `${responseHeight}%` }) : {}}
        >
          {/* Unified Response Header */}
          <div className={`flex justify-between bg-[#212121] flex-shrink-0 ${
            layoutMode === 'vertical' && isResponseCollapsed 
              ? 'flex-col-reverse py-4 h-full border-l border-[#333333] items-center' 
              : 'flex-row px-4 py-2 border-b border-[#333333] items-center'
          }`}>
            <div className={`text-[13px] font-semibold text-gray-400 ${
              layoutMode === 'vertical' && isResponseCollapsed ? '-rotate-90 whitespace-nowrap mb-6' : ''
            }`}>Response</div>
            
            <div className={`flex text-gray-500 ${
              layoutMode === 'vertical' && isResponseCollapsed ? 'flex-col gap-4' : 'gap-4 items-center'
            }`}>
              {(response || error) && !isResponseCollapsed && (
                <button 
                  onClick={() => { setResponse(null); setError(null); }} 
                  className="text-[11px] font-medium hover:text-gray-300 px-1.5 py-0.5 rounded transition-colors"
                  title="Clear Response"
                >
                  Clear
                </button>
              )}
              <div className={`flex ${layoutMode === 'vertical' && isResponseCollapsed ? 'flex-col gap-4' : 'gap-2 items-center'}`}>
                <button onClick={() => setLayoutMode(prev => prev === 'vertical' ? 'horizontal' : 'vertical')} className="hover:text-gray-300" title="Toggle Pane Layout">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  {layoutMode === 'horizontal' ? (
                    <line x1="12" y1="3" x2="12" y2="21"></line>
                  ) : (
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                  )}
                </svg>
              </button>
              <button onClick={() => setIsResponseCollapsed(prev => !prev)} className="hover:text-gray-300" title="Collapse Response">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transform transition-transform duration-200 ${isResponseCollapsed ? 'rotate-180' : ''}`}>
                  {layoutMode === 'vertical' ? (
                    <polyline points="9 18 15 12 9 6"></polyline>
                  ) : (
                    <polyline points="6 9 12 15 18 9"></polyline>
                  )}
                </svg>
              </button>
            </div>
            </div>
          </div>
          
          {!isResponseCollapsed && (
            <div className="flex-1 overflow-hidden">
               <ResponseViewer response={response} isLoading={isLoading} error={error} />
            </div>
          )}
        </div>
        </div>
          </>
        )}
      </div>
      
      <EnvironmentManager isOpen={showEnvManager} onClose={() => setShowEnvManager(false)} />
      
      {activeTab && (
        <SnippetGenerator 
          isOpen={showSnippetModal} 
          onClose={() => setShowSnippetModal(false)} 
          activeTab={activeTab} 
          resolveVariables={resolveVariables} 
        />
      )}
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
