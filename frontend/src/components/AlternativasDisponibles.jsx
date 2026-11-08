import { useState } from 'react';
import Boton from './ui/Boton.jsx';
import * as calendarioService from '../services/calendarioService.js';
import { formatearFecha, formatearHorario } from '../utils/fechas.js';

// Botón para buscar otras fechas u horarios cuando la consultada no está disponible
export default function AlternativasDisponibles({ consulta, textoElegir = 'Consultar', onElegir }) {
  const [alternativas, setAlternativas] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState('');

  async function buscar() {
    setBuscando(true);
    setError('');
    try {
      setAlternativas(await calendarioService.buscarAlternativas(consulta));
    } catch (e) {
      setError(e.message);
    } finally {
      setBuscando(false);
    }
  }

  if (!alternativas) {
    return (
      <div className="mt-3">
        <Boton variante="secundario" className="w-full" disabled={buscando} onClick={buscar}>
          {buscando ? 'Buscando…' : 'Buscar fechas y horarios disponibles'}
        </Boton>
        {error && <p className="mt-1.5 text-xs text-red-700">{error}</p>}
      </div>
    );
  }

  const grupos = [
    ['Otros horarios el mismo día', alternativas.mismoDia],
    ['El mismo horario en otras fechas', alternativas.otrasFechas]
  ];
  return (
    <div className="mt-3 grid gap-3" data-alternativas>
      {grupos.map(([titulo, lista]) => (
        <div key={titulo}>
          <strong className="text-xs">{titulo}</strong>
          {lista.length ? (
            <ul className="mt-1 grid gap-1">
              {lista.map((alternativa) => (
                <li key={`${alternativa.fecha}-${alternativa.horaInicio}`} className="flex items-center justify-between gap-2 rounded bg-white px-2.5 py-1.5 text-stone-800">
                  <span>{formatearFecha(alternativa.fecha)} · {formatearHorario(alternativa)}</span>
                  <Boton variante="enlace" onClick={() => onElegir(alternativa)}>{textoElegir}</Boton>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs">No se encontraron alternativas.</p>
          )}
        </div>
      ))}
    </div>
  );
}
