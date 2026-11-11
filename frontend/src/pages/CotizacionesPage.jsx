import { useCallback, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import EncabezadoPagina from '../components/EncabezadoPagina.jsx';
import Antetitulo from '../components/ui/Antetitulo.jsx';
import Aviso from '../components/ui/Aviso.jsx';
import Badge from '../components/ui/Badge.jsx';
import ListaDatos from '../components/ui/ListaDatos.jsx';
import Panel from '../components/ui/Panel.jsx';
import Vacio from '../components/ui/Vacio.jsx';
import { useFetch } from '../hooks/useFetch.js';
import * as cotizacionService from '../services/cotizacionService.js';
import { formatearFecha, formatearHorario } from '../utils/fechas.js';

const formatoPrecio = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0
});

// Mismos estados que EstadoCotizacion en el schema de Prisma
const ESTADOS = {
  pendiente_revision: { texto: 'Pendiente de revisión', color: 'amarillo' },
  modificaciones_solicitadas: { texto: 'Modificaciones solicitadas', color: 'rojo' },
  aprobada: { texto: 'Aprobada por Gerencia', color: 'verde' },
  enviada: { texto: 'Enviada al cliente', color: 'azul' },
  aceptada: { texto: 'Aceptada por el cliente', color: 'verde' },
  rechazada: { texto: 'Rechazada por el cliente', color: 'rojo' },
  sin_respuesta: { texto: 'Sin respuesta del cliente', color: 'amarillo' }
};

const LABEL_TIPO_PRECIO = { fijo: 'Precio fijo', por_hora: 'Por hora' };

function EstadoCotizacion({ estado }) {
  const { texto, color } = ESTADOS[estado] || { texto: estado, color: 'azul' };
  return <Badge color={color} data-estado={estado}>{texto}</Badge>;
}

const columnas = [
  { campo: 'id', titulo: 'N°', className: 'text-stone-500', render: (c) => `#${c.id}` },
  {
    campo: 'cliente',
    titulo: 'Cliente / evento',
    render: (c) => (
      <>
        <strong>{c.solicitud.cliente}</strong>
        <small className="block text-stone-500">{c.solicitud.tipoEvento || 'Sin tipo de evento'}</small>
      </>
    )
  },
  {
    campo: 'fecha',
    titulo: 'Fecha del evento',
    className: 'whitespace-nowrap',
    render: (c) => (c.solicitud.fecha ? formatearFecha(c.solicitud.fecha) : '—')
  },
  { campo: 'total', titulo: 'Total', className: 'whitespace-nowrap', render: (c) => formatoPrecio.format(c.total) },
  { campo: 'estado', titulo: 'Estado', render: (c) => <EstadoCotizacion estado={c.estado} /> }
];

// Cotizaciones registradas: listado con filtro por estado y detalle del cálculo
export default function CotizacionesPage({ params }) {
  const [filtro, setFiltro] = useState('');
  const [seleccionadaId, setSeleccionadaId] = useState(Number(params.get('id')) || null);
  const { datos: cotizaciones, cargando, error } = useFetch(
    useCallback(() => cotizacionService.listar({ estado: filtro }), [filtro])
  );
  const seleccionada = cotizaciones.find((c) => c.id === seleccionadaId) || null;

  return (
    <>
      <EncabezadoPagina
        antetitulo="Comercial"
        titulo="Cotizaciones"
        descripcion="Cotizaciones de las solicitudes, calculadas con los precios vigentes del catálogo."
      />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Panel>
          <div className="flex gap-2.5 border-b border-stone-200 p-3.5">
            <select className="w-auto" aria-label="Filtrar por estado" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="">Todos los estados</option>
              {Object.entries(ESTADOS).map(([valor, { texto }]) => (
                <option key={valor} value={valor}>{texto}</option>
              ))}
            </select>
          </div>
          {error && <Aviso tipo="error" className="m-3.5">{error}</Aviso>}
          {cargando && !cotizaciones.length ? (
            <Vacio>Cargando…</Vacio>
          ) : (
            <DataTable
              columnas={columnas}
              datos={cotizaciones}
              vacio={filtro ? 'No hay cotizaciones con este estado.' : 'Todavía no hay cotizaciones registradas.'}
              seleccionadoId={seleccionadaId}
              onSeleccionar={(c) => setSeleccionadaId(c.id)}
            />
          )}
        </Panel>
        <Panel lateral>
          {seleccionada ? (
            <DetalleCotizacion key={seleccionada.id} cotizacion={seleccionada} />
          ) : (
            <>
              <Antetitulo>Detalle</Antetitulo>
              <Vacio>Selecciona una cotización para ver el detalle del cálculo.</Vacio>
            </>
          )}
        </Panel>
      </div>
    </>
  );
}

function DetalleCotizacion({ cotizacion: c }) {
  const { solicitud } = c;
  return (
    <>
      <Antetitulo className="mb-2">Cotización #{c.id}</Antetitulo>
      <h2 className="mb-2 text-xl font-bold">{solicitud.cliente}</h2>
      <div className="mb-3"><EstadoCotizacion estado={c.estado} /></div>
      <ListaDatos datos={[
        ['Solicitud', `#${solicitud.id} · ${solicitud.tipoEvento || 'Sin tipo de evento'}`],
        ['Fecha', solicitud.fecha ? formatearFecha(solicitud.fecha) : '—'],
        ['Horario', formatearHorario(solicitud) || '—'],
        ['Horas del evento', `${solicitud.horasEvento} h`],
        ['Registrada', new Date(c.createdAt).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })]
      ]} />

      <section className="border-t border-stone-200 pt-4" aria-label="Servicios cotizados">
        <Antetitulo className="mb-2.5">Servicios cotizados</Antetitulo>
        <ul className="grid gap-2 text-sm">
          {c.detalles.map((d) => (
            <li key={d.servicioId} className="flex items-start justify-between gap-3">
              <span>
                <strong>{d.nombre}</strong>
                <small className="block text-stone-500">
                  {LABEL_TIPO_PRECIO[d.tipoPrecio] || d.tipoPrecio} · {formatoPrecio.format(d.precio)}
                  {d.tipoPrecio === 'por_hora' && ` × ${d.horas} h`}
                </small>
              </span>
              <span className="whitespace-nowrap font-medium">{formatoPrecio.format(d.subtotal)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex justify-between border-t border-stone-200 pt-3 text-base font-bold">
          <span>Total</span>
          <span>{formatoPrecio.format(c.total)}</span>
        </p>
      </section>

      <a className="mt-5 inline-block text-sm font-semibold text-teal-700 hover:underline" href={`#/solicitudes?id=${solicitud.id}`}>Abrir en Solicitudes →</a>
    </>
  );
}
