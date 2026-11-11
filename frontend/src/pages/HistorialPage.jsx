import { useCallback, useEffect, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import EncabezadoPagina from '../components/EncabezadoPagina.jsx';
import EstadoBadge from '../components/EstadoBadge.jsx';
import EstadoCambio from '../components/EstadoCambio.jsx';
import Antetitulo from '../components/ui/Antetitulo.jsx';
import Aviso from '../components/ui/Aviso.jsx';
import Badge from '../components/ui/Badge.jsx';
import ListaDatos from '../components/ui/ListaDatos.jsx';
import Panel from '../components/ui/Panel.jsx';
import Vacio from '../components/ui/Vacio.jsx';
import { useFetch } from '../hooks/useFetch.js';
import * as clienteService from '../services/clienteService.js';
import { etiquetaCampo, formatearValor } from '../utils/camposEvento.js';
import { formatearFecha, formatearHorario } from '../utils/fechas.js';
import { esProduccion } from '../utils/roles.js';

const fechaHora = (valor) => new Date(valor).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' });

// Resultados que entrega el módulo de cotizaciones
const RESULTADOS_COTIZACION = {
  aprobada: { texto: 'Cotización aprobada', color: 'verde' },
  rechazada: { texto: 'Rechazada por el cliente', color: 'rojo' },
  sin_respuesta: { texto: 'Sin respuesta del cliente', color: 'amarillo' }
};

function ResultadoCotizacion({ cotizacion }) {
  if (!cotizacion) return <span className="text-xs text-stone-500">Sin cotización</span>;
  const { texto, color } = RESULTADOS_COTIZACION[cotizacion.estado] || { texto: cotizacion.estado, color: 'azul' };
  return <Badge color={color} data-cotizacion={cotizacion.estado}>{texto}</Badge>;
}

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

const columnaCotizacion = { campo: 'cotizacion', titulo: 'Cotización', render: (r) => <ResultadoCotizacion cotizacion={r.cotizacion} /> };

// Historial de un cliente: sus solicitudes, eventos y cambios
export default function HistorialPage({ user, params }) {
  const puedeConsultar = esProduccion(user);
  const [busqueda, setBusqueda] = useState('');
  const [q, setQ] = useState('');
  const { datos: encontrados } = useFetch(useCallback(() => (puedeConsultar && q ? clienteService.listar(q) : Promise.resolve([])), [puedeConsultar, q]));
  const [clienteId, setClienteId] = useState(params.get('cliente') || '');
  const { datos: historial, cargando, error } = useFetch(
    useCallback(() => (clienteId ? clienteService.historial(clienteId) : Promise.resolve(null)), [clienteId]),
    null
  );
  const [seleccionadoId, setSeleccionadoId] = useState(null);
  const [filtro, setFiltro] = useState('');
  const registros = historial?.registros || [];
  const visibles = filtro ? registros.filter((r) => r.estado === filtro) : registros;
  const seleccionado = registros.find((r) => r.id === seleccionadoId) || null;
  const eventos = registros.filter(esEvento).length;
  const cambios = registros.reduce((total, r) => total + r.cambios.length, 0);
  // Lo de cotizaciones solo se muestra cuando ese módulo entregue resultados
  const hayCotizaciones = registros.some((r) => r.cotizacion);
  const sinConcretar = registros.filter((r) => ['rechazada', 'sin_respuesta'].includes(r.cotizacion?.estado)).length;
  const columnasVisibles = hayCotizaciones ? [...columnas.slice(0, -1), columnaCotizacion, columnas.at(-1)] : columnas;

  // Igual que en Clientes: espera a que se deje de escribir antes de buscar
  useEffect(() => {
    const timer = setTimeout(() => setQ(busqueda.trim()), 250);
    return () => clearTimeout(timer);
  }, [busqueda]);

  function elegirCliente(cliente) {
    setClienteId(String(cliente.id));
    setSeleccionadoId(null);
    setBusqueda('');
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
            <input type="search" placeholder="Buscar cliente por RUT, nombre, correo o teléfono" aria-label="Buscar cliente" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            <select className="w-auto" aria-label="Filtrar por estado" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendientes de información</option>
              <option value="registrada">Registradas</option>
              <option value="confirmado">Eventos confirmados</option>
            </select>
          </div>
          {busqueda.trim() && q && (
            <ul className="border-b border-stone-200 py-1 text-sm" aria-label="Clientes encontrados">
              {encontrados.length ? encontrados.map((c) => (
                <li key={c.id}>
                  <button type="button" className="w-full px-3.5 py-2 text-left hover:bg-stone-50" onClick={() => elegirCliente(c)}>
                    <strong>{c.nombre}</strong> <span className="text-stone-500">{c.rut || 'Sin RUT'} · {c.correo}</span>
                  </button>
                </li>
              )) : <li className="px-3.5 py-2 text-stone-500">No hay clientes que coincidan con la búsqueda.</li>}
            </ul>
          )}
          {historial && (
            <p className="border-b border-stone-200 px-3.5 py-2.5 text-sm text-stone-600" data-resumen>
              <strong className="text-stone-900">{historial.cliente.nombre}</strong>{historial.cliente.rut ? ` (${historial.cliente.rut})` : ''} · Solicitudes: <strong>{registros.length - eventos}</strong> · Eventos: <strong>{eventos}</strong> · Cambios solicitados: <strong>{cambios}</strong>
              {hayCotizaciones && <> · Rechazadas o sin respuesta: <strong>{sinConcretar}</strong></>}
            </p>
          )}
          {error && <Aviso tipo="error" className="m-3.5">{error}</Aviso>}
          {!clienteId ? (
            <Vacio>Busca un cliente para ver su historial.</Vacio>
          ) : cargando && !historial ? (
            <Vacio>Cargando…</Vacio>
          ) : (
            <DataTable columnas={columnasVisibles} datos={visibles} vacio={filtro ? 'No hay registros con este estado.' : 'Este cliente no tiene solicitudes registradas.'} seleccionadoId={seleccionadoId} onSeleccionar={(r) => setSeleccionadoId(r.id)} />
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
      {r.cotizacion && (
        <section className="mb-4 border-t border-stone-200 pt-4 text-sm" aria-label="Resultado de la cotización">
          <div className="flex items-center justify-between gap-3">
            <span className="text-stone-500">Resultado de la cotización</span>
            <ResultadoCotizacion cotizacion={r.cotizacion} />
          </div>
          {r.cotizacion.detalle && <p className="mt-1.5">{r.cotizacion.detalle}</p>}
        </section>
      )}
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
