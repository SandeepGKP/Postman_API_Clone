import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
}

export interface FormDataKeyValuePair extends KeyValuePair {
  type: 'text' | 'file';
  file?: File;
}

export interface RequestTab {
  id: string; 
  name: string;
  method: string;
  url: string;
  protocol?: 'http' | 'ws' | 'grpc';
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  bodyType: 'none' | 'raw' | 'form-data' | 'urlencoded' | 'graphql';
  rawType?: 'Auto' | 'JSON' | 'Text' | 'HTML' | 'XML' | 'JavaScript';
  body: string;
  formData: FormDataKeyValuePair[];
  urlencoded: KeyValuePair[];
  graphqlQuery?: string;
  graphqlVariables?: string;
  authType: 'none' | 'bearer' | 'basic';
  authCredentials: Record<string, string>;
  preRequestScript?: string;
  testScript?: string;
  isDirty?: boolean;
  savedRequestId?: number;
  collectionId?: number;
}

interface WorkspaceState {
  activeSidebarTab: 'collections' | 'history' | 'mocks' | 'monitors';
  setActiveSidebarTab: (tab: 'collections' | 'history' | 'mocks' | 'monitors') => void;
  
  openTabs: RequestTab[];
  activeTabId: string | null;
  
  addTab: (tab: RequestTab) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<RequestTab>) => void;
  
  triggerSendCount: number;
  triggerSend: () => void;
  
  environments: any[];
  setEnvironments: (envs: any[]) => void;
  
  selectedEnvironmentId: string | null;
  setSelectedEnvironmentId: (id: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeSidebarTab: 'collections',
      setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),
      
      openTabs: [],
      activeTabId: null,
      
      addTab: (tab) => set((state) => {
        const exists = state.openTabs.find(t => t.id === tab.id);
        if (exists) {
          return { activeTabId: tab.id };
        }
        return {
          openTabs: [...state.openTabs, tab],
          activeTabId: tab.id,
        };
      }),
      
      closeTab: (tabId) => set((state) => {
        const newTabs = state.openTabs.filter(t => t.id !== tabId);
        let newActiveId = state.activeTabId;
        
        if (state.activeTabId === tabId) {
          newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
        }
        
        return {
          openTabs: newTabs,
          activeTabId: newActiveId,
        };
      }),
      
      setActiveTab: (tabId) => set({ activeTabId: tabId }),
      
      updateTab: (tabId, updates) => set((state) => ({
        openTabs: state.openTabs.map(t => t.id === tabId ? { ...t, ...updates, isDirty: true } : t)
      })),
      
      triggerSendCount: 0,
      triggerSend: () => set((state) => ({ triggerSendCount: state.triggerSendCount + 1 })),
      
      environments: [],
      setEnvironments: (envs) => set({ environments: envs }),
      
      selectedEnvironmentId: null,
      setSelectedEnvironmentId: (id) => set({ selectedEnvironmentId: id }),
    }),
    {
      name: 'postman-clone-storage',
      partialize: (state) => ({
        openTabs: state.openTabs.map(tab => ({
          ...tab,
          formData: tab.formData.map(fd => ({ ...fd, file: undefined }))
        })),
        activeTabId: state.activeTabId,
        selectedEnvironmentId: state.selectedEnvironmentId
      })
    }
  )
);

export const createNewTab = (protocol: 'http' | 'ws' | 'grpc' = 'http'): RequestTab => ({
  id: `tab_${Date.now()}`,
  name: protocol === 'ws' ? 'New WebSocket Request' : protocol === 'grpc' ? 'New gRPC Request' : 'Untitled Request',
  method: protocol === 'ws' ? 'WS' : protocol === 'grpc' ? 'GRPC' : 'GET',
  url: '',
  protocol: protocol,
  headers: [],
  queryParams: [],
  bodyType: 'none',
  body: '',
  formData: [],
  urlencoded: [],
  graphqlQuery: '',
  graphqlVariables: '',
  authType: 'none',
  authCredentials: {},
  preRequestScript: '',
  testScript: ''
});
