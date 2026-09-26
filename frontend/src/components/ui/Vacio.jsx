// Mensaje para listas o paneles sin contenido.
export default function Vacio({ children }) {
  return <p className="px-3.5 py-9 text-center text-sm text-stone-500">{children}</p>;
}
