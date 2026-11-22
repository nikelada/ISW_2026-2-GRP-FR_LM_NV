import { useCallback, useState } from 'react';
import { useFetch } from '../hooks/useFetch.js';
import * as espacioService from '../services/espacioService.js';
import Campo from './ui/Campo.jsx';

const OTRO = '__otro__';

export const textoEspacio = (espacio) => (espacio.ubicacion ? `${espacio.nombre} · ${espacio.ubicacion}` : espacio.nombre);

// Lista de espacios, o un lugar escrito a mano
export default function SelectorLugar({ etiqueta, espacioId, lugar, onChange, error }) {
  const { datos: espacios } = useFetch(useCallback(() => espacioService.listar(), []));
  const [otro, setOtro] = useState(!espacioId && Boolean(lugar));
  // Los fuera de servicio no se ofrecen, salvo que sea el que ya tenía
  let opciones = espacios.filter((e) => e.estado !== 'fuera_servicio' || e.id === Number(espacioId));
  if (espacioId && !opciones.some((e) => e.id === Number(espacioId))) opciones = [...opciones, { id: Number(espacioId), nombre: lugar }];

  function elegir(valor) {
    if (valor === OTRO) {
      setOtro(true);
      onChange({ espacioId: '', lugar: '' });
      return;
    }
    setOtro(false);
    const espacio = opciones.find((e) => String(e.id) === valor);
    onChange({ espacioId: valor, lugar: espacio ? espacio.nombre : '' });
  }

  return (
    <div className="grid gap-2">
      <Campo etiqueta={etiqueta} error={error}>
        <select name="espacioId" value={espacioId ? String(espacioId) : otro ? OTRO : ''} onChange={(e) => elegir(e.target.value)}>
          <option value="">Selecciona un lugar</option>
          {opciones.map((e) => (
            <option key={e.id} value={e.id}>{textoEspacio(e)}{e.estado === 'mantencion' ? ' (en mantención)' : ''}</option>
          ))}
          <option value={OTRO}>Otro lugar (casa del cliente, hotel, etc.)…</option>
        </select>
      </Campo>
      {otro && (
        <input
          type="text"
          name="lugar"
          aria-label="Dirección del otro lugar"
          placeholder="Ej.: casa del cliente, Los Aromos 345, Ñuñoa"
          maxLength={255}
          value={lugar}
          onChange={(e) => onChange({ espacioId: '', lugar: e.target.value })}
        />
      )}
    </div>
  );
}
