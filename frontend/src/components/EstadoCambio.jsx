import Badge from './ui/Badge.jsx';

export const ESTADOS_CAMBIO = {
  pendiente: { texto: 'Pendiente de revisión', color: 'amarillo' },
  aprobado: { texto: 'Aprobado', color: 'verde' },
  rechazado: { texto: 'Rechazado', color: 'rojo' }
};

// Badge con el estado del cambio (y si ya se aplicó)
export default function EstadoCambio({ cambio }) {
  const { texto, color } = ESTADOS_CAMBIO[cambio.estado];
  return (
    <>
      <Badge color={color} data-estado-cambio={cambio.estado}>{texto}</Badge>
      {cambio.aplicadoEn && <Badge color="oscuro" data-estado-cambio="aplicado">Aplicado al evento</Badge>}
    </>
  );
}
