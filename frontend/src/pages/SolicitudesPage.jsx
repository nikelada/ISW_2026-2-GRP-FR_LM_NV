import { useCallback, useEffect, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import EncabezadoPagina from '../components/EncabezadoPagina.jsx';
import EstadoBadge from '../components/EstadoBadge.jsx';
import ResultadoDisponibilidad from '../components/ResultadoDisponibilidad.jsx';
import Antetitulo from '../components/ui/Antetitulo.jsx';
import Aviso from '../components/ui/Aviso.jsx';
import Boton from '../components/ui/Boton.jsx';
import Campo from '../components/ui/Campo.jsx';
import ListaDatos from '../components/ui/ListaDatos.jsx';
import Panel from '../components/ui/Panel.jsx';
import Vacio from '../components/ui/Vacio.jsx';
import { useFetch } from '../hooks/useFetch.js';
import * as calendarioService from '../services/calendarioService.js';
import * as clienteService from '../services/clienteService.js';
import * as solicitudService from '../services/solicitudService.js';
import * as servicioService from '../services/servicioService.js';
import { formatearFecha, formatearHorario } from '../utils/fechas.js';
import { esProduccion } from '../utils/roles.js';

const VACIO = { clienteId: '', fecha: '', horaInicio: '', horaFin: '', cantidadPersonas: '', lugar: '' };

const formatoPrecio = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0
});

const LABEL_TIPO_PRECIO = {
  fijo: 'precio fijo',
  por_hora: 'por hora'
};

function textoPrecioServicio(version) {
  if (!version) return 'Precio pendiente';
  return `${formatoPrecio.format(version.precio)} ${LABEL_TIPO_PRECIO[version.tipoPrecio] || version.tipoPrecio}`;
}

const sinDato = (texto = '—') => <span className="text-xs text-amber-700">{texto}</span>;

const columnas = [
  { campo: 'id', titulo: 'N°', className: 'text-stone-500', render: (s) => `#${s.id}` },
  { campo: 'cliente', titulo: 'Cliente', render: (s) => <strong>{s.cliente.nombre}</strong> },
  { campo: 'fecha', titulo: 'Fecha', className: 'whitespace-nowrap', render: (s) => (s.fecha ? formatearFecha(s.fecha) : sinDato('Sin fecha')) },
  { campo: 'horario', titulo: 'Horario', className: 'whitespace-nowrap', render: (s) => formatearHorario(s) || sinDato('Sin horario') },
  { campo: 'cantidadPersonas', titulo: 'Personas', render: (s) => s.cantidadPersonas ?? sinDato() },
  { campo: 'lugar', titulo: 'Lugar', render: (s) => s.lugar || sinDato() },
  { campo: 'estado', titulo: 'Estado', render: (s) => <EstadoBadge estado={s.estado} fechaHabilitada={s.fechaHabilitada} /> }
];

function aFormulario(solicitud) {
  return Object.fromEntries(Object.keys(VACIO).map((campo) => [campo, solicitud[campo] ?? '']));
}

