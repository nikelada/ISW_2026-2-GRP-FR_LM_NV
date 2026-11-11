import Badge from './ui/Badge.jsx';

const ESTADOS = {
  pendiente: { texto: 'Pendiente de información', color: 'amarillo' },
  registrada: { texto: 'Registrada', color: 'verde' },
  confirmado: { texto: 'Fecha confirmada', color: 'oscuro' }
};

// "Fecha habilitada" solo se muestra si el evento todavía no está confirmado
export default function EstadoBadge({ estado, fechaHabilitada = false }) {
  const { texto, color } = ESTADOS[estado] || { texto: estado, color: 'azul' };
  return (
    <>
      <Badge color={color} data-estado={estado}>{texto}</Badge>
      {fechaHabilitada && estado !== 'confirmado' && <Badge color="azul" data-estado="habilitada">Fecha habilitada</Badge>}
    </>
  );
}
