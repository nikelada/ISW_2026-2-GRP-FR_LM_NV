import { useCallback, useEffect, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import EncabezadoPagina from '../components/EncabezadoPagina.jsx';
import Antetitulo from '../components/ui/Antetitulo.jsx';
import Aviso from '../components/ui/Aviso.jsx';
import Badge from '../components/ui/Badge.jsx';
import ListaDatos from '../components/ui/ListaDatos.jsx';
import Panel from '../components/ui/Panel.jsx';
import Vacio from '../components/ui/Vacio.jsx';
import { useFetch } from '../hooks/useFetch.js';
import * as servicioService from '../services/servicioService.js';
import * as tipoServicioService from '../services/tipoServicioService.js';

const formatoPrecio = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0
});

const columnas = [
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
    render: (s) => s.versionActiva?.tipoPrecio || '—'
  }
];

export default function ServiciosPage() {
  const [tipoServicioId, setTipoServicioId] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const { datos: tipos, error: errorTipos } = useFetch(useCallback(() => tipoServicioService.listar(), []));
  const {
    datos: servicios,
    cargando,
    error: errorServicios
  } = useFetch(useCallback(
    () => servicioService.listar({ tipoServicioId }),
    [tipoServicioId]
  ));

  useEffect(() => {
    if (!seleccionado) return;
    const actualizado = servicios.find((servicio) => servicio.id === seleccionado.id);
    setSeleccionado(actualizado || null);
  }, [servicios, seleccionado?.id]);

  return (
    <>
      <EncabezadoPagina
        antetitulo="Gestión"
        titulo="Servicios"
        descripcion="Servicios disponibles y su precio actual."
      />
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
                columnas={columnas}
                datos={servicios}
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
        ['Cobro', version?.tipoPrecio || '—']
      ]} />
      {!version && <Aviso tipo="warning">Este servicio no tiene una versión de precio activa.</Aviso>}
    </>
  );
}
