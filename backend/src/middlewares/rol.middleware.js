// Roles del login y su área: usuario = Producción y Comercial, manager = Gerencia, admin = todo
export const ROLES_PRODUCCION = ['usuario', 'admin'];
export const ROLES_GERENCIA = ['manager', 'admin'];
export const ROLES_ADMIN = ['admin'];

// Va después de requireAuth y deja pasar solo a los roles indicados
export function autorizarRol(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Tu rol no tiene permiso para realizar esta acción.' });
    }
    next();
  };
}
