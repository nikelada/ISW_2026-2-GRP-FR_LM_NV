// Texto chico en mayúsculas que va arriba de los títulos
export default function Antetitulo({ className = '', children }) {
  return <p className={`text-[11px] font-semibold uppercase tracking-widest text-stone-500 ${className}`}>{children}</p>;
}
