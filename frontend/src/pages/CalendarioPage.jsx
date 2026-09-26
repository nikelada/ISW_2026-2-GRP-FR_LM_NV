import { useCallback, useMemo, useState } from 'react';
import EncabezadoPagina from '../components/EncabezadoPagina.jsx';
import EstadoBadge from '../components/EstadoBadge.jsx';
import ResultadoDisponibilidad from '../components/ResultadoDisponibilidad.jsx';
import Antetitulo from '../components/ui/Antetitulo.jsx';
import Aviso from '../components/ui/Aviso.jsx';
import Boton from '../components/ui/Boton.jsx';
import Campo from '../components/ui/Campo.jsx';
import Panel from '../components/ui/Panel.jsx';
import Vacio from '../components/ui/Vacio.jsx';
import { useFetch } from '../hooks/useFetch.js';
import * as calendarioService from '../services/calendarioService.js';
import { formatearFecha, formatearHorario } from '../utils/fechas.js';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const CHIP = 'block truncate rounded border px-1.5 py-0.5 text-[10px] max-lg:h-1.5 max-lg:p-0 max-lg:text-[0px]';
const chipEstado = (estado) => (estado === 'confirmado' ? 'border-teal-900 bg-teal-900 text-white' : 'border-teal-200 bg-white text-teal-900');

function aIso(fecha) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

function desdeIso(texto) {
  const [year, month, day] = texto.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Días visibles del mes en semanas completas de lunes a domingo.
function diasDelMes(mes) {
  const inicio = new Date(mes.getFullYear(), mes.getMonth(), 1);
  inicio.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7));
  const fin = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
  fin.setDate(fin.getDate() + (6 - ((fin.getDay() + 6) % 7)));
  const dias = [];
  for (const d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) dias.push(new Date(d));
  return dias;
}

