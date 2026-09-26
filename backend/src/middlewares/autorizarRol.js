// Relación entre los roles del login y las áreas de la empresa:
// usuario = Producción y Comercial, manager = Gerencia, admin = acceso completo.
export const ROLES_PRODUCCION = ['usuario', 'admin'];
export const ROLES_GERENCIA = ['manager', 'admin'];

// Se usa después de requireAuth: decide si el rol del usuario puede continuar.
export function autorizarRol(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Tu rol no tiene permiso para realizar esta acción.' });
    }
    next();
  };
}
