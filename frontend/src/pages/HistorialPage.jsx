import { useCallback, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import EncabezadoPagina from '../components/EncabezadoPagina.jsx';
import EstadoBadge from '../components/EstadoBadge.jsx';
import EstadoCambio from '../components/EstadoCambio.jsx';
import Antetitulo from '../components/ui/Antetitulo.jsx';
import Aviso from '../components/ui/Aviso.jsx';
import ListaDatos from '../components/ui/ListaDatos.jsx';
import Panel from '../components/ui/Panel.jsx';
import Vacio from '../components/ui/Vacio.jsx';
import { useFetch } from '../hooks/useFetch.js';
import * as clienteService from '../services/clienteService.js';
import { etiquetaCampo, formatearValor } from '../utils/camposEvento.js';
import { formatearFecha, formatearHorario } from '../utils/fechas.js';
import { esProduccion } from '../utils/roles.js';

const fechaHora = (valor) => new Date(valor).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' });

const esEvento = (registro) => registro.estado === 'confirmado';

const columnas = [
  { campo: 'id', titulo: 'N°', className: 'text-stone-500', render: (r) => `#${r.id}` },
  {
    campo: 'tipo',
    titulo: 'Registro',
    render: (r) => (
      <>
        <strong>{esEvento(r) ? 'Evento' : 'Solicitud'}</strong>
        <small className="block text-stone-500">{r.tipoEvento || 'Sin tipo de evento'}</small>
      </>
    )
  },
  {
    campo: 'fecha',
    titulo: 'Fecha',
    className: 'whitespace-nowrap',
    render: (r) => (r.fecha ? <>{formatearFecha(r.fecha)}<small className="block text-stone-500">{formatearHorario(r)}</small></> : '—')
  },
  { campo: 'estado', titulo: 'Estado', render: (r) => <EstadoBadge estado={r.estado} fechaHabilitada={r.fechaHabilitada} /> },
  { campo: 'cambios', titulo: 'Cambios', render: (r) => (r.cambios.length ? r.cambios.length : '—') }
];

// Historial de un cliente: sus solicitudes, eventos y cambios
export default function HistorialPage({ user, params }) {
  const puedeConsultar = esProduccion(user);
  const { datos: clientes } = useFetch(useCallback(() => (puedeConsultar ? clienteService.listar() : Promise.resolve([])), [puedeConsultar]));
  const [clienteId, setClienteId] = useState(params.get('cliente') || '');
  const { datos: historial, cargando, error } = useFetch(
    useCallback(() => (clienteId ? clienteService.historial(clienteId) : Promise.resolve(null)), [clienteId]),
    null
  );
  const [seleccionadoId, setSeleccionadoId] = useState(null);
  const registros = historial?.registros || [];
  const seleccionado = registros.find((r) => r.id === seleccionadoId) || null;

  function elegirCliente(id) {
    setClienteId(id);
    setSeleccionadoId(null);
  }

  if (!puedeConsultar) {
    return (
      <>
        <EncabezadoPagina antetitulo="Clientes" titulo="Historial de clientes" descripcion="Solicitudes y eventos anteriores de cada cliente." />
        <Aviso tipo="warning"><p>El historial de clientes lo consulta Producción y Comercial.</p></Aviso>
      </>
    );
  }

  return (
    <>
      <EncabezadoPagina antetitulo="Clientes" titulo="Historial de clientes" descripcion="Solicitudes y eventos de un cliente, su estado y los cambios registrados durante su gestión." />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Panel>
          <div className="flex gap-2.5 border-b border-stone-200 p-3.5">
            <select aria-label="Cliente" value={clienteId} onChange={(e) => elegirCliente(e.target.value)}>
              <option value="">Selecciona un cliente registrado</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.correo}</option>)}
            </select>
          </div>
          {error && <Aviso tipo="error" className="m-3.5">{error}</Aviso>}
          {!clienteId ? (
            <Vacio>Selecciona un cliente para ver su historial.</Vacio>
          ) : cargando && !historial ? (
            <Vacio>Cargando…</Vacio>
          ) : (
            <DataTable columnas={columnas} datos={registros} vacio="Este cliente no tiene solicitudes registradas." seleccionadoId={seleccionadoId} onSeleccionar={(r) => setSeleccionadoId(r.id)} />
          )}
        </Panel>
        <Panel lateral>
          {seleccionado ? (
            <DetalleRegistro key={seleccionado.id} registro={seleccionado} />
          ) : (
            <>
              <Antetitulo>Detalle</Antetitulo>
              <Vacio>Selecciona un registro para ver su información en detalle.</Vacio>
            </>
          )}
        </Panel>
      </div>
    </>
  );
}

