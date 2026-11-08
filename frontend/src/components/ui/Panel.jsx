// Caja blanca con borde. Con `lateral` queda pegada al costado al hacer scroll
export default function Panel({ lateral = false, className = '', children, ...props }) {
  const Etiqueta = lateral ? 'aside' : 'section';
  return (
    <Etiqueta
      className={`rounded-lg border border-stone-200 bg-white ${lateral ? 'p-6 lg:sticky lg:top-20' : ''} ${className}`}
      data-panel={lateral ? 'lateral' : undefined}
      {...props}
    >
      {children}
    </Etiqueta>
  );
}
