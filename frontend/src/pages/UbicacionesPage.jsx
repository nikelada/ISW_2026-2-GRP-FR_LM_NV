import { useCallback, useEffect, useState } from 'react';
import EncabezadoPagina from '../components/EncabezadoPagina.jsx';
import Aviso from '../components/ui/Aviso.jsx';
import Boton from '../components/ui/Boton.jsx';
import Campo from '../components/ui/Campo.jsx';
import Panel from '../components/ui/Panel.jsx';
import Vacio from '../components/ui/Vacio.jsx';
import { useFetch } from '../hooks/useFetch.js';
import * as operacionesService from '../services/operacionesService.js';
import * as ubicacionesService from '../services/ubicacionesService.js';

const RECURSO_VACIO = { nombre: '', tipo: 'espacio', ubicacion: '', estado: 'disponible' };
const ESTADOS_RECURSO = ['disponible', 'en_uso', 'mantencion', 'fuera_servicio'];
const etiqueta = (texto = '') => texto.replaceAll('_', ' ');

export default function UbicacionesPage() {
  const recursosFetch = useFetch(useCallback(() => ubicacionesService.listarRecursos(), []));
  const eventosFetch = useFetch(useCallback(() => operacionesService.listarEventos(), []));
  const [eventoId, setEventoId] = useState('');
  const eventoFetch = useFetch(
    useCallback(() => eventoId ? operacionesService.obtenerOperacion(eventoId) : Promise.resolve(null), [eventoId]),
    null
  );
  const [recursoForm, setRecursoForm] = useState(RECURSO_VACIO);
  const [recursoEditando, setRecursoEditando] = useState(null);
  const [disponibilidad, setDisponibilidad] = useState([]);
  const [consultaRealizada, setConsultaRealizada] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const evento = eventoFetch.datos;
  const cerrado = evento?.cierre?.estado === 'aprobado';

  useEffect(() => {
    if (!eventoId && eventosFetch.datos.length) setEventoId(String(eventosFetch.datos[0].id));
  }, [eventoId, eventosFetch.datos]);

  useEffect(() => {
    setDisponibilidad([]);
    setConsultaRealizada(false);
  }, [eventoId]);

  async function guardarRecurso(event) {
    event.preventDefault();
    setOcupado(true);
    setAviso(null);
    const datos = {
      ...recursoForm,
      nombre: recursoForm.nombre.trim(),
      ubicacion: recursoForm.ubicacion.trim()
    };
    try {
      if (recursoEditando) {
        await ubicacionesService.actualizarRecurso(recursoEditando, datos);
      } else {
        await ubicacionesService.crearRecurso(datos);
      }
      setRecursoForm(RECURSO_VACIO);
      setRecursoEditando(null);
      setAviso({ tipo: 'success', texto: recursoEditando ? 'Ubicación actualizada.' : 'Ubicación registrada.' });
      await recursosFetch.recargar();
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.message });
    } finally {
      setOcupado(false);
    }
  }

  async function buscarDisponibilidad(event) {
    event.preventDefault();
    setAviso(null);
    setDisponibilidad([]);
    setConsultaRealizada(false);
    if (!evento?.fecha || !evento.horaInicio || !evento.horaFin) {
      setAviso({ tipo: 'error', texto: 'El evento debe tener fecha y horario para consultar disponibilidad.' });
      return;
    }
    try {
      const resultado = await ubicacionesService.consultarDisponibilidad({
        fecha: evento.fecha,
        horaInicio: evento.horaInicio,
        horaFin: evento.horaFin,
        tipo: 'espacio',
        solicitudId: evento.id
      });
      setDisponibilidad(resultado);
      setConsultaRealizada(true);
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.message });
    }
  }

  async function reservar(recursoId) {
    setOcupado(true);
    setAviso(null);
    try {
      await ubicacionesService.reservarRecurso(evento.id, recursoId);
      setAviso({ tipo: 'success', texto: 'Espacio reservado para el evento.' });
      setDisponibilidad([]);
      setConsultaRealizada(false);
      await Promise.all([eventoFetch.recargar(), eventosFetch.recargar(), recursosFetch.recargar()]);
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.message });
    } finally {
      setOcupado(false);
    }
  }

  const idsReservados = new Set(
    (evento?.reservasRecursos || [])
      .filter((reserva) => reserva.recurso.tipo === 'espacio')
      .map((reserva) => reserva.recursoId)
  );
  const opcionesEvento = eventosFetch.datos.map((item) => (
    <option key={item.id} value={item.id}>
      #{item.id} · {item.cliente.nombre} · {item.fecha} {item.horaInicio}-{item.horaFin}
    </option>
  ));

  return (
    <>
      <EncabezadoPagina
        antetitulo="Gestión"
        titulo="Ubicaciones"
        descripcion="Administra los espacios de la empresa y asígnalos a eventos confirmados."
      />
      {aviso && <Aviso tipo={aviso.tipo} className="mb-4"><p>{aviso.texto}</p></Aviso>}
      {recursosFetch.error && <Aviso tipo="error" className="mb-4">{recursosFetch.error}</Aviso>}
      {eventosFetch.error && <Aviso tipo="error" className="mb-4">{eventosFetch.error}</Aviso>}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <Panel>
          <h2 className="mb-4 text-xl font-bold">{recursoEditando ? 'Actualizar ubicación' : 'Registrar ubicación'}</h2>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={guardarRecurso}>
            <Campo etiqueta="Nombre del espacio">
              <input required maxLength={150} value={recursoForm.nombre} onChange={(e) => setRecursoForm({ ...recursoForm, nombre: e.target.value })} />
            </Campo>
            <Campo etiqueta="Dirección o ubicación">
              <input required maxLength={255} value={recursoForm.ubicacion} onChange={(e) => setRecursoForm({ ...recursoForm, ubicacion: e.target.value })} />
            </Campo>
            <Campo etiqueta="Estado">
              <select value={recursoForm.estado} onChange={(e) => setRecursoForm({ ...recursoForm, estado: e.target.value })}>
                {ESTADOS_RECURSO.map((estado) => <option key={estado} value={estado}>{etiqueta(estado)}</option>)}
              </select>
            </Campo>
            <div className="flex gap-2 md:col-span-2">
              <Boton type="submit" disabled={ocupado}>{recursoEditando ? 'Guardar cambios' : 'Agregar espacio'}</Boton>
              {recursoEditando && (
                <Boton variante="secundario" onClick={() => { setRecursoEditando(null); setRecursoForm(RECURSO_VACIO); }}>
                  Cancelar
                </Boton>
              )}
            </div>
          </form>

          {recursosFetch.datos.length === 0 && !recursosFetch.cargando
            ? <div className="mt-4"><Vacio>No hay espacios registrados.</Vacio></div>
            : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b border-stone-200 text-stone-500"><th className="p-2">Espacio</th><th className="p-2">Ubicación</th><th className="p-2">Estado</th><th className="p-2"></th></tr></thead>
                  <tbody>
                    {recursosFetch.datos.map((recurso) => (
                      <tr key={recurso.id} className="border-b border-stone-100">
                        <td className="p-2 font-semibold">{recurso.nombre}</td>
                        <td className="p-2">{recurso.ubicacion || 'Sin ubicación'}</td>
                        <td className="p-2">{etiqueta(recurso.estado)}</td>
                        <td className="p-2 text-right">
                          <Boton variante="enlace" onClick={() => {
                            setRecursoEditando(recurso.id);
                            setRecursoForm({
                              nombre: recurso.nombre,
                              tipo: recurso.tipo,
                              ubicacion: recurso.ubicacion || '',
                              estado: recurso.estado
                            });
                          }}>Editar</Boton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </Panel>

        <div className="grid gap-4">
          <Panel>
            <Campo etiqueta="Evento confirmado">
              <select aria-label="Evento confirmado" value={eventoId} onChange={(e) => setEventoId(e.target.value)}>
                <option value="">Seleccionar evento</option>
                {opcionesEvento}
              </select>
            </Campo>
            {eventosFetch.cargando && <p className="mt-3 text-sm text-stone-500">Cargando eventos…</p>}
            {!eventosFetch.cargando && eventosFetch.datos.length === 0 && <Vacio>No hay eventos confirmados disponibles.</Vacio>}
            {evento && <p className="mt-3 text-sm text-stone-600">{evento.fecha} · {evento.horaInicio}-{evento.horaFin} · {evento.lugar || 'Sin lugar'}</p>}
          </Panel>

          {evento && (
            <Panel>
              <h2 className="mb-3 text-lg font-bold">Reservas de espacios</h2>
              {cerrado
                ? <Aviso tipo="warning"><p>El cierre del evento ya fue aprobado; no se pueden modificar sus reservas.</p></Aviso>
                : (
                  <form className="mb-4 grid gap-3" onSubmit={buscarDisponibilidad}>
                    <Boton type="submit" disabled={ocupado}>Consultar disponibilidad</Boton>
                  </form>
                )}
              {evento.reservasRecursos.filter((reserva) => reserva.recurso.tipo === 'espacio').length > 0 && (
                <ul className="mb-4 grid gap-2">
                  {evento.reservasRecursos.filter((reserva) => reserva.recurso.tipo === 'espacio').map((reserva) => (
                    <li key={reserva.id} className="rounded border border-stone-200 p-3 text-sm">
                      <strong>{reserva.recurso.nombre}</strong> · {reserva.recurso.ubicacion || 'Ubicación no registrada'}
                      <span className="block text-stone-500">{reserva.devueltoEn ? 'Devuelto' : 'Reservado para este evento'}</span>
                    </li>
                  ))}
                </ul>
              )}
              {disponibilidad.length > 0 && (
                <ul className="grid gap-2">
                  {disponibilidad.map((recurso) => {
                    const yaReservado = idsReservados.has(recurso.id);
                    return (
                      <li key={recurso.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-stone-200 p-3 text-sm">
                        <span>
                          <strong>{recurso.nombre}</strong>
                          <span className="block text-stone-500">{recurso.ubicacion || 'Ubicación no registrada'}</span>
                          {recurso.motivo && <span className="block text-amber-800">{recurso.motivo}</span>}
                        </span>
                        {yaReservado
                          ? <span className="font-semibold text-teal-800">Ya reservado para este evento</span>
                          : <span className={recurso.disponible ? 'font-semibold text-teal-800' : 'font-semibold text-stone-500'}>{recurso.disponible ? 'Disponible' : 'No disponible'}</span>}
                        {recurso.disponible && !yaReservado && !cerrado && (
                          <Boton disabled={ocupado} onClick={() => reservar(recurso.id)}>Reservar</Boton>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {consultaRealizada && disponibilidad.length === 0 && <p className="text-sm text-stone-500">No se encontraron espacios que coincidan con el filtro.</p>}
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
