-- CreateTable
CREATE TABLE "solicitudes_servicios" (
    "id" SERIAL NOT NULL,
    "solicitudId" INTEGER NOT NULL,
    "servicioId" INTEGER NOT NULL,

    CONSTRAINT "solicitudes_servicios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solicitudes_servicios_servicioId_idx" ON "solicitudes_servicios"("servicioId");

-- CreateIndex
CREATE UNIQUE INDEX "solicitudes_servicios_solicitudId_servicioId_key" ON "solicitudes_servicios"("solicitudId", "servicioId");

-- AddForeignKey
ALTER TABLE "solicitudes_servicios" ADD CONSTRAINT "solicitudes_servicios_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitudes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_servicios" ADD CONSTRAINT "solicitudes_servicios_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
