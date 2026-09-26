import Badge from './ui/Badge.jsx';

const ESTADOS = {
  pendiente: { texto: 'Pendiente de información', color: 'amarillo' },
  disponible_cotizar: { texto: 'Disponible para cotizar', color: 'verde' },
  confirmado: { texto: 'Fecha confirmada', color: 'oscuro' }
};

// La marca de fecha habilitada solo aporta información mientras el evento no está confirmado.
export default function EstadoBadge({ estado, fechaHabilitada = false }) {
  const { texto, color } = ESTADOS[estado] || { texto: estado, color: 'azul' };
  return (
    <>
      <Badge color={color} data-estado={estado}>{texto}</Badge>
      {fechaHabilitada && estado !== 'confirmado' && <Badge color="azul" data-estado="habilitada">Fecha habilitada</Badge>}
    </>
  );
}
