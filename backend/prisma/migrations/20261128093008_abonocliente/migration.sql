/*
  Warnings:

  - You are about to drop the `abonos` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "abonos" DROP CONSTRAINT "abonos_cotizacionId_fkey";

-- DropTable
DROP TABLE "abonos";

-- CreateTable
CREATE TABLE "abonos_cliente" (
    "id" SERIAL NOT NULL,
    "cotizacionId" INTEGER NOT NULL,
    "monto" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abonos_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "abonos_cliente_cotizacionId_idx" ON "abonos_cliente"("cotizacionId");

-- AddForeignKey
ALTER TABLE "abonos_cliente" ADD CONSTRAINT "abonos_cliente_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
