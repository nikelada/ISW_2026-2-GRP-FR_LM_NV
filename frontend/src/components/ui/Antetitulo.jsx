// Texto pequeño en mayúsculas que va sobre un título.
export default function Antetitulo({ className = '', children }) {
  return <p className={`text-[11px] font-semibold uppercase tracking-widest text-stone-500 ${className}`}>{children}</p>;
}