// Registrar solicitudes asociadas a un cliente registrado.
export default function SolicitudesPage({ user, params }) {
  const puedeEditar = esProduccion(user);
  const [filtro, setFiltro] = useState('');
  const { datos: solicitudes, cargando, error, recargar } = useFetch(useCallback(() => solicitudService.listar(filtro), [filtro]));
  const { datos: clientes } = useFetch(useCallback(() => clienteService.listar(), []));
  const { datos: serviciosDisponibles, error: errorServicios } = useFetch(useCallback(() => servicioService.listar(), []));

  const [seleccionada, setSeleccionada] = useState(null);
  const [modo, setModo] = useState(puedeEditar && params.get('nueva') === '1' ? 'nueva' : 'detalle');
  const [form, setForm] = useState({ ...VACIO, clienteId: params.get('cliente') || '' });
  const [errores, setErrores] = useState({});
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [tipoServicioParaAgregar, setTipoServicioParaAgregar] = useState('');
  const [servicioParaAgregar, setServicioParaAgregar] = useState('');
  const [servicioProcesando, setServicioProcesando] = useState('');
  const [resultado, setResultado] = useState(null);
  const idInicial = Number(params.get('id')) || null;

  // Mantiene el detalle sincronizado con la última carga de la lista
  // y abre la solicitud indicada en la URL (p. ej. desde el calendario).
  useEffect(() => {
    const id = seleccionada?.id ?? idInicial;
    if (!id) return;
    const actual = solicitudes.find((s) => s.id === id);
    if (actual && actual !== seleccionada) setSeleccionada(actual);
  }, [solicitudes, seleccionada, idInicial]);

  function limpiarParametros() {
    if (params.toString()) history.replaceState(null, '', '#/solicitudes');
  }

  function seleccionar(solicitud) {
    setSeleccionada(solicitud);
    setModo('detalle');
    setAviso(null);
    setErrores({});
    setResultado(null);
    setTipoServicioParaAgregar('');
    setServicioParaAgregar('');
  }

  function nueva() {
    setSeleccionada(null);
    setResultado(null);
    setForm(VACIO);
    setModo('nueva');
    setAviso(null);
    setErrores({});
  }

  function editar() {
    setResultado(null);
    setForm(aFormulario(seleccionada));
    setModo('editar');
    setAviso(null);
    setErrores({});
  }

  function cancelar() {
    setModo('detalle');
    setErrores({});
    limpiarParametros();
  }

  async function guardar(event) {
    event.preventDefault();
    setGuardando(true);
    setAviso(null);
    try {
      const guardada = modo === 'editar'
        ? await solicitudService.actualizar(seleccionada.id, form)
        : await solicitudService.crear(form);
      setSeleccionada(guardada);
      setModo('detalle');
      setErrores({});
      setAviso({ tipo: 'success', texto: `Solicitud #${guardada.id} guardada.` });
      limpiarParametros();
      recargar();
    } catch (e) {
      setErrores(e.data?.errores || {});
      setAviso({ tipo: 'error', texto: e.message });
    } finally {
      setGuardando(false);
    }
  }

  // Revisa la fecha y horario de la solicitud contra los eventos confirmados.
  async function revisarFecha() {
    setAviso(null);
    try {
      setResultado(await calendarioService.validarFechaSolicitud(seleccionada.id));
    } catch (e) {
      if (e.data?.conflictos) setResultado(e.data);
      else setAviso({ tipo: 'error', texto: e.message });
    }
    recargar();
  }

  async function agregarServicio() {
    if (!seleccionada || !servicioParaAgregar) return;
    setServicioProcesando('agregar');
    setAviso(null);
    try {
      const actualizada = await solicitudService.agregarServicio(seleccionada.id, Number(servicioParaAgregar));
      setSeleccionada(actualizada);
      setServicioParaAgregar('');
      recargar();
    } catch (e) {
      setAviso({ tipo: 'error', texto: e.message });
    } finally {
      setServicioProcesando('');
    }
  }

  async function quitarServicio(servicioId) {
    if (!seleccionada) return;
    setServicioProcesando(`quitar-${servicioId}`);
    setAviso(null);
    try {
      const actualizada = await solicitudService.quitarServicio(seleccionada.id, servicioId);
      setSeleccionada(actualizada);
      recargar();
    } catch (e) {
      setAviso({ tipo: 'error', texto: e.message });
    } finally {
      setServicioProcesando('');
    }
  }

  const campo = (nombre) => ({
    name: nombre,
    value: form[nombre],
    onChange: (e) => setForm({ ...form, [nombre]: e.target.value })
  });

  return (
    <>
      <EncabezadoPagina antetitulo="Gestión" titulo="Solicitudes de eventos" descripcion="Solicitudes registradas y su estado para continuar a cotización.">
        {puedeEditar && <Boton onClick={nueva}><span>Nueva solicitud</span><span aria-hidden="true">+</span></Boton>}
      </EncabezadoPagina>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Panel>
          <div className="flex gap-2.5 border-b border-stone-200 p-3.5">
            <select className="w-auto" aria-label="Filtrar por estado" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendientes de información</option>
              <option value="disponible_cotizar">Disponibles para cotizar</option>
              <option value="confirmado">Fecha confirmada</option>
            </select>
          </div>
          {error && <Aviso tipo="error" className="m-3.5">{error}</Aviso>}
          {cargando && !solicitudes.length
            ? <Vacio>Cargando…</Vacio>
            : <DataTable columnas={columnas} datos={solicitudes} vacio="No hay solicitudes registradas con este filtro." seleccionadoId={seleccionada?.id} onSeleccionar={seleccionar} />}
        </Panel>

        <Panel lateral>
          {modo === 'detalle' ? (
            <DetalleSolicitud
              solicitud={seleccionada}
              aviso={aviso}
              resultado={resultado}
              puedeEditar={puedeEditar}
              serviciosDisponibles={serviciosDisponibles}
              errorServicios={errorServicios}
              tipoServicioParaAgregar={tipoServicioParaAgregar}
              servicioParaAgregar={servicioParaAgregar}
              servicioProcesando={servicioProcesando}
              onTipoServicioParaAgregar={(tipo) => {
                setTipoServicioParaAgregar(tipo);
                setServicioParaAgregar('');
              }}
              onServicioParaAgregar={setServicioParaAgregar}
              onAgregarServicio={agregarServicio}
              onQuitarServicio={quitarServicio}
              onEditar={editar}
              onRevisarFecha={revisarFecha}
            />
          ) : (
            <>
              <Antetitulo className="mb-2">{modo === 'editar' ? `Solicitud #${seleccionada.id}` : 'Nueva solicitud'}</Antetitulo>
              <h2 className="mb-4 text-xl font-bold">{modo === 'editar' ? 'Actualizar solicitud' : 'Registrar solicitud'}</h2>
              {aviso && <Aviso tipo={aviso.tipo}><p>{aviso.texto}</p></Aviso>}
              {!clientes.length && <Aviso tipo="warning"><p>No hay clientes registrados. Registra primero el cliente en la sección Clientes.</p></Aviso>}
              <form className="grid gap-4" onSubmit={guardar} noValidate>
                <Campo etiqueta="Cliente" error={errores.clienteId}>
                  <select {...campo('clienteId')}>
                    <option value="">Selecciona un cliente registrado</option>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </Campo>
                <Campo etiqueta="Fecha" error={errores.fecha}><input type="date" {...campo('fecha')} /></Campo>
                <div className="grid grid-cols-2 gap-3">
                  <Campo etiqueta="Hora de inicio" error={errores.horaInicio}><input type="time" {...campo('horaInicio')} /></Campo>
                  <Campo etiqueta="Hora de término" error={errores.horaFin}><input type="time" {...campo('horaFin')} /></Campo>
                </div>
                <Campo etiqueta="Cantidad de personas" error={errores.cantidadPersonas}><input type="number" min="1" step="1" {...campo('cantidadPersonas')} /></Campo>
                <Campo etiqueta="Lugar" error={errores.lugar}><input type="text" maxLength={255} {...campo('lugar')} /></Campo>
                <p className="text-xs text-stone-500">El cliente es obligatorio. Los servicios se asociarán después de registrar la solicitud. Si falta algún otro dato, la solicitud quedará pendiente hasta completarla.</p>
                <div className="flex gap-2.5">
                  <Boton type="submit" className="flex-1" disabled={guardando}>
                    <span>{modo === 'editar' ? 'Guardar cambios' : 'Registrar solicitud'}</span><span aria-hidden="true">→</span>
                  </Boton>
                  <Boton variante="secundario" onClick={cancelar}>Cancelar</Boton>
                </div>
              </form>
            </>
          )}
        </Panel>
      </div>
    </>
  );
}

