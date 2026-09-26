const COLORES = {
  amarillo: 'bg-amber-100 text-amber-800',
  verde: 'bg-emerald-100 text-emerald-800',
  rojo: 'bg-red-100 text-red-800',
  azul: 'bg-sky-100 text-sky-800',
  oscuro: 'bg-teal-900 text-white'
};

export default function Badge({ color, children, ...props }) {
  return (
    <span className={`mr-1.5 my-0.5 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${COLORES[color]}`} {...props}>
      {children}
    </span>
  );
}
