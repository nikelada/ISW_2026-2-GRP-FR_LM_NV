/*
  Warnings:

  - Added the required column `versionServicioId` to the `solicitudes_servicios` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "solicitudes_servicios" ADD COLUMN     "versionServicioId" INTEGER;

-- Asignar la versión activa de cada servicio existente.
UPDATE "solicitudes_servicios" AS ss
SET "versionServicioId" = (
    SELECT vs."id"
    FROM "versiones_servicio" AS vs
    WHERE vs."servicioId" = ss."servicioId"
      AND vs."estado" = 'activo'
    ORDER BY vs."vigenciaDesde" DESC
    LIMIT 1
);

-- Hacerla obligatoria después de completar los datos.
ALTER TABLE "solicitudes_servicios"
ALTER COLUMN "versionServicioId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "solicitudes_servicios_versionServicioId_idx" ON "solicitudes_servicios"("versionServicioId");

-- AddForeignKey
ALTER TABLE "solicitudes_servicios" ADD CONSTRAINT "solicitudes_servicios_versionServicioId_fkey" FOREIGN KEY ("versionServicioId") REFERENCES "versiones_servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