function DetalleRegistro({ registro: r }) {
  return (
    <>
      <Antetitulo className="mb-2">{esEvento(r) ? 'Evento' : 'Solicitud'} #{r.id}</Antetitulo>
      <h2 className="mb-2 text-xl font-bold">{r.tipoEvento || 'Sin tipo de evento'}</h2>
      <div className="mb-3"><EstadoBadge estado={r.estado} fechaHabilitada={r.fechaHabilitada} /></div>
      {r.faltantes.length > 0 && !esEvento(r) && (
        <Aviso tipo="warning" titulo="Información pendiente">
          <ul>{r.faltantes.map((f) => <li key={f}>{f}</li>)}</ul>
        </Aviso>
      )}
      <ListaDatos datos={[
        ['Fecha', r.fecha ? formatearFecha(r.fecha) : '—'],
        ['Horario', formatearHorario(r) || '—'],
        ['Cantidad de personas', r.cantidadPersonas ?? '—'],
        ['Lugar', r.lugar || '—'],
        ['Requerimientos técnicos', r.requerimientosTecnicos || '—'],
        ['Servicios adicionales', r.servicios.length ? r.servicios.map((s) => s.nombre).join('\n') : '—'],
        ['Registrada', fechaHora(r.createdAt)]
      ]} />
      <section className="border-t border-stone-200 pt-4" aria-label="Cambios solicitados">
        <Antetitulo className="mb-2.5">Cambios solicitados</Antetitulo>
        {r.cambios.length ? (
          <ul className="grid gap-3 text-sm">
            {r.cambios.map((c) => (
              <li key={c.id} className="rounded-md border border-stone-200 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <a className="font-semibold text-teal-700 hover:underline" href={`#/cambios?id=${c.id}`}>Cambio #{c.id}</a>
                  <span><EstadoCambio cambio={c} /></span>
                </div>
                <ul className="mb-1">
                  {Object.entries(c.cambios).map(([campo, valor]) => (
                    <li key={campo}>{etiquetaCampo(campo)}: <strong>{formatearValor(campo, valor)}</strong></li>
                  ))}
                </ul>
                <p className="text-stone-600">Motivo: {c.motivo}</p>
                <small className="block text-stone-500">
                  Registrado por {c.registradoPor} · {fechaHora(c.createdAt)}
                  {c.revisadoPor ? ` · ${c.estado === 'aprobado' ? 'aprobado' : 'rechazado'} por ${c.revisadoPor}` : ' · pendiente de revisión de Gerencia'}
                </small>
              </li>
            ))}
          </ul>
        ) : <p className="text-xs text-stone-500">Sin cambios solicitados.</p>}
      </section>

      <section className="mt-5 border-t border-stone-200 pt-4" aria-label="Modificaciones aplicadas">
        <Antetitulo className="mb-2.5">Modificaciones aplicadas</Antetitulo>
        {r.historial.length ? (
          <ul className="grid gap-2 text-sm">
            {r.historial.map((h) => (
              <li key={h.id}>
                <strong>{etiquetaCampo(h.campo)}</strong>: {formatearValor(h.campo, h.valorAnterior)} → {formatearValor(h.campo, h.valorNuevo)}
                <small className="block text-stone-500">{fechaHora(h.createdAt)} · aplicado por {h.usuario} (cambio #{h.cambioId})</small>
              </li>
            ))}
          </ul>
        ) : <p className="text-xs text-stone-500">Sin modificaciones aplicadas.</p>}
      </section>

      <a className="mt-5 inline-block text-sm font-semibold text-teal-700 hover:underline" href={`#/solicitudes?id=${r.id}`}>Abrir en Solicitudes →</a>
    </>
  );
}
