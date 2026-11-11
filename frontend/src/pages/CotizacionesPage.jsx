import { useCallback, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import EncabezadoPagina from '../components/EncabezadoPagina.jsx';
import Antetitulo from '../components/ui/Antetitulo.jsx';
import Aviso from '../components/ui/Aviso.jsx';
import Badge from '../components/ui/Badge.jsx';
import Boton from '../components/ui/Boton.jsx';
import Campo from '../components/ui/Campo.jsx';
import ListaDatos from '../components/ui/ListaDatos.jsx';
import Panel from '../components/ui/Panel.jsx';
import Vacio from '../components/ui/Vacio.jsx';
import { useFetch } from '../hooks/useFetch.js';
import * as cotizacionService from '../services/cotizacionService.js';
import * as servicioService from '../services/servicioService.js';
import * as solicitudService from '../services/solicitudService.js';
import { formatearFecha, formatearHorario } from '../utils/fechas.js';
import { esProduccion } from '../utils/roles.js';

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
const CHECK = 'flex items-start gap-2 text-sm font-normal text-stone-800';

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

// Cotizaciones registradas: listado con filtro por estado, detalle del cálculo y creación
export default function CotizacionesPage({ user, params }) {
  const puedeCrear = esProduccion(user);
  const [filtro, setFiltro] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [creando, setCreando] = useState(false);
  const [seleccionadaId, setSeleccionadaId] = useState(Number(params.get('id')) || null);
  const { datos: cotizaciones, cargando, error, recargar } = useFetch(
    useCallback(() => cotizacionService.listar({ estado: filtro }), [filtro])
  );
  const seleccionada = cotizaciones.find((c) => c.id === seleccionadaId) || null;
  // Igual que en Solicitudes: busca por cliente o tipo de evento sobre lo ya cargado
  const texto = busqueda.trim().toLowerCase();
  const visibles = texto
    ? cotizaciones.filter((c) => `${c.solicitud.cliente} ${c.solicitud.tipoEvento || ''}`.toLowerCase().includes(texto))
    : cotizaciones;

  function verCotizacion(id) {
    setCreando(false);
    setFiltro('');
    setBusqueda('');
    setSeleccionadaId(id);
  }

  function alGuardar(creada) {
    verCotizacion(creada.id);
    recargar();
  }

  return (
    <>
      <EncabezadoPagina
        antetitulo="Comercial"
        titulo="Cotizaciones"
        descripcion="Cotizaciones de las solicitudes, calculadas con los precios vigentes del catálogo."
      >
        {puedeCrear && !creando && <Boton onClick={() => setCreando(true)}>Nueva cotización</Boton>}
      </EncabezadoPagina>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Panel>
          <div className="flex gap-2.5 border-b border-stone-200 p-3.5">
            <input type="search" placeholder="Buscar por cliente o tipo de evento" aria-label="Buscar cotizaciones" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
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
              datos={visibles}
              vacio={
                texto
                  ? 'No hay cotizaciones que coincidan con la búsqueda.'
                  : filtro
                    ? 'No hay cotizaciones con este estado.'
                    : 'Todavía no hay cotizaciones registradas.'
              }
              seleccionadoId={seleccionadaId}
              onSeleccionar={(c) => { setCreando(false); setSeleccionadaId(c.id); }}
            />
          )}
        </Panel>
        <Panel lateral>
          {creando ? (
            <NuevaCotizacion onCancelar={() => setCreando(false)} onGuardada={alGuardar} onVerCotizacion={verCotizacion} />
          ) : seleccionada ? (
            <DetalleCotizacion key={seleccionada.id} cotizacion={seleccionada} user={user} />
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

// Servicios con su precio, horas (si es por hora) y subtotal, más el total
function DetalleCalculo({ detalles, total }) {
  return (
    <section className="border-t border-stone-200 pt-4" aria-label="Servicios cotizados">
      <Antetitulo className="mb-2.5">Servicios cotizados</Antetitulo>
      <ul className="grid gap-2 text-sm">
        {detalles.map((d) => (
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
        <span>{formatoPrecio.format(total)}</span>
      </p>
    </section>
  );
}

function DetalleCotizacion({ cotizacion: c, user }) {
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
        // horas guardadas al cotizar; pueden diferir del horario actual si la solicitud se editó
        ['Horas cotizadas', `${solicitud.horasEvento} h`],
        ['Registrada', new Date(c.createdAt).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })]
      ]} />
      <DetalleCalculo detalles={c.detalles} total={c.total} />
      {/* Gerencia no tiene la sección Solicitudes */}
      {esProduccion(user) && (
        <a className="mt-5 inline-block text-sm font-semibold text-teal-700 hover:underline" href={`#/solicitudes?id=${solicitud.id}`}>Abrir en Solicitudes →</a>
      )}
    </>
  );
}

// RF-07: se elige la solicitud y sus servicios, se ve el cálculo y recién ahí se puede guardar
function NuevaCotizacion({ onCancelar, onGuardada, onVerCotizacion }) {
  const { datos: solicitudes, cargando: cargandoSolicitudes, error: errorSolicitudes } = useFetch(
    useCallback(() => solicitudService.listar('registrada'), [])
  );
  const { datos: catalogo, cargando: cargandoCatalogo, error: errorCatalogo } = useFetch(
    useCallback(() => servicioService.listar(), [])
  );
  const [solicitudId, setSolicitudId] = useState('');
  const [servicios, setServicios] = useState([]);
  const [excluidos, setExcluidos] = useState([]);
  const [calculo, setCalculo] = useState(null);
  const [errores, setErrores] = useState({});
  const [aviso, setAviso] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const listo = !cargandoSolicitudes && !cargandoCatalogo;

  // Cualquier cambio invalida el cálculo: hay que volver a calcular antes de guardar
  function limpiarCalculo() {
    setCalculo(null);
    setAviso(null);
    setErrores({});
  }

  // Se marcan los servicios que ya tiene la solicitud, si siguen disponibles en el catálogo
  function elegirSolicitud(id) {
    setSolicitudId(id);
    const propios = solicitudes.find((s) => String(s.id) === id)?.servicios || [];
    const disponibles = new Set(catalogo.map((s) => s.id));
    setServicios(propios.filter((s) => disponibles.has(s.id)).map((s) => s.id));
    setExcluidos(propios.filter((s) => !disponibles.has(s.id)).map((s) => s.nombre));
    limpiarCalculo();
  }

  function alternarServicio(id, marcado) {
    setServicios((actuales) => (marcado ? [...actuales, id] : actuales.filter((x) => x !== id)));
    limpiarCalculo();
  }

  function mostrarError(e) {
    setErrores(e.data?.errores || {});
    setAviso({ mensaje: e.message, faltantes: e.data?.faltantes, cotizacionActiva: e.data?.cotizacionActiva });
  }

  async function ejecutar(accion) {
    setProcesando(true);
    setAviso(null);
    setErrores({});
    try {
      await accion();
    } catch (e) {
      mostrarError(e);
    } finally {
      setProcesando(false);
    }
  }

  const datos = () => ({ solicitudId: Number(solicitudId), servicios });
  const calcular = () => ejecutar(async () => {
    setCalculo(null);
    setCalculo(await cotizacionService.calcular(datos()));
  });
  const guardar = () => ejecutar(async () => onGuardada(await cotizacionService.crear(datos())));

  return (
    <>
      <Antetitulo className="mb-2">Nueva cotización</Antetitulo>
      <p className="mb-4 text-xs text-stone-500">Elige una solicitud registrada y los servicios a cotizar. Se usan los precios vigentes del catálogo.</p>
      {(errorSolicitudes || errorCatalogo) && <Aviso tipo="error">{errorSolicitudes || errorCatalogo}</Aviso>}

      <div className="grid gap-4">
        <Campo etiqueta="Solicitud" error={errores.solicitudId}>
          <select name="solicitudId" value={solicitudId} disabled={!listo} onChange={(e) => elegirSolicitud(e.target.value)}>
            <option value="">{listo ? 'Selecciona una solicitud' : 'Cargando…'}</option>
            {solicitudes.map((s) => (
              <option key={s.id} value={s.id}>
                #{s.id} · {s.cliente?.nombre} · {s.tipoEvento} · {formatearFecha(s.fecha)}
              </option>
            ))}
          </select>
        </Campo>
        {listo && !solicitudes.length && <p className="text-xs text-stone-500">No hay solicitudes registradas para cotizar.</p>}

        {solicitudId && (
          <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-xs font-semibold text-stone-600">Servicios</legend>
            {excluidos.length > 0 && (
              <Aviso tipo="warning">No se marcaron porque ya no están disponibles en el catálogo: {excluidos.join(', ')}.</Aviso>
            )}
            {catalogo.map((s) => (
              <label key={s.id} className={CHECK}>
                <input type="checkbox" name={`servicio-${s.id}`} checked={servicios.includes(s.id)} onChange={(e) => alternarServicio(s.id, e.target.checked)} />
                <span>
                  {s.nombre}
                  <small className="block text-stone-500">
                    {LABEL_TIPO_PRECIO[s.versionActiva?.tipoPrecio] || '—'} · {s.versionActiva ? formatoPrecio.format(s.versionActiva.precio) : '—'}
                  </small>
                </span>
              </label>
            ))}
            {errores.servicios && <span className="text-xs font-medium text-red-700" data-campo-error>{errores.servicios}</span>}
          </fieldset>
        )}
      </div>

      {aviso && (
        <Aviso tipo="error" className="my-3.5">
          <p>{aviso.mensaje}</p>
          {aviso.faltantes?.length > 0 && <ul>{aviso.faltantes.map((f) => <li key={f}>{f}</li>)}</ul>}
          {aviso.cotizacionActiva && (
            <p>
              <Boton variante="enlace" onClick={() => onVerCotizacion(aviso.cotizacionActiva.id)}>
                Ver cotización #{aviso.cotizacionActiva.id}
              </Boton>
            </p>
          )}
        </Aviso>
      )}

      {calculo && (
        <div className="mt-4">
          <ListaDatos datos={[
            ['Horario', formatearHorario(calculo.solicitud) || '—'],
            ['Horas del evento', `${calculo.solicitud.horasEvento} h`]
          ]} />
          <DetalleCalculo detalles={calculo.detalles} total={calculo.total} />
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2.5">
        {calculo ? (
          <Boton onClick={guardar} disabled={procesando}>Guardar cotización</Boton>
        ) : (
          <Boton onClick={calcular} disabled={procesando || !solicitudId || !servicios.length}>Calcular</Boton>
        )}
        <Boton variante="secundario" onClick={onCancelar}>Cancelar</Boton>
      </div>
    </>
  );
}
