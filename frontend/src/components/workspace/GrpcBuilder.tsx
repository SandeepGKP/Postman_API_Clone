import React, { useState } from 'react';
import { useWorkspaceStore, RequestTab } from '@/store/workspaceStore';
import { Play } from 'lucide-react';

interface GrpcBuilderProps {
  activeTab: RequestTab;
}

export default function GrpcBuilder({ activeTab }: GrpcBuilderProps) {
  const { updateTab } = useWorkspaceStore();
  const [method, setMethod] = useState('');
  const [message, setMessage] = useState('{\n  \n}');
  const [response, setResponse] = useState('');

  const invoke = () => {
    // Basic stub for gRPC invocation without proxy
    setResponse('// gRPC implementation requires a proxy or grpc-web setup.\n// This is a placeholder for the actual gRPC response.\n\n{\n  "status": "UNIMPLEMENTED",\n  "message": "gRPC backend proxy is not configured."\n}');
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-[#1E1E1E]">
      <div className="p-3 border-b border-[#333333]">
        <div className="flex gap-2 min-w-0">
          <div className="flex bg-[#1E1E1E] rounded border border-[#333333] focus-within:border-gray-500 flex-1 h-[36px] min-w-0">
            <div className="bg-transparent px-3 text-xs font-semibold flex items-center text-[#2284b3] border-r border-[#333333] h-full flex-shrink-0">
              gRPC
            </div>
            <input 
              type="text" 
              placeholder="Enter gRPC server URL (e.g. grpc.example.com:443)"
              value={activeTab.url}
              onChange={(e) => updateTab(activeTab.id, { url: e.target.value })}
              className="flex-1 min-w-0 bg-transparent text-gray-200 text-sm px-3 outline-none font-mono"
            />
          </div>
          <button 
            onClick={invoke}
            className="bg-[#0F6F99] hover:bg-[#0d6187] text-white px-5 rounded h-[36px] font-medium flex items-center gap-2 transition-colors flex-shrink-0"
          >
            Invoke
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Request Pane */}
        <div className="flex-1 flex flex-col border-r border-[#333333]">
          <div className="px-4 py-2 border-b border-[#333333] bg-[#212121] text-xs text-gray-400 font-semibold flex items-center gap-3">
            <span>Method:</span>
            <input 
              type="text" 
              placeholder="e.g. package.Service/Method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="bg-[#1E1E1E] border border-[#333] rounded px-2 py-1 text-gray-200 outline-none focus:border-[#555] font-mono flex-1 max-w-[300px]"
            />
          </div>
          <div className="flex-1 p-0 flex flex-col bg-[#1E1E1E]">
            <div className="px-4 py-2 border-b border-[#333333] bg-[#212121] text-xs text-gray-400 font-semibold">
              Message Payload (JSON)
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 bg-transparent text-gray-300 p-4 font-mono text-sm outline-none resize-none"
              spellCheck="false"
            />
          </div>
        </div>

        {/* Response Pane */}
        <div className="flex-1 flex flex-col bg-[#1E1E1E]">
          <div className="px-4 py-2 border-b border-[#333333] bg-[#212121] text-xs text-gray-400 font-semibold">
            Response
          </div>
          <div className="flex-1 p-4 font-mono text-sm text-gray-300 whitespace-pre-wrap overflow-y-auto">
            {response || <span className="text-gray-500">Enter server details and invoke to see response</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
