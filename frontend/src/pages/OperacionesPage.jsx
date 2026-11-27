import { useCallback, useEffect, useState } from 'react';
import EncabezadoPagina from '../components/EncabezadoPagina.jsx';
import Aviso from '../components/ui/Aviso.jsx';
import Boton from '../components/ui/Boton.jsx';
import Campo from '../components/ui/Campo.jsx';
import Panel from '../components/ui/Panel.jsx';
import Vacio from '../components/ui/Vacio.jsx';
import { useFetch } from '../hooks/useFetch.js';
import * as operacionesService from '../services/operacionesService.js';
import * as inventarioService from '../services/inventarioService.js';

const etiqueta = (texto = '') => texto.replaceAll('_', ' ');
const moneda = (valor) => Number(valor).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });

function ListaEstado({
  titulo,
  elementos,
  campoEstado,
  alCambiar,
  textoVacio,
  deshabilitado = false,
  puedeCambiar = true,
  mostrarResponsables = false,
  textoPendiente = 'Marcar completado',
  textoCompletada = 'Reabrir'
}) {
  return (
    <section className="grid gap-2">
      <h3 className="font-bold">{titulo}</h3>
      {elementos.length === 0 ? <p className="text-sm text-stone-500">{textoVacio}</p> : (
        <ul className="grid gap-2">
          {elementos.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-stone-200 p-3 text-sm">
              <span>
                <strong>{item.titulo || item.concepto || item.recurso?.nombre || item.inventario?.nombre}</strong>
                {item.cantidad !== undefined && <span className="ml-2 text-stone-600">· {item.cantidad} unidad(es)</span>}
                {item.descripcion && <span className="block text-stone-500">{item.descripcion}</span>}
                {mostrarResponsables && (
                  <span className="block text-stone-500">
                    Responsables: {item.responsables?.length
                      ? item.responsables.map(({ personalEvento }) => personalEvento.personal.nombre).join(', ')
                      : 'sin responsables registrados'}
                  </span>
                )}
                {item.monto !== undefined && <span className="ml-2 text-stone-600">{moneda(item.monto)}</span>}
                {item.inventario && !item.inventario.reutilizable && <span className="ml-2 text-stone-500">· consumido</span>}
                {item.devueltoEn !== undefined && (!item.inventario || item.inventario.reutilizable) && <span className="ml-2 text-stone-500">· {item.devueltoEn ? 'devuelto' : 'pendiente de devolución'}</span>}
              </span>
              {campoEstado && puedeCambiar && (
                <Boton variante="secundario" className="py-1.5!" disabled={deshabilitado} onClick={() => alCambiar(item)}>
                  {item[campoEstado] === 'pendiente' ? textoPendiente : textoCompletada}
                </Boton>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function agruparReservasInventario(reservas = []) {
  const grupos = new Map();
  for (const reserva of reservas) {
    const inventarioId = reserva.inventario.id;
    let grupo = grupos.get(inventarioId);
    if (!grupo) {
      grupo = { inventario: reserva.inventario, cantidad: 0, reservas: [] };
      grupos.set(inventarioId, grupo);
    }
    grupo.cantidad += reserva.cantidad;
    grupo.reservas.push(reserva);
  }
  return [...grupos.values()];
}

export default function OperacionesPage({ user }) {
  const esAdmin = user?.role === 'admin';
  const puedeAprobar = ['manager', 'admin'].includes(user?.role);
  const eventosFetch = useFetch(useCallback(() => operacionesService.listarEventos(), []));
  const [eventoId, setEventoId] = useState('');
  const eventoFetch = useFetch(
    useCallback(() => eventoId ? operacionesService.obtenerOperacion(eventoId) : Promise.resolve(null), [eventoId]),
    null
  );
  const [tareaForm, setTareaForm] = useState({ titulo: '', descripcion: '', responsablesIds: [] });
  const [pagoForm, setPagoForm] = useState({ concepto: '', monto: '' });
  const [encuesta, setEncuesta] = useState({ encuestaConforme: '', encuestaComentario: '' });
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!eventoId && eventosFetch.datos.length) setEventoId(String(eventosFetch.datos[0].id));
  }, [eventoId, eventosFetch.datos]);

  useEffect(() => {
    setEncuesta({
      encuestaConforme: eventoFetch.datos?.cierre?.encuestaConforme === true
        ? 'si'
        : eventoFetch.datos?.cierre?.encuestaConforme === false ? 'no' : '',
      encuestaComentario: eventoFetch.datos?.cierre?.encuestaComentario || ''
    });
  }, [eventoFetch.datos]);

  const evento = eventoFetch.datos;
  const cerrado = evento?.cierre?.estado === 'aprobado';

  async function ejecutar(accion, mensaje) {
    setOcupado(true);
    setAviso(null);
    try {
      await accion();
      setAviso({ tipo: 'success', texto: mensaje });
      await Promise.all([eventoFetch.recargar(), eventosFetch.recargar()]);
      return true;
    } catch (error) {
      const pendientes = error.data?.pendientes;
      setAviso({
        tipo: 'error',
        texto: pendientes?.length ? `${error.message} ${pendientes.join(' ')}` : error.message
      });
      await eventoFetch.recargar();
      return false;
    } finally {
      setOcupado(false);
    }
  }

  const opcionesEvento = eventosFetch.datos.map((item) => (
    <option key={item.id} value={item.id}>
      #{item.id} · {item.cliente.nombre} · {item.fecha} {item.horaInicio}-{item.horaFin}
    </option>
  ));
  const objetosAgrupados = agruparReservasInventario(evento?.reservasInventario);

  return (
    <>
      <EncabezadoPagina
        antetitulo="Cierre de eventos"
        titulo="Operaciones"
        descripcion="Controla devoluciones, tareas, pagos y aprobación de cierre de eventos confirmados."
      />
      {aviso && <Aviso tipo={aviso.tipo} className="mb-4"><p>{aviso.texto}</p></Aviso>}
      {eventosFetch.error && <Aviso tipo="error" className="mb-4">{eventosFetch.error}</Aviso>}

      <Panel className="mb-4">
        <Campo etiqueta="Evento confirmado">
          <select
            aria-label="Evento confirmado"
            value={eventoId}
            onChange={(e) => {
              setEventoId(e.target.value);
              setTareaForm({ ...tareaForm, responsablesIds: [] });
            }}
          >
            <option value="">Seleccionar evento</option>
            {opcionesEvento}
          </select>
        </Campo>
        {eventosFetch.cargando && <p className="mt-3 text-sm text-stone-500">Cargando eventos…</p>}
        {!eventosFetch.cargando && eventosFetch.datos.length === 0 && <Vacio>No hay eventos confirmados disponibles.</Vacio>}
      </Panel>

      {evento && (
        <div className="grid items-start gap-4">
          <Panel>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-stone-500">Evento #{evento.id}</p>
                <h2 className="text-xl font-bold">{evento.cliente.nombre}</h2>
                <p className="text-sm text-stone-600">{evento.fecha} · {evento.horaInicio}-{evento.horaFin} · {evento.lugar || 'Sin lugar'}</p>
              </div>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold">{etiqueta(evento.cierre?.estado || 'sin iniciar cierre')}</span>
            </div>

            <ListaEstado
              titulo="Espacios reservados"
              elementos={evento.reservasRecursos.filter((reserva) => reserva.recurso.tipo === 'espacio')}
              textoVacio="Este evento no tiene espacios reservados."
            />
            {evento.reservasRecursos.some((reserva) => reserva.recurso.tipo === 'espacio' && !reserva.devueltoEn) && (
              <ul className="mt-2 grid gap-2">
                {evento.reservasRecursos.filter((reserva) => reserva.recurso.tipo === 'espacio' && !reserva.devueltoEn).map((reserva) => (
                  <li key={reserva.id} className="flex items-center justify-between rounded border border-stone-200 p-3 text-sm">
                    <span>{reserva.recurso.nombre} · {reserva.recurso.ubicacion || 'Ubicación no registrada'}</span>
                    {esAdmin && !cerrado && <Boton variante="secundario" disabled={ocupado} onClick={() => ejecutar(() => operacionesService.devolverRecurso(reserva.id), 'Devolución registrada.')}>Marcar devuelto</Boton>}
                  </li>
                ))}
              </ul>
            )}
            <section className="mt-4 grid gap-2">
              <h3 className="font-bold">Objetos reservados desde Inventario</h3>
              {objetosAgrupados.length === 0 ? (
                <p className="text-sm text-stone-500">Este evento no tiene objetos reservados.</p>
              ) : (
                <ul className="grid gap-2">
                  {objetosAgrupados.map((grupo) => {
                    const tieneDevolucionesPendientes = grupo.inventario.reutilizable
                      && grupo.reservas.some((reserva) => !reserva.devueltoEn);
                    return (
                      <li key={grupo.inventario.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-stone-200 p-3 text-sm">
                        <span>
                          <strong>{grupo.inventario.nombre}</strong>
                          <span className="ml-2 text-stone-600">· {grupo.cantidad} unidad(es)</span>
                          {!grupo.inventario.reutilizable && <span className="ml-2 text-stone-500">· consumido</span>}
                          {grupo.inventario.reutilizable && !tieneDevolucionesPendientes && <span className="ml-2 text-stone-500">· devuelto</span>}
                        </span>
                        {esAdmin && !cerrado && tieneDevolucionesPendientes && (
                          <Boton
                            variante="secundario"
                            disabled={ocupado}
                            onClick={() => ejecutar(
                              () => inventarioService.devolverReservasGrupo(evento.id, grupo.inventario.id),
                              `Devolución de «${grupo.inventario.nombre}» registrada.`
                            )}
                          >
                            Marcar devuelto
                          </Boton>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="mt-6 grid gap-3 border-t border-stone-200 pt-5">
              <h3 className="font-bold">Tareas del evento</h3>
              <p className="text-sm text-stone-600">Indica quiénes realizarán cada tarea y confirma cuando el trabajo esté terminado.</p>
              {esAdmin && !cerrado && (
                <form className="grid max-w-2xl gap-3" onSubmit={async (e) => {
                    e.preventDefault();
                    const guardada = await ejecutar(() => operacionesService.crearTarea(evento.id, {
                      ...tareaForm,
                      responsablesIds: tareaForm.responsablesIds.map(Number)
                    }), 'Tarea asignada al personal seleccionado.');
                    if (guardada) setTareaForm({ titulo: '', descripcion: '', responsablesIds: [] });
                  }}>
                  <Campo etiqueta="Nueva tarea"><input required maxLength={150} value={tareaForm.titulo} onChange={(e) => setTareaForm({ ...tareaForm, titulo: e.target.value })} /></Campo>
                  <Campo etiqueta="Descripción"><input maxLength={2000} value={tareaForm.descripcion} onChange={(e) => setTareaForm({ ...tareaForm, descripcion: e.target.value })} /></Campo>
                  {evento.personalAsignado.length === 0 ? (
                    <p className="text-sm text-amber-800">Primero asigna personal a este evento desde la sección Personal.</p>
                  ) : (
                    <Campo etiqueta="Empleados responsables">
                      <select
                        multiple
                        required
                        size={Math.min(Math.max(evento.personalAsignado.length, 2), 5)}
                        value={tareaForm.responsablesIds}
                        onChange={(e) => setTareaForm({
                          ...tareaForm,
                          responsablesIds: [...e.target.selectedOptions].map((opcion) => opcion.value)
                        })}
                        aria-label="Empleados responsables de la tarea"
                      >
                        {evento.personalAsignado.map((asignacion) => (
                          <option key={asignacion.id} value={asignacion.id}>
                            {asignacion.personal.nombre}{asignacion.funcion ? ` · ${asignacion.funcion}` : ''}
                          </option>
                        ))}
                      </select>
                      <span className="font-normal">Mantén Ctrl (Windows) o Cmd (Mac) para elegir a varias personas.</span>
                    </Campo>
                  )}
                  <Boton type="submit" disabled={ocupado || !evento.personalAsignado.length || !tareaForm.responsablesIds.length}>Agregar tarea</Boton>
                </form>
              )}
              <ListaEstado
                titulo="Seguimiento del trabajo"
                elementos={evento.tareas}
                campoEstado="estado"
                puedeCambiar={esAdmin && !cerrado}
                deshabilitado={ocupado}
                mostrarResponsables
                textoPendiente="Confirmar trabajo terminado"
                textoCompletada="Reabrir tarea"
                alCambiar={(tarea) => ejecutar(() => operacionesService.alternarTarea(tarea.id), 'Estado de tarea actualizado.')}
                textoVacio="No hay tareas registradas para este evento."
              />
            </section>

            {esAdmin && !cerrado && (
              <div className="mt-6 grid gap-6 border-t border-stone-200 pt-5 lg:grid-cols-2">
                <section className="grid content-start gap-3">
                  <h3 className="font-bold">Pagos</h3>
                  <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(e) => {
                    e.preventDefault();
                    ejecutar(() => operacionesService.crearPago(evento.id, { ...pagoForm, monto: Number(pagoForm.monto) }), 'Pago agregado.');
                    setPagoForm({ concepto: '', monto: '' });
                  }}>
                    <Campo etiqueta="Concepto"><input required maxLength={150} value={pagoForm.concepto} onChange={(e) => setPagoForm({ ...pagoForm, concepto: e.target.value })} /></Campo>
                    <Campo etiqueta="Monto CLP"><input required type="number" min="1" step="1" value={pagoForm.monto} onChange={(e) => setPagoForm({ ...pagoForm, monto: e.target.value })} /></Campo>
                    <div className="self-end"><Boton type="submit" disabled={ocupado}>Agregar</Boton></div>
                  </form>
                  <ListaEstado titulo="Seguimiento" elementos={evento.pagos} campoEstado="estado" deshabilitado={ocupado} alCambiar={(pago) => ejecutar(() => operacionesService.alternarPago(pago.id), 'Estado de pago actualizado.')} textoVacio="No hay pagos registrados." />
                </section>
              </div>
            )}

            {esAdmin && !cerrado && (
              <section className="mt-6 grid gap-3 border-t border-stone-200 pt-5">
                <h3 className="font-bold">Solicitar aprobación del cierre</h3>
                <p className="text-sm text-stone-600">El sistema verificará devoluciones, tareas, pagos y conformidad de la evaluación del cliente.</p>
                <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => {
                  e.preventDefault();
                  ejecutar(() => operacionesService.solicitarCierre(evento.id, {
                    encuestaConforme: encuesta.encuestaConforme === 'si',
                    encuestaComentario: encuesta.encuestaComentario
                  }), 'Cierre enviado a revisión de Gerencia.');
                }}>
                  <Campo etiqueta="¿Evaluación del cliente conforme?"><select required value={encuesta.encuestaConforme} onChange={(e) => setEncuesta({ ...encuesta, encuestaConforme: e.target.value })}><option value="">Selecciona</option><option value="si">Sí, conforme</option><option value="no">No conforme</option></select></Campo>
                  <Campo etiqueta="Comentario de la encuesta"><textarea maxLength={2000} rows="2" value={encuesta.encuestaComentario} onChange={(e) => setEncuesta({ ...encuesta, encuestaComentario: e.target.value })} /></Campo>
                  <div className="sm:col-span-2"><Boton type="submit" disabled={ocupado}>Validar condiciones y enviar</Boton></div>
                </form>
              </section>
            )}

            {evento.cierre && (
              <section className="mt-6 grid gap-3 border-t border-stone-200 pt-5">
                <h3 className="font-bold">Estado de cierre</h3>
                {Object.values(evento.condicionesCierre).every(Boolean)
                  ? <p className="text-sm text-stone-600">El cierre se ha cumplido exitosamente.</p>
                  : <p className="text-sm text-stone-600">El cierre aún no se ha cumplido.</p>}

                {evento.cierre.encuestaComentario && <p className="text-sm text-stone-600">Encuesta: {evento.cierre.encuestaComentario}</p>}
                {evento.cierre.aprobadoPor && <p className="text-sm text-stone-600">Aprobado por {evento.cierre.aprobadoPor.name}.</p>}
                {puedeAprobar && evento.cierre.estado === 'revision_gerencia' && (
                  <Boton disabled={ocupado} onClick={() => ejecutar(() => operacionesService.aprobarCierre(evento.id), 'Cierre final aprobado por Gerencia.')}>Aprobar cierre final</Boton>
                )}
              </section>
            )}
          </Panel>
        </div>
      )}
      {!evento && eventoId && eventoFetch.error && <Aviso tipo="error">{eventoFetch.error}</Aviso>}
    </>
  );
}