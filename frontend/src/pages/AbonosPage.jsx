import { useCallback, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import EncabezadoPagina from '../components/EncabezadoPagina.jsx';
import Antetitulo from '../components/ui/Antetitulo.jsx';
import Aviso from '../components/ui/Aviso.jsx';
import Boton from '../components/ui/Boton.jsx';
import Campo from '../components/ui/Campo.jsx';
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

const DESHABILITADO = 'disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 disabled:hover:border-stone-300';

// RF-08: el abono inicial corresponde al 50% del total
const abonoMinimo = (total) => total / 2;

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
  { campo: 'total', titulo: 'Total', className: 'whitespace-nowrap', render: (c) => formatoPrecio.format(c.total) }
];

// Cotizaciones aceptadas por el cliente y sus abonos (RF-08)
export default function AbonosPage() {
  const [busqueda, setBusqueda] = useState('');
  const [seleccionadaId, setSeleccionadaId] = useState(null);
  const { datos: cotizaciones, cargando, error } = useFetch(
    useCallback(() => cotizacionService.listar({ estado: 'aceptada' }), [])
  );
  const seleccionada = cotizaciones.find((c) => c.id === seleccionadaId) || null;
  const texto = busqueda.trim().toLowerCase();
  const visibles = texto
    ? cotizaciones.filter((c) => `${c.solicitud.cliente} ${c.solicitud.tipoEvento || ''}`.toLowerCase().includes(texto))
    : cotizaciones;

  return (
    <>
      <EncabezadoPagina
        antetitulo="Producción y Comercial"
        titulo="Abonos"
        descripcion="Cotizaciones aceptadas por el cliente y sus abonos."
      />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Panel>
          <div className="flex gap-2.5 border-b border-stone-200 p-3.5">
            <input type="search" placeholder="Buscar por cliente o tipo de evento" aria-label="Buscar" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          {error && <Aviso tipo="error" className="m-3.5">{error}</Aviso>}
          {cargando && !cotizaciones.length ? (
            <Vacio>Cargando…</Vacio>
          ) : (
            <DataTable
              columnas={columnas}
              datos={visibles}
              vacio={texto ? 'No hay resultados para la búsqueda.' : 'No hay cotizaciones aceptadas.'}
              seleccionadoId={seleccionadaId}
              onSeleccionar={(c) => setSeleccionadaId(c.id)}
            />
          )}
        </Panel>
        <Panel lateral>
          {seleccionada ? (
            <DetalleAbonos key={seleccionada.id} cotizacion={seleccionada} />
          ) : (
            <>
              <Antetitulo>Detalle</Antetitulo>
              <Vacio>Selecciona una cotización para ver sus abonos.</Vacio>
            </>
          )}
        </Panel>
      </div>
    </>
  );
}

function DetalleAbonos({ cotizacion: c }) {
  const { solicitud } = c;
  // Sin la tabla de abonos todavía no hay abonos registrados
  const abonoActual = 0;
  // RF-08: lo que falta pagar para completar el total
  const saldoPendiente = c.total - abonoActual;
  return (
    <>
      <Antetitulo className="mb-2">Cotización #{c.id}</Antetitulo>
      <h2 className="mb-2 text-xl font-bold">{solicitud.cliente}</h2>
      <ListaDatos datos={[
        ['Solicitud', `#${solicitud.id} · ${solicitud.tipoEvento || 'Sin tipo de evento'}`],
        ['Fecha', solicitud.fecha ? formatearFecha(solicitud.fecha) : '—'],
        ['Horario', formatearHorario(solicitud) || '—']
      ]} />

      <section className="grid gap-2 border-t border-stone-200 pt-4 text-sm" aria-label="Abonos">
        <p className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span>{formatoPrecio.format(c.total)}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-stone-600">Abono mínimo</span>
          <span className="whitespace-nowrap font-medium">{formatoPrecio.format(abonoMinimo(c.total))}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-stone-600">Abono actual</span>
          <span className="whitespace-nowrap font-medium">{formatoPrecio.format(abonoActual)}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-stone-600">Saldo pendiente</span>
          <span className="whitespace-nowrap font-medium">{formatoPrecio.format(saldoPendiente)}</span>
        </p>
      </section>

      <div className="mt-5 grid gap-2.5 border-t border-stone-200 pt-4">
        <Campo etiqueta="Ingresar abono">
          <input type="number" inputMode="numeric" min="1" step="1" placeholder="Monto" disabled />
        </Campo>
        <Boton className={`w-full ${DESHABILITADO}`} disabled>
          <span>Registrar abono</span><span aria-hidden="true">→</span>
        </Boton>
      </div>
    </>
  );
}
