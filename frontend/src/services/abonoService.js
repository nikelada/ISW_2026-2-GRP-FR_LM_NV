import { api } from './api.js';

// Cotizaciones aceptadas por el cliente, con sus abonos, abono actual, mínimo y saldo pendiente
export const listar = () => api.get('/abonos');

// RF-08: { cotizacionId, monto, fecha: 'AAAA-MM-DD' }; responde la cotización y si el evento quedó confirmado
export const registrar = (datos) => api.post('/abonos', datos);