function DetalleSolicitud({
  solicitud,
  aviso,
  resultado,
  puedeEditar,
  serviciosDisponibles,
  errorServicios,
  tipoServicioParaAgregar,
  servicioParaAgregar,
  servicioProcesando,
  onTipoServicioParaAgregar,
  onServicioParaAgregar,
  onAgregarServicio,
  onQuitarServicio,
  onEditar,
  onRevisarFecha
}) {
  if (!solicitud) {
    return (
      <>
        <Antetitulo>Detalle</Antetitulo>
        <Vacio>Selecciona una solicitud para ver su detalle.</Vacio>
      </>
    );
  }
  const s = solicitud;
  const confirmada = s.estado === 'confirmado';
  const puedeRevisarFecha = !confirmada && s.fecha && s.horaInicio && s.horaFin;
  const servicios = s.servicios || [];
  const idsAsociados = new Set(servicios.map((servicio) => servicio.id));
  const serviciosActivos = serviciosDisponibles.filter((servicio) => servicio.tipoServicio?.activo !== false);
  const opcionesDisponibles = serviciosActivos.filter((servicio) => !idsAsociados.has(servicio.id));
  const tiposDisponibles = Array.from(
    new Map(serviciosActivos.map((servicio) => [servicio.tipoServicio.id, servicio.tipoServicio])).values()
  ).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const serviciosDelTipo = opcionesDisponibles.filter(
    (servicio) => servicio.tipoServicioId === Number(tipoServicioParaAgregar)
  );
  const servicioSeleccionado = serviciosDelTipo.find((servicio) => servicio.id === Number(servicioParaAgregar));
  return (
    <>
      <Antetitulo className="mb-2">Solicitud #{s.id}</Antetitulo>
      <h2 className="mb-2 text-xl font-bold">{s.cliente.nombre}</h2>
      <div className="mb-4" data-estado-detalle><EstadoBadge estado={s.estado} fechaHabilitada={s.fechaHabilitada} /></div>
      {aviso && <Aviso tipo={aviso.tipo}><p>{aviso.texto}</p></Aviso>}
      {confirmada ? (
        <Aviso tipo="success" titulo="Evento con fecha confirmada">
          <p>Sus datos ya no se editan desde la solicitud.</p>
        </Aviso>
      ) : s.faltantes.length ? (
        <Aviso tipo="warning" titulo="Falta información para pasar a cotización">
          <ul>{s.faltantes.map((f) => <li key={f}>{f}</li>)}</ul>
        </Aviso>
      ) : (
        <Aviso tipo="success" titulo="Información completa">
          <p>La solicitud está disponible para continuar al proceso de cotización.</p>
        </Aviso>
      )}
      <ListaDatos datos={[
        ['Fecha', s.fecha ? formatearFecha(s.fecha) : '—'],
        ['Horario', formatearHorario(s) || '—'],
        ['Cantidad de personas', s.cantidadPersonas ?? '—'],
        ['Lugar', s.lugar || '—']
      ]} />
      <div className="mb-4 border-t border-stone-200 pt-4">
        <Antetitulo className="mb-2">Servicios necesarios</Antetitulo>
        {servicios.length ? (
          <ul className="mb-3 grid gap-2 text-sm">
            {servicios.map((servicio) => (
              <li key={servicio.id} className="flex items-center justify-between gap-3 rounded-md bg-stone-50 px-3 py-2">
                <div className="min-w-0">
                  <span className="block font-medium">{servicio.nombre}</span>
                  <span className="block text-xs text-stone-500">{textoPrecioServicio(servicio.versionServicio)}</span>
                </div>
                {puedeEditar && !confirmada && (
                  <Boton
                    variante="enlace"
                    disabled={Boolean(servicioProcesando)}
                    onClick={() => onQuitarServicio(servicio.id)}
                  >
                    {servicioProcesando === `quitar-${servicio.id}` ? 'Quitando…' : 'Quitar'}
                  </Boton>
                )}
              </li>
            ))}
          </ul>
        ) : <p className="mb-3 text-sm text-stone-500">No hay servicios asociados.</p>}
        {errorServicios && <Aviso tipo="error" className="mb-3">{errorServicios}</Aviso>}
        {puedeEditar && !confirmada && (
          <div className="grid gap-2.5">
            <select
              aria-label="Tipo de servicio para agregar"
              value={tipoServicioParaAgregar}
              onChange={(event) => onTipoServicioParaAgregar(event.target.value)}
              disabled={Boolean(servicioProcesando)}
            >
              <option value="">Selecciona un tipo de servicio</option>
              {tiposDisponibles.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>)}
            </select>
            <div className="flex items-start gap-2.5">
              <div className="min-w-0 flex-1">
                <select
                  className="h-10 w-full"
                  aria-label="Servicio para agregar"
                  value={servicioParaAgregar}
                  onChange={(event) => onServicioParaAgregar(event.target.value)}
                  disabled={!tipoServicioParaAgregar || !serviciosDelTipo.length || Boolean(servicioProcesando)}
                >
                  <option value="">
                    {tipoServicioParaAgregar && !serviciosDelTipo.length
                      ? 'No hay más servicios disponibles de este tipo'
                      : 'Selecciona un servicio activo'}
                  </option>
                  {serviciosDelTipo.map((servicio) => <option key={servicio.id} value={servicio.id}>{servicio.nombre}</option>)}
                </select>
                {servicioSeleccionado && (
                  <p className="mt-1 text-xs text-stone-500">{textoPrecioServicio(servicioSeleccionado.versionActiva)}</p>
                )}
              </div>
              <Boton
                variante="secundario"
                className="h-10 shrink-0"
                disabled={!servicioParaAgregar || Boolean(servicioProcesando)}
                onClick={onAgregarServicio}
              >
                {servicioProcesando === 'agregar' ? 'Agregando…' : 'Agregar'}
              </Boton>
            </div>
          </div>
        )}
        <div className="mt-2 flex items-center justify-between border-t border-stone-200 pt-3 text-sm">
          <span className="text-stone-500">Costo estimado</span>
          <strong>Pendiente de cálculo</strong>
        </div>
      </div>
      <ResultadoDisponibilidad resultado={resultado} />
      <div className="grid gap-2.5">
        {puedeEditar && !confirmada && (
          <Boton onClick={onEditar}><span>{s.faltantes.length ? 'Completar información' : 'Editar solicitud'}</span><span aria-hidden="true">→</span></Boton>
        )}
        {puedeRevisarFecha && <Boton variante="secundario" onClick={onRevisarFecha}>Revisar disponibilidad de la fecha</Boton>}
      </div>
    </>
  );
}
