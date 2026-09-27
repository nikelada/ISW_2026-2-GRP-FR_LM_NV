import { useCallback, useEffect, useMemo, useState } from 'react';
import CambiosPrecio from '../components/CambiosPrecio.jsx';
import DataTable from '../components/DataTable.jsx';
import EncabezadoPagina from '../components/EncabezadoPagina.jsx';
import Antetitulo from '../components/ui/Antetitulo.jsx';
import Aviso from '../components/ui/Aviso.jsx';
import Boton from '../components/ui/Boton.jsx';
import Campo from '../components/ui/Campo.jsx';
import ListaDatos from '../components/ui/ListaDatos.jsx';
import Panel from '../components/ui/Panel.jsx';
import Vacio from '../components/ui/Vacio.jsx';
import { useFetch } from '../hooks/useFetch.js';
import * as servicioService from '../services/servicioService.js';
import * as tipoServicioService from '../services/tipoServicioService.js';
import { esGerencia, esProduccion } from '../utils/roles.js';

const TIPO_VACIO = { nombre: '', descripcion: '' };
const SERVICIO_VACIO = {
  tipoServicioId: '',
  nombre: '',
  descripcion: '',
  precio: '',
  tipoPrecio: 'fijo'
};
const CAMBIO_PRECIO_VACIO = { precio: '', tipoPrecio: 'fijo' };

const formatoPrecio = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0
});

const LABEL_TIPO_PRECIO = {
  fijo: 'Precio fijo',
  por_hora: 'Por hora'
};

const labelTipoPrecio = (tipoPrecio) => LABEL_TIPO_PRECIO[tipoPrecio] || tipoPrecio || '—';

const columnasServicios = [
  { campo: 'nombre', titulo: 'Servicio', render: (s) => <strong>{s.nombre}</strong> },
  { campo: 'tipoServicio', titulo: 'Tipo', render: (s) => s.tipoServicio.nombre },
  {
    campo: 'precio',
    titulo: 'Precio',
    className: 'whitespace-nowrap',
    render: (s) => (s.versionActiva ? formatoPrecio.format(s.versionActiva.precio) : 'Sin versión activa')
  },
  {
    campo: 'tipoPrecio',
    titulo: 'Cobro',
    render: (s) => labelTipoPrecio(s.versionActiva?.tipoPrecio)
  }
];

const columnasTipos = [
  { campo: 'nombre', titulo: 'Tipo de servicio', render: (tipo) => <strong>{tipo.nombre}</strong> },
  { campo: 'descripcion', titulo: 'Descripción', render: (tipo) => tipo.descripcion || '—' },
  { campo: 'cantidadServicios', titulo: 'Servicios' }
];

