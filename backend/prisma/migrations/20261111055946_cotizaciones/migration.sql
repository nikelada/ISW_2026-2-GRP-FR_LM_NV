-- CreateEnum
CREATE TYPE "EstadoCotizacion" AS ENUM ('pendiente_revision', 'modificaciones_solicitadas', 'aprobada', 'enviada', 'aceptada', 'rechazada', 'sin_respuesta');

-- CreateTable
CREATE TABLE "cotizaciones" (
    "id" SERIAL NOT NULL,
    "solicitudId" INTEGER NOT NULL,
    "estado" "EstadoCotizacion" NOT NULL DEFAULT 'pendiente_revision',
    "total" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "cotizaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalles_cotizacion" (
    "id" SERIAL NOT NULL,
    "cotizacionId" INTEGER NOT NULL,
    "servicioId" INTEGER NOT NULL,
    "versionServicioId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "detalles_cotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cotizaciones_solicitudId_idx" ON "cotizaciones"("solicitudId");

-- CreateIndex
CREATE INDEX "cotizaciones_estado_idx" ON "cotizaciones"("estado");

-- CreateIndex
CREATE INDEX "detalles_cotizacion_servicioId_idx" ON "detalles_cotizacion"("servicioId");

-- CreateIndex
CREATE INDEX "detalles_cotizacion_versionServicioId_idx" ON "detalles_cotizacion"("versionServicioId");

-- CreateIndex
CREATE UNIQUE INDEX "detalles_cotizacion_cotizacionId_servicioId_key" ON "detalles_cotizacion"("cotizacionId", "servicioId");

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitudes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_cotizacion" ADD CONSTRAINT "detalles_cotizacion_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_cotizacion" ADD CONSTRAINT "detalles_cotizacion_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_cotizacion" ADD CONSTRAINT "detalles_cotizacion_versionServicioId_fkey" FOREIGN KEY ("versionServicioId") REFERENCES "versiones_servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
