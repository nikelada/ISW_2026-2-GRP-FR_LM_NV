import { useCallback, useEffect, useState } from 'react';
import EncabezadoPagina from '../components/EncabezadoPagina.jsx';
import Aviso from '../components/ui/Aviso.jsx';
import Boton from '../components/ui/Boton.jsx';
import Campo from '../components/ui/Campo.jsx';
import Panel from '../components/ui/Panel.jsx';
import Vacio from '../components/ui/Vacio.jsx';
import { useFetch } from '../hooks/useFetch.js';
import * as operacionesService from '../services/operacionesService.js';

export default function PersonalPage({ user }) {
  const esAdmin = user?.role === 'admin';
  const eventosFetch = useFetch(useCallback(() => operacionesService.listarEventos(), []));
  const [eventoId, setEventoId] = useState('');
  const eventoFetch = useFetch(
    useCallback(() => (eventoId ? operacionesService.obtenerOperacion(eventoId) : Promise.resolve(null)), [eventoId]),
    null
  );
  const contactosFetch = useFetch(
    useCallback(() => (esAdmin ? operacionesService.listarContactos() : Promise.resolve([])), [esAdmin])
  );

  const [personalForm, setPersonalForm] = useState({
    personalId: '',
    nombre: '',
    telefono: '',
    correo: '',
    funcion: ''
  });
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!eventoId && eventosFetch.datos.length) setEventoId(String(eventosFetch.datos[0].id));
  }, [eventoId, eventosFetch.datos]);

  const evento = eventoFetch.datos;
  const cerrado = evento?.cierre?.estado === 'aprobado';

  async function ejecutar(accion, mensaje) {
    setOcupado(true);
    setAviso(null);
    try {
      await accion();
      setAviso({ tipo: 'success', texto: mensaje });
      await Promise.all([eventoFetch.recargar(), contactosFetch.recargar()]);
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.message });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <EncabezadoPagina
        antetitulo="Gestión de equipo"
        titulo="Personal eventual"
        descripcion="Asigna personal y contactos guardados a eventos confirmados."
      />

      {aviso && <Aviso tipo={aviso.tipo} className="mb-4"><p>{aviso.texto}</p></Aviso>}
      {eventosFetch.error && <Aviso tipo="error" className="mb-4">{eventosFetch.error}</Aviso>}

      <Panel className="mb-4">
        <Campo etiqueta="Evento confirmado">
          <select aria-label="Evento confirmado" value={eventoId} onChange={(e) => setEventoId(e.target.value)}>
            <option value="">Seleccionar evento</option>
            {eventosFetch.datos.map((item) => (
              <option key={item.id} value={item.id}>
                #{item.id} · {item.cliente.nombre} · {item.fecha} {item.horaInicio}-{item.horaFin}
              </option>
            ))}
          </select>
        </Campo>
        {eventosFetch.cargando && <p className="mt-3 text-sm text-stone-500">Cargando eventos…</p>}
        {!eventosFetch.cargando && eventosFetch.datos.length === 0 && (
          <Vacio>No hay eventos confirmados disponibles.</Vacio>
        )}
      </Panel>

      {evento && (
        <Panel>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase text-stone-500">Evento #{evento.id}</p>
              <h2 className="text-xl font-bold">{evento.cliente.nombre}</h2>
              <p className="text-sm text-stone-600">
                {evento.fecha} · {evento.horaInicio}-{evento.horaFin} · {evento.lugar || 'Sin lugar'}
              </p>
            </div>
            {cerrado && (
              <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold">
                Evento cerrado (solo lectura)
              </span>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {esAdmin && !cerrado && (
              <section className="grid content-start gap-3">
                <h3 className="font-bold">Asignar personal al evento</h3>
                <form
                  className="grid gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const datos = personalForm.personalId
                      ? { personalId: Number(personalForm.personalId), funcion: personalForm.funcion }
                      : personalForm;
                    ejecutar(() => operacionesService.asignarPersonal(evento.id, datos), 'Personal asignado.');
                    setPersonalForm({ personalId: '', nombre: '', telefono: '', correo: '', funcion: '' });
                  }}
                >
                  <Campo etiqueta="Usar contacto guardado">
                    <select
                      value={personalForm.personalId}
                      onChange={(e) => setPersonalForm({ ...personalForm, personalId: e.target.value })}
                    >
                      <option value="">Crear nuevo personal</option>
                      {contactosFetch.datos.map((contacto) => (
                        <option key={contacto.id} value={contacto.id}>{contacto.nombre}</option>
                      ))}
                    </select>
                  </Campo>

                  {!personalForm.personalId && (
                    <>
                      <Campo etiqueta="Nombre">
                        <input
                          required
                          value={personalForm.nombre}
                          onChange={(e) => setPersonalForm({ ...personalForm, nombre: e.target.value })}
                        />
                      </Campo>
                      <Campo etiqueta="Teléfono">
                        <input
                          value={personalForm.telefono}
                          onChange={(e) => setPersonalForm({ ...personalForm, telefono: e.target.value })}
                        />
                      </Campo>
                      <Campo etiqueta="Correo">
                        <input
                          type="email"
                          value={personalForm.correo}
                          onChange={(e) => setPersonalForm({ ...personalForm, correo: e.target.value })}
                        />
                      </Campo>
                    </>
                  )}

                  <Campo etiqueta="Función en el evento">
                    <input
                      value={personalForm.funcion}
                      onChange={(e) => setPersonalForm({ ...personalForm, funcion: e.target.value })}
                    />
                  </Campo>

                  <Boton type="submit" disabled={ocupado}>Asignar personal</Boton>
                </form>
              </section>
            )}

            <section className={`grid content-start gap-3 ${!esAdmin || cerrado ? 'lg:col-span-2' : ''}`}>
              <h3 className="font-bold">Personal asignado ({evento.personalAsignado.length})</h3>
              {evento.personalAsignado.length === 0 ? (
                <p className="text-sm text-stone-500">No hay personal eventual asignado a este evento.</p>
              ) : (
                <ul className="grid gap-2">
                  {evento.personalAsignado.map((asignacion) => {
                    const tieneTareas = evento.tareas.some((tarea) =>
                      tarea.responsables.some(({ personalEvento }) => personalEvento.id === asignacion.id)
                    );
                    return (
                      <li
                        key={asignacion.id}
                        className="flex items-center justify-between rounded border border-stone-200 p-3 text-sm"
                      >
                        <span>
                          <strong>{asignacion.personal.nombre}</strong>
                          {asignacion.funcion && ` · ${asignacion.funcion}`}
                          {asignacion.personal.telefono && (
                            <span className="ml-2 text-stone-500">· {asignacion.personal.telefono}</span>
                          )}
                          {asignacion.personal.esContacto && (
                            <small className="block text-teal-700">Contacto guardado para futuros eventos</small>
                          )}
                          {tieneTareas && (
                            <small className="block text-stone-500">Tiene tareas asociadas; no se puede quitar de este evento.</small>
                          )}
                        </span>
                        {esAdmin && !cerrado && (
                          <Boton
                            variante="enlace"
                            disabled={ocupado || tieneTareas}
                            onClick={() =>
                              ejecutar(() => operacionesService.quitarPersonal(asignacion.id), 'Asignación eliminada.')
                            }
                          >
                            Quitar
                          </Boton>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </Panel>
      )}

      {!evento && eventoId && eventoFetch.error && <Aviso tipo="error">{eventoFetch.error}</Aviso>}
    </>
  );
}