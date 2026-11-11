-- CreateEnum
CREATE TYPE "EstadoCambio" AS ENUM ('pendiente', 'aprobado', 'rechazado');

-- CreateTable
CREATE TABLE "solicitudes_cambio" (
    "id" SERIAL NOT NULL,
    "solicitudId" INTEGER NOT NULL,
    "cambios" JSONB NOT NULL,
    "estado" "EstadoCambio" NOT NULL DEFAULT 'pendiente',
    "registradoPor" VARCHAR(150) NOT NULL,
    "revisionRecursos" BOOLEAN NOT NULL DEFAULT false,
    "revisionAnticipacion" BOOLEAN NOT NULL DEFAULT false,
    "revisionCosto" BOOLEAN NOT NULL DEFAULT false,
    "revisionOtrosEventos" BOOLEAN NOT NULL DEFAULT false,
    "revisadoPor" VARCHAR(150),
    "revisadoEn" TIMESTAMP(6),
    "aplicadoPor" VARCHAR(150),
    "aplicadoEn" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "solicitudes_cambio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_eventos" (
    "id" SERIAL NOT NULL,
    "solicitudId" INTEGER NOT NULL,
    "cambioId" INTEGER NOT NULL,
    "campo" VARCHAR(50) NOT NULL,
    "valorAnterior" TEXT,
    "valorNuevo" TEXT,
    "usuario" VARCHAR(150) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solicitudes_cambio_solicitudId_idx" ON "solicitudes_cambio"("solicitudId");

-- CreateIndex
CREATE INDEX "historial_eventos_solicitudId_idx" ON "historial_eventos"("solicitudId");

-- AddForeignKey
ALTER TABLE "solicitudes_cambio" ADD CONSTRAINT "solicitudes_cambio_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitudes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_eventos" ADD CONSTRAINT "historial_eventos_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitudes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_eventos" ADD CONSTRAINT "historial_eventos_cambioId_fkey" FOREIGN KEY ("cambioId") REFERENCES "solicitudes_cambio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
