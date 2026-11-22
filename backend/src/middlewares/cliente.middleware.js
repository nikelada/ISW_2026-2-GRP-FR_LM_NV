// nombre@dominio.cl
const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;
// 7 u 8 dígitos, guion y un dígito o K
const RUT_REGEX = /^\d{7,8}-[\dK]$/;
// Solo dígitos, espacios, +, - y paréntesis
const TELEFONO_REGEX = /^[\d\s+()-]+$/;
// Número chileno de 9 dígitos, con o sin 56 adelante
const TELEFONO_CHILE_REGEX = /^(56)?([2-9]\d{8})$/;

// Sin puntos seguidos ni en los bordes
function correoValido(correo) {
  if (!EMAIL_REGEX.test(correo) || correo.length > 255) return false;
  const [usuario, dominio] = correo.split('@');
  if (usuario.startsWith('.') || usuario.endsWith('.') || correo.includes('..')) return false;
  return dominio.split('.').every((parte) => !parte.startsWith('-') && !parte.endsWith('-'));
}

// Deja el teléfono como +56 9 1234 5678
function normalizarTelefono(telefono) {
  const numero = telefono.replace(/\D/g, '').match(TELEFONO_CHILE_REGEX)[2];
  if (numero[0] === '9' || numero[0] === '2') return `+56 ${numero[0]} ${numero.slice(1, 5)} ${numero.slice(5)}`;
  return `+56 ${numero.slice(0, 2)} ${numero.slice(2, 5)} ${numero.slice(5)}`;
}

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
  let telefono = String(req.body.telefono || '').trim();
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
  else if ((telefono.match(/\+/g) || []).length > (telefono.startsWith('+') ? 1 : 0)) errores.telefono = 'El signo + solo puede ir al inicio.';
  else if (!TELEFONO_CHILE_REGEX.test(telefono.replace(/\D/g, ''))) {
    errores.telefono = 'Ingresa un número chileno de 9 dígitos, con o sin +56 (ej.: +56 9 1234 5678).';
  } else telefono = normalizarTelefono(telefono);
  if (!correo) errores.correo = 'El correo es obligatorio.';
  else if (!correoValido(correo)) errores.correo = 'El correo no tiene un formato válido (ej.: nombre@empresa.cl).';

  if (Object.keys(errores).length) {
    return res.status(400).json({ message: 'Faltan datos obligatorios del cliente o no son válidos.', errores });
  }
  req.body = { rut, nombre, telefono, correo };
  next();
}
