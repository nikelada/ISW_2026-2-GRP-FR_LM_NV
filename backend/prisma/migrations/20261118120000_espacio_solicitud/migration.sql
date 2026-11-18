-- AlterTable
ALTER TABLE "solicitudes" ADD COLUMN "espacioId" INTEGER;

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_espacioId_fkey" FOREIGN KEY ("espacioId") REFERENCES "recursos_operativos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
