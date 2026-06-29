import React from 'react';
import { KeyValuePair } from '@/store/workspaceStore';
import { Trash2, Info } from 'lucide-react';

interface KeyValueEditorProps {
  items: KeyValuePair[];
  onChange: (items: KeyValuePair[]) => void;
  suggestions?: string[];
  valueSuggestions?: string[];
  autoItems?: KeyValuePair[];
  showAutoItems?: boolean;
  onAutoItemToggle?: (index: number, enabled: boolean) => void;
}

export default function KeyValueEditor({ items, onChange, suggestions, valueSuggestions, autoItems, showAutoItems, onAutoItemToggle }: KeyValueEditorProps) {
  const handleItemChange = (index: number, field: keyof KeyValuePair, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (index === items.length - 1 && field !== 'enabled' && value !== '') {
      newItems.push({ key: '', value: '', enabled: false });
      newItems[index].enabled = true;
    }
    
    onChange(newItems);
  };

  const handleRemove = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    if (newItems.length === 0) {
      newItems.push({ key: '', value: '', enabled: false });
    }
    onChange(newItems);
  };

  const displayItems = items.length > 0 ? items : [{ key: '', value: '', enabled: false }];

  return (
    <div className="w-full text-xs border border-[#333333] rounded overflow-hidden">
      <div className="flex border-b border-[#333333] bg-[#2A2A2A] text-gray-400 font-medium">
        <div className="w-8 border-r border-[#333333]"></div>
        <div className="flex-1 px-2 py-1.5 border-r border-[#333333]">Key</div>
        <div className="flex-1 px-2 py-1.5 border-r border-[#333333]">Value</div>
        <div className="w-8"></div>
      </div>
      
      {showAutoItems && autoItems && autoItems.map((item, index) => (
        <div key={`auto-${index}`} className={`flex border-b border-[#333333] hover:bg-[#2A2A2A] transition-colors group bg-[#222] ${!item.enabled ? 'opacity-50' : ''}`}>
          <div className="w-8 flex items-center justify-center border-r border-[#333333]">
            <input 
              type="checkbox" 
              checked={item.enabled || false}
              onChange={(e) => onAutoItemToggle && onAutoItemToggle(index, e.target.checked)}
              className="accent-orange-500 cursor-pointer"
            />
          </div>
          <div className="flex-1 border-r border-[#333333] px-2 py-1.5 flex items-center justify-between">
            <span className={`text-gray-300 font-mono ${!item.enabled ? 'line-through text-gray-500' : ''}`}>{item.key}</span>
            <Info className="w-3.5 h-3.5 text-gray-500" />
          </div>
          <div className="flex-1 border-r border-[#333333] px-2 py-1.5 flex items-center">
            <span className={`text-gray-400 font-mono ${!item.enabled ? 'line-through text-gray-500' : ''}`}>{item.value}</span>
          </div>
          <div className="w-8"></div>
        </div>
      ))}

      {displayItems.map((item, index) => (
        <div key={index} className="flex border-b border-[#333333] last:border-b-0 hover:bg-[#2A2A2A] transition-colors group">
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
              list={suggestions ? "key-suggestions" : undefined}
            />
          </div>
          <div className="flex-1 border-r border-[#333333]">
            <input 
              type="text" 
              placeholder="Value"
              value={item.value || ''}
              onChange={(e) => handleItemChange(index, 'value', e.target.value)}
              className="w-full bg-transparent px-2 py-1.5 outline-none text-gray-200 placeholder-gray-600 font-mono"
              list={valueSuggestions ? "value-suggestions" : undefined}
            />
          </div>
          <div className="w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
             {(item.key || item.value) && (
               <button onClick={() => handleRemove(index)} className="text-gray-500 hover:text-red-400">
                 <Trash2 className="w-3.5 h-3.5" />
               </button>
             )}
          </div>
        </div>
      ))}

      {suggestions && (
        <datalist id="key-suggestions">
          {suggestions.map((s, i) => <option key={i} value={s} />)}
        </datalist>
      )}

      {valueSuggestions && (
        <datalist id="value-suggestions">
          {valueSuggestions.map((s, i) => <option key={`val-${i}`} value={s} />)}
        </datalist>
      )}
    </div>
  );
}
