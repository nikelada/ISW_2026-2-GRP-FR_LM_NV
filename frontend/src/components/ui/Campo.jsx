const INVALIDO = '[&_input]:border-red-600 [&_select]:border-red-600 [&_textarea]:border-red-600';

// Etiqueta + control de formulario + mensaje de error del campo.
export default function Campo({ etiqueta, error, children }) {
  return (
    <label className={`grid gap-1.5 text-xs font-semibold text-stone-600 ${error ? INVALIDO : ''}`}>
      {etiqueta}
      {children}
      {error && <span className="text-xs font-medium text-red-700" data-campo-error>{error}</span>}
    </label>
  );
}
