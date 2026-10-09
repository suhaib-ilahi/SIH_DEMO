export type DataMode = 'mock' | 'api';

const rawMode = String(import.meta.env.VITE_DATA_MODE || 'mock').toLowerCase();
const mode: DataMode = rawMode === 'mock' || rawMode === 'api'
  ? rawMode
  : (() => { throw new Error(`Invalid VITE_DATA_MODE "${rawMode}". Use "mock" or "api".`); })();

const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim();
if (mode === 'api' && !/^https?:\/\/[^/]+/i.test(apiBaseUrl)) {
  throw new Error('VITE_API_BASE_URL must be an absolute HTTP(S) URL when VITE_DATA_MODE=api.');
}

export const env = Object.freeze({ dataMode: mode, apiBaseUrl: apiBaseUrl.replace(/\/+$/, '') });
