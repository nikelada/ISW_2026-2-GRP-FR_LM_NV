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
import { formatearFecha, formatearHorario } from '../utils/fechas.js';
import { esProduccion } from '../utils/roles.js';

const VACIO = { clienteId: '', fecha: '', horaInicio: '', horaFin: '', cantidadPersonas: '', lugar: '', servicios: '' };

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

  const [seleccionada, setSeleccionada] = useState(null);
  const [modo, setModo] = useState(puedeEditar && params.get('nueva') === '1' ? 'nueva' : 'detalle');
  const [form, setForm] = useState({ ...VACIO, clienteId: params.get('cliente') || '' });
  const [errores, setErrores] = useState({});
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);
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
            <DetalleSolicitud solicitud={seleccionada} aviso={aviso} resultado={resultado} puedeEditar={puedeEditar} onEditar={editar} onRevisarFecha={revisarFecha} />
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
                <Campo etiqueta="Servicios necesarios" error={errores.servicios}><textarea placeholder="Ej.: banquetería, sonido, iluminación" {...campo('servicios')} /></Campo>
                <p className="text-xs text-stone-500">El cliente es obligatorio. Si falta algún otro dato, la solicitud quedará pendiente hasta completarla.</p>
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

function DetalleSolicitud({ solicitud, aviso, resultado, puedeEditar, onEditar, onRevisarFecha }) {
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
        ['Lugar', s.lugar || '—'],
        ['Servicios necesarios', s.servicios || '—']
      ]} />
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
