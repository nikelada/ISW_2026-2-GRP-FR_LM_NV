const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 7 u 8 dígitos, guion y un dígito o K
const RUT_REGEX = /^\d{7,8}-[\dK]$/;
// Solo dígitos, espacios, +, - y paréntesis
const TELEFONO_REGEX = /^[\d\s+()-]+$/;

// Deja el RUT como 12345678-5 (sin puntos y con K mayúscula)
function normalizarRut(texto) {
  const limpio = String(texto || '').replace(/[.\s-]/g, '').toUpperCase();
  return limpio.length > 1 ? `${limpio.slice(0, -1)}-${limpio.slice(-1)}` : limpio;
}

// Dígito verificador con módulo 11
function digitoVerificador(numero) {
  let suma = 0;
  let factor = 2;
  for (const digito of [...numero].reverse()) {
    suma += Number(digito) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resultado = 11 - (suma % 11);
  if (resultado === 11) return '0';
  if (resultado === 10) return 'K';
  return String(resultado);
}

// RUT, nombre, teléfono y correo son obligatorios. Deja el body limpio para el controlador
export function validarCliente(req, res, next) {
  const rut = normalizarRut(req.body.rut);
  const nombre = String(req.body.nombre || '').trim();
  const telefono = String(req.body.telefono || '').trim();
  const correo = String(req.body.correo || '').trim().toLowerCase();

  const errores = {};
  if (!rut) errores.rut = 'El RUT es obligatorio.';
  else if (!RUT_REGEX.test(rut)) errores.rut = 'El RUT no tiene un formato válido.';
  else if (digitoVerificador(rut.slice(0, -2)) !== rut.slice(-1)) errores.rut = 'El RUT no es válido: el dígito verificador no corresponde.';
  if (!nombre) errores.nombre = 'El nombre es obligatorio.';
  else if (nombre.length < 2) errores.nombre = 'El nombre debe tener al menos 2 caracteres.';
  else if (nombre.length > 150) errores.nombre = 'El nombre no puede superar 150 caracteres.';
  else if (!/\p{L}/u.test(nombre)) errores.nombre = 'El nombre debe incluir letras.';
  if (!telefono) errores.telefono = 'El teléfono es obligatorio.';
  else if (telefono.length > 30) errores.telefono = 'El teléfono no puede superar 30 caracteres.';
  else if (!TELEFONO_REGEX.test(telefono)) errores.telefono = 'El teléfono solo puede tener números, espacios, +, - y paréntesis.';
  else if (!/^\d{8,15}$/.test(telefono.replace(/\D/g, ''))) errores.telefono = 'El teléfono debe tener entre 8 y 15 dígitos.';
  if (!correo) errores.correo = 'El correo es obligatorio.';
  else if (!EMAIL_REGEX.test(correo) || correo.length > 255) errores.correo = 'El correo no tiene un formato válido.';

  if (Object.keys(errores).length) {
    return res.status(400).json({ message: 'Faltan datos obligatorios del cliente o no son válidos.', errores });
  }
  req.body = { rut, nombre, telefono, correo };
  next();
}
