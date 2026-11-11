import { useCallback, useEffect, useRef, useState } from 'react';

// Carga los datos al montar y cada vez que cambia fn. Ojo: fn tiene que ir en useCallback,
// si no se vuelve a pedir en cada render.
export function useFetch(fn, inicial = []) {
  const [datos, setDatos] = useState(inicial);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const ultimaPeticion = useRef(0);

  const recargar = useCallback(() => {
    const peticion = ++ultimaPeticion.current;
    setCargando(true);
    setError('');
    return fn()
      .then((resultado) => { if (peticion === ultimaPeticion.current) setDatos(resultado); })
      .catch((e) => { if (peticion === ultimaPeticion.current) setError(e.message); })
      .finally(() => { if (peticion === ultimaPeticion.current) setCargando(false); });
  }, [fn]);

  useEffect(() => { recargar(); }, [recargar]);

  return { datos, cargando, error, recargar };
}
