import { useCallback, useEffect, useState } from 'react';
import DataTable from './DataTable.jsx';
import Antetitulo from './ui/Antetitulo.jsx';
import Aviso from './ui/Aviso.jsx';
import Boton from './ui/Boton.jsx';
import ListaDatos from './ui/ListaDatos.jsx';
import Panel from './ui/Panel.jsx';
import Vacio from './ui/Vacio.jsx';
import { useFetch } from '../hooks/useFetch.js';
import * as cambioServicioService from '../services/cambioServicioService.js';
import { formatearFecha } from '../utils/fechas.js';
import { esGerencia } from '../utils/roles.js';

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
const formatearVigencia = (fecha) => (fecha
  ? formatearFecha(fecha.slice(0, 10), {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
  : '—');

const columnas = [
  { campo: 'servicio', titulo: 'Servicio', render: (cambio) => <strong>{cambio.servicio.nombre}</strong> },
  {
    campo: 'precioActual',
    titulo: 'Precio actual',
    className: 'whitespace-nowrap',
    render: (cambio) => cambio.servicio.versionActiva
      ? formatoPrecio.format(cambio.servicio.versionActiva.precio)
      : '—'
  },
  {
    campo: 'cobroActual',
    titulo: 'Cobro actual',
    render: (cambio) => labelTipoPrecio(cambio.servicio.versionActiva?.tipoPrecio)
  },
  {
    campo: 'vigenciaDesde',
    titulo: 'Vigente desde',
    className: 'whitespace-nowrap',
    render: (cambio) => formatearVigencia(cambio.servicio.versionActiva?.vigenciaDesde)
  },
  {
    campo: 'precioNuevo',
    titulo: 'Precio nuevo',
    className: 'whitespace-nowrap',
    render: (cambio) => formatoPrecio.format(cambio.precioNuevo)
  },
  {
    campo: 'cobroNuevo',
    titulo: 'Cobro nuevo',
    render: (cambio) => labelTipoPrecio(cambio.tipoPrecioNuevo)
  }
];

export default function CambiosPrecio({ user }) {
  const puedeRevisar = esGerencia(user);
  const {
    datos: cambios,
    cargando,
    error,
    recargar
  } = useFetch(useCallback(
    () => (puedeRevisar ? cambioServicioService.listarPendientes() : Promise.resolve([])),
    [puedeRevisar]
  ));
  const [seleccionado, setSeleccionado] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [procesando, setProcesando] = useState('');

  useEffect(() => {
    setSeleccionado((actual) => {
      if (!actual) return actual;
      return cambios.find((cambio) => cambio.id === actual.id) || null;
    });
  }, [cambios]);

  async function resolver(accion) {
    setProcesando(accion);
    setAviso(null);
    try {
      if (accion === 'aprobar') await cambioServicioService.aprobar(seleccionado.id);
      else await cambioServicioService.rechazar(seleccionado.id);
      setAviso({
        tipo: 'success',
        texto: accion === 'aprobar'
          ? `Cambio de precio de «${seleccionado.servicio.nombre}» aprobado.`
          : `Cambio de precio de «${seleccionado.servicio.nombre}» rechazado.`
      });
      setSeleccionado(null);
      recargar();
    } catch (e) {
      setAviso({ tipo: 'error', texto: e.message });
    } finally {
      setProcesando('');
    }
  }

  if (!puedeRevisar) {
    return <Aviso tipo="error">Esta sección está disponible únicamente para Gerencia.</Aviso>;
  }

  return (
    <>
      {aviso && <Aviso tipo={aviso.tipo} className="mb-4">{aviso.texto}</Aviso>}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Panel>
          {error && <Aviso tipo="error" className="m-3.5">{error}</Aviso>}
          {cargando && !cambios.length
            ? <Vacio>Cargando…</Vacio>
            : (
              <DataTable
                columnas={columnas}
                datos={cambios}
                vacio="No hay cambios de precio pendientes."
                seleccionadoId={seleccionado?.id}
                onSeleccionar={(cambio) => { setSeleccionado(cambio); setAviso(null); }}
              />
            )}
        </Panel>

        <Panel lateral>
          <DetalleCambio
            cambio={seleccionado}
            procesando={procesando}
            onAprobar={() => resolver('aprobar')}
            onRechazar={() => resolver('rechazar')}
          />
        </Panel>
      </div>
    </>
  );
}

function DetalleCambio({ cambio, procesando, onAprobar, onRechazar }) {
  if (!cambio) {
    return (
      <>
        <Antetitulo>Revisión</Antetitulo>
        <Vacio>Selecciona un cambio de precio pendiente para revisarlo.</Vacio>
      </>
    );
  }

  const actual = cambio.servicio.versionActiva;
  return (
    <>
      <Antetitulo className="mb-2">Cambio de precio</Antetitulo>
      <h2 className="mb-4 text-xl font-bold">{cambio.servicio.nombre}</h2>
      <ListaDatos datos={[
        ['Precio actual', actual ? formatoPrecio.format(actual.precio) : '—'],
        ['Cobro actual', labelTipoPrecio(actual?.tipoPrecio)],
        ['Vigente desde', formatearVigencia(actual?.vigenciaDesde)],
        ['Precio nuevo', formatoPrecio.format(cambio.precioNuevo)],
        ['Cobro nuevo', labelTipoPrecio(cambio.tipoPrecioNuevo)]
      ]} />
      <div className="flex gap-2.5">
        <Boton className="flex-1" disabled={Boolean(procesando)} onClick={onAprobar}>
          <span className="block w-full text-center">{procesando === 'aprobar' ? 'Aprobando…' : 'Aprobar'}</span>
        </Boton>
        <Boton className="flex-1" variante="secundario" disabled={Boolean(procesando)} onClick={onRechazar}>
          <span className="block w-full text-center">{procesando === 'rechazar' ? 'Rechazando…' : 'Rechazar'}</span>
        </Boton>
      </div>
    </>
  );
}
