import { useCallback, useEffect, useState } from 'react';
import EncabezadoPagina from '../components/EncabezadoPagina.jsx';
import Aviso from '../components/ui/Aviso.jsx';
import Boton from '../components/ui/Boton.jsx';
import Campo from '../components/ui/Campo.jsx';
import Panel from '../components/ui/Panel.jsx';
import Vacio from '../components/ui/Vacio.jsx';
import { useFetch } from '../hooks/useFetch.js';
import * as inventarioService from '../services/inventarioService.js';
import * as operacionesService from '../services/operacionesService.js';

const OBJETO_VACIO = {
  nombre: '',
  categoria: '',
  precio: '',
  stock: '',
  reutilizable: false,
  stockFueraServicio: '0'
};
const VEHICULO_VACIO = { nombre: '', precio: '', estado: 'disponible' };
const ESTADOS_VEHICULO = ['disponible', 'fuera_servicio'];

const moneda = (precio) => precio === null || precio === undefined
  ? 'Sin tarifa'
  : Number(precio).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });
const etiqueta = (texto = '') => texto.replaceAll('_', ' ');

export default function InventarioPage({ user }) {
  const puedeEditar = ['manager', 'admin'].includes(user?.role);
  const esAdmin = user?.role === 'admin';
  const inventarioFetch = useFetch(useCallback(() => inventarioService.listar(), []));
  const eventosFetch = useFetch(useCallback(() => operacionesService.listarEventos(), []));
  const vehiculosFetch = useFetch(useCallback(() => inventarioService.listarVehiculos(), []));
  const [categoriaActiva, setCategoriaActiva] = useState('objetos');
  const [solicitudId, setSolicitudId] = useState('');
  const disponibilidadObjetos = useFetch(
    useCallback(
      () => solicitudId ? inventarioService.consultarDisponibilidad(Number(solicitudId)) : Promise.resolve([]),
      [solicitudId]
    )
  );
  const disponibilidadVehiculos = useFetch(
    useCallback(
      () => solicitudId ? inventarioService.consultarDisponibilidadVehiculos(Number(solicitudId)) : Promise.resolve([]),
      [solicitudId]
    )
  );
  const [objetoEditando, setObjetoEditando] = useState(null);
  const [objetoForm, setObjetoForm] = useState(OBJETO_VACIO);
  const [vehiculoEditando, setVehiculoEditando] = useState(null);
  const [vehiculoForm, setVehiculoForm] = useState(VEHICULO_VACIO);
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!solicitudId && eventosFetch.datos.length) setSolicitudId(String(eventosFetch.datos[0].id));
  }, [solicitudId, eventosFetch.datos]);

  const evento = eventosFetch.datos.find((item) => String(item.id) === solicitudId);
  const eventoCerrado = evento?.cierre?.estado === 'aprobado';
  const datosObjetos = solicitudId ? disponibilidadObjetos.datos : inventarioFetch.datos;
  const datosVehiculos = vehiculosFetch.datos.map((vehiculo) => ({
    ...vehiculo,
    disponibilidadEvento: disponibilidadVehiculos.datos.find((item) => item.id === vehiculo.id)
  }));

  async function ejecutar(accion, mensaje, recargas = []) {
    setGuardando(true);
    setAviso(null);
    try {
      await accion();
      setAviso({ tipo: 'success', texto: mensaje });
      await Promise.all(recargas.map((recargar) => recargar()));
      return true;
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.message });
      return false;
    } finally {
      setGuardando(false);
    }
  }

  function editarObjeto(item) {
    setObjetoEditando(item);
    setObjetoForm({
      nombre: item.nombre,
      categoria: item.categoria || '',
      precio: item.precio,
      stock: item.stock,
      reutilizable: item.reutilizable,
      stockFueraServicio: String(item.stockFueraServicio || 0)
    });
    setAviso(null);
  }

  function cancelarObjeto() {
    setObjetoEditando(null);
    setObjetoForm(OBJETO_VACIO);
  }

  async function guardarObjeto(event) {
    event.preventDefault();
    const datos = {
      ...objetoForm,
      nombre: objetoForm.nombre.trim(),
      categoria: objetoForm.categoria.trim(),
      precio: Number(objetoForm.precio),
      stock: Number(objetoForm.stock),
      stockFueraServicio: Number(objetoForm.stockFueraServicio)
    };
    const guardado = await ejecutar(
      () => objetoEditando
        ? inventarioService.actualizar(objetoEditando.id, datos)
        : inventarioService.crear(datos),
      objetoEditando ? `«${datos.nombre}» actualizado.` : `«${datos.nombre}» agregado al inventario.`,
      [inventarioFetch.recargar, disponibilidadObjetos.recargar]
    );
    if (guardado) cancelarObjeto();
  }

  async function eliminarObjeto(item) {
    if (!window.confirm(`¿Eliminar «${item.nombre}» del inventario?`)) return;
    const eliminada = await ejecutar(
      () => inventarioService.eliminar(item.id),
      `«${item.nombre}» eliminado del inventario.`,
      [inventarioFetch.recargar, disponibilidadObjetos.recargar]
    );
    if (eliminada && objetoEditando?.id === item.id) cancelarObjeto();
  }

  async function ajustarReservaObjeto(item, delta) {
    const reducir = delta < 0;
    const cantidad = Math.abs(delta);
    const unidades = cantidad === 1 ? 'una unidad' : `${cantidad} unidades`;
    const verbo = reducir
      ? cantidad === 1 ? 'Se quitó' : 'Se quitaron'
      : cantidad === 1 ? 'Se agregó' : 'Se agregaron';
    await ejecutar(
      () => reducir
        ? inventarioService.reducirReserva(item.id, Number(solicitudId), cantidad)
        : inventarioService.reservar(item.id, Number(solicitudId), cantidad),
      `${verbo} ${unidades} de «${item.nombre}» ${reducir ? 'de' : 'a'} la reserva.`,
      [disponibilidadObjetos.recargar, inventarioFetch.recargar]
    );
  }

  function editarVehiculo(vehiculo) {
    setVehiculoEditando(vehiculo);
    setVehiculoForm({
      nombre: vehiculo.nombre,
      precio: vehiculo.precio ?? '',
      estado: vehiculo.estado === 'fuera_servicio' || vehiculo.estado === 'mantencion'
        ? 'fuera_servicio'
        : 'disponible'
    });
    setAviso(null);
  }

  function cancelarVehiculo() {
    setVehiculoEditando(null);
    setVehiculoForm(VEHICULO_VACIO);
  }

  async function guardarVehiculo(event) {
    event.preventDefault();
    const datos = {
      ...vehiculoForm,
      nombre: vehiculoForm.nombre.trim(),
      precio: Number(vehiculoForm.precio)
    };
    const guardado = await ejecutar(
      () => vehiculoEditando
        ? inventarioService.actualizarVehiculo(vehiculoEditando.id, datos)
        : inventarioService.crearVehiculo(datos),
      vehiculoEditando ? `«${datos.nombre}» actualizado.` : `«${datos.nombre}» agregado a vehículos.`,
      [vehiculosFetch.recargar, disponibilidadVehiculos.recargar]
    );
    if (guardado) cancelarVehiculo();
  }

  async function reservarVehiculo(vehiculo) {
    await ejecutar(
      () => inventarioService.reservarVehiculo(vehiculo.id, Number(solicitudId)),
      `«${vehiculo.nombre}» reservado para el evento.`,
      [vehiculosFetch.recargar, disponibilidadVehiculos.recargar]
    );
  }

  async function devolverVehiculo(reserva) {
    await ejecutar(
      () => operacionesService.devolverRecurso(reserva.id),
      'Devolución del vehículo registrada.',
      [vehiculosFetch.recargar, disponibilidadVehiculos.recargar]
    );
  }

  function campoObjeto(nombre) {
    return {
      value: objetoForm[nombre],
      onChange: (event) => setObjetoForm({ ...objetoForm, [nombre]: event.target.value })
    };
  }

  function estadoVehiculo(vehiculo) {
    if (vehiculo.estado === 'fuera_servicio' || vehiculo.estado === 'mantencion') return 'fuera de servicio';
    const reservado = vehiculo.reservas.some((reserva) => reserva.solicitudId === Number(solicitudId));
    if (reservado || vehiculo.reservas.length || vehiculo.disponibilidadEvento?.disponible === false || vehiculo.estado === 'en_uso') {
      return 'reservado';
    }
    return 'disponible';
  }

  return (
    <>
      <EncabezadoPagina
        antetitulo="Gestión"
        titulo="Inventario"
        descripcion="Administra objetos, vehículos y sus reservas para eventos confirmados."
      />
      {aviso && <Aviso tipo={aviso.tipo} className="mb-4"><p>{aviso.texto}</p></Aviso>}
      {eventosFetch.error && <Aviso tipo="error" className="mb-4">{eventosFetch.error}</Aviso>}
      {inventarioFetch.error && <Aviso tipo="error" className="mb-4">{inventarioFetch.error}</Aviso>}
      {vehiculosFetch.error && <Aviso tipo="error" className="mb-4">{vehiculosFetch.error}</Aviso>}

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Categorías de inventario">
        {[
          { id: 'objetos', texto: 'Objetos' },
          { id: 'vehiculos', texto: 'Vehículos' }
        ].map((categoria) => (
          <Boton
            key={categoria.id}
            variante={categoriaActiva === categoria.id ? 'primario' : 'secundario'}
            role="tab"
            aria-selected={categoriaActiva === categoria.id}
            onClick={() => setCategoriaActiva(categoria.id)}
          >
            {categoria.texto}
          </Boton>
        ))}
      </div>

      <Panel className="mb-4">
        <Campo etiqueta="Reservar para evento confirmado">
          <select value={solicitudId} onChange={(event) => setSolicitudId(event.target.value)}>
            <option value="">Seleccionar evento</option>
            {eventosFetch.datos.map((item) => (
              <option key={item.id} value={item.id}>
                #{item.id} · {item.cliente.nombre} · {item.fecha} {item.horaInicio}-{item.horaFin}
              </option>
            ))}
          </select>
        </Campo>
        {eventosFetch.cargando && <p className="mt-2 text-sm text-stone-500">Cargando eventos…</p>}
        {!eventosFetch.cargando && !eventosFetch.datos.length && <Vacio>No hay eventos confirmados para reservar.</Vacio>}
        {evento && <p className="mt-2 text-sm text-stone-600">Evento #{evento.id}: {evento.fecha}, {evento.horaInicio}-{evento.horaFin}</p>}
        {eventoCerrado && <p className="mt-2 text-sm text-amber-800">El cierre del evento ya fue aprobado; no se pueden agregar reservas.</p>}
        {disponibilidadObjetos.error && <Aviso tipo="error" className="mt-3">{disponibilidadObjetos.error}</Aviso>}
        {disponibilidadVehiculos.error && <Aviso tipo="error" className="mt-3">{disponibilidadVehiculos.error}</Aviso>}
      </Panel>

      {categoriaActiva === 'objetos' ? (
        <div className={`grid grid-cols-1 items-start gap-4 ${puedeEditar ? 'lg:grid-cols-[minmax(0,1fr)_380px]' : ''}`}>
          <Panel>
            {inventarioFetch.cargando && !inventarioFetch.datos.length
              ? <Vacio>Cargando objetos…</Vacio>
              : datosObjetos.length === 0
                ? <Vacio>No hay objetos registrados.</Vacio>
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-stone-200 text-stone-500">
                          <th className="p-2">Objeto / tipo</th>
                          <th className="p-2">Arriendo</th>
                          <th className="p-2">Stock</th>
                          <th className="p-2">Estado para el evento</th>
                          <th className="p-2">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datosObjetos.map((item) => (
                          <tr key={item.id} className="border-b border-stone-100">
                            <td className="p-2">
                              <strong>{item.nombre}</strong>
                              <span className="block text-stone-500">{item.categoria || 'Sin clasificar'}</span>
                              {item.reutilizable && <span className="text-xs text-stone-500">Reutilizable</span>}
                            </td>
                            <td className="p-2">{moneda(item.precio)}</td>
                            <td className="p-2">
                              <span className="block">Total: {item.stock}</span>
                              {item.reutilizable && <span className="block text-stone-500">Fuera de servicio: {item.stockFueraServicio}</span>}
                            </td>
                            <td className="p-2">
                              {solicitudId ? (
                                <>
                                  <span className="block">Disponible: {item.stockDisponible}</span>
                                  {item.reutilizable && <span className="block text-teal-800">Reservado para el evento: {item.stockReservado}</span>}
                                  {item.reutilizable && <span className="block">En uso ahora: {item.stockEnUso}</span>}
                                  {!item.reutilizable && item.stockReservado > 0 && <span className="block text-stone-500">Consumido por este evento: {item.stockReservado}</span>}
                                </>
                              ) : <span className="text-stone-500">Selecciona un evento</span>}
                            </td>
                            <td className="p-2">
                              <div className="flex flex-wrap gap-2">
                                {puedeEditar && <Boton variante="enlace" onClick={() => editarObjeto(item)}>Editar</Boton>}
                                {puedeEditar && <Boton variante="enlace" onClick={() => eliminarObjeto(item)}>Eliminar</Boton>}
                                {solicitudId && !eventoCerrado && (item.stockDisponible > 0 || item.stockReservado > 0) && (
                                  <div className="flex items-center gap-2" role="group" aria-label={`Reservas de ${item.nombre}`}>
                                    <Boton
                                      variante="secundario"
                                      className="px-2! py-1.5!"
                                      aria-label={`Quitar 10 unidades de ${item.nombre}`}
                                      disabled={guardando || item.stockReservado < 10}
                                      onClick={() => ajustarReservaObjeto(item, -10)}
                                    >
                                      −10
                                    </Boton>
                                    <Boton
                                      variante="secundario"
                                      className="px-2! py-1.5!"
                                      aria-label={`Quitar una unidad de ${item.nombre}`}
                                      disabled={guardando || item.stockReservado <= 0}
                                      onClick={() => ajustarReservaObjeto(item, -1)}
                                    >
                                      −
                                    </Boton>
                                    <span className="min-w-5 text-center font-semibold" aria-live="polite">
                                      {item.stockReservado}
                                    </span>
                                    <Boton
                                      variante="secundario"
                                      className="px-2! py-1.5!"
                                      aria-label={`Agregar una unidad de ${item.nombre}`}
                                      disabled={guardando || item.stockDisponible <= 0}
                                      onClick={() => ajustarReservaObjeto(item, 1)}
                                    >
                                      +
                                    </Boton>
                                    <Boton
                                      variante="secundario"
                                      className="px-2! py-1.5!"
                                      aria-label={`Agregar 10 unidades de ${item.nombre}`}
                                      disabled={guardando || item.stockDisponible < 10}
                                      onClick={() => ajustarReservaObjeto(item, 10)}
                                    >
                                      +10
                                    </Boton>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
          </Panel>

          {puedeEditar && (
            <Panel lateral>
              <p className="mb-2 text-sm font-semibold text-stone-500">{objetoEditando ? 'Actualizar objeto' : 'Nuevo objeto'}</p>
              <h2 className="mb-4 text-xl font-bold">{objetoEditando ? objetoEditando.nombre : 'Agregar objeto'}</h2>
              <form className="grid gap-4" onSubmit={guardarObjeto} noValidate>
                <Campo etiqueta="Objeto"><input type="text" maxLength={150} required {...campoObjeto('nombre')} /></Campo>
                <Campo etiqueta="Tipo de objeto"><input type="text" maxLength={100} required {...campoObjeto('categoria')} /></Campo>
                <Campo etiqueta="Precio de arriendo (CLP)"><input type="number" min="0" step="0.01" required {...campoObjeto('precio')} /></Campo>
                <Campo etiqueta="Stock"><input type="number" min="0" step="1" required {...campoObjeto('stock')} /></Campo>
                <Campo etiqueta="¿Es reutilizable?">
                  <select
                    value={objetoForm.reutilizable ? 'si' : 'no'}
                    onChange={(event) => setObjetoForm({
                      ...objetoForm,
                      reutilizable: event.target.value === 'si',
                      stockFueraServicio: event.target.value === 'si' ? objetoForm.stockFueraServicio : '0'
                    })}
                  >
                    <option value="no">No, se consume al reservar</option>
                    <option value="si">Sí, se devuelve después del evento</option>
                  </select>
                </Campo>
                {objetoForm.reutilizable && (
                  <Campo etiqueta="Unidades fuera de servicio">
                    <input type="number" min="0" step="1" max={objetoForm.stock || undefined} required {...campoObjeto('stockFueraServicio')} />
                  </Campo>
                )}
                <p className="text-xs text-stone-500">Los objetos no reutilizables se descuentan al reservar. Para los reutilizables, disponibilidad y reservas se calculan según el horario del evento.</p>
                <div className="flex gap-2">
                  <Boton type="submit" className="flex-1" disabled={guardando}>{objetoEditando ? 'Guardar cambios' : 'Agregar objeto'}</Boton>
                  {objetoEditando && <Boton variante="secundario" onClick={cancelarObjeto}>Cancelar</Boton>}
                </div>
              </form>
            </Panel>
          )}
        </div>
      ) : (
        <div className={`grid grid-cols-1 items-start gap-4 ${puedeEditar ? 'lg:grid-cols-[minmax(0,1fr)_380px]' : ''}`}>
          <Panel>
            {vehiculosFetch.cargando && !vehiculosFetch.datos.length
              ? <Vacio>Cargando vehículos…</Vacio>
              : datosVehiculos.length === 0
                ? <Vacio>No hay vehículos registrados.</Vacio>
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-stone-200 text-stone-500">
                          <th className="p-2">Vehículo</th>
                          <th className="p-2">Tarifa</th>
                          <th className="p-2">Estado</th>
                          <th className="p-2">Reservas</th>
                          <th className="p-2">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datosVehiculos.map((vehiculo) => {
                          const estado = estadoVehiculo(vehiculo);
                          const yaReservado = vehiculo.reservas.some((reserva) => reserva.solicitudId === Number(solicitudId));
                          const disponible = vehiculo.disponibilidadEvento?.disponible === true && !yaReservado;
                          return (
                            <tr key={vehiculo.id} className="border-b border-stone-100">
                              <td className="p-2 font-semibold">{vehiculo.nombre}</td>
                              <td className="p-2">{moneda(vehiculo.precio)}</td>
                              <td className="p-2">{estado}</td>
                              <td className="p-2">
                                {vehiculo.reservas.length
                                  ? vehiculo.reservas.map((reserva) => (
                                    <span key={reserva.id} className="mb-1 flex flex-wrap items-center gap-2">
                                      <span>Evento #{reserva.solicitudId} · {reserva.fecha} · {reserva.horaInicio}-{reserva.horaFin}</span>
                                      {esAdmin && <Boton variante="enlace" onClick={() => devolverVehiculo(reserva)}>Marcar devuelto</Boton>}
                                    </span>
                                  ))
                                  : <span className="text-stone-500">Sin reservas</span>}
                              </td>
                              <td className="p-2">
                                <div className="flex flex-wrap gap-2">
                                  {puedeEditar && <Boton variante="enlace" onClick={() => editarVehiculo(vehiculo)}>Editar</Boton>}
                                  {solicitudId && !eventoCerrado && disponible && <Boton className="px-3 py-1.5" disabled={guardando} onClick={() => reservarVehiculo(vehiculo)}>Reservar</Boton>}
                                  {yaReservado && <span className="text-teal-800">Ya reservado para este evento</span>}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
          </Panel>

          {puedeEditar && (
            <Panel lateral>
              <p className="mb-2 text-sm font-semibold text-stone-500">{vehiculoEditando ? 'Actualizar vehículo' : 'Nuevo vehículo'}</p>
              <h2 className="mb-4 text-xl font-bold">{vehiculoEditando ? vehiculoEditando.nombre : 'Agregar vehículo'}</h2>
              <form className="grid gap-4" onSubmit={guardarVehiculo}>
                <Campo etiqueta="Nombre / identificación"><input type="text" maxLength={150} required value={vehiculoForm.nombre} onChange={(event) => setVehiculoForm({ ...vehiculoForm, nombre: event.target.value })} /></Campo>
                <Campo etiqueta="Tarifa de arriendo (CLP)"><input type="number" min="0" step="0.01" required value={vehiculoForm.precio} onChange={(event) => setVehiculoForm({ ...vehiculoForm, precio: event.target.value })} /></Campo>
                <Campo etiqueta="Estado">
                  <select value={vehiculoForm.estado} onChange={(event) => setVehiculoForm({ ...vehiculoForm, estado: event.target.value })}>
                    {ESTADOS_VEHICULO.map((estado) => <option key={estado} value={estado}>{etiqueta(estado)}</option>)}
                  </select>
                </Campo>
                <p className="text-xs text-stone-500">El estado “Reservado” se determina por las fechas de las reservas confirmadas.</p>
                <div className="flex gap-2">
                  <Boton type="submit" className="flex-1" disabled={guardando}>{vehiculoEditando ? 'Guardar cambios' : 'Agregar vehículo'}</Boton>
                  {vehiculoEditando && <Boton variante="secundario" onClick={cancelarVehiculo}>Cancelar</Boton>}
                </div>
              </form>
            </Panel>
          )}
        </div>
      )}
    </>
  );
}
