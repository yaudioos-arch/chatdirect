const normalizeUrl = (value) => {
  if (!value) return '';
  return value.replace(/\/$/, '');
};

export const API_BASE = normalizeUrl(import.meta.env.VITE_API_URL || '');
export const SOCKET_BASE = normalizeUrl(import.meta.env.VITE_SOCKET_URL || API_BASE || window.location.origin);

export const apiUrl = (path = '') => {
  const safePath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${safePath}`;
};

export const socketUrl = () => SOCKET_BASE;
