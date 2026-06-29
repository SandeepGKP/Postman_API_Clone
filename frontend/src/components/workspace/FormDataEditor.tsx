import React, { useRef } from 'react';
import { FormDataKeyValuePair } from '@/store/workspaceStore';
import { Trash2, Paperclip, File as FileIcon } from 'lucide-react';

interface FormDataEditorProps {
  items: FormDataKeyValuePair[];
  onChange: (items: FormDataKeyValuePair[]) => void;
}

export default function FormDataEditor({ items, onChange }: FormDataEditorProps) {
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const handleItemChange = (index: number, field: keyof FormDataKeyValuePair, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-add new empty row if we are typing in the last row
    if (index === items.length - 1 && field !== 'enabled' && field !== 'type' && value !== '') {
      newItems.push({ key: '', value: '', enabled: false, type: 'text' });
      newItems[index].enabled = true;
    }
    
    // If switching to file type, clear text value
    if (field === 'type' && value === 'file') {
      newItems[index].value = '';
    }
    
    onChange(newItems);
  };

  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const newItems = [...items];
      newItems[index] = { ...newItems[index], file: file, enabled: true };
      
      if (index === items.length - 1) {
        newItems.push({ key: '', value: '', enabled: false, type: 'text' });
      }
      
      onChange(newItems);
    }
  };

  const handleRemove = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    if (newItems.length === 0) {
      newItems.push({ key: '', value: '', enabled: false, type: 'text' });
    }
    onChange(newItems);
  };

  const displayItems = items.length > 0 ? items : [{ key: '', value: '', enabled: false, type: 'text' as const }];

  return (
    <div className="w-full text-xs border border-[#333333] rounded overflow-hidden">
      <div className="flex border-b border-[#333333] bg-[#2A2A2A] text-gray-400 font-medium">
        <div className="w-8 border-r border-[#333333]"></div>
        <div className="flex-1 px-2 py-1.5 border-r border-[#333333]">Key</div>
        <div className="w-24 px-2 py-1.5 border-r border-[#333333]">Type</div>
        <div className="flex-[2] px-2 py-1.5 border-r border-[#333333]">Value</div>
        <div className="w-8"></div>
      </div>
      
      {displayItems.map((item, index) => (
        <div key={index} className="flex border-b border-[#333333] last:border-b-0 hover:bg-[#2A2A2A] transition-colors group relative">
          <div className="w-8 flex items-center justify-center border-r border-[#333333]">
            <input 
              type="checkbox" 
              checked={item.enabled || false}
              onChange={(e) => handleItemChange(index, 'enabled', e.target.checked)}
              className="accent-orange-500 cursor-pointer"
            />
          </div>
          
          <div className="flex-1 border-r border-[#333333]">
            <input 
              type="text" 
              placeholder="Key"
              value={item.key || ''}
              onChange={(e) => handleItemChange(index, 'key', e.target.value)}
              className="w-full bg-transparent px-2 py-1.5 outline-none text-gray-200 placeholder-gray-600 font-mono"
            />
          </div>
          
          <div className="w-24 border-r border-[#333333]">
            <select 
              value={item.type}
              onChange={(e) => handleItemChange(index, 'type', e.target.value)}
              className="w-full bg-[#212121] text-white text-center px-2 py-1.5 outline-none cursor-pointer"
            >
              <option value="text">Text</option>
              <option value="file">File</option>
            </select>
          </div>
          
          <div className="flex-[2] border-r border-[#333333] relative flex items-center">
            {item.type === 'text' ? (
              <input 
                type="text" 
                placeholder="Value"
                value={item.value || ''}
                onChange={(e) => handleItemChange(index, 'value', e.target.value)}
                className="w-full bg-transparent px-2 py-1.5 outline-none text-gray-200 placeholder-gray-600 font-mono"
              />
            ) : (
              <div className="w-full flex items-center px-2 py-1 gap-2">
                <input 
                  type="file" 
                  className="hidden" 
                  ref={(el) => { fileInputRefs.current[index] = el; }}
                  onChange={(e) => handleFileChange(index, e)}
                />
                <button 
                  onClick={() => fileInputRefs.current[index]?.click()}
                  className="flex items-center gap-1 bg-[#333333] hover:bg-[#444] text-gray-300 px-2 py-0.5 rounded text-[10px] transition-colors"
                >
                  <Paperclip className="w-3 h-3" /> Select File
                </button>
                {item.file && (
                  <span className="text-green-400 text-[10px] flex items-center gap-1 truncate max-w-[200px]">
                    <FileIcon className="w-3 h-3" /> {item.file.name}
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div className="w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
             {(item.key || item.value || item.file) && (
               <button onClick={() => handleRemove(index)} className="text-gray-500 hover:text-red-400">
                 <Trash2 className="w-3.5 h-3.5" />
               </button>
             )}
          </div>
        </div>
      ))}
    </div>
  );
}
