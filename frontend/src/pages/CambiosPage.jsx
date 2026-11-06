import { useCallback, useEffect, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import EncabezadoPagina from '../components/EncabezadoPagina.jsx';
import EstadoCambio, { ESTADOS_CAMBIO } from '../components/EstadoCambio.jsx';
import ResultadoDisponibilidad from '../components/ResultadoDisponibilidad.jsx';
import Antetitulo from '../components/ui/Antetitulo.jsx';
import Aviso from '../components/ui/Aviso.jsx';
import Boton from '../components/ui/Boton.jsx';
import Campo from '../components/ui/Campo.jsx';
import ListaDatos from '../components/ui/ListaDatos.jsx';
import Panel from '../components/ui/Panel.jsx';
import Vacio from '../components/ui/Vacio.jsx';
import { useFetch } from '../hooks/useFetch.js';
import * as cambioService from '../services/cambioService.js';
import * as solicitudService from '../services/solicitudService.js';
import { CAMPOS_EVENTO, etiquetaCampo, formatearValor } from '../utils/camposEvento.js';
import { formatearFecha, formatearHorario } from '../utils/fechas.js';
import { esGerencia, esProduccion } from '../utils/roles.js';

// Marcar un factor significa que ya se revisó, no que esté todo bien
const FACTORES = [
  { clave: 'revisionRecursos', etiqueta: 'Revisé la disponibilidad de recursos' },
  { clave: 'revisionAnticipacion', etiqueta: 'Revisé el tiempo de anticipación' },
  { clave: 'revisionCosto', etiqueta: 'Revisé el costo adicional' },
  { clave: 'revisionOtrosEventos', etiqueta: 'Revisé si afecta a otros eventos confirmados' }
];

const CAMPOS_HORARIO = ['fecha', 'horaInicio', 'horaFin'];
const NOTA = 'ml-6 text-xs text-stone-500';

function Anticipacion({ evento }) {
  const [year, month, day] = evento.fecha.split('-').map(Number);
  const hoy = new Date();
  const dias = Math.round((Date.UTC(year, month - 1, day) - Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) / 86400000);
  return <p className={NOTA}>{dias >= 0 ? `Faltan ${dias} días para el evento.` : 'La fecha del evento ya pasó.'}</p>;
}

const NOTAS_FACTOR = {
  revisionRecursos: () => <p className={NOTA}>Se revisa en el módulo de recursos.</p>,
  revisionAnticipacion: ({ cambio }) => <Anticipacion evento={cambio.evento} />,
  revisionCosto: () => <p className={NOTA}>El costo adicional se determina en el módulo de cotizaciones.</p>,
  revisionOtrosEventos: ImpactoOtrosEventos
};

// Muestra si el nuevo horario choca con otros eventos confirmados
function ImpactoOtrosEventos({ cambio }) {
  if (cambio.conflictos.length) {
    return <p className="ml-6 text-xs font-medium text-red-700">Afecta: se superpone con {cambio.conflictos.length === 1 ? 'otro evento confirmado' : `${cambio.conflictos.length} eventos confirmados`} (ver detalle arriba).</p>;
  }
  if (CAMPOS_HORARIO.some((campo) => campo in cambio.cambios)) {
    return <p className="ml-6 text-xs text-emerald-700">El nuevo horario no se superpone con otros eventos confirmados.</p>;
  }
  return <p className="ml-6 text-xs text-stone-500">El cambio no modifica la fecha ni el horario del evento.</p>;
}

const CHECK = 'flex items-center gap-2 text-sm font-normal text-stone-800';

const fechaHora = (valor) => new Date(valor).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' });

const columnas = [
  { campo: 'id', titulo: 'N°', className: 'text-stone-500', render: (c) => `#${c.id}` },
  {
    campo: 'evento',
    titulo: 'Evento',
    render: (c) => (
      <>
        <strong>{c.evento.cliente.nombre}</strong>
        <small className="block text-stone-500">{formatearFecha(c.evento.fecha)} · {formatearHorario(c.evento)}</small>
      </>
    )
  },
  { campo: 'cambios', titulo: 'Datos a cambiar', render: (c) => Object.keys(c.cambios).map(etiquetaCampo).join(', ') },
  { campo: 'estado', titulo: 'Estado', render: (c) => <EstadoCambio cambio={c} /> }
];

// Cambios de eventos: se registran, gerencia los revisa y después se aplican
export default function CambiosPage({ user, params }) {
  const produccion = esProduccion(user);
  const gerencia = esGerencia(user);
  const [filtro, setFiltro] = useState('');
  const { datos: cambios, cargando, error, recargar } = useFetch(useCallback(() => cambioService.listar(filtro), [filtro]));
  const [seleccionadoId, setSeleccionadoId] = useState(Number(params.get('id')) || null);
  const [nuevo, setNuevo] = useState(produccion && params.get('nuevo') === '1');
  const [aviso, setAviso] = useState(null);
  const seleccionado = cambios.find((c) => c.id === seleccionadoId) || null;

  function seleccionar(cambio) {
    setSeleccionadoId(cambio.id);
    setNuevo(false);
    setAviso(null);
  }

  function alTerminar(cambio, texto, tipo = 'success') {
    setSeleccionadoId(cambio.id);
    setNuevo(false);
    setAviso({ tipo, texto });
    if (params.toString()) history.replaceState(null, '', '#/cambios');
    recargar();
  }

  return (
    <>
      <EncabezadoPagina antetitulo="Eventos confirmados" titulo="Cambios solicitados" descripcion="Cambios pedidos por los clientes: Gerencia los aprueba o rechaza y Producción y Comercial aplica solo lo aprobado.">
        {produccion && (
          <Boton onClick={() => { setNuevo(true); setSeleccionadoId(null); setAviso(null); }}>
            <span>Registrar cambio</span><span aria-hidden="true">+</span>
          </Boton>
        )}
      </EncabezadoPagina>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Panel>
          <div className="flex gap-2.5 border-b border-stone-200 p-3.5">
            <select className="w-auto" aria-label="Filtrar por estado" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="">Todos los estados</option>
              {Object.entries(ESTADOS_CAMBIO).map(([valor, { texto }]) => <option key={valor} value={valor}>{texto}</option>)}
            </select>
          </div>
          {error && <Aviso tipo="error" className="m-3.5">{error}</Aviso>}
          {cargando && !cambios.length
            ? <Vacio>Cargando…</Vacio>
            : <DataTable columnas={columnas} datos={cambios} vacio="No hay cambios registrados con este filtro." seleccionadoId={seleccionadoId} onSeleccionar={seleccionar} />}
        </Panel>
        <Panel lateral>
          {nuevo ? (
            <NuevoCambio eventoInicial={Number(params.get('evento')) || ''} onCancelar={() => setNuevo(false)} onRegistrado={(c) => alTerminar(c, `Cambio #${c.id} registrado; queda pendiente de revisión de Gerencia.`)} />
          ) : seleccionado ? (
            <DetalleCambio key={seleccionado.id} cambio={seleccionado} aviso={aviso} gerencia={gerencia} produccion={produccion} onTerminar={alTerminar} />
          ) : (
            <>
              <Antetitulo>Detalle</Antetitulo>
              {aviso && <Aviso tipo={aviso.tipo} className="mt-3"><p>{aviso.texto}</p></Aviso>}
              <Vacio>Selecciona un cambio para ver su detalle.</Vacio>
            </>
          )}
        </Panel>
      </div>
    </>
  );
}

// Formulario para registrar lo que el cliente pidió cambiar
function NuevoCambio({ eventoInicial, onCancelar, onRegistrado }) {
  const { datos: eventos } = useFetch(useCallback(() => solicitudService.listar('confirmado'), []));
  const [eventoId, setEventoId] = useState(eventoInicial);
  const [seleccion, setSeleccion] = useState({});
  const [valores, setValores] = useState({});
  const [motivo, setMotivo] = useState('');
  const [errores, setErrores] = useState({});
  const [error, setError] = useState('');
  const evento = eventos.find((e) => e.id === Number(eventoId));

  // Al elegir el evento se cargan sus valores actuales
  useEffect(() => {
    if (!evento) return;
    setValores(Object.fromEntries(CAMPOS_EVENTO.map(({ campo }) => [campo, evento[campo] ?? ''])));
    setSeleccion({});
  }, [evento]);

  async function registrar(event) {
    event.preventDefault();
    setError('');
    setErrores({});
    const cambios = Object.fromEntries(Object.keys(seleccion).filter((campo) => seleccion[campo]).map((campo) => [campo, valores[campo]]));
    try {
      onRegistrado(await cambioService.registrar({ solicitudId: Number(eventoId), cambios, motivo }));
    } catch (e) {
      setErrores(e.data?.errores || {});
      setError(e.message);
    }
  }

  return (
    <>
      <Antetitulo className="mb-2">Nuevo cambio</Antetitulo>
      <h2 className="mb-4 text-xl font-bold">Registrar cambio solicitado</h2>
      {error && <Aviso tipo="error"><p>{error}</p></Aviso>}
      <form className="grid gap-4" onSubmit={registrar} noValidate>
        <Campo etiqueta="Evento confirmado">
          <select name="evento" value={eventoId} onChange={(e) => setEventoId(e.target.value)}>
            <option value="">Selecciona un evento</option>
            {eventos.map((e) => <option key={e.id} value={e.id}>{e.cliente.nombre} · {formatearFecha(e.fecha)} · {formatearHorario(e)}</option>)}
          </select>
        </Campo>
        {evento && (
          <>
            <p className="text-xs text-stone-500">Marca los datos que el cliente quiere cambiar e indica el nuevo valor.</p>
            {CAMPOS_EVENTO.map(({ campo, etiqueta, tipo }) => (
              <div key={campo} className={`grid gap-2 rounded-md border px-3 py-2.5 ${seleccion[campo] ? 'border-stone-400 bg-stone-50' : 'border-stone-200'}`}>
                <label className={CHECK}>
                  <input type="checkbox" name={`cambiar-${campo}`} checked={!!seleccion[campo]} onChange={(e) => setSeleccion({ ...seleccion, [campo]: e.target.checked })} />
                  <span>{etiqueta}</span>
                </label>
                {seleccion[campo] && (
                  <Campo error={errores[campo]}>
                    {tipo === 'textarea'
                      ? <textarea name={campo} value={valores[campo]} onChange={(e) => setValores({ ...valores, [campo]: e.target.value })} />
                      : <input type={tipo} name={campo} min={tipo === 'number' ? 1 : undefined} value={valores[campo]} onChange={(e) => setValores({ ...valores, [campo]: e.target.value })} />}
                  </Campo>
                )}
              </div>
            ))}
            <Campo etiqueta="Motivo del cambio" error={errores.motivo}>
              <textarea name="motivo" rows={3} maxLength={1000} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </Campo>
          </>
        )}
        <div className="flex gap-2.5">
          <Boton type="submit" className="flex-1" disabled={!evento}><span>Registrar cambio</span><span aria-hidden="true">→</span></Boton>
          <Boton variante="secundario" onClick={onCancelar}>Cancelar</Boton>
        </div>
      </form>
    </>
  );
}

function DetalleCambio({ cambio, aviso, gerencia, produccion, onTerminar }) {
  const [factores, setFactores] = useState(Object.fromEntries(FACTORES.map(({ clave }) => [clave, false])));
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);
  const todosRevisados = FACTORES.every(({ clave }) => factores[clave]);
  const { evento } = cambio;

  async function revisar(decision) {
    setError('');
    try {
      const revisado = await cambioService.revisar(cambio.id, { decision, ...factores });
      onTerminar(revisado, decision === 'aprobar'
        ? 'Cambio aprobado: Producción y Comercial puede aplicarlo al evento.'
        : 'Cambio rechazado: el evento mantiene su información actual.');
    } catch (e) {
      setError(e.message);
    }
  }

  async function aplicar() {
    setError('');
    setResultado(null);
    try {
      onTerminar(await cambioService.aplicar(cambio.id), 'Evento actualizado con los datos aprobados; la modificación quedó en su historial.');
    } catch (e) {
      if (e.data?.conflictos) setResultado(e.data);
      else setError(e.message);
    }
  }

  const celda = 'border-b border-stone-100 px-3 py-2.5 text-left';

  return (
    <>
      <Antetitulo className="mb-2">Cambio #{cambio.id}</Antetitulo>
      <h2 className="mb-2 text-xl font-bold">{evento.cliente.nombre}</h2>
      <div className="mb-4"><EstadoCambio cambio={cambio} /></div>
      {aviso && <Aviso tipo={aviso.tipo}><p>{aviso.texto}</p></Aviso>}
      {error && <Aviso tipo="error"><p>{error}</p></Aviso>}

      <table className="mb-1.5 w-full border border-stone-200 text-sm" aria-label="Datos del cambio">
        <thead className="text-[11px] uppercase tracking-wide text-stone-500">
          <tr>
            <th className={celda}>Dato</th>
            {!cambio.aplicadoEn && <th className={celda}>Actual</th>}
            <th className={celda}>{cambio.aplicadoEn ? 'Aplicado' : cambio.estado === 'pendiente' ? 'Propuesto' : 'Solicitado'}</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(cambio.cambios).map(([campo, valor]) => (
            <tr key={campo}>
              <td className={celda}>{etiquetaCampo(campo)}</td>
              {!cambio.aplicadoEn && <td className={celda}>{formatearValor(campo, evento[campo])}</td>}
              <td className={`${celda} font-semibold`}>{formatearValor(campo, valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ListaDatos datos={[
        ['Motivo', cambio.motivo],
        ['Registrado por', `${cambio.registradoPor} · ${fechaHora(cambio.createdAt)}`],
        [cambio.estado === 'aprobado' ? 'Aprobado por' : 'Rechazado por', cambio.revisadoPor ? `${cambio.revisadoPor} · ${fechaHora(cambio.revisadoEn)}` : null],
        ['Aplicado por', cambio.aplicadoPor ? `${cambio.aplicadoPor} · ${fechaHora(cambio.aplicadoEn)}` : null]
      ]} />

      {cambio.estado === 'aprobado' && !cambio.aplicadoEn && (
        <Aviso tipo="warning" titulo="Pendiente de aplicar">
          <p>Gerencia aprobó este cambio. Falta aplicarlo al evento.</p>
        </Aviso>
      )}
      {cambio.estado === 'rechazado' && (
        <Aviso tipo="success" titulo="Cambio rechazado">
          <p>El evento mantiene su información actual.</p>
        </Aviso>
      )}

      {cambio.estado === 'pendiente' && (
        <>
          {cambio.conflictos.length > 0 && (
            <ResultadoDisponibilidad resultado={{ disponible: false, conflictos: cambio.conflictos, message: 'Con la fecha u horario propuestos, el evento se superpone con otro evento confirmado.' }} />
          )}
          {gerencia ? (
            <div className="mt-3.5 grid gap-2.5 border-t border-stone-200 pt-4" aria-label="Revisión de Gerencia">
              <Antetitulo>Revisión de Gerencia</Antetitulo>
              <p className="text-xs text-stone-500">Marca cada factor una vez revisado. Si alguno perjudica al evento o a otros eventos confirmados, rechaza el cambio.</p>
              {FACTORES.map(({ clave, etiqueta }) => {
                const Nota = NOTAS_FACTOR[clave];
                return (
                  <div key={clave} className="grid gap-1">
                    <label className={CHECK}>
                      <input type="checkbox" name={clave} checked={factores[clave]} onChange={(e) => setFactores({ ...factores, [clave]: e.target.checked })} />
                      <span>{etiqueta}</span>
                    </label>
                    <Nota cambio={cambio} />
                  </div>
                );
              })}
              <p className="text-xs text-stone-500">Para aprobar, los cuatro factores deben estar revisados.</p>
              <div className="flex gap-2.5">
                <Boton className="flex-1" disabled={!todosRevisados} onClick={() => revisar('aprobar')}><span>Aprobar</span><span aria-hidden="true">✓</span></Boton>
                <Boton variante="secundario" onClick={() => revisar('rechazar')}>Rechazar</Boton>
              </div>
            </div>
          ) : (
            <p className="text-xs text-stone-500">Pendiente de revisión por Gerencia.</p>
          )}
        </>
      )}

      {cambio.estado === 'aprobado' && !cambio.aplicadoEn && produccion && (
        <>
          <ResultadoDisponibilidad resultado={resultado} />
          <Boton className="w-full" onClick={aplicar}><span>Aplicar datos aprobados al evento</span><span aria-hidden="true">→</span></Boton>
        </>
      )}
    </>
  );
}
