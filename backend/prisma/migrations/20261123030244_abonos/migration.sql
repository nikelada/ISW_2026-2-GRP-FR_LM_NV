-- AlterTable
ALTER TABLE "cotizaciones" ADD COLUMN     "aceptadaEn" DATE;

-- CreateTable
CREATE TABLE "abonos" (
    "id" SERIAL NOT NULL,
    "cotizacionId" INTEGER NOT NULL,
    "monto" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abonos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "abonos_cotizacionId_idx" ON "abonos"("cotizacionId");

-- AddForeignKey
ALTER TABLE "abonos" ADD CONSTRAINT "abonos_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
