import React, { useState, useEffect, useRef } from 'react';
import { useWorkspaceStore, RequestTab } from '@/store/workspaceStore';
import { Play, Square } from 'lucide-react';

interface WebSocketBuilderProps {
  activeTab: RequestTab;
}

export default function WebSocketBuilder({ activeTab }: WebSocketBuilderProps) {
  const { updateTab } = useWorkspaceStore();
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [messages, setMessages] = useState<{type: 'sent' | 'received' | 'info', data: string, time: string}[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const ws = useRef<WebSocket | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const connect = () => {
    if (!activeTab.url) return;
    try {
      setStatus('connecting');
      ws.current = new WebSocket(activeTab.url);
      
      ws.current.onopen = () => {
        setStatus('connected');
        setMessages(prev => [...prev, { type: 'info', data: 'Connected to ' + activeTab.url, time: new Date().toLocaleTimeString() }]);
      };
      
      ws.current.onmessage = (e) => {
        setMessages(prev => [...prev, { type: 'received', data: e.data, time: new Date().toLocaleTimeString() }]);
      };
      
      ws.current.onclose = () => {
        setStatus('disconnected');
        setMessages(prev => [...prev, { type: 'info', data: 'Disconnected', time: new Date().toLocaleTimeString() }]);
      };

      ws.current.onerror = (e) => {
        setStatus('disconnected');
        setMessages(prev => [...prev, { type: 'info', data: 'Error occurred', time: new Date().toLocaleTimeString() }]);
      };
    } catch (e: any) {
      setStatus('disconnected');
      setMessages(prev => [...prev, { type: 'info', data: `Failed to connect: ${e.message}`, time: new Date().toLocaleTimeString() }]);
    }
  };

  const disconnect = () => {
    if (ws.current) {
      ws.current.close();
    }
  };

  const sendMessage = () => {
    if (ws.current && status === 'connected' && messageInput) {
      ws.current.send(messageInput);
      setMessages(prev => [...prev, { type: 'sent', data: messageInput, time: new Date().toLocaleTimeString() }]);
      setMessageInput('');
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-[#1E1E1E]">
      <div className="p-3 border-b border-[#333333]">
        <div className="flex gap-2 min-w-0">
          <div className="flex bg-[#1E1E1E] rounded border border-[#333333] focus-within:border-gray-500 flex-1 h-[36px] min-w-0">
            <div className="bg-transparent px-3 text-xs font-semibold flex items-center text-orange-400 border-r border-[#333333] h-full flex-shrink-0">
              WS
            </div>
            <input 
              type="text" 
              placeholder="Enter WebSocket URL (e.g. wss://echo.websocket.org)"
              value={activeTab.url}
              onChange={(e) => updateTab(activeTab.id, { url: e.target.value })}
              className="flex-1 min-w-0 bg-transparent text-gray-200 text-sm px-3 outline-none font-mono"
            />
          </div>
          {status === 'disconnected' ? (
            <button 
              onClick={connect}
              className="bg-[#0F6F99] hover:bg-[#0d6187] text-white px-5 rounded h-[36px] font-medium flex items-center gap-2 transition-colors flex-shrink-0"
            >
              Connect
            </button>
          ) : (
            <button 
              onClick={disconnect}
              className="bg-red-600 hover:bg-red-700 text-white px-5 rounded h-[36px] font-medium flex items-center gap-2 transition-colors flex-shrink-0"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Message Log Pane */}
        <div className="flex-1 flex flex-col border-r border-[#333333]">
          <div className="px-4 py-2 border-b border-[#333333] bg-[#212121] text-xs text-gray-400 font-semibold">
            Messages
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 font-mono text-xs">
            {messages.length === 0 && (
              <div className="text-gray-500 text-center mt-10">No messages yet. Connect and send a message.</div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`p-2 rounded max-w-[80%] ${m.type === 'sent' ? 'bg-[#0F6F99]/20 text-[#2284b3] self-end' : m.type === 'received' ? 'bg-[#333333] text-green-400 self-start' : 'bg-transparent text-gray-500 text-center self-center w-full'}`}>
                <div className="mb-1 text-[10px] opacity-70">
                  {m.type === 'sent' ? '↑ Sent' : m.type === 'received' ? '↓ Received' : 'Info'} • {m.time}
                </div>
                <div className="break-all whitespace-pre-wrap">{m.data}</div>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* Compose Pane */}
        <div className="w-1/3 flex flex-col bg-[#212121]">
          <div className="px-4 py-2 border-b border-[#333333] bg-[#212121] text-xs text-gray-400 font-semibold">
            Message
          </div>
          <div className="flex-1 p-2 flex flex-col">
            <textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Enter message to send..."
              className="flex-1 bg-[#1E1E1E] text-gray-200 p-3 rounded border border-[#333] outline-none focus:border-[#555] font-mono text-xs resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  sendMessage();
                }
              }}
            />
            <button 
              onClick={sendMessage}
              disabled={status !== 'connected' || !messageInput}
              className="mt-2 bg-[#0F6F99] disabled:bg-[#333] disabled:text-gray-500 hover:bg-[#0d6187] text-white py-2 rounded text-xs font-semibold transition-colors"
            >
              Send (Ctrl+Enter)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
