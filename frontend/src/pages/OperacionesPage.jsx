import { useCallback, useEffect, useState } from 'react';
import EncabezadoPagina from '../components/EncabezadoPagina.jsx';
import Aviso from '../components/ui/Aviso.jsx';
import Boton from '../components/ui/Boton.jsx';
import Campo from '../components/ui/Campo.jsx';
import Panel from '../components/ui/Panel.jsx';
import Vacio from '../components/ui/Vacio.jsx';
import { useFetch } from '../hooks/useFetch.js';
import * as operacionesService from '../services/operacionesService.js';

const RECURSO_VACIO = { nombre: '', tipo: 'equipo', categoria: '', estado: 'disponible' };
const ESTADOS_RECURSO = ['disponible', 'en_uso', 'mantencion', 'fuera_servicio'];
const TIPOS_RECURSO = ['equipo', 'espacio', 'vehiculo'];

const etiqueta = (texto = '') => texto.replaceAll('_', ' ');
const moneda = (valor) => Number(valor).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });

function ListaEstado({ titulo, elementos, campoEstado, alCambiar, textoVacio, deshabilitado = false }) {
  return (
    <section className="grid gap-2">
      <h3 className="font-bold">{titulo}</h3>
      {elementos.length === 0 ? <p className="text-sm text-stone-500">{textoVacio}</p> : (
        <ul className="grid gap-2">
          {elementos.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-stone-200 p-3 text-sm">
              <span>
                <strong>{item.titulo || item.concepto || item.personal?.nombre || item.recurso?.nombre}</strong>
                {item.funcion && <span className="text-stone-500"> · {item.funcion}</span>}
                {item.descripcion && <span className="block text-stone-500">{item.descripcion}</span>}
                {item.monto !== undefined && <span className="ml-2 text-stone-600">{moneda(item.monto)}</span>}
                {item.personal?.esContacto && <span className="ml-2 text-teal-700">· contacto guardado</span>}
                {item.devueltoEn !== undefined && <span className="ml-2 text-stone-500">· {item.devueltoEn ? 'devuelto' : 'pendiente de devolución'}</span>}
              </span>
              {campoEstado && (
                <Boton variante="secundario" className="py-1.5!" disabled={deshabilitado} onClick={() => alCambiar(item)}>
                  {item[campoEstado] === 'pendiente' ? 'Marcar completado' : 'Reabrir'}
                </Boton>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
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
  const recursosFetch = useFetch(
    useCallback(() => esAdmin ? operacionesService.listarRecursos() : Promise.resolve([]), [esAdmin])
  );
  const contactosFetch = useFetch(
    useCallback(() => esAdmin ? operacionesService.listarContactos() : Promise.resolve([]), [esAdmin])
  );
  const [recursoForm, setRecursoForm] = useState(RECURSO_VACIO);
  const [recursoEditando, setRecursoEditando] = useState(null);
  const [consultaTipo, setConsultaTipo] = useState('equipo');
  const [consultaCategoria, setConsultaCategoria] = useState('');
  const [disponibilidad, setDisponibilidad] = useState([]);
  const [consultaRealizada, setConsultaRealizada] = useState(false);
  const [personalForm, setPersonalForm] = useState({ personalId: '', nombre: '', telefono: '', correo: '', funcion: '' });
  const [tareaForm, setTareaForm] = useState({ titulo: '', descripcion: '' });
  const [pagoForm, setPagoForm] = useState({ concepto: '', monto: '' });
  const [encuesta, setEncuesta] = useState({ encuestaConforme: '', encuestaComentario: '' });
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!eventoId && eventosFetch.datos.length) setEventoId(String(eventosFetch.datos[0].id));
  }, [eventoId, eventosFetch.datos]);

  useEffect(() => {
    setDisponibilidad([]);
    setConsultaRealizada(false);
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
      setDisponibilidad([]);
      setConsultaRealizada(false);
      setAviso({ tipo: 'success', texto: mensaje });
      await Promise.all([eventoFetch.recargar(), recursosFetch.recargar(), contactosFetch.recargar(), eventosFetch.recargar()]);
    } catch (error) {
      const pendientes = error.data?.pendientes;
      setAviso({
        tipo: 'error',
        texto: pendientes?.length ? `${error.message} ${pendientes.join(' ')}` : error.message
      });
      await eventoFetch.recargar();
    } finally {
      setOcupado(false);
    }
  }

  async function guardarRecurso(event) {
    event.preventDefault();
    const datos = {
      ...recursoForm,
      nombre: recursoForm.nombre.trim(),
      categoria: recursoForm.categoria.trim()
    };
    await ejecutar(
      () => recursoEditando
        ? operacionesService.actualizarRecurso(recursoEditando, datos)
        : operacionesService.crearRecurso(datos),
      recursoEditando ? 'Recurso actualizado.' : 'Recurso creado.'
    );
    setRecursoForm(RECURSO_VACIO);
    setRecursoEditando(null);
  }

  async function buscarDisponibilidad(event) {
    event.preventDefault();
    setAviso(null);
    setDisponibilidad([]);
    setConsultaRealizada(false);
    if (!evento?.fecha || !evento.horaInicio || !evento.horaFin) {
      setAviso({ tipo: 'error', texto: 'El evento debe tener fecha y horario para consultar recursos.' });
      return;
    }
    try {
      setDisponibilidad(await operacionesService.consultarDisponibilidad({
        fecha: evento.fecha,
        horaInicio: evento.horaInicio,
        horaFin: evento.horaFin,
        tipo: consultaTipo,
        categoria: consultaCategoria,
        solicitudId: evento.id
      }));
      setConsultaRealizada(true);
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.message });
    }
  }

  const opcionesEvento = eventosFetch.datos.map((item) => (
    <option key={item.id} value={item.id}>
      #{item.id} · {item.cliente.nombre} · {item.fecha} {item.horaInicio}-{item.horaFin}
    </option>
  ));

  return (
    <>
      <EncabezadoPagina
        antetitulo="Preparación y cierre"
        titulo="Operaciones de eventos"
        descripcion="Recursos, personal eventual y controles para gestionar el cierre de eventos confirmados."
      />
      {aviso && <Aviso tipo={aviso.tipo} className="mb-4"><p>{aviso.texto}</p></Aviso>}
      {eventosFetch.error && <Aviso tipo="error" className="mb-4">{eventosFetch.error}</Aviso>}

      {esAdmin && (
        <Panel className="mb-4">
          <h2 className="mb-4 text-xl font-bold">{recursoEditando ? 'Actualizar recurso' : 'Registrar recurso'}</h2>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={guardarRecurso}>
            <Campo etiqueta="Nombre"><input required maxLength={150} value={recursoForm.nombre} onChange={(e) => setRecursoForm({ ...recursoForm, nombre: e.target.value })} /></Campo>
            <Campo etiqueta="Tipo"><select value={recursoForm.tipo} onChange={(e) => setRecursoForm({ ...recursoForm, tipo: e.target.value })}>{TIPOS_RECURSO.map((tipo) => <option key={tipo} value={tipo}>{etiqueta(tipo)}</option>)}</select></Campo>
            <Campo etiqueta="Categoría"><input required maxLength={100} value={recursoForm.categoria} onChange={(e) => setRecursoForm({ ...recursoForm, categoria: e.target.value })} /></Campo>
            <Campo etiqueta="Estado"><select value={recursoForm.estado} onChange={(e) => setRecursoForm({ ...recursoForm, estado: e.target.value })}>{ESTADOS_RECURSO.map((estado) => <option key={estado} value={estado}>{etiqueta(estado)}</option>)}</select></Campo>
            <div className="flex gap-2 md:col-span-4">
              <Boton type="submit" disabled={ocupado}>{recursoEditando ? 'Guardar cambios' : 'Agregar recurso'}</Boton>
              {recursoEditando && <Boton variante="secundario" onClick={() => { setRecursoEditando(null); setRecursoForm(RECURSO_VACIO); }}>Cancelar</Boton>}
            </div>
          </form>
          {recursosFetch.error && <Aviso tipo="error" className="mt-3">{recursosFetch.error}</Aviso>}
          {recursosFetch.datos.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-stone-200 text-stone-500"><th className="p-2">Recurso</th><th className="p-2">Tipo / categoría</th><th className="p-2">Estado</th><th className="p-2"></th></tr></thead>
                <tbody>
                  {recursosFetch.datos.map((recurso) => (
                    <tr key={recurso.id} className="border-b border-stone-100">
                      <td className="p-2 font-semibold">{recurso.nombre}</td>
                      <td className="p-2">{etiqueta(recurso.tipo)} · {recurso.categoria}</td>
                      <td className="p-2">{etiqueta(recurso.estado)}</td>
                      <td className="p-2 text-right"><Boton variante="enlace" onClick={() => { setRecursoEditando(recurso.id); setRecursoForm({ nombre: recurso.nombre, tipo: recurso.tipo, categoria: recurso.categoria, estado: recurso.estado }); }}>Editar</Boton></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      <Panel className="mb-4">
        <Campo etiqueta="Evento confirmado">
          <select aria-label="Evento confirmado" value={eventoId} onChange={(e) => setEventoId(e.target.value)}>
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

            {esAdmin && !cerrado && (
              <section className="mb-6 grid gap-3 border-b border-stone-200 pb-5">
                <h3 className="font-bold">Consultar y reservar recursos</h3>
                <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={buscarDisponibilidad}>
                  <Campo etiqueta="Tipo de recurso"><select value={consultaTipo} onChange={(e) => setConsultaTipo(e.target.value)}>{TIPOS_RECURSO.map((tipo) => <option key={tipo} value={tipo}>{etiqueta(tipo)}</option>)}</select></Campo>
                  <Campo etiqueta="Categoría (opcional)"><input value={consultaCategoria} onChange={(e) => setConsultaCategoria(e.target.value)} /></Campo>
                  <div className="self-end"><Boton type="submit">Consultar horario</Boton></div>
                </form>
                {disponibilidad.length > 0 && (
                  <ul className="grid gap-2">
                    {disponibilidad.map((recurso) => (
                      <li key={recurso.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-stone-200 p-3 text-sm">
                        <span><strong>{recurso.nombre}</strong> · {recurso.categoria}
                          {recurso.motivo && <span className="block text-amber-800">{recurso.motivo}</span>}
                        </span>
                        <span className={recurso.disponible ? 'font-semibold text-teal-800' : 'font-semibold text-stone-500'}>{recurso.disponible ? 'Disponible' : 'No disponible'}</span>
                        {recurso.disponible && <Boton disabled={ocupado} onClick={() => ejecutar(() => operacionesService.reservarRecurso(evento.id, recurso.id), 'Recurso reservado para el evento.')}>Reservar</Boton>}
                      </li>
                    ))}
                  </ul>
                )}
                {consultaRealizada && disponibilidad.length === 0 && <p className="text-sm text-stone-500">No se encontraron recursos que coincidan con el filtro.</p>}
              </section>
            )}

            <ListaEstado
              titulo="Recursos reservados"
              elementos={evento.reservasRecursos}
              textoVacio="Este evento no tiene recursos reservados."
            />
            {evento.reservasRecursos.some((reserva) => !reserva.devueltoEn) && (
              <ul className="mt-2 grid gap-2">
                {evento.reservasRecursos.filter((reserva) => !reserva.devueltoEn).map((reserva) => (
                  <li key={reserva.id} className="flex items-center justify-between rounded border border-stone-200 p-3 text-sm">
                    <span>{reserva.recurso.nombre} · {reserva.recurso.tipo}</span>
                    {esAdmin && !cerrado && <Boton variante="secundario" disabled={ocupado} onClick={() => ejecutar(() => operacionesService.devolverRecurso(reserva.id), 'Devolución registrada.')}>Marcar devuelto</Boton>}
                  </li>
                ))}
              </ul>
            )}

            {esAdmin && !cerrado && (
              <div className="mt-6 grid gap-6 border-t border-stone-200 pt-5 lg:grid-cols-2">
                <section className="grid content-start gap-3">
                  <h3 className="font-bold">Asignar personal eventual</h3>
                  <form className="grid gap-3" onSubmit={(e) => {
                    e.preventDefault();
                    const datos = personalForm.personalId
                      ? { personalId: Number(personalForm.personalId), funcion: personalForm.funcion }
                      : personalForm;
                    ejecutar(() => operacionesService.asignarPersonal(evento.id, datos), 'Personal asignado.');
                    setPersonalForm({ personalId: '', nombre: '', telefono: '', correo: '', funcion: '' });
                  }}>
                    <Campo etiqueta="Usar contacto guardado"><select value={personalForm.personalId} onChange={(e) => setPersonalForm({ ...personalForm, personalId: e.target.value })}><option value="">Crear nuevo personal</option>{contactosFetch.datos.map((contacto) => <option key={contacto.id} value={contacto.id}>{contacto.nombre}</option>)}</select></Campo>
                    {!personalForm.personalId && <>
                      <Campo etiqueta="Nombre"><input required value={personalForm.nombre} onChange={(e) => setPersonalForm({ ...personalForm, nombre: e.target.value })} /></Campo>
                      <Campo etiqueta="Teléfono"><input value={personalForm.telefono} onChange={(e) => setPersonalForm({ ...personalForm, telefono: e.target.value })} /></Campo>
                      <Campo etiqueta="Correo"><input type="email" value={personalForm.correo} onChange={(e) => setPersonalForm({ ...personalForm, correo: e.target.value })} /></Campo>
                    </>}
                    <Campo etiqueta="Función en el evento"><input value={personalForm.funcion} onChange={(e) => setPersonalForm({ ...personalForm, funcion: e.target.value })} /></Campo>
                    <Boton type="submit" disabled={ocupado}>Asignar</Boton>
                  </form>
                  {evento.personalAsignado.length === 0
                    ? <p className="text-sm text-stone-500">No hay personal eventual asignado.</p>
                    : (
                    <ul className="grid gap-2">
                      {evento.personalAsignado.map((asignacion) => (
                        <li key={asignacion.id} className="flex items-center justify-between rounded border border-stone-200 p-3 text-sm">
                          <span><strong>{asignacion.personal.nombre}</strong>{asignacion.funcion && ` · ${asignacion.funcion}`}{asignacion.personal.esContacto && <small className="block text-teal-700">Contacto guardado para futuros eventos</small>}</span>
                          {!cerrado && <Boton variante="enlace" onClick={() => ejecutar(() => operacionesService.quitarPersonal(asignacion.id), 'Asignación eliminada.')}>Quitar</Boton>}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="grid content-start gap-5">
                  <div className="grid gap-3">
                    <h3 className="font-bold">Tareas</h3>
                    <form className="grid gap-3" onSubmit={(e) => {
                      e.preventDefault();
                      ejecutar(() => operacionesService.crearTarea(evento.id, tareaForm), 'Tarea agregada.');
                      setTareaForm({ titulo: '', descripcion: '' });
                    }}>
                      <Campo etiqueta="Nueva tarea"><input required maxLength={150} value={tareaForm.titulo} onChange={(e) => setTareaForm({ ...tareaForm, titulo: e.target.value })} /></Campo>
                      <Campo etiqueta="Descripción"><input maxLength={2000} value={tareaForm.descripcion} onChange={(e) => setTareaForm({ ...tareaForm, descripcion: e.target.value })} /></Campo>
                      <Boton type="submit" disabled={ocupado}>Agregar tarea</Boton>
                    </form>
                    <ListaEstado titulo="Seguimiento" elementos={evento.tareas} campoEstado="estado" deshabilitado={ocupado} alCambiar={(tarea) => ejecutar(() => operacionesService.alternarTarea(tarea.id), 'Estado de tarea actualizado.')} textoVacio="No hay tareas registradas." />
                  </div>
                  <div className="grid gap-3">
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
                  </div>
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
                <ul className="grid gap-1 text-sm">
                  {Object.entries(evento.condicionesCierre).map(([clave, cumplida]) => (
                    <li key={clave}>{cumplida ? '✓' : '○'} {etiqueta(clave)}: {cumplida ? 'cumplido' : 'pendiente'}</li>
                  ))}
                </ul>
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
