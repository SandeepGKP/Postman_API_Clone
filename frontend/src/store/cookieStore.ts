import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Cookie {
  id: string;
  name: string;
  value: string;
  domain: string;
  path: string;
  secure?: boolean;
  httpOnly?: boolean;
}

interface CookieStore {
  cookies: Record<string, Cookie[]>; // Keyed by domain
  
  // Actions
  addDomain: (domain: string) => void;
  deleteDomain: (domain: string) => void;
  addCookie: (domain: string, cookie: Omit<Cookie, 'id'>) => void;
  updateCookie: (domain: string, cookieId: string, updates: Partial<Cookie>) => void;
  deleteCookie: (domain: string, cookieId: string) => void;
  parseAndSaveSetCookie: (domain: string, setCookieHeader: string[]) => void;
}

export const useCookieStore = create<CookieStore>()(
  persist(
    (set, get) => ({
      cookies: {},

      addDomain: (domain) => {
        set((state) => {
          if (state.cookies[domain]) return state;
          return { cookies: { ...state.cookies, [domain]: [] } };
        });
      },

      deleteDomain: (domain) => {
        set((state) => {
          const newCookies = { ...state.cookies };
          delete newCookies[domain];
          return { cookies: newCookies };
        });
      },

      addCookie: (domain, cookie) => {
        const id = crypto.randomUUID();
        set((state) => {
          const domainCookies = state.cookies[domain] || [];
          // Replace if cookie with same name already exists
          const existingIndex = domainCookies.findIndex(c => c.name === cookie.name);
          if (existingIndex >= 0) {
            const updated = [...domainCookies];
            updated[existingIndex] = { ...updated[existingIndex], ...cookie };
            return { cookies: { ...state.cookies, [domain]: updated } };
          }
          return {
            cookies: {
              ...state.cookies,
              [domain]: [...domainCookies, { ...cookie, id }]
            }
          };
        });
      },

      updateCookie: (domain, cookieId, updates) => {
        set((state) => {
          const domainCookies = state.cookies[domain];
          if (!domainCookies) return state;
          
          return {
            cookies: {
              ...state.cookies,
              [domain]: domainCookies.map(c => c.id === cookieId ? { ...c, ...updates } : c)
            }
          };
        });
      },

      deleteCookie: (domain, cookieId) => {
        set((state) => {
          const domainCookies = state.cookies[domain];
          if (!domainCookies) return state;
          return {
            cookies: {
              ...state.cookies,
              [domain]: domainCookies.filter(c => c.id !== cookieId)
            }
          };
        });
      },

      parseAndSaveSetCookie: (domain, setCookieHeaders) => {
        // Example header: "my_token=123; Path=/; Secure; HttpOnly"
        setCookieHeaders.forEach(header => {
          const parts = header.split(';');
          const [nameValuePair] = parts;
          const [name, ...valueParts] = nameValuePair.split('=');
          const value = valueParts.join('=');
          
          let path = '/';
          let secure = false;
          let httpOnly = false;
          let cookieDomain = domain;

          for (let i = 1; i < parts.length; i++) {
            const part = parts[i].trim();
            if (part.toLowerCase().startsWith('path=')) {
              path = part.split('=')[1];
            } else if (part.toLowerCase().startsWith('domain=')) {
              cookieDomain = part.split('=')[1];
            } else if (part.toLowerCase() === 'secure') {
              secure = true;
            } else if (part.toLowerCase() === 'httponly') {
              httpOnly = true;
            }
          }

          // In case the cookie domain is specified, we add it under that domain
          get().addDomain(cookieDomain);

          get().addCookie(cookieDomain, {
            name: name.trim(),
            value: value.trim(),
            domain: cookieDomain,
            path,
            secure,
            httpOnly
          });
        });
      }
    }),
    {
      name: 'postman-clone-cookies',
    }
  )
);
