// Siguiente código del año: SOL-2026-0001, SOL-2026-0002...
export async function siguienteCodigo(modelo, prefijo) {
  const inicio = `${prefijo}-${new Date().getFullYear()}-`;
  const ultimo = await modelo.findFirst({
    where: { codigo: { startsWith: inicio } },
    orderBy: { codigo: 'desc' },
    select: { codigo: true }
  });
  const numero = ultimo ? Number(ultimo.codigo.slice(inicio.length)) + 1 : 1;
  return inicio + String(numero).padStart(4, '0');
}

// Si dos se crean al mismo tiempo, espera un poco y reintenta con el siguiente
export async function crearConCodigo(modelo, prefijo, { data, ...opciones }) {
  for (let intento = 1; ; intento++) {
    try {
      return await modelo.create({ ...opciones, data: { ...data, codigo: await siguienteCodigo(modelo, prefijo) } });
    } catch (error) {
      if (error.code !== 'P2002' || intento === 10) throw error;
      await new Promise((resolver) => setTimeout(resolver, Math.random() * 50));
    }
  }
}
