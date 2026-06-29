export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function fetchCollections() {
  const res = await fetch(`${API_BASE}/collections/`);
  return res.json();
}

export async function fetchHistory() {
  const res = await fetch(`${API_BASE}/proxy/history`);
  return res.json();
}

export async function deleteHistory(id: number) {
  const res = await fetch(`${API_BASE}/proxy/history/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function deleteHistoryByDate(dateStr: string) {
  const res = await fetch(`${API_BASE}/proxy/history/date/${dateStr}`, { method: 'DELETE' });
  return res.json();
}

export async function fetchEnvironments() {
  const res = await fetch(`${API_BASE}/environments/`);
  return res.json();
}
