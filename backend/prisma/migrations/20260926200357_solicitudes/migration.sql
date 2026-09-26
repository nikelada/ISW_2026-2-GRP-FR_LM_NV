-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('pendiente', 'disponible_cotizar');

-- CreateTable
CREATE TABLE "solicitudes" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "fecha" DATE,
    "horaInicio" TIME(0),
    "horaFin" TIME(0),
    "cantidadPersonas" INTEGER,
    "lugar" VARCHAR(255),
    "servicios" TEXT,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'pendiente',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "solicitudes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solicitudes_clienteId_idx" ON "solicitudes"("clienteId");

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
