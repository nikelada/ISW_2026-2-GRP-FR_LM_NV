/*
  Warnings:

  - You are about to drop the column `precio` on the `servicios` table. All the data in the column will be lost.
  - You are about to drop the column `tipoPrecio` on the `servicios` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "EstadoCambioServicio" AS ENUM ('pendiente', 'aprobado', 'rechazado');

-- AlterTable
ALTER TABLE "servicios" DROP COLUMN "precio",
DROP COLUMN "tipoPrecio";

-- CreateTable
CREATE TABLE "versiones_servicio" (
    "id" SERIAL NOT NULL,
    "servicioId" INTEGER NOT NULL,
    "tipoPrecio" "TipoPrecio" NOT NULL,
    "precio" INTEGER NOT NULL,
    "vigenciaDesde" TIMESTAMP(6) NOT NULL,
    "vigenciaHasta" TIMESTAMP(6),

    CONSTRAINT "versiones_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cambios_servicio" (
    "id" SERIAL NOT NULL,
    "servicioId" INTEGER NOT NULL,
    "tipoPrecioPropuesto" "TipoPrecio" NOT NULL,
    "precioPropuesto" INTEGER NOT NULL,
    "estado" "EstadoCambioServicio" NOT NULL DEFAULT 'pendiente',
    "versionGeneradaId" INTEGER,

    CONSTRAINT "cambios_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "versiones_servicio_servicioId_vigenciaHasta_idx" ON "versiones_servicio"("servicioId", "vigenciaHasta");

-- CreateIndex
CREATE UNIQUE INDEX "cambios_servicio_versionGeneradaId_key" ON "cambios_servicio"("versionGeneradaId");

-- CreateIndex
CREATE INDEX "cambios_servicio_servicioId_idx" ON "cambios_servicio"("servicioId");

-- CreateIndex
CREATE INDEX "cambios_servicio_estado_idx" ON "cambios_servicio"("estado");

-- AddForeignKey
ALTER TABLE "versiones_servicio" ADD CONSTRAINT "versiones_servicio_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cambios_servicio" ADD CONSTRAINT "cambios_servicio_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cambios_servicio" ADD CONSTRAINT "cambios_servicio_versionGeneradaId_fkey" FOREIGN KEY ("versionGeneradaId") REFERENCES "versiones_servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
