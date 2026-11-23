import { useCallback, useEffect, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import EncabezadoPagina from '../components/EncabezadoPagina.jsx';
import { textoEspacio } from '../components/SelectorLugar.jsx';
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
import { formatearFecha, formatearHorario } from '../utils/fechas.js';
import { esGerencia, esProduccion } from '../utils/roles.js';

const formatoPrecio = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0
});

// Mismos estados que EstadoCotizacion en el schema de Prisma
const ESTADOS = {
  pendiente_revision: { texto: 'Estado cotización pendiente', color: 'amarillo' },
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
  aprobar: 'Revisión pendiente',
  aprobadas: 'Cotización aprobada'
};

const VACIO_POR_VISTA = {
  cotizar: 'No hay solicitudes pendientes de cotizar.',
  aprobar: 'No hay cotizaciones pendientes de revisión.',
  aprobadas: 'No hay cotizaciones aprobadas.'
};

const LABEL_TIPO_PRECIO = { fijo: 'Precio fijo', por_hora: 'Por hora' };

// Mismos valores que MotivoModificacion en el schema de Prisma
const MOTIVOS_MODIFICACION = {
  servicio_no_disponible: 'Servicio no disponible',
  precio_desactualizado: 'Precio desactualizado',
  otro: 'Otro'
};
const MAXIMO_COMENTARIO = 1000;

// Mismos valores que MotivoRechazo en el schema de Prisma; "No respondió" va solo (queda "sin respuesta")
const MOTIVOS_RECHAZO = {
  precio: 'Precio',
  otra_empresa: 'Seleccionó otra empresa',
  evento_cancelado: 'Canceló el evento',
  no_respondio: 'No respondió',
  otro: 'Otro'
};
const fechaHora = (valor) => new Date(valor).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' });

// Lo que pidió Gerencia al solicitar modificaciones (RF-10): motivos, comentario y quién lo pidió
function ModificacionesSolicitadas({ titulo, motivos, comentario, revisadoPor, revisadoEn }) {
  return (
    <Aviso tipo="warning" titulo={titulo}>
      <p>Motivos: {motivos.map((motivo) => MOTIVOS_MODIFICACION[motivo] || motivo).join(', ')}.</p>
      {comentario && <p className="whitespace-pre-line">"{comentario}"</p>}
      {revisadoPor && <p className="text-xs">{revisadoPor}{revisadoEn ? ` · ${fechaHora(revisadoEn)}` : ''}</p>}
    </Aviso>
  );
}
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

// Datos de la solicitud que sirven para revisar la cotización (Producción y Comercial y Gerencia)
const datosParaRevisar = (s) => [
  ['Cantidad de personas', s.cantidadPersonas ?? '—'],
  ['Lugar', s.espacio ? textoEspacio(s.espacio) : s.lugar || '—'],
  ['Requerimientos técnicos', s.requerimientosTecnicos || '—']
];