export default function ServiciosPage({ user }) {
  const puedeEditar = esProduccion(user);
  const puedeRevisarCambios = esGerencia(user);
  const [vista, setVista] = useState('servicios');
  const [tipoServicioId, setTipoServicioId] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [creandoServicio, setCreandoServicio] = useState(false);
  const [editandoServicio, setEditandoServicio] = useState(false);
  const [cambiandoPrecio, setCambiandoPrecio] = useState(false);
  const [formServicio, setFormServicio] = useState(SERVICIO_VACIO);
  const [formCambioPrecio, setFormCambioPrecio] = useState(CAMBIO_PRECIO_VACIO);
  const [erroresServicio, setErroresServicio] = useState({});
  const [erroresCambioPrecio, setErroresCambioPrecio] = useState({});
  const [avisoServicio, setAvisoServicio] = useState(null);
  const [guardandoServicio, setGuardandoServicio] = useState(false);
  const [guardandoCambioPrecio, setGuardandoCambioPrecio] = useState(false);
  const [creandoTipo, setCreandoTipo] = useState(false);
  const [formTipo, setFormTipo] = useState(TIPO_VACIO);
  const [erroresTipo, setErroresTipo] = useState({});
  const [avisoTipo, setAvisoTipo] = useState(null);
  const [guardandoTipo, setGuardandoTipo] = useState(false);
  const {
    datos: tipos,
    cargando: cargandoTipos,
    error: errorTipos,
    recargar: recargarTipos
  } = useFetch(useCallback(() => tipoServicioService.listar(), []));
  const {
    datos: servicios,
    cargando,
    error: errorServicios,
    recargar: recargarServicios
  } = useFetch(useCallback(() => servicioService.listar(), []));

  const serviciosFiltrados = useMemo(
    () => (tipoServicioId
      ? servicios.filter((servicio) => servicio.tipoServicioId === Number(tipoServicioId))
      : servicios),
    [servicios, tipoServicioId]
  );
  const tiposConCantidad = useMemo(
    () => tipos.map((tipo) => ({
      ...tipo,
      cantidadServicios: servicios.filter((servicio) => servicio.tipoServicioId === tipo.id).length
    })),
    [tipos, servicios]
  );

  useEffect(() => {
    setSeleccionado((actual) => {
      if (!actual) return actual;
      return serviciosFiltrados.find((servicio) => servicio.id === actual.id) || null;
    });
  }, [serviciosFiltrados]);

  function mostrarVista(nuevaVista) {
    setVista(nuevaVista);
    setCreandoServicio(false);
    setEditandoServicio(false);
    setCambiandoPrecio(false);
    setCreandoTipo(false);
    setErroresServicio({});
    setErroresCambioPrecio({});
    setErroresTipo({});
    setAvisoServicio(null);
    setAvisoTipo(null);
  }

  function nuevoServicio() {
    setFormServicio(SERVICIO_VACIO);
    setErroresServicio({});
    setAvisoServicio(null);
    setCreandoServicio(true);
    setEditandoServicio(false);
    setCambiandoPrecio(false);
  }

  function seleccionarServicio(servicio) {
    setSeleccionado(servicio);
    setCreandoServicio(false);
    setEditandoServicio(false);
    setCambiandoPrecio(false);
    setErroresServicio({});
    setErroresCambioPrecio({});
    setAvisoServicio(null);
  }

  function cancelarServicio() {
    setCreandoServicio(false);
    setEditandoServicio(false);
    setCambiandoPrecio(false);
    setErroresServicio({});
    setErroresCambioPrecio({});
  }

  function editarServicio() {
    setFormServicio({
      ...SERVICIO_VACIO,
      tipoServicioId: String(seleccionado.tipoServicioId),
      nombre: seleccionado.nombre,
      descripcion: seleccionado.descripcion || ''
    });
    setErroresServicio({});
    setAvisoServicio(null);
    setCreandoServicio(false);
    setEditandoServicio(true);
    setCambiandoPrecio(false);
  }

  function editarPrecio() {
    setFormCambioPrecio({
      precio: String(seleccionado.versionActiva.precio),
      tipoPrecio: seleccionado.versionActiva.tipoPrecio
    });
    setErroresCambioPrecio({});
    setAvisoServicio(null);
    setCreandoServicio(false);
    setEditandoServicio(false);
    setCambiandoPrecio(true);
  }

  function cancelarCambioPrecio() {
    setCambiandoPrecio(false);
    setErroresCambioPrecio({});
  }

  async function guardarCambioPrecio(event) {
    event.preventDefault();
    setGuardandoCambioPrecio(true);
    setAvisoServicio(null);
    try {
      await servicioService.solicitarCambio(seleccionado.id, formCambioPrecio);
      setCambiandoPrecio(false);
      setErroresCambioPrecio({});
      setAvisoServicio({
        tipo: 'success',
        texto: `El cambio de precio de «${seleccionado.nombre}» fue enviado a Gerencia.`
      });
    } catch (error) {
      setErroresCambioPrecio(error.data?.errores || {});
      setAvisoServicio({ tipo: 'error', texto: error.message });
    } finally {
      setGuardandoCambioPrecio(false);
    }
  }

  async function guardarServicio(event) {
    event.preventDefault();
    setGuardandoServicio(true);
    setAvisoServicio(null);
    try {
      const guardado = editandoServicio
        ? await servicioService.actualizar(seleccionado.id, {
          tipoServicioId: formServicio.tipoServicioId,
          nombre: formServicio.nombre,
          descripcion: formServicio.descripcion,
          activo: seleccionado.activo
        })
        : await servicioService.crear(formServicio);
      setSeleccionado(guardado);
      setCreandoServicio(false);
      setEditandoServicio(false);
      setFormServicio(SERVICIO_VACIO);
      setErroresServicio({});
      setAvisoServicio({
        tipo: 'success',
        texto: editandoServicio
          ? `Servicio «${guardado.nombre}» actualizado.`
          : `Servicio «${guardado.nombre}» registrado.`
      });
      recargarServicios();
    } catch (error) {
      setErroresServicio(error.data?.errores || {});
      setAvisoServicio({ tipo: 'error', texto: error.message });
    } finally {
      setGuardandoServicio(false);
    }
  }

  function nuevoTipo() {
    setFormTipo(TIPO_VACIO);
    setErroresTipo({});
    setAvisoTipo(null);
    setCreandoTipo(true);
  }

  function cancelarTipo() {
    setCreandoTipo(false);
    setErroresTipo({});
  }

  async function guardarTipo(event) {
    event.preventDefault();
    setGuardandoTipo(true);
    setAvisoTipo(null);
    try {
      const creado = await tipoServicioService.crear(formTipo);
      setAvisoTipo({ tipo: 'success', texto: `Tipo de servicio «${creado.nombre}» registrado.` });
      setCreandoTipo(false);
      setFormTipo(TIPO_VACIO);
      setErroresTipo({});
      recargarTipos();
    } catch (error) {
      setErroresTipo(error.data?.errores || {});
      setAvisoTipo({ tipo: 'error', texto: error.message });
    } finally {
      setGuardandoTipo(false);
    }
  }

  return (
    <>
      <EncabezadoPagina
        antetitulo="Gestión"
        titulo={vista === 'servicios'
          ? 'Servicios'
          : vista === 'tipos' ? 'Tipos de servicio' : 'Cambios de precio'}
        descripcion={vista === 'servicios'
          ? 'Servicios disponibles y su precio actual.'
          : vista === 'tipos'
            ? 'Tipos utilizados para organizar los servicios disponibles.'
            : 'Solicitudes pendientes de aprobación para precios y modalidades de cobro.'}
      >
        <div className="flex gap-2.5">
          {vista === 'servicios' && puedeEditar && <Boton onClick={nuevoServicio}>Nuevo servicio</Boton>}
          {vista === 'tipos' && puedeEditar && <Boton onClick={nuevoTipo}>Nuevo tipo de servicio</Boton>}
          {vista !== 'servicios' && <Boton variante="secundario" onClick={() => mostrarVista('servicios')}>Ver servicios</Boton>}
          {puedeRevisarCambios && vista === 'servicios' && (
            <Boton variante="secundario" onClick={() => mostrarVista('cambios')}>Cambios de precio</Boton>
          )}
          {vista !== 'tipos' && <Boton variante="secundario" onClick={() => mostrarVista('tipos')}>Tipos de servicio</Boton>}
        </div>
      </EncabezadoPagina>

      {vista === 'tipos' ? (
        <div className={`grid grid-cols-1 items-start gap-4 ${creandoTipo ? 'lg:grid-cols-[minmax(0,1fr)_380px]' : ''}`}>
          <Panel>
            {errorTipos && <Aviso tipo="error" className="m-3.5">{errorTipos}</Aviso>}
            {avisoTipo && !creandoTipo && <Aviso tipo={avisoTipo.tipo} className="m-3.5">{avisoTipo.texto}</Aviso>}
            {cargandoTipos && !tipos.length
              ? <Vacio>Cargando…</Vacio>
              : (
                <DataTable
                  columnas={columnasTipos}
                  datos={tiposConCantidad}
                  vacio="No hay tipos de servicio registrados."
                />
              )}
          </Panel>

          {creandoTipo && (
            <Panel lateral>
              <Antetitulo className="mb-2">Nuevo tipo</Antetitulo>
              <h2 className="mb-4 text-xl font-bold">Registrar tipo de servicio</h2>
              {avisoTipo && <Aviso tipo={avisoTipo.tipo}>{avisoTipo.texto}</Aviso>}
              <form className="grid gap-4" onSubmit={guardarTipo} noValidate>
                <Campo etiqueta="Nombre" error={erroresTipo.nombre}>
                  <input
                    type="text"
                    maxLength={100}
                    value={formTipo.nombre}
                    onChange={(event) => setFormTipo({ ...formTipo, nombre: event.target.value })}
                  />
                </Campo>
                <Campo etiqueta="Descripción" error={erroresTipo.descripcion}>
                  <textarea
                    maxLength={1000}
                    value={formTipo.descripcion}
                    onChange={(event) => setFormTipo({ ...formTipo, descripcion: event.target.value })}
                  />
                </Campo>
                <p className="text-xs text-stone-500">El nombre es obligatorio.</p>
                <div className="flex gap-2.5">
                  <Boton type="submit" className="flex-1" disabled={guardandoTipo}>
                    <span>{guardandoTipo ? 'Guardando…' : 'Registrar tipo'}</span><span aria-hidden="true">→</span>
                  </Boton>
                  <Boton variante="secundario" onClick={cancelarTipo}>Cancelar</Boton>
                </div>
              </form>
            </Panel>
          )}
        </div>
      ) : vista === 'cambios' ? (
        <CambiosPrecio user={user} />
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Panel>
          <div className="flex gap-2.5 border-b border-stone-200 p-3.5">
            <select
              className="w-auto"
              aria-label="Filtrar por tipo de servicio"
              value={tipoServicioId}
              onChange={(event) => setTipoServicioId(event.target.value)}
            >
              <option value="">Todos los tipos</option>
              {tipos.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>)}
            </select>
          </div>
          {(errorTipos || errorServicios) && (
            <Aviso tipo="error" className="m-3.5">{errorTipos || errorServicios}</Aviso>
          )}
          {avisoServicio && !creandoServicio && !editandoServicio && !cambiandoPrecio && (
            <Aviso tipo={avisoServicio.tipo} className="m-3.5">{avisoServicio.texto}</Aviso>
          )}
          {cargando && !servicios.length
            ? <Vacio>Cargando…</Vacio>
            : (
              <DataTable
                columnas={columnasServicios}
                datos={serviciosFiltrados}
                vacio="No hay servicios disponibles con este filtro."
                seleccionadoId={seleccionado?.id}
                onSeleccionar={seleccionarServicio}
              />
            )}
          </Panel>

          <Panel lateral>
            {creandoServicio || editandoServicio ? (
              <FormularioServicio
                tipos={tipos}
                form={formServicio}
                setForm={setFormServicio}
                errores={erroresServicio}
                aviso={avisoServicio}
                guardando={guardandoServicio}
                onGuardar={guardarServicio}
                onCancelar={cancelarServicio}
                editando={editandoServicio}
              />
            ) : cambiandoPrecio ? (
              <FormularioCambioPrecio
                form={formCambioPrecio}
                setForm={setFormCambioPrecio}
                errores={erroresCambioPrecio}
                aviso={avisoServicio}
                guardando={guardandoCambioPrecio}
                onGuardar={guardarCambioPrecio}
                onCancelar={cancelarCambioPrecio}
              />
            ) : (
              <DetalleServicio
                servicio={seleccionado}
                puedeEditar={puedeEditar}
                onEditar={editarServicio}
                onEditarPrecio={editarPrecio}
              />
            )}
          </Panel>
        </div>
      )}
    </>
  );
}

