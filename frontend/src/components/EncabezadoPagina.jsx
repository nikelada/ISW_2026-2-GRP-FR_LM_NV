import Antetitulo from './ui/Antetitulo.jsx';

// Título de cada pantalla, con acciones opcionales a la derecha.
export default function EncabezadoPagina({ antetitulo, titulo, descripcion, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-6">
      <div>
        <Antetitulo className="mb-2">{antetitulo}</Antetitulo>
        <h1 className="mb-1.5 text-3xl font-bold">{titulo}</h1>
        <p className="text-sm text-stone-500">{descripcion}</p>
      </div>
      {children}
    </div>
  );
}
