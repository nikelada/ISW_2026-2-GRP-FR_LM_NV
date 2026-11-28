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
import * as abonoClienteService from '../services/abonoClienteService.js';
import { formatearFecha, formatearHorario } from '../utils/fechas.js';

const formatoPrecio = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0
});

// AAAA-MM-DD (como lo manda el backend) a dd-mm-aaaa
const fechaDDMMAAAA = (fecha) => fecha.split('-').reverse().join('-');

// Hoy como AAAA-MM-DD (fecha local), para proponerla en el campo y como máximo
function hoy() {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
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
  { campo: 'total', titulo: 'Total', className: 'whitespace-nowrap', render: (c) => formatoPrecio.format(c.total) }
];

// Cotizaciones aceptadas por el cliente y sus abonos (RF-08)
export default function AbonosPage() {
  const [busqueda, setBusqueda] = useState('');
  const [seleccionadaId, setSeleccionadaId] = useState(null);
  const [aviso, setAviso] = useState(null);
  const { datos: cotizaciones, cargando, error, recargar } = useFetch(
    useCallback(() => abonoClienteService.listar(), [])
  );
  const seleccionada = cotizaciones.find((c) => c.id === seleccionadaId) || null;
  const texto = busqueda.trim().toLowerCase();
  const visibles = texto
    ? cotizaciones.filter((c) => `${c.solicitud.cliente} ${c.solicitud.tipoEvento || ''}`.toLowerCase().includes(texto))
    : cotizaciones;

  function seleccionar(c) {
    setSeleccionadaId(c.id);
    setAviso(null);
  }

  function alRegistrar(actualizada, monto) {
    setAviso(
      actualizada.eventoConfirmado
        ? `Abono de ${formatoPrecio.format(monto)} registrado. El evento de ${actualizada.solicitud.cliente} quedó confirmado.`
        : `Abono de ${formatoPrecio.format(monto)} registrado.`
    );
    recargar();
  }

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
              onSeleccionar={seleccionar}
            />
          )}
        </Panel>
        <Panel lateral>
          {aviso && <Aviso tipo="success">{aviso}</Aviso>}
          {seleccionada ? (
            <DetalleAbonos key={seleccionada.id} cotizacion={seleccionada} onRegistrado={alRegistrar} />
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

// RF-08: total, abono mínimo (50%), abono actual (se expande con cada abono), saldo pendiente y el
// formulario para registrar un abono. El monto no puede superar el saldo y la fecha va entre el día
// de la aceptación y hoy (el backend valida lo mismo).
function DetalleAbonos({ cotizacion: c, onRegistrado }) {
  const { solicitud } = c;
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(hoy);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState('');
  const [registrando, setRegistrando] = useState(false);
  const pagada = c.saldoPendiente <= 0;

  async function registrar(event) {
    event.preventDefault();
    setRegistrando(true);
    setErrores({});
    setError('');
    try {
      const actualizada = await abonoClienteService.registrar({ cotizacionId: c.id, monto: Number(monto), fecha });
      onRegistrado(actualizada, Number(monto));
      setMonto('');
      setFecha(hoy());
    } catch (e) {
      setErrores(e.data?.errores || {});
      setError(e.message);
    } finally {
      setRegistrando(false);
    }
  }

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
          <span className="whitespace-nowrap font-medium">{formatoPrecio.format(c.abonoMinimo)}</span>
        </p>
        <details className="group">
          <summary className="flex cursor-pointer list-none justify-between">
            <span className="text-stone-600">
              Abono actual <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">▸</span>
            </span>
            <span className="whitespace-nowrap font-medium">{formatoPrecio.format(c.abonoActual)}</span>
          </summary>
          {c.abonos.length ? (
            <ul className="mt-2 grid gap-1 rounded-md bg-stone-50 px-3 py-2 text-xs">
              {c.abonos.map((abono) => (
                <li key={abono.id} className="flex justify-between">
                  <span className="text-stone-600">{fechaDDMMAAAA(abono.fecha)}</span>
                  <span className="whitespace-nowrap">{formatoPrecio.format(abono.monto)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 rounded-md bg-stone-50 px-3 py-2 text-xs text-stone-500">Sin abonos registrados.</p>
          )}
        </details>
        <p className="flex justify-between">
          <span className="text-stone-600">Saldo pendiente</span>
          <span className="whitespace-nowrap font-medium">{formatoPrecio.format(c.saldoPendiente)}</span>
        </p>
      </section>

      <form className="mt-5 grid gap-2.5 border-t border-stone-200 pt-4" onSubmit={registrar} noValidate>
        <Campo etiqueta="Ingresar abono" error={errores.monto}>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max={c.saldoPendiente}
            step="1"
            placeholder="Monto"
            value={monto}
            disabled={pagada || registrando}
            onChange={(e) => setMonto(e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Fecha del pago" error={errores.fecha}>
          <input
            type="date"
            min={c.aceptadaEn || undefined}
            max={hoy()}
            value={fecha}
            disabled={pagada || registrando}
            onChange={(e) => setFecha(e.target.value)}
          />
        </Campo>
        {error && !Object.keys(errores).length && <Aviso tipo="error" className="mb-0">{error}</Aviso>}
        <Boton type="submit" className="w-full" disabled={pagada || registrando || !monto || !fecha}>
          <span>{registrando ? 'Registrando…' : 'Registrar abono'}</span><span aria-hidden="true">→</span>
        </Boton>
      </form>
    </>
  );
}