function FormularioServicio({ tipos, form, setForm, errores, aviso, guardando, onGuardar, onCancelar, editando }) {
  const campo = (nombre) => ({
    name: nombre,
    value: form[nombre],
    onChange: (event) => setForm({ ...form, [nombre]: event.target.value })
  });

  return (
    <>
      <Antetitulo className="mb-2">{editando ? 'Modificar servicio' : 'Nuevo servicio'}</Antetitulo>
      <h2 className="mb-4 text-xl font-bold">{editando ? form.nombre : 'Registrar servicio'}</h2>
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
      {!tipos.length && (
        <Aviso tipo="warning">Registra primero un tipo de servicio.</Aviso>
      )}
      <form className="grid gap-4" onSubmit={onGuardar} noValidate>
        <Campo etiqueta="Tipo de servicio" error={errores.tipoServicioId}>
          <select {...campo('tipoServicioId')}>
            <option value="">Selecciona un tipo</option>
            {tipos.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Nombre" error={errores.nombre}>
          <input type="text" maxLength={150} {...campo('nombre')} />
        </Campo>
        <Campo etiqueta="Descripción" error={errores.descripcion}>
          <textarea maxLength={1000} {...campo('descripcion')} />
        </Campo>
        {!editando && (
          <>
            <Campo etiqueta="Precio" error={errores.precio}>
              <InputPrecio
                value={form.precio}
                onChange={(precio) => setForm({ ...form, precio })}
              />
            </Campo>
            <Campo etiqueta="Cobro" error={errores.tipoPrecio}>
              <select {...campo('tipoPrecio')}>
                <option value="fijo">Precio fijo</option>
                <option value="por_hora">Por hora</option>
              </select>
            </Campo>
          </>
        )}
        <p className="text-xs text-stone-500">Todos los campos son obligatorios.</p>
        <div className="flex gap-2.5">
          <Boton type="submit" className="flex-1" disabled={guardando || !tipos.length}>
            <span>{guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Registrar servicio'}</span><span aria-hidden="true">→</span>
          </Boton>
          <Boton variante="secundario" onClick={onCancelar}>Cancelar</Boton>
        </div>
      </form>
    </>
  );
}

function FormularioCambioPrecio({ form, setForm, errores, aviso, guardando, onGuardar, onCancelar }) {
  return (
    <>
      <Antetitulo className="mb-2">Cambio sujeto a aprobación</Antetitulo>
      <h2 className="mb-4 text-xl font-bold">Editar precio</h2>
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
      <form className="grid gap-4" onSubmit={onGuardar} noValidate>
        <Campo etiqueta="Precio" error={errores.precio}>
          <InputPrecio
            value={form.precio}
            onChange={(precio) => setForm({ ...form, precio })}
          />
        </Campo>
        <Campo etiqueta="Cobro" error={errores.tipoPrecio}>
          <select
            name="tipoPrecio"
            value={form.tipoPrecio}
            onChange={(event) => setForm({ ...form, tipoPrecio: event.target.value })}
          >
            <option value="fijo">Precio fijo</option>
            <option value="por_hora">Por hora</option>
          </select>
        </Campo>
        <p className="text-xs text-stone-500">El cambio se aplicará solamente si Gerencia lo aprueba.</p>
        <div className="flex gap-2.5">
          <Boton type="submit" className="flex-1" disabled={guardando}>
            <span>{guardando ? 'Enviando…' : 'Enviar a Gerencia'}</span><span aria-hidden="true">→</span>
          </Boton>
          <Boton variante="secundario" onClick={onCancelar}>Cancelar</Boton>
        </div>
      </form>
    </>
  );
}

function InputPrecio({ value, onChange }) {
  return (
    <input
      type="number"
      min="1"
      max="10000000"
      step="1"
      className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      name="precio"
      value={value}
      onKeyDown={(event) => {
        if (['-', '+', 'e', 'E', '.', ','].includes(event.key)) event.preventDefault();
      }}
      onChange={(event) => {
        if (/^\d*$/.test(event.target.value)) onChange(event.target.value);
      }}
    />
  );
}

function DetalleServicio({ servicio, puedeEditar, onEditar, onEditarPrecio }) {
  if (!servicio) {
    return (
      <>
        <Antetitulo>Detalle</Antetitulo>
        <Vacio>Selecciona un servicio para ver su información.</Vacio>
      </>
    );
  }

  const version = servicio.versionActiva;
  return (
    <>
      <Antetitulo className="mb-2">{servicio.tipoServicio.nombre}</Antetitulo>
      <h2 className="mb-2 text-xl font-bold">{servicio.nombre}</h2>
      <ListaDatos datos={[
        ['Descripción', servicio.descripcion || '—'],
        ['Precio', version ? formatoPrecio.format(version.precio) : '—'],
        ['Cobro', labelTipoPrecio(version?.tipoPrecio)]
      ]} />
      {!version && <Aviso tipo="warning">Este servicio no tiene una versión de precio activa.</Aviso>}
      {puedeEditar && (
        <div className="flex gap-2.5">
          <Boton className="flex-1" onClick={onEditar}><span className="block w-full text-center">Editar servicio</span></Boton>
          <Boton className="flex-1" variante="secundario" onClick={onEditarPrecio}><span className="block w-full text-center">Editar precio</span></Boton>
        </div>
      )}
    </>
  );
}
