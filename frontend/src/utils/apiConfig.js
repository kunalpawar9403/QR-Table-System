import { isNativeAppEnvironment } from '../pages/MobileAppEntry';

const SERVER_URL_STORAGE_KEY = 'tablemint_server_api_url';

export function getApiBaseUrl() {
  if (typeof window === 'undefined') return '';

  // 1. Explicit user override stored in localStorage
  const stored = localStorage.getItem(SERVER_URL_STORAGE_KEY);
  if (stored && stored.trim()) {
    return stored.trim().replace(/\/+$/, '');
  }

  // 2. Vite environment variable
  if (import.meta.env?.VITE_API_URL) {
    return String(import.meta.env.VITE_API_URL).trim().replace(/\/+$/, '');
  }

  // 3. In normal web browser, use relative paths
  if (!isNativeAppEnvironment()) {
    return '';
  }

  // 4. In Android APK:
  // Default to Live Render Production Cloud Server
  return 'https://qr-table-system.onrender.com';
}

export function setApiBaseUrl(url) {
  if (url && url.trim()) {
    localStorage.setItem(SERVER_URL_STORAGE_KEY, url.trim().replace(/\/+$/, ''));
  } else {
    localStorage.removeItem(SERVER_URL_STORAGE_KEY);
  }
}

export function formatApiUrl(endpoint) {
  if (!endpoint) return '';
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (!base) return cleanEndpoint;
  return `${base}${cleanEndpoint}`;
}

export function getCustomerWebBaseUrl() {
  if (typeof window === 'undefined') return 'https://qr-table-system.onrender.com';
  const origin = window.location.origin;
  if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.startsWith('file:') || origin.startsWith('capacitor:')) {
    const apiBase = getApiBaseUrl();
    if (apiBase && !apiBase.includes('localhost') && !apiBase.includes('127.0.0.1')) {
      return apiBase;
    }
    return 'https://qr-table-system.onrender.com';
  }
  return origin;
}


