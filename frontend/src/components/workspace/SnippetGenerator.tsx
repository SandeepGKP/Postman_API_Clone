import React, { useState } from 'react';
import { X, Copy } from 'lucide-react';
import { RequestTab } from '@/store/workspaceStore';
import { useToastStore } from '@/store/toastStore';

interface SnippetGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: RequestTab;
  resolveVariables: (text: string) => string;
}

export default function SnippetGenerator({ isOpen, onClose, activeTab, resolveVariables }: SnippetGeneratorProps) {
  const [language, setLanguage] = useState<'curl' | 'fetch' | 'python'>('curl');
  const { addToast } = useToastStore();

  if (!isOpen) return null;

  const url = resolveVariables(activeTab.url);
  const method = activeTab.method;
  
  let headersObj: Record<string, string> = {};
  activeTab.headers.forEach(h => {
    if (h.enabled && h.key) {
      headersObj[resolveVariables(h.key)] = resolveVariables(h.value);
    }
  });

  const getSnippet = () => {
    let snippet = '';
    
    if (language === 'curl') {
      snippet = `curl --location --request ${method} '${url}' \\\n`;
      Object.entries(headersObj).forEach(([key, value]) => {
        snippet += `--header '${key}: ${value}' \\\n`;
      });
      if (activeTab.bodyType === 'raw' && activeTab.body) {
        snippet += `--data-raw '${resolveVariables(activeTab.body)}'`;
      }
      // remove trailing slash if needed
      snippet = snippet.trim().replace(/\\$/, '');
    } 
    else if (language === 'fetch') {
      snippet = `const myHeaders = new Headers();\n`;
      Object.entries(headersObj).forEach(([key, value]) => {
        snippet += `myHeaders.append("${key}", "${value}");\n`;
      });
      snippet += `\nconst requestOptions = {\n  method: '${method}',\n  headers: myHeaders,\n`;
      if (activeTab.bodyType === 'raw' && activeTab.body) {
        snippet += `  body: JSON.stringify(${resolveVariables(activeTab.body)}),\n`;
      }
      snippet += `  redirect: 'follow'\n};\n\n`;
      snippet += `fetch("${url}", requestOptions)\n  .then(response => response.text())\n  .then(result => console.log(result))\n  .catch(error => console.log('error', error));`;
    }
    else if (language === 'python') {
      snippet = `import requests\nimport json\n\nurl = "${url}"\n\n`;
      if (activeTab.bodyType === 'raw' && activeTab.body) {
        snippet += `payload = json.dumps(${resolveVariables(activeTab.body)})\n`;
      } else {
        snippet += `payload = {}\n`;
      }
      snippet += `headers = {\n`;
      Object.entries(headersObj).forEach(([key, value]) => {
        snippet += `  '${key}': '${value}',\n`;
      });
      snippet += `}\n\n`;
      snippet += `response = requests.request("${method}", url, headers=headers, data=payload)\n\nprint(response.text)`;
    }

    return snippet;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getSnippet());
    addToast("Snippet copied to clipboard!", "success");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col w-[700px] h-[500px] bg-[#1E1E1E] border border-[#333] rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#252525] border-b border-[#333]">
          <h2 className="text-gray-200 font-semibold text-sm">Code snippets</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Languages */}
          <div className="w-1/4 border-r border-[#333] flex flex-col bg-[#1A1A1A] p-2">
            {(['curl', 'fetch', 'python'] as const).map((lang) => (
              <div 
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-3 py-2 text-xs cursor-pointer rounded mb-1 transition-colors capitalize ${
                  language === lang
                    ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20 font-medium'
                    : 'text-gray-400 hover:bg-[#2A2A2A]'
                }`}
              >
                {lang === 'curl' ? 'cURL' : lang === 'fetch' ? 'JavaScript - Fetch' : 'Python - Requests'}
              </div>
            ))}
          </div>

          {/* Right Area - Code Editor */}
          <div className="w-3/4 flex flex-col bg-[#111111]">
            <div className="flex justify-end p-2 border-b border-[#333]">
              <button 
                onClick={copyToClipboard}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors p-1"
              >
                <Copy className="w-3.5 h-3.5" /> Copy snippet
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="text-[13px] text-gray-300 font-mono whitespace-pre-wrap break-all">
                {getSnippet()}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
