// Lista de pares etiqueta / valor: datos = [['Fecha', '...'], ...]. Los pares con valor null se omiten.
export default function ListaDatos({ datos }) {
  return (
    <dl className="my-4 grid grid-cols-[140px_1fr] gap-x-3 gap-y-2 text-sm">
      {datos.filter(([, valor]) => valor !== null).map(([etiqueta, valor]) => (
        <div key={etiqueta} className="contents">
          <dt className="text-stone-500">{etiqueta}</dt>
          <dd className="whitespace-pre-line font-medium">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}
