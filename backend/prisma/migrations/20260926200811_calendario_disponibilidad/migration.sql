-- AlterEnum
ALTER TYPE "EstadoSolicitud" ADD VALUE 'confirmado';

-- AlterTable
ALTER TABLE "solicitudes" ADD COLUMN     "fechaHabilitada" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "solicitudes_fecha_idx" ON "solicitudes"("fecha");
