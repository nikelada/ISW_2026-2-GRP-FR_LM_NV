import { useCallback, useState } from 'react';
import { useFetch } from '../hooks/useFetch.js';
import * as tipoEventoService from '../services/tipoEventoService.js';
import Boton from './ui/Boton.jsx';
import Campo from './ui/Campo.jsx';

const NUEVO = '__nuevo__';

// Lista de tipos de evento, con opción de agregar uno nuevo
export default function SelectorTipoEvento({ etiqueta, name = 'tipoEvento', value, onChange, error }) {
  const { datos: tipos, recargar } = useFetch(useCallback(() => tipoEventoService.listar(), []));
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [errorNuevo, setErrorNuevo] = useState('');
  const [guardando, setGuardando] = useState(false);
  // Si el tipo actual no está en la lista, igual se muestra
  const opciones = value && !tipos.some((t) => t.nombre === value) ? [...tipos, { id: 'actual', nombre: value }] : tipos;

  function elegir(valor) {
    if (valor === NUEVO) {
      setCreando(true);
      return;
    }
    setCreando(false);
    onChange(valor);
  }

  function cancelar() {
    setCreando(false);
    setNombre('');
    setErrorNuevo('');
  }

  async function crear() {
    setGuardando(true);
    setErrorNuevo('');
    try {
      const tipo = await tipoEventoService.crear(nombre);
      await recargar();
      onChange(tipo.nombre);
      cancelar();
    } catch (e) {
      // Si ya existía, se elige ese
      if (e.data?.tipoExistente) {
        onChange(e.data.tipoExistente.nombre);
        cancelar();
      } else {
        setErrorNuevo(e.data?.errores?.nombre || e.message);
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Campo etiqueta={etiqueta} error={error}>
        <select name={name} value={creando ? NUEVO : value} onChange={(e) => elegir(e.target.value)}>
          <option value="">Selecciona un tipo de evento</option>
          {opciones.map((t) => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
          <option value={NUEVO}>+ Agregar otro tipo…</option>
        </select>
      </Campo>
      {creando && (
        <div className="grid gap-1.5 rounded-md border border-stone-200 bg-stone-50 p-2.5">
          <div className="flex items-start gap-2">
            <input
              type="text"
              aria-label="Nombre del nuevo tipo de evento"
              placeholder="Ej.: Bautizo"
              maxLength={100}
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => {
                // Que Enter no envíe la solicitud
                if (e.key === 'Enter') {
                  e.preventDefault();
                  crear();
                }
              }}
            />
            <Boton variante="secundario" className="h-10 shrink-0" disabled={guardando} onClick={crear}>{guardando ? 'Agregando…' : 'Agregar'}</Boton>
          </div>
          {errorNuevo && <span className="text-xs font-medium text-red-700">{errorNuevo}</span>}
          <Boton variante="enlace" className="justify-self-start" onClick={cancelar}>Cancelar</Boton>
        </div>
      )}
    </div>
  );
}
