import { api } from './api.js';

export const login = (credentials) => api.post('/auth/login', credentials);
export const register = (data) => api.post('/auth/register', data);
export const getCurrentUser = () => api.get('/auth/me');
