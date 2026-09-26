const TIPOS = {
  success: 'border-emerald-600 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-500 bg-amber-50 text-amber-900',
  error: 'border-red-600 bg-red-50 text-red-900'
};

// Mensaje destacado: tipo = 'success' | 'warning' | 'error'.
export default function Aviso({ tipo = 'success', titulo, className = 'mb-3.5', children }) {
  return (
    <div
      role={tipo === 'error' ? 'alert' : 'status'}
      data-aviso={tipo}
      className={`border-l-4 px-3.5 py-3 text-sm [&_p]:mt-1.5 [&_p:first-child]:mt-0 [&_ul]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5 ${TIPOS[tipo]} ${className}`}
    >
      {titulo && <strong className="font-semibold">{titulo}</strong>}
      {children}
    </div>
  );
}
