import { useCallback, useEffect, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import EncabezadoPagina from '../components/EncabezadoPagina.jsx';
import Antetitulo from '../components/ui/Antetitulo.jsx';
import Aviso from '../components/ui/Aviso.jsx';
import Badge from '../components/ui/Badge.jsx';
import Boton from '../components/ui/Boton.jsx';
import ListaDatos from '../components/ui/ListaDatos.jsx';
import Panel from '../components/ui/Panel.jsx';
import Vacio from '../components/ui/Vacio.jsx';
import { useFetch } from '../hooks/useFetch.js';
import * as cotizacionService from '../services/cotizacionService.js';
import * as servicioService from '../services/servicioService.js';
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

// Las dos vistas de la página
const VISTAS = {
  cotizar: 'Cotización pendiente',
  aprobar: 'Aprobación pendiente'
};

const LABEL_TIPO_PRECIO = { fijo: 'Precio fijo', por_hora: 'Por hora' };
// AAAA-MM-DD (como lo manda el backend) a dd-mm-aaaa
const fechaDDMMAAAA = (fecha) => fecha.split('-').reverse().join('-');
const sinResultados = () => Promise.resolve([]);

function EstadoCotizacion({ estado }) {
  const { texto, color } = ESTADOS[estado] || { texto: estado, color: 'azul' };
  return <Badge color={color} data-estado={estado}>{texto}</Badge>;
}

function ClienteEvento({ cliente, tipoEvento }) {
  return (
    <>
      <strong>{cliente}</strong>
      <small className="block text-stone-500">{tipoEvento || 'Sin tipo de evento'}</small>
    </>
  );
}

const fechaEvento = (fecha) => (fecha ? formatearFecha(fecha) : '—');

// Solicitudes listas para cotizar (registradas, con la fecha habilitada y sin cotización activa)
const columnasPorCotizar = [
  { campo: 'codigo', titulo: 'Solicitud', className: 'whitespace-nowrap text-stone-500' },
  { campo: 'cliente', titulo: 'Cliente / evento', render: (s) => <ClienteEvento cliente={s.cliente.nombre} tipoEvento={s.tipoEvento} /> },
  { campo: 'fecha', titulo: 'Fecha del evento', className: 'whitespace-nowrap', render: (s) => fechaEvento(s.fecha) }
];

// Cotizaciones que esperan la revisión de Gerencia
const columnasPorAprobar = [
  { campo: 'id', titulo: 'N°', className: 'text-stone-500', render: (c) => `#${c.id}` },
  { campo: 'cliente', titulo: 'Cliente / evento', render: (c) => <ClienteEvento cliente={c.solicitud.cliente} tipoEvento={c.solicitud.tipoEvento} /> },
  { campo: 'fecha', titulo: 'Fecha del evento', className: 'whitespace-nowrap', render: (c) => fechaEvento(c.solicitud.fecha) },
  { campo: 'total', titulo: 'Total', className: 'whitespace-nowrap', render: (c) => formatoPrecio.format(c.total) }
];

// Producción y Comercial ve las solicitudes por cotizar y las cotizaciones por aprobar;
// Gerencia solo las cotizaciones por aprobar.
export default function CotizacionesPage({ user, params }) {
  const puedeCotizar = esProduccion(user);
  const idInicial = Number(params.get('id')) || null;
  const [vista, setVista] = useState(puedeCotizar && !idInicial ? 'cotizar' : 'aprobar');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionadoId, setSeleccionadoId] = useState(idInicial);
  const [aviso, setAviso] = useState(null);

  const porCotizar = useFetch(useCallback(() => (puedeCotizar ? cotizacionService.listarPorCotizar() : sinResultados()), [puedeCotizar]));
  const porAprobar = useFetch(useCallback(() => cotizacionService.listar({ estado: 'pendiente_revision' }), []));
  const catalogo = useFetch(useCallback(() => (puedeCotizar ? servicioService.listar() : sinResultados()), [puedeCotizar]));

  const enCotizar = vista === 'cotizar';
  const lista = enCotizar ? porCotizar : porAprobar;
  const texto = busqueda.trim().toLowerCase();
  const visibles = texto
    ? lista.datos.filter((fila) => {
      const { cliente, tipoEvento } = enCotizar ? { cliente: fila.cliente.nombre, tipoEvento: fila.tipoEvento } : fila.solicitud;
      return `${cliente} ${tipoEvento || ''}`.toLowerCase().includes(texto);
    })
    : lista.datos;
  const seleccionado = lista.datos.find((fila) => fila.id === seleccionadoId) || null;

  function cambiarVista(nueva) {
    setVista(nueva);
    setSeleccionadoId(null);
    setAviso(null);
  }

  function seleccionar(fila) {
    setSeleccionadoId(fila.id);
    setAviso(null);
  }

  // La solicitud sale de "Cotización pendiente" y su cotización pasa a "Aprobación pendiente"
  function alEnviar(creada) {
    setVista('aprobar');
    setBusqueda('');
    setSeleccionadoId(creada.id);
    setAviso(`Cotización de ${creada.solicitud.cliente} enviada a aprobación de Gerencia.`);
    porCotizar.recargar();
    porAprobar.recargar();
  }

  return (
    <>
      <EncabezadoPagina
        antetitulo="Producción y Comercial"
        titulo="Cotizaciones"
        descripcion="Solicitudes listas para cotizar y cotizaciones que esperan la aprobación de Gerencia."
      />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Panel>
          <div className="flex gap-2.5 border-b border-stone-200 p-3.5">
            <input type="search" placeholder="Buscar por cliente o tipo de evento" aria-label="Buscar" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            {puedeCotizar && (
              <select className="w-auto" aria-label="Ver" value={vista} onChange={(e) => cambiarVista(e.target.value)}>
                {Object.entries(VISTAS).map(([valor, titulo]) => <option key={valor} value={valor}>{titulo}</option>)}
              </select>
            )}
          </div>
          {lista.error && <Aviso tipo="error" className="m-3.5">{lista.error}</Aviso>}
          {lista.cargando && !lista.datos.length ? (
            <Vacio>Cargando…</Vacio>
          ) : (
            <DataTable
              columnas={enCotizar ? columnasPorCotizar : columnasPorAprobar}
              datos={visibles}
              vacio={
                texto
                  ? 'No hay resultados para la búsqueda.'
                  : enCotizar
                    ? 'No hay solicitudes pendientes de cotizar.'
                    : 'No hay cotizaciones pendientes de aprobación.'
              }
              seleccionadoId={seleccionadoId}
              onSeleccionar={seleccionar}
            />
          )}
        </Panel>
        <Panel lateral>
          {!seleccionado ? (
            <>
              <Antetitulo>Detalle</Antetitulo>
              <Vacio>{enCotizar ? 'Selecciona una solicitud para ver su cotización.' : 'Selecciona una cotización para ver el detalle del cálculo.'}</Vacio>
            </>
          ) : enCotizar ? (
            catalogo.cargando
              ? <Vacio>Cargando…</Vacio>
              : <CotizarSolicitud key={seleccionado.id} solicitud={seleccionado} catalogo={catalogo.datos} errorCatalogo={catalogo.error} onEnviada={alEnviar} />
          ) : (
            <>
              {aviso && <Aviso tipo="success">{aviso}</Aviso>}
              <DetalleCotizacion key={seleccionado.id} cotizacion={seleccionado} user={user} />
            </>
          )}
        </Panel>
      </div>
    </>
  );
}

