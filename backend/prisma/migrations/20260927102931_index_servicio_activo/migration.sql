-- CreateEnum
CREATE TYPE "EstadoVersionServicio" AS ENUM ('activo', 'inactivo');

-- DropIndex
DROP INDEX "versiones_servicio_servicioId_vigenciaHasta_idx";

-- AlterTable
ALTER TABLE "versiones_servicio" ADD COLUMN     "estado" "EstadoVersionServicio" NOT NULL DEFAULT 'activo';

-- CreateIndex
CREATE INDEX "versiones_servicio_servicioId_estado_idx" ON "versiones_servicio"("servicioId", "estado");