// Solicitudes listas para cotizar (registradas, con la fecha habilitada y sin cotización activa)
const columnasPorCotizar = [
  { campo: 'codigo', titulo: 'Solicitud', className: 'whitespace-nowrap text-stone-500' },
  {
    campo: 'cliente',
    titulo: 'Cliente / evento',
    render: (s) => (
      <>
        <ClienteEvento cliente={s.cliente.nombre} tipoEvento={s.tipoEvento} />
        {s.modificacionSolicitada && <div className="mt-1"><Badge color="rojo">Modificaciones solicitadas</Badge></div>}
      </>
    )
  },
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
  // Las aprobadas por Gerencia, para que Producción y Comercial siga con ellas
  const aprobadas = useFetch(useCallback(() => (puedeCotizar ? cotizacionService.listar({ estado: 'aprobada' }) : sinResultados()), [puedeCotizar]));
  const catalogo = useFetch(useCallback(() => (puedeCotizar ? servicioService.listar() : sinResultados()), [puedeCotizar]));

  const enCotizar = vista === 'cotizar';
  const lista = { cotizar: porCotizar, aprobar: porAprobar, aprobadas }[vista];
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

  // La solicitud sale de "Cotización pendiente" y su cotización pasa a "Revisión pendiente"
  function alEnviar(creada) {
    setVista('aprobar');
    setBusqueda('');
    setSeleccionadoId(creada.id);
    setAviso(`Cotización de ${creada.solicitud.cliente} enviada a revisión de Gerencia.`);
    porCotizar.recargar();
    porAprobar.recargar();
  }

  // Aprobada, sale de "Revisión pendiente" y pasa a "Cotización aprobada"
  function alAprobar(aprobada) {
    setSeleccionadoId(null);
    setAviso(`Cotización de ${aprobada.solicitud.cliente} aprobada.`);
    porAprobar.recargar();
    aprobadas.recargar();
  }

  // Aceptada por el cliente, sale de "Cotización aprobada"
  function alAceptar(aceptada) {
    setSeleccionadoId(null);
    setAviso(`Cotización de ${aceptada.solicitud.cliente} aceptada por el cliente.`);
    aprobadas.recargar();
  }

  // El cliente no la aceptó: sale de "Cotización aprobada" y la solicitud vuelve a "Cotización pendiente"
  function alRechazar(cotizacion) {
    setSeleccionadoId(null);
    setAviso(
      cotizacion.estado === 'sin_respuesta'
        ? `Cotización de ${cotizacion.solicitud.cliente} registrada sin respuesta del cliente.`
        : `Cotización de ${cotizacion.solicitud.cliente} rechazada por el cliente.`
    );
    aprobadas.recargar();
    porCotizar.recargar();
  }

  // Gerencia pidió modificaciones: sale de "Revisión pendiente" y vuelve a "Cotización pendiente"
  function alSolicitarModificaciones(cotizacion) {
    setSeleccionadoId(null);
    setAviso(`Se solicitaron modificaciones de la cotización de ${cotizacion.solicitud.cliente} a Producción y Comercial.`);
    porAprobar.recargar();
    porCotizar.recargar();
  }

  return (
    <>
      <EncabezadoPagina
        antetitulo="Producción y Comercial"
        titulo="Cotizaciones"
        descripcion="Solicitudes listas para cotizar y cotizaciones que esperan la revisión de Gerencia."
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
              vacio={texto ? 'No hay resultados para la búsqueda.' : VACIO_POR_VISTA[vista]}
              seleccionadoId={seleccionadoId}
              onSeleccionar={seleccionar}
            />
          )}
        </Panel>
        <Panel lateral>
          {aviso && <Aviso tipo="success">{aviso}</Aviso>}
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
            <DetalleCotizacion key={seleccionado.id} cotizacion={seleccionado} user={user} onAprobada={alAprobar} onAceptada={alAceptar} onRechazada={alRechazar} onModificacionesSolicitadas={alSolicitarModificaciones} />
          )}
        </Panel>
      </div>
    </>
  );
}