// Cada servicio: arriba la versión del precio (fecha, tipo y precio unitario) y abajo, aparte, el cálculo.
// Con onQuitar, cada servicio se puede quitar de la cotización.
function DetalleCalculo({ detalles, total, onQuitar, deshabilitado = false }) {
  return (
    <section className="border-t border-stone-200 pt-4" aria-label="Servicios cotizados">
      <Antetitulo className="mb-2.5">Servicios cotizados</Antetitulo>
      <ul className="grid gap-4 text-sm">
        {detalles.map((d) => (
          <li key={d.servicioId}>
            <div className="flex items-start justify-between gap-3">
              <strong className="block">{d.nombre}</strong>
              {onQuitar && (
                <Boton variante="enlace" disabled={deshabilitado} onClick={() => onQuitar(d.servicioId)}>Quitar</Boton>
              )}
            </div>
            {d.vigenciaDesde && (
              <small className="block text-stone-500">Última actualización: {fechaDDMMAAAA(d.vigenciaDesde)}</small>
            )}
            <small className="block text-stone-500">
              {LABEL_TIPO_PRECIO[d.tipoPrecio] || d.tipoPrecio} · {formatoPrecio.format(d.precio)}
            </small>
            <p className="mt-1.5 flex justify-between gap-3">
              <span className="text-stone-600">Subtotal</span>
              <span className="whitespace-nowrap font-medium">{formatoPrecio.format(d.subtotal)}</span>
            </p>
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
        ['Fecha', fechaEvento(solicitud.fecha)],
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

// RF-07: la cotización se muestra ya calculada con los servicios de la solicitud; se pueden quitar o
// agregar servicios (el total se recalcula solo) y después se envía a aprobación de Gerencia.
// Cambiar los servicios aquí no modifica la solicitud.
function CotizarSolicitud({ solicitud: s, catalogo, errorCatalogo, onEnviada }) {
  const disponibles = new Set(catalogo.map((servicio) => servicio.id));
  const propios = s.servicios || [];
  // Los servicios de la solicitud que ya no están en el catálogo no se pueden cotizar
  const [excluidos] = useState(() => propios.filter((servicio) => !disponibles.has(servicio.id)).map((servicio) => servicio.nombre));
  const [servicios, setServicios] = useState(() => propios.filter((servicio) => disponibles.has(servicio.id)).map((servicio) => servicio.id));
  const [calculo, setCalculo] = useState(null);
  const [calculando, setCalculando] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [tipoParaAgregar, setTipoParaAgregar] = useState('');
  const [servicioParaAgregar, setServicioParaAgregar] = useState('');

  // Cada cambio en los servicios vuelve a calcular (con los precios vigentes)
  useEffect(() => {
    if (!servicios.length) {
      setCalculo(null);
      return undefined;
    }
    let vigente = true;
    setCalculando(true);
    setError('');
    cotizacionService.calcular({ solicitudId: s.id, servicios })
      .then((resultado) => { if (vigente) setCalculo(resultado); })
      .catch((e) => { if (vigente) { setCalculo(null); setError(e.message); } })
      .finally(() => { if (vigente) setCalculando(false); });
    return () => { vigente = false; };
  }, [s.id, servicios]);

  const activos = catalogo.filter((servicio) => servicio.tipoServicio?.activo !== false && !servicios.includes(servicio.id));
  const tipos = Array.from(new Map(activos.map((servicio) => [servicio.tipoServicio.id, servicio.tipoServicio])).values())
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const delTipo = activos.filter((servicio) => servicio.tipoServicioId === Number(tipoParaAgregar));
  const ocupado = calculando || enviando;

  function quitar(id) {
    setServicios((actuales) => actuales.filter((x) => x !== id));
  }

  function agregar() {
    setServicios((actuales) => [...actuales, Number(servicioParaAgregar)]);
    setTipoParaAgregar('');
    setServicioParaAgregar('');
  }

  async function enviar() {
    setEnviando(true);
    setError('');
    try {
      onEnviada(await cotizacionService.crear({ solicitudId: s.id, servicios }));
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  }

  return (
    <>
      <Antetitulo className="mb-2">Solicitud {s.codigo}</Antetitulo>
      <h2 className="mb-4 text-xl font-bold">{s.cliente.nombre}</h2>
      <ListaDatos datos={[
        ['Tipo de evento', s.tipoEvento || '—'],
        ['Fecha', fechaEvento(s.fecha)],
        ['Horario', formatearHorario(s) || '—'],
        ['Horas del evento', calculo ? `${calculo.solicitud.horasEvento} h` : '—']
      ]} />
      {errorCatalogo && <Aviso tipo="error">{errorCatalogo}</Aviso>}
      {excluidos.length > 0 && (
        <Aviso tipo="warning">No se incluyeron porque ya no están disponibles en el catálogo: {excluidos.join(', ')}.</Aviso>
      )}

      {calculo ? (
        <DetalleCalculo detalles={calculo.detalles} total={calculo.total} onQuitar={quitar} deshabilitado={ocupado} />
      ) : !servicios.length ? (
        <Vacio>Agrega al menos un servicio para cotizar.</Vacio>
      ) : calculando ? (
        <Vacio>Calculando…</Vacio>
      ) : null}

      <div className="mt-4 grid gap-2.5 border-t border-stone-200 pt-4">
        <Antetitulo>Agregar servicio</Antetitulo>
        <select aria-label="Tipo de servicio para agregar" value={tipoParaAgregar} disabled={ocupado} onChange={(e) => { setTipoParaAgregar(e.target.value); setServicioParaAgregar(''); }}>
          <option value="">Selecciona un tipo de servicio</option>
          {tipos.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>)}
        </select>
        <div className="flex items-start gap-2.5">
          <select className="h-10 min-w-0 flex-1" aria-label="Servicio para agregar" value={servicioParaAgregar} disabled={!tipoParaAgregar || ocupado} onChange={(e) => setServicioParaAgregar(e.target.value)}>
            <option value="">Selecciona un servicio</option>
            {delTipo.map((servicio) => <option key={servicio.id} value={servicio.id}>{servicio.nombre}</option>)}
          </select>
          <Boton variante="secundario" className="h-10 shrink-0" disabled={!servicioParaAgregar || ocupado} onClick={agregar}>Agregar</Boton>
        </div>
      </div>

      {error && <Aviso tipo="error" className="mt-3.5">{error}</Aviso>}

      <div className="mt-5">
        <Boton className="w-full" onClick={enviar} disabled={!calculo || !servicios.length || ocupado}>
          <span>{enviando ? 'Enviando…' : 'Enviar a aprobación'}</span><span aria-hidden="true">→</span>
        </Boton>
      </div>
    </>
  );
}
