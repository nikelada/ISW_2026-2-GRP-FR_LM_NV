-- AlterTable
ALTER TABLE "solicitudes" ADD COLUMN     "tipoEvento" VARCHAR(100),
ADD COLUMN     "requerimientosTecnicos" TEXT;

-- Las solicitudes registradas aún no tienen estos datos obligatorios: vuelven a quedar pendientes.
UPDATE "solicitudes" SET "estado" = 'pendiente' WHERE "estado" = 'registrada';