// Cada servicio: arriba la versión del precio (fecha, tipo y precio unitario) y abajo, aparte, el cálculo.
// accion se muestra en la misma línea que el título "Servicios cotizados". Con onQuitar, cada servicio
// tiene la opción de quitarlo; vacio es el texto cuando no queda ningún servicio.
function DetalleCalculo({ detalles, total, accion, onQuitar, deshabilitado = false, vacio }) {
  return (
    <section className="border-t border-stone-200 pt-4" aria-label="Servicios cotizados">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <Antetitulo>Servicios cotizados</Antetitulo>
        {accion}
      </div>
      {!detalles.length && vacio && <p className="text-sm text-stone-500">{vacio}</p>}
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

function DetalleCotizacion({ cotizacion: c, user, onAprobada, onAceptada, onRechazada, onModificacionesSolicitadas }) {
  const { solicitud } = c;
  // RF-10: Gerencia revisa las cotizaciones que están en su revisión
  const puedeRevisar = esGerencia(user) && c.estado === 'pendiente_revision';
  // RF-10: Producción y Comercial registra que el cliente aceptó una cotización aprobada
  const puedeAceptar = esProduccion(user) && c.estado === 'aprobada';
  const [procesando, setProcesando] = useState('');
  const [error, setError] = useState('');
  // Formulario de Gerencia para solicitar modificaciones
  const [solicitando, setSolicitando] = useState(false);
  const [motivos, setMotivos] = useState([]);
  const [comentario, setComentario] = useState('');
  const [errores, setErrores] = useState({});
  // Formulario de Producción y Comercial para registrar que el cliente no la aceptó
  const [rechazando, setRechazando] = useState(false);
  const [motivosRechazo, setMotivosRechazo] = useState([]);
  const [detalleRechazo, setDetalleRechazo] = useState('');

  // "No respondió" va solo: al marcarlo se quitan los demás, y al marcar otro se quita "No respondió"
  function alternarMotivoRechazo(motivo, marcado) {
    if (!marcado) return setMotivosRechazo((actuales) => actuales.filter((m) => m !== motivo));
    if (motivo === 'no_respondio') return setMotivosRechazo(['no_respondio']);
    setMotivosRechazo((actuales) => [...actuales.filter((m) => m !== 'no_respondio'), motivo]);
  }

  function cancelarRechazo() {
    setRechazando(false);
    setMotivosRechazo([]);
    setDetalleRechazo('');
    setErrores({});
    setError('');
  }

  async function confirmarRechazo() {
    setProcesando('rechazar');
    setErrores({});
    setError('');
    try {
      onRechazada(await cotizacionService.rechazar(c.id, { motivos: motivosRechazo, detalle: detalleRechazo }));
    } catch (e) {
      setErrores(e.data?.errores || {});
      setError(e.message);
      setProcesando('');
    }
  }

  function alternarMotivo(motivo, marcado) {
    setMotivos((actuales) => (marcado ? [...actuales, motivo] : actuales.filter((m) => m !== motivo)));
  }

  function cancelarSolicitud() {
    setSolicitando(false);
    setMotivos([]);
    setComentario('');
    setErrores({});
    setError('');
  }

  async function enviarSolicitud() {
    setProcesando('modificaciones');
    setErrores({});
    setError('');
    try {
      onModificacionesSolicitadas(await cotizacionService.solicitarModificaciones(c.id, { motivos, comentario }));
    } catch (e) {
      setErrores(e.data?.errores || {});
      setError(e.message);
      setProcesando('');
    }
  }

  // Cambia el estado de la cotización y avisa a la página con la cotización actualizada
  async function ejecutar(accion, cambio, alTerminar) {
    setProcesando(accion);
    setError('');
    try {
      alTerminar(await cambio(c.id));
    } catch (e) {
      setError(e.message);
      setProcesando('');
    }
  }

  const aprobar = () => ejecutar('aprobar', cotizacionService.aprobar, onAprobada);
  const aceptar = () => ejecutar('aceptar', cotizacionService.aceptar, onAceptada);

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
        ...datosParaRevisar(solicitud),
        ['Registrada', fechaHora(c.createdAt)],
        // quién de Gerencia la revisó por última vez y cuándo
        ['Revisada por', c.revisadoPor ? `${c.revisadoPor} · ${fechaHora(c.revisadoEn)}` : null]
      ]} />
      {/* Si se reenvió después de que Gerencia pidió modificaciones, se ve lo que había pedido */}
      {c.motivosModificacion?.length > 0 && (
        <ModificacionesSolicitadas
          titulo="Modificaciones solicitadas anteriormente"
          motivos={c.motivosModificacion}
          comentario={c.comentarioModificacion}
        />
      )}
      <DetalleCalculo detalles={c.detalles} total={c.total} />
      {error && !Object.keys(errores).length && <Aviso tipo="error" className="mt-3.5">{error}</Aviso>}
      {/* Lucas: descargar factura en pdf */}
      {/* {esProduccion(user) && c.estado === 'aprobada' && (
        <Boton variante="secundario" className="mt-5 w-full" onClick={descargarPdf}>Descargar factura en PDF</Boton>
      )} */}
      {puedeRevisar && !solicitando && (
        <div className="mt-5 grid gap-2.5">
          <Boton onClick={aprobar} disabled={Boolean(procesando)}>
            <span>{procesando === 'aprobar' ? 'Aprobando…' : 'Aprobar cotización'}</span><span aria-hidden="true">→</span>
          </Boton>
          <Boton variante="secundario" disabled={Boolean(procesando)} onClick={() => setSolicitando(true)}>
            Solicitar modificaciones
          </Boton>
        </div>
      )}
      {puedeRevisar && solicitando && (
        <section className="mt-5 grid gap-3 border-t border-stone-200 pt-4" aria-label="Solicitar modificaciones">
          <Antetitulo>Solicitar modificaciones</Antetitulo>
          <fieldset className="grid gap-1.5">
            <legend className="mb-1 text-xs font-semibold text-stone-600">Motivos</legend>
            {Object.entries(MOTIVOS_MODIFICACION).map(([valor, texto]) => (
              <label key={valor} className="flex items-center gap-2 text-sm text-stone-800">
                <input type="checkbox" checked={motivos.includes(valor)} disabled={Boolean(procesando)} onChange={(e) => alternarMotivo(valor, e.target.checked)} />
                {texto}
              </label>
            ))}
            {errores.motivos && <span className="text-xs font-medium text-red-700" data-campo-error>{errores.motivos}</span>}
          </fieldset>
          <Campo etiqueta={`Comentario para Producción y Comercial (${comentario.length}/${MAXIMO_COMENTARIO})`} error={errores.comentario}>
            <textarea rows={4} maxLength={MAXIMO_COMENTARIO} value={comentario} disabled={Boolean(procesando)} onChange={(e) => setComentario(e.target.value)} />
          </Campo>
          {error && !Object.keys(errores).length && <Aviso tipo="error" className="mb-0">{error}</Aviso>}
          <div className="flex gap-2.5">
            <Boton className="flex-1" disabled={!motivos.length || !comentario.trim() || Boolean(procesando)} onClick={enviarSolicitud}>
              <span>{procesando === 'modificaciones' ? 'Enviando…' : 'Enviar solicitud'}</span><span aria-hidden="true">→</span>
            </Boton>
            <Boton variante="secundario" disabled={Boolean(procesando)} onClick={cancelarSolicitud}>Cancelar</Boton>
          </div>
        </section>
      )}
      {puedeAceptar && !rechazando && (
        <div className="mt-5 grid gap-2.5">
          <Boton onClick={aceptar} disabled={Boolean(procesando)}>
            <span>{procesando === 'aceptar' ? 'Aceptando…' : 'Aceptar cotización'}</span><span aria-hidden="true">→</span>
          </Boton>
          <Boton variante="secundario" disabled={Boolean(procesando)} onClick={() => setRechazando(true)}>
            Rechazar cotización
          </Boton>
        </div>
      )}
      {puedeAceptar && rechazando && (
        <section className="mt-5 grid gap-3 border-t border-stone-200 pt-4" aria-label="Rechazar cotización">
          <Antetitulo>Rechazar cotización</Antetitulo>
          <fieldset className="grid gap-1.5">
            <legend className="mb-1 text-xs font-semibold text-stone-600">Motivos</legend>
            {Object.entries(MOTIVOS_RECHAZO).map(([valor, texto]) => (
              <label key={valor} className="flex items-center gap-2 text-sm text-stone-800">
                <input
                  type="checkbox"
                  checked={motivosRechazo.includes(valor)}
                  disabled={Boolean(procesando)}
                  onChange={(e) => alternarMotivoRechazo(valor, e.target.checked)}
                />
                {texto}
              </label>
            ))}
            {errores.motivos && <span className="text-xs font-medium text-red-700" data-campo-error>{errores.motivos}</span>}
          </fieldset>
          <Campo etiqueta={`Detalle, opcional (${detalleRechazo.length}/${MAXIMO_COMENTARIO})`} error={errores.detalle}>
            <textarea rows={4} maxLength={MAXIMO_COMENTARIO} value={detalleRechazo} disabled={Boolean(procesando)} onChange={(e) => setDetalleRechazo(e.target.value)} />
          </Campo>
          {error && !Object.keys(errores).length && <Aviso tipo="error" className="mb-0">{error}</Aviso>}
          <div className="flex gap-2.5">
            <Boton className="flex-1" disabled={!motivosRechazo.length || Boolean(procesando)} onClick={confirmarRechazo}>
              <span>{procesando === 'rechazar' ? 'Guardando…' : 'Confirmar rechazo'}</span><span aria-hidden="true">→</span>
            </Boton>
            <Boton variante="secundario" disabled={Boolean(procesando)} onClick={cancelarRechazo}>Cancelar</Boton>
          </div>
        </section>
      )}
      {/* Gerencia no tiene la sección Solicitudes */}
      {esProduccion(user) && (
        <a className="mt-5 inline-block text-sm font-semibold text-teal-700 hover:underline" href={`#/solicitudes?id=${solicitud.id}`}>Abrir en Solicitudes →</a>
      )}
    </>
  );
}

