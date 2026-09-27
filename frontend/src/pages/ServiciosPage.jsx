import { useCallback, useEffect, useMemo, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import EncabezadoPagina from '../components/EncabezadoPagina.jsx';
import Antetitulo from '../components/ui/Antetitulo.jsx';
import Aviso from '../components/ui/Aviso.jsx';
import Badge from '../components/ui/Badge.jsx';
import Boton from '../components/ui/Boton.jsx';
import Campo from '../components/ui/Campo.jsx';
import ListaDatos from '../components/ui/ListaDatos.jsx';
import Panel from '../components/ui/Panel.jsx';
import Vacio from '../components/ui/Vacio.jsx';
import { useFetch } from '../hooks/useFetch.js';
import * as servicioService from '../services/servicioService.js';
import * as tipoServicioService from '../services/tipoServicioService.js';
import { esProduccion } from '../utils/roles.js';

const TIPO_VACIO = { nombre: '', descripcion: '' };

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
  const [vista, setVista] = useState('servicios');
  const [tipoServicioId, setTipoServicioId] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
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
    error: errorServicios
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
    if (!seleccionado) return;
    const actualizado = serviciosFiltrados.find((servicio) => servicio.id === seleccionado.id);
    setSeleccionado(actualizado || null);
  }, [serviciosFiltrados, seleccionado?.id]);

  function cambiarVista() {
    setVista(vista === 'servicios' ? 'tipos' : 'servicios');
    setCreandoTipo(false);
    setErroresTipo({});
    setAvisoTipo(null);
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
        titulo={vista === 'servicios' ? 'Servicios' : 'Tipos de servicio'}
        descripcion={vista === 'servicios'
          ? 'Servicios disponibles y su precio actual.'
          : 'Tipos utilizados para organizar los servicios disponibles.'}
      >
        <div className="flex gap-2.5">
          {vista === 'tipos' && puedeEditar && <Boton onClick={nuevoTipo}>Nuevo tipo de servicio</Boton>}
          <Boton variante="secundario" onClick={cambiarVista}>
            {vista === 'servicios' ? 'Tipos de servicio' : 'Ver servicios'}
          </Boton>
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
          {cargando && !servicios.length
            ? <Vacio>Cargando…</Vacio>
            : (
              <DataTable
                columnas={columnasServicios}
                datos={serviciosFiltrados}
                vacio="No hay servicios disponibles con este filtro."
                seleccionadoId={seleccionado?.id}
                onSeleccionar={setSeleccionado}
              />
            )}
          </Panel>

          <Panel lateral>
            <DetalleServicio servicio={seleccionado} />
          </Panel>
        </div>
      )}
    </>
  );
}

function DetalleServicio({ servicio }) {
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
      <Badge color={servicio.activo ? 'verde' : 'rojo'}>{servicio.activo ? 'Activo' : 'Inactivo'}</Badge>
      <ListaDatos datos={[
        ['Descripción', servicio.descripcion || '—'],
        ['Precio', version ? formatoPrecio.format(version.precio) : '—'],
        ['Cobro', labelTipoPrecio(version?.tipoPrecio)]
      ]} />
      {!version && <Aviso tipo="warning">Este servicio no tiene una versión de precio activa.</Aviso>}
    </>
  );
}
