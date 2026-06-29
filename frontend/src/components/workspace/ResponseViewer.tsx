import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useToastStore } from '@/store/toastStore';

interface ResponseData {
  status_code: number;
  time: number;
  size: number;
  headers: Record<string, string | string[]>;
  data: string;
  testResults?: any[];
}

interface ResponseViewerProps {
  response: ResponseData | null;
  isLoading: boolean;
  error: string | null;
}

const getStatusText = (code: number) => {
  const map: Record<number, string> = {
    200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content',
    400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed',
    500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable'
  };
  return map[code] || '';
};

export default function ResponseViewer({ response, isLoading, error }: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'cookies' | 'test-results'>('body');
  const [viewTab, setViewTab] = useState<'pretty' | 'raw' | 'preview'>('pretty');
  const [isWordWrap, setIsWordWrap] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [responseFormat, setResponseFormat] = useState('Auto');
  const [detectedFormat, setDetectedFormat] = useState('Text');
  const [openNativeSelect, setOpenNativeSelect] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToastStore();

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedData);
    addToast('Response copied to clipboard', 'success');
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (window as any).find(e.currentTarget.value);
    }
  };

  useEffect(() => {
    if (responseFormat === 'Auto' && response) {
      const contentTypeStr = Object.keys(response.headers || {}).find(k => k.toLowerCase() === 'content-type');
      let cType = '';
      if (contentTypeStr) {
        const val = response.headers[contentTypeStr];
        cType = Array.isArray(val) ? val[0] : val;
      }
      cType = cType.toLowerCase();

      if (cType.includes('application/json')) {
        setDetectedFormat('JSON');
      } else if (cType.includes('text/html')) {
        setDetectedFormat('HTML');
      } else if (cType.includes('xml')) {
        setDetectedFormat('XML');
      } else if (typeof response.data === 'string') {
        try {
          JSON.parse(response.data);
          setDetectedFormat('JSON');
        } catch(e) {
          if (response.data.trim().startsWith('<html') || response.data.trim().startsWith('<!DOCTYPE html')) {
             setDetectedFormat('HTML');
          } else if (response.data.trim().startsWith('<?xml') || response.data.trim().startsWith('<')) {
             setDetectedFormat('XML');
          } else {
             setDetectedFormat('Text');
          }
        }
      } else {
        setDetectedFormat('Text');
      }
    }
  }, [response, responseFormat]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-[#1E1E1E] h-full">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p>Sending request...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-500 bg-[#1E1E1E] h-full">
        <div className="text-center p-4">
          <p className="font-semibold mb-2">Could not send request</p>
          <p className="text-xs text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 bg-[#1E1E1E] h-full">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          <p className="text-sm font-medium text-gray-400">Enter the URL and click Send to get a response</p>
        </div>
      </div>
    );
  }

  const isSuccess = response.status_code >= 200 && response.status_code < 300;
  
  // Extract headers array
  const headers = Object.entries(response.headers || {}).map(([key, val]) => ({
    key,
    value: Array.isArray(val) ? val.join(', ') : val
  }));

  // Parse cookies from Set-Cookie header if any
  const cookies = headers
    .filter(h => h.key.toLowerCase() === 'set-cookie')
    .map(h => ({
      key: h.value.split('=')[0],
      value: h.value.split(';')[0].substring(h.value.indexOf('=') + 1)
    }));

  let formattedData = response.data;
  let isJson = false;

  const actualFormat = responseFormat === 'Auto' ? detectedFormat : responseFormat;

  if (typeof response.data === 'string') {
    if (actualFormat === 'JSON') {
      try {
        const parsed = JSON.parse(response.data);
        formattedData = JSON.stringify(parsed, null, 4);
        isJson = true;
      } catch (e) {
        // not valid json, leave as is
      }
    } else {
      isJson = false;
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#1E1E1E] min-w-0 w-full">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between px-4 pt-2 border-b border-[#333333] bg-[#212121] gap-2 xl:gap-0 overflow-x-auto no-scrollbar">
        <div className="flex relative items-center mb-2 min-w-max group">
          <select 
            value={activeTab}
            onChange={(e) => { setActiveTab(e.target.value as any); setOpenNativeSelect(null); e.target.blur(); }}
            onClick={() => setOpenNativeSelect(openNativeSelect === 'activeTab' ? null : 'activeTab')}
            onBlur={() => setOpenNativeSelect(null)}
            className="bg-[#212121] text-white text-center outline-none text-[13px] font-medium appearance-none cursor-pointer border-b-[3px] border-orange-500 pb-1 pr-5"
          >
            <option value="body" className="bg-[#1C1C1C]">Body</option>
            <option value="cookies" className="bg-[#1C1C1C]">Cookies {cookies.length > 0 ? `(${cookies.length})` : ''}</option>
            <option value="headers" className="bg-[#1C1C1C]">Headers ({headers.length})</option>
            <option value="test-results" className="bg-[#1C1C1C]">Test Results</option>
          </select>
          <div className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transform transition-transform duration-200 ${openNativeSelect === 'activeTab' ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </div>
        
        <div className="flex items-center gap-x-4 gap-y-1 text-xs text-gray-400 min-w-max pb-2 xl:pb-0">
          <div className="flex items-center gap-1.5" title="View Network Info">
            <Globe className="w-3.5 h-3.5 text-gray-500" />
            <span>Status: <span className={`font-medium ${isSuccess ? 'text-green-500' : 'text-red-500'}`}>{response.status_code} {getStatusText(response.status_code)}</span></span>
          </div>
          <div>Time: <span className="text-green-500 font-medium">{response.time} ms</span></div>
          <div>Size: <span className="text-green-500 font-medium">{(response.size / 1024).toFixed(2)} KB</span></div>
          <div className="ml-1 cursor-pointer hover:text-gray-300 hidden sm:block">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto bg-[#1E1E1E]">
        {activeTab === 'headers' && (
           <table className="w-full text-left text-sm font-mono text-gray-300 m-4">
             <tbody>
               {headers.map((h, i) => (
                 <tr key={i} className="border-b border-[#333] hover:bg-[#2A2A2A]">
                   <td className="py-1 pr-4 font-semibold text-gray-400">{h.key}</td>
                   <td className="py-1 break-all">
                     {h.key.toLowerCase() === 'date' ? new Date(h.value).toLocaleString('en-IN') : h.value}
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        )}

        {activeTab === 'cookies' && (
           cookies.length === 0 ? (
             <div className="flex items-center justify-center h-full w-full text-sm font-mono text-gray-500 italic min-h-[150px]">
               No cookies were returned in the response.
             </div>
           ) : (
             <table className="w-full text-left text-sm font-mono text-gray-300 m-4">
               <tbody>
                 {cookies.map((c, i) => (
                   <tr key={i} className="border-b border-[#333] hover:bg-[#2A2A2A]">
                     <td className="py-1 pr-4 font-semibold text-gray-400">{c.key}</td>
                     <td className="py-1 break-all">{c.value}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           )
        )}

        {activeTab === 'test-results' && (
           <div className="flex flex-col h-full bg-[#1E1E1E]">
             {!response.testResults || response.testResults.length === 0 ? (
               <div className="flex items-center justify-center h-full text-gray-500 text-sm italic">
                 No test results available.
               </div>
             ) : (
               <table className="w-full text-left text-sm font-mono text-gray-300 m-4">
                 <tbody>
                   {response.testResults.map((t: any, i: number) => (
                     <tr key={i} className="border-b border-[#333] hover:bg-[#2A2A2A]">
                       <td className="py-2 pl-4 pr-2 font-medium" style={{ color: t.passed ? '#10B981' : '#EF4444' }}>
                         {t.passed ? 'PASS' : 'FAIL'}
                       </td>
                       <td className="py-2 pr-4 font-semibold text-gray-200">{t.name}</td>
                       <td className="py-2 pr-4 text-red-400 break-all">{t.error || ''}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             )}
           </div>
        )}

        {activeTab === 'body' && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-3 px-4 pt-3">
              <div className="flex items-center gap-3 text-[13px]">
                <div className="flex border border-[#333333] rounded p-0.5 bg-[#1A1A1A]">
                  <button onClick={() => setViewTab('pretty')} className={`px-3 py-1 rounded transition-colors ${viewTab === 'pretty' ? 'bg-[#333] text-gray-200 font-medium shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>Pretty</button>
                  <button onClick={() => setViewTab('raw')} className={`px-3 py-1 rounded transition-colors ${viewTab === 'raw' ? 'bg-[#333] text-gray-200 font-medium shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>Raw</button>
                  <button onClick={() => setViewTab('preview')} className={`px-3 py-1 rounded transition-colors ${viewTab === 'preview' ? 'bg-[#333] text-gray-200 font-medium shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>Preview</button>
                </div>
                {viewTab === 'pretty' && (
                  <div className="relative group">
                    <select 
                      value={responseFormat}
                      onChange={(e) => { setResponseFormat(e.target.value); setOpenNativeSelect(null); e.target.blur(); }}
                      onClick={() => setOpenNativeSelect(openNativeSelect === 'format' ? null : 'format')}
                      onBlur={() => setOpenNativeSelect(null)}
                      className="bg-[#212121] text-white text-center text-xs pl-2 pr-6 py-1.5 rounded border border-[#444] cursor-pointer hover:bg-[#3a3a3a] transition-colors outline-none appearance-none" 
                    >
                      <option value="JSON">JSON</option>
                      <option value="XML">XML</option>
                      <option value="HTML">HTML</option>
                      <option value="Text">Text</option>
                      <option value="Auto">Auto {responseFormat === 'Auto' && detectedFormat ? `(${detectedFormat})` : ''}</option>
                    </select>
                    <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transform transition-transform duration-200 ${openNativeSelect === 'format' ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 text-gray-500">
                <button onClick={handleCopy} className="hover:text-gray-300 transition-colors" title="Copy response">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
                <button onClick={toggleSearch} className={`transition-colors ${showSearch ? 'text-orange-500' : 'hover:text-gray-300'}`} title="Search response">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </button>
              </div>
            </div>

            {showSearch && (
              <div className="px-4 pb-3">
                <input 
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Find in response (Press Enter)" 
                  className="w-full bg-[#1A1A1A] border border-[#333] text-gray-300 text-[13px] px-3 py-1.5 rounded focus:outline-none focus:border-[#555]"
                  onKeyDown={handleSearch}
                />
              </div>
            )}
            
            <div className="flex-1 overflow-auto bg-[#1E1E1E]">
              {viewTab === 'preview' ? (
                <iframe srcDoc={response.data} className="w-full h-full bg-white border-none" sandbox="allow-same-origin" />
              ) : (
                <div className="font-mono text-[13px] leading-[1.6] pb-8 pt-2">
                  {formattedData.split('\n').map((line, idx) => {
                    const leadingSpaces = line.match(/^\s*/)?.[0].length || 0;
                    return (
                      <div key={idx} className="flex group hover:bg-[#252525]">
                        <div className="w-10 flex-shrink-0 text-right pr-4 text-gray-600 select-none mr-2 group-hover:text-gray-400">{idx + 1}</div>
                        <div className="flex-1 min-w-0">
                          {isJson && viewTab === 'pretty' ? (
                            <code 
                              className={`block break-normal text-gray-300 ${isWordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}`} 
                              style={isWordWrap ? { paddingLeft: `${leadingSpaces}ch`, textIndent: `-${leadingSpaces}ch` } : {}}
                              dangerouslySetInnerHTML={{
                                __html: line.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
                                  let cls = 'text-[#85B1FF]';
                                  if (/^"/.test(match)) {
                                    if (/:$/.test(match)) {
                                      cls = 'text-[#9CDCFE]';
                                    } else {
                                      cls = 'text-[#CE9178]';
                                    }
                                  } else if (/true|false/.test(match)) {
                                    cls = 'text-[#569CD6]';
                                  } else if (/null/.test(match)) {
                                    cls = 'text-[#569CD6]';
                                  } else if (/-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/.test(match)) {
                                    cls = 'text-[#B5CEA8]';
                                  }
                                  return '<span class="' + cls + '">' + match + '</span>';
                                })
                              }} 
                            />
                          ) : (
                            <code 
                              className={`block break-normal text-gray-300 ${isWordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}`} 
                              style={isWordWrap ? { paddingLeft: `${leadingSpaces}ch`, textIndent: `-${leadingSpaces}ch` } : {}}
                            >
                              {line}
                            </code>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