// RF-07: la cotización se muestra ya calculada con los servicios de la solicitud (precios vigentes).
// Con "Modificar servicios" Producción y Comercial puede quitar y agregar servicios; los cambios se
// aplican al confirmar (o se descartan al cancelar). Mientras se modifican, no se puede enviar a revisión.
function CotizarSolicitud({ solicitud: s, catalogo, errorCatalogo, onEnviada }) {
  const disponibles = new Set(catalogo.map((servicio) => servicio.id));
  const modificacion = s.modificacionSolicitada;
  // Si Gerencia pidió modificaciones se parte de los servicios que ya tenía la cotización; si no, de los de la solicitud
  const propios = modificacion ? modificacion.servicios : s.servicios || [];
  // Los servicios de la solicitud que ya no están en el catálogo no se pueden cotizar
  const [excluidos] = useState(() => propios.filter((servicio) => !disponibles.has(servicio.id)).map((servicio) => servicio.nombre));
  const [servicios, setServicios] = useState(() => propios.filter((servicio) => disponibles.has(servicio.id)).map((servicio) => servicio.id));
  // Mientras se modifican, los cambios van en un borrador
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState(servicios);
  const [tipoParaAgregar, setTipoParaAgregar] = useState('');
  const [servicioParaAgregar, setServicioParaAgregar] = useState('');
  const [calculo, setCalculo] = useState(null);
  const [calculando, setCalculando] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const enCalculo = editando ? borrador : servicios;

  // Cada cambio en los servicios vuelve a calcular (con los precios vigentes)
  useEffect(() => {
    if (!enCalculo.length) {
      setCalculo(null);
      return undefined;
    }
    let vigente = true;
    setCalculando(true);
    setError('');
    cotizacionService.calcular({ solicitudId: s.id, servicios: enCalculo })
      .then((resultado) => { if (vigente) setCalculo(resultado); })
      .catch((e) => { if (vigente) { setCalculo(null); setError(e.message); } })
      .finally(() => { if (vigente) setCalculando(false); });
    return () => { vigente = false; };
  }, [s.id, enCalculo]);

  const ocupado = calculando || enviando;
  // Mientras llega el cálculo nuevo, no se muestran los servicios recién quitados
  const detalles = calculo && enCalculo.length ? calculo.detalles.filter((d) => enCalculo.includes(d.servicioId)) : [];
  const activos = catalogo.filter((servicio) => servicio.tipoServicio?.activo !== false && !borrador.includes(servicio.id));
  const tipos = Array.from(new Map(activos.map((servicio) => [servicio.tipoServicio.id, servicio.tipoServicio])).values())
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const delTipo = activos.filter((servicio) => servicio.tipoServicioId === Number(tipoParaAgregar));

  function modificar() {
    setBorrador(servicios);
    setEditando(true);
  }

  function confirmar() {
    setServicios(borrador);
    setEditando(false);
  }

  function cancelar() {
    setBorrador(servicios);
    setTipoParaAgregar('');
    setServicioParaAgregar('');
    setEditando(false);
  }

  function quitar(id) {
    setBorrador((actuales) => actuales.filter((x) => x !== id));
  }

  function agregar() {
    setBorrador((actuales) => [...actuales, Number(servicioParaAgregar)]);
    setTipoParaAgregar('');
    setServicioParaAgregar('');
  }

  const acciones = editando ? (
    <div className="flex gap-2">
      <Boton variante="secundario" className="px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400" disabled={!borrador.length || calculando || Boolean(error)} onClick={confirmar}>
        Confirmar
      </Boton>
      <Boton variante="secundario" className="px-3 py-1.5 text-xs" onClick={cancelar}>Cancelar</Boton>
    </div>
  ) : (
    <Boton variante="secundario" className="px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400" disabled={ocupado} onClick={modificar}>
      Modificar servicios
    </Boton>
  );

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
        ['Horas del evento', calculo ? `${calculo.solicitud.horasEvento} h` : '—'],
        ...datosParaRevisar(s)
      ]} />
      {modificacion && (
        <ModificacionesSolicitadas
          titulo="Gerencia solicitó modificaciones"
          motivos={modificacion.motivos}
          comentario={modificacion.comentario}
          revisadoPor={modificacion.revisadoPor}
          revisadoEn={modificacion.revisadoEn}
        />
      )}
      {errorCatalogo && <Aviso tipo="error">{errorCatalogo}</Aviso>}
      {excluidos.length > 0 && (
        <Aviso tipo="warning">No se incluyeron porque ya no están disponibles en el catálogo: {excluidos.join(', ')}.</Aviso>
      )}

      {calculo || editando ? (
        <DetalleCalculo
          detalles={detalles}
          total={enCalculo.length && calculo ? calculo.total : 0}
          accion={acciones}
          onQuitar={editando ? quitar : undefined}
          deshabilitado={calculando}
          vacio="Agrega al menos un servicio."
        />
      ) : !servicios.length ? (
        <Vacio>La solicitud no tiene servicios disponibles para cotizar.</Vacio>
      ) : calculando ? (
        <Vacio>Calculando…</Vacio>
      ) : null}

      {editando && (
        <div className="mt-4 grid gap-2.5 border-t border-stone-200 pt-4">
          <Antetitulo>Agregar servicio</Antetitulo>
          <select aria-label="Tipo de servicio para agregar" value={tipoParaAgregar} disabled={calculando} onChange={(e) => { setTipoParaAgregar(e.target.value); setServicioParaAgregar(''); }}>
            <option value="">Selecciona un tipo de servicio</option>
            {tipos.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>)}
          </select>
          <div className="flex items-start gap-2.5">
            <select className="h-10 min-w-0 flex-1" aria-label="Servicio para agregar" value={servicioParaAgregar} disabled={!tipoParaAgregar || calculando} onChange={(e) => setServicioParaAgregar(e.target.value)}>
              <option value="">Selecciona un servicio</option>
              {delTipo.map((servicio) => <option key={servicio.id} value={servicio.id}>{servicio.nombre}</option>)}
            </select>
            <Boton variante="secundario" className="h-10 shrink-0" disabled={!servicioParaAgregar || calculando} onClick={agregar}>Agregar</Boton>
          </div>
        </div>
      )}

      {error && <Aviso tipo="error" className="mt-3.5">{error}</Aviso>}

      <div className="mt-5">
        <Boton className="w-full" onClick={enviar} disabled={editando || !calculo || !servicios.length || ocupado}>
          <span>{enviando ? 'Enviando…' : 'Enviar a revisión de Gerencia'}</span><span aria-hidden="true">→</span>
        </Boton>
      </div>
    </>
  );
}
