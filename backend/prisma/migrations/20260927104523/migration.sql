/*
  Warnings:

  - You are about to drop the column `versionGeneradaId` on the `cambios_servicio` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "cambios_servicio" DROP CONSTRAINT "cambios_servicio_versionGeneradaId_fkey";

-- DropIndex
DROP INDEX "cambios_servicio_versionGeneradaId_key";

-- AlterTable
ALTER TABLE "cambios_servicio" DROP COLUMN "versionGeneradaId";
