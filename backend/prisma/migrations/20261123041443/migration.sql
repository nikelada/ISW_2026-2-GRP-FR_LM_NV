-- CreateEnum
CREATE TYPE "MotivoModificacion" AS ENUM ('servicio_no_disponible', 'precio_desactualizado', 'otro');

-- AlterTable
ALTER TABLE "cotizaciones" ADD COLUMN     "comentarioModificacion" VARCHAR(1000),
ADD COLUMN     "motivosModificacion" "MotivoModificacion"[],
ADD COLUMN     "revisadoEn" TIMESTAMP(6),
ADD COLUMN     "revisadoPor" VARCHAR(150);