// Consultar calendario y disponibilidad.
export default function CalendarioPage() {
  const hoy = aIso(new Date());
  const [seleccionado, setSeleccionado] = useState(hoy);
  const [mes, setMes] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const dias = useMemo(() => diasDelMes(mes), [mes]);
  const desde = aIso(dias[0]);
  const hasta = aIso(dias.at(-1));
  const { datos: eventos, error } = useFetch(useCallback(() => calendarioService.listar(desde, hasta), [desde, hasta]));

  const [consulta, setConsulta] = useState({ fecha: hoy, horaInicio: '', horaFin: '' });
  const [resultado, setResultado] = useState(null);
  const [errorConsulta, setErrorConsulta] = useState('');

  const eventosDelDia = (fecha) => eventos.filter((evento) => evento.fecha === fecha);
  const titulo = mes.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

  function seleccionar(fecha) {
    setSeleccionado(fecha);
    setConsulta({ ...consulta, fecha });
    setResultado(null);
    const dia = desdeIso(fecha);
    if (dia.getMonth() !== mes.getMonth()) setMes(new Date(dia.getFullYear(), dia.getMonth(), 1));
  }

  function cambiarMes(delta) {
    setMes(new Date(mes.getFullYear(), mes.getMonth() + delta, 1));
  }

  async function consultar(event) {
    event.preventDefault();
    setErrorConsulta('');
    setResultado(null);
    try {
      setResultado(await calendarioService.consultarDisponibilidad(consulta));
    } catch (e) {
      setErrorConsulta(e.message);
    }
  }

  const delDia = eventosDelDia(seleccionado);

  return (
    <>
      <EncabezadoPagina antetitulo="Calendario compartido" titulo="Calendario de eventos" descripcion="Eventos registrados por fecha y horario. Solo los eventos con fecha confirmada generan conflicto.">
        <div className="flex gap-2 max-lg:hidden">
          <span className={`${CHIP} ${chipEstado('confirmado')} text-[11px]!`}>Fecha confirmada</span>
          <span className={`${CHIP} ${chipEstado('pendiente')} text-[11px]!`}>Solicitud sin confirmar</span>
        </div>
      </EncabezadoPagina>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <div className="flex items-center gap-2.5 border-b border-stone-200 p-3.5">
            <Boton variante="secundario" className="px-3! py-1.5!" aria-label="Mes anterior" onClick={() => cambiarMes(-1)}>←</Boton>
            <h2 className="flex-1 text-center text-lg font-bold">{titulo.charAt(0).toUpperCase() + titulo.slice(1)}</h2>
            <Boton variante="secundario" className="px-3! py-1.5!" aria-label="Mes siguiente" onClick={() => cambiarMes(1)}>→</Boton>
            <Boton variante="enlace" onClick={() => seleccionar(hoy)}>Hoy</Boton>
          </div>
          {error && <Aviso tipo="error" className="m-3.5">{error}</Aviso>}
          <div className="grid grid-cols-7">
            {DIAS.map((dia) => (
              <div key={dia} className="border-b border-stone-200 p-2 text-center text-[11px] font-semibold uppercase text-stone-500">{dia}</div>
            ))}
            {dias.map((dia) => {
              const fecha = aIso(dia);
              const eventosDia = eventosDelDia(fecha);
              const fuera = dia.getMonth() !== mes.getMonth();
              return (
                <button
                  key={fecha}
                  type="button"
                  data-fecha={fecha}
                  aria-pressed={fecha === seleccionado}
                  onClick={() => seleccionar(fecha)}
                  className={`flex min-h-24 flex-col gap-0.5 overflow-hidden border-b border-r border-stone-100 p-1.5 text-left nth-[7n]:border-r-0 hover:bg-stone-50 max-lg:min-h-16
                    ${fuera ? 'bg-stone-50 text-stone-400' : 'bg-white'} ${fecha === seleccionado ? 'ring-2 ring-inset ring-teal-900' : ''}`}
                >
                  <span className={`text-xs font-semibold ${fecha === hoy ? 'grid size-6 place-items-center rounded-full bg-teal-100 text-teal-900' : ''}`}>{dia.getDate()}</span>
                  {eventosDia.slice(0, 3).map((evento) => (
                    <span key={evento.id} data-estado={evento.estado} className={`${CHIP} ${chipEstado(evento.estado)}`}>
                      {formatearHorario(evento)} {evento.cliente.nombre}
                    </span>
                  ))}
                  {eventosDia.length > 3 && <span className="text-[10px] text-stone-500">+{eventosDia.length - 3} más</span>}
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel lateral>
          <Antetitulo className="mb-2">Día seleccionado</Antetitulo>
          <h2 className="mb-4 text-xl font-bold">{formatearFecha(seleccionado, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
          {delDia.length ? (
            <ul className="mb-5 grid gap-2" aria-label="Eventos del día">
              {delDia.map((evento) => (
                <li key={evento.id} className={`grid grid-cols-[92px_1fr_auto] items-start gap-2.5 border border-l-4 border-stone-200 p-3 text-sm ${evento.estado === 'confirmado' ? 'border-l-teal-900' : 'border-l-teal-200'}`}>
                  <span className="text-xs font-semibold">{formatearHorario(evento) || 'Sin horario'}</span>
                  <div>
                    <strong>{evento.cliente.nombre}</strong>
                    <small className="mb-1 mt-0.5 block text-stone-500">{evento.lugar || 'Sin lugar'}{evento.cantidadPersonas ? ` · ${evento.cantidadPersonas} personas` : ''}</small>
                    <div><EstadoBadge estado={evento.estado} fechaHabilitada={evento.fechaHabilitada} /></div>
                  </div>
                  <a className="text-sm font-semibold text-teal-700 hover:underline" href={`#/solicitudes?id=${evento.id}`}>Ver</a>
                </li>
              ))}
            </ul>
          ) : (
            <Vacio>No hay eventos registrados en esta fecha.</Vacio>
          )}

          <form className="grid gap-4 border-t border-stone-200 pt-4" aria-label="Revisar disponibilidad" onSubmit={consultar}>
            <Antetitulo>Revisar disponibilidad</Antetitulo>
            <Campo etiqueta="Fecha"><input type="date" name="fecha" required value={consulta.fecha} onChange={(e) => setConsulta({ ...consulta, fecha: e.target.value })} /></Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Hora de inicio"><input type="time" name="horaInicio" required value={consulta.horaInicio} onChange={(e) => setConsulta({ ...consulta, horaInicio: e.target.value })} /></Campo>
              <Campo etiqueta="Hora de término"><input type="time" name="horaFin" required value={consulta.horaFin} onChange={(e) => setConsulta({ ...consulta, horaFin: e.target.value })} /></Campo>
            </div>
            <Boton type="submit"><span>Consultar disponibilidad</span><span aria-hidden="true">→</span></Boton>
            {errorConsulta && <Aviso tipo="error" className=""><p>{errorConsulta}</p></Aviso>}
            <ResultadoDisponibilidad resultado={resultado} />
          </form>
        </Panel>
      </div>
    </>
  );
}
