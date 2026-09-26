const VARIANTES = {
  primario: 'flex items-center justify-between gap-3 rounded-md bg-teal-900 px-4 py-2.5 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60',
  secundario: 'rounded-md border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-teal-900 hover:border-stone-400',
  enlace: 'text-sm font-semibold text-teal-700 hover:text-teal-900 hover:underline'
};

export default function Boton({ variante = 'primario', type = 'button', className = '', children, ...props }) {
  return (
    <button type={type} className={`${VARIANTES[variante]} ${className}`} {...props}>
      {children}
    </button>
  );
}
