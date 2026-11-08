-- La solicitud con todos sus datos queda registrada; la cotización es una etapa posterior.
ALTER TYPE "EstadoSolicitud" RENAME VALUE 'disponible_cotizar' TO 'registrada';
