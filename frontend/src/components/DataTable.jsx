import Vacio from './ui/Vacio.jsx';

// Tabla genérica: no sabe qué es un cliente ni una solicitud, solo dibuja filas.
export default function DataTable({ columnas, datos, vacio, seleccionadoId, onSeleccionar }) {
  if (!datos.length) return <Vacio>{vacio}</Vacio>;

  return (
    <table className="w-full border-collapse text-sm max-lg:block max-lg:overflow-x-auto">
      <thead>
        <tr>
          {columnas.map((c) => (
            <th key={c.campo} className="border-b border-stone-200 px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-500">
              {c.titulo}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {datos.map((fila) => {
          const seleccionada = fila.id === seleccionadoId;
          return (
            <tr
              key={fila.id}
              aria-selected={seleccionada}
              className={`border-b border-stone-100 last:border-0 ${seleccionada ? 'bg-teal-50' : ''} ${onSeleccionar ? 'cursor-pointer hover:bg-stone-50' : ''}`}
              onClick={onSeleccionar ? () => onSeleccionar(fila) : undefined}
            >
              {columnas.map((c) => (
                <td key={c.campo} className={`px-3.5 py-3 align-middle ${c.className || ''}`}>{c.render ? c.render(fila) : fila[c.campo]}</td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
