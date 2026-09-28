// Misma relación que backend/src/middlewares/rol.middleware.js.
const ROLES_PRODUCCION = ['usuario', 'admin'];

const AREA_POR_ROL = { usuario: 'Producción y Comercial', manager: 'Gerencia', admin: 'Administración' };

export function esProduccion(user) {
  return ROLES_PRODUCCION.includes(user?.role);
}

export function esOperaciones(user) {
  return ROLES_PRODUCCION.includes(user?.role);
}

export function areaDelRol(role) {
  return AREA_POR_ROL[role] || role;
}
