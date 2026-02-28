const BASE = '/api';

function getToken() {
  return localStorage.getItem('token') || '';
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error: string }).error || res.statusText);
  }
  // Handle no-content responses
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ token: string; is_admin: boolean }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  register: (username: string, password: string, folder = '') =>
    request<{ token: string; is_admin: boolean }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, folder }),
    }),
  me: () => request<{ id: number; username: string; folder: string; is_admin: number; created_at: string }>('/auth/me'),

  // Settings
  getSettings: () => request<Record<string, string>>('/settings'),
  updateSettings: (data: Record<string, string>) =>
    request<{ ok: boolean }>('/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Downloads
  getDownloads: () => request<Download[]>('/downloads'),
  createDownload: (url: string) =>
    request<Download>('/downloads', { method: 'POST', body: JSON.stringify({ url }) }),
  deleteDownload: (id: number) =>
    request<{ ok: boolean }>(`/downloads/${id}`, { method: 'DELETE' }),

  // Transcripts
  getTranscripts: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<Transcript[]>(`/transcripts${qs}`);
  },
  getTranscript: (id: number) => request<Transcript>(`/transcripts/${id}`),
  createTranscript: (data: Partial<Transcript>) =>
    request<{ id: number }>('/transcripts', { method: 'POST', body: JSON.stringify(data) }),
  updateTranscript: (id: number, data: Partial<Transcript>) =>
    request<{ ok: boolean }>(`/transcripts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTranscript: (id: number) =>
    request<{ ok: boolean }>(`/transcripts/${id}`, { method: 'DELETE' }),
  transcribeVideo: (id: number) =>
    request<{ ok: boolean; transcript_text: string; summary: string; key_topics: string[] }>(`/transcripts/${id}/transcribe`, { method: 'POST' }),
  exportTranscript: (id: number, format: 'md' | 'srt') =>
    `${BASE}/transcripts/${id}/export?format=${format}`,

  // Search
  search: (params: Record<string, string>) => {
    const qs = '?' + new URLSearchParams(params).toString();
    return request<SearchResult[]>(`/search${qs}`);
  },

  // Users
  getUsers: () => request<User[]>('/users'),
  deleteUser: (id: number) => request<{ ok: boolean }>(`/users/${id}`, { method: 'DELETE' }),
  changePassword: (id: number, password: string) =>
    request<{ ok: boolean }>(`/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ password }) }),
  changeFolder: (id: number, folder: string) =>
    request<{ ok: boolean }>(`/users/${id}/folder`, { method: 'PUT', body: JSON.stringify({ folder }) }),
};

export interface Download {
  id: number;
  user_id: number;
  username?: string;
  url: string;
  status: 'pending' | 'running' | 'done' | 'error' | 'cancelled';
  progress: number;
  error?: string;
  created_at: string;
}

export interface Transcript {
  id: number;
  user_id: number;
  post_id?: string;
  post_title: string;
  creator: string;
  video_path: string;
  transcript_text: string;
  srt_content: string;
  language: string;
  duration_seconds: number;
  summary: string;
  key_topics: string;
  created_at: string;
}

export interface SearchResult extends Omit<Transcript, 'transcript_text' | 'srt_content' | 'video_path'> {
  snippet?: string;
}

export interface User {
  id: number;
  username: string;
  folder: string;
  is_admin: number;
  created_at: string;
}
