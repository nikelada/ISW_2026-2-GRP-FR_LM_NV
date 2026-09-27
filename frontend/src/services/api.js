// Único punto del frontend que conoce la dirección del backend.
import { getStoredSession } from '../utils/session.js';

const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getStoredSession()?.token;
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // `data` conserva los detalles del backend (p. ej. errores por campo).
    throw Object.assign(new Error(data.message || 'Ocurrió un error inesperado.'), { status: response.status, data });
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body })
};
