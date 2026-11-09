CREATE TYPE "TipoRecursoOperativo" AS ENUM ('equipo', 'espacio', 'vehiculo');
CREATE TYPE "EstadoRecursoOperativo" AS ENUM ('disponible', 'en_uso', 'mantencion', 'fuera_servicio');
CREATE TYPE "EstadoTareaEvento" AS ENUM ('pendiente', 'completada');
CREATE TYPE "EstadoPagoEvento" AS ENUM ('pendiente', 'pagado');
CREATE TYPE "EstadoCierreEvento" AS ENUM ('pendiente', 'revision_gerencia', 'aprobado');

CREATE TABLE "recursos_operativos" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "tipo" "TipoRecursoOperativo" NOT NULL,
    "categoria" VARCHAR(100) NOT NULL,
    "estado" "EstadoRecursoOperativo" NOT NULL DEFAULT 'disponible',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    CONSTRAINT "recursos_operativos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reservas_recursos" (
    "id" SERIAL NOT NULL,
    "recursoId" INTEGER NOT NULL,
    "solicitudId" INTEGER NOT NULL,
    "devueltoEn" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reservas_recursos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "personal_eventual" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "telefono" VARCHAR(30),
    "correo" VARCHAR(255),
    "esContacto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    CONSTRAINT "personal_eventual_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "personal_eventos" (
    "id" SERIAL NOT NULL,
    "solicitudId" INTEGER NOT NULL,
    "personalId" INTEGER NOT NULL,
    "funcion" VARCHAR(100),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "personal_eventos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tareas_evento" (
    "id" SERIAL NOT NULL,
    "solicitudId" INTEGER NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "descripcion" TEXT,
    "estado" "EstadoTareaEvento" NOT NULL DEFAULT 'pendiente',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    CONSTRAINT "tareas_evento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pagos_evento" (
    "id" SERIAL NOT NULL,
    "solicitudId" INTEGER NOT NULL,
    "concepto" VARCHAR(150) NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoPagoEvento" NOT NULL DEFAULT 'pendiente',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    CONSTRAINT "pagos_evento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cierres_evento" (
    "id" SERIAL NOT NULL,
    "solicitudId" INTEGER NOT NULL,
    "estado" "EstadoCierreEvento" NOT NULL DEFAULT 'pendiente',
    "encuestaConforme" BOOLEAN,
    "encuestaComentario" TEXT,
    "solicitadoEn" TIMESTAMP(6),
    "aprobadoPorId" INTEGER,
    "aprobadoEn" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    CONSTRAINT "cierres_evento_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reservas_recursos_recursoId_solicitudId_key" ON "reservas_recursos"("recursoId", "solicitudId");
CREATE INDEX "reservas_recursos_solicitudId_idx" ON "reservas_recursos"("solicitudId");
CREATE INDEX "recursos_operativos_tipo_categoria_estado_idx" ON "recursos_operativos"("tipo", "categoria", "estado");
CREATE INDEX "personal_eventual_esContacto_nombre_idx" ON "personal_eventual"("esContacto", "nombre");
CREATE UNIQUE INDEX "personal_eventos_solicitudId_personalId_key" ON "personal_eventos"("solicitudId", "personalId");
CREATE INDEX "personal_eventos_personalId_idx" ON "personal_eventos"("personalId");
CREATE INDEX "tareas_evento_solicitudId_estado_idx" ON "tareas_evento"("solicitudId", "estado");
CREATE INDEX "pagos_evento_solicitudId_estado_idx" ON "pagos_evento"("solicitudId", "estado");
CREATE UNIQUE INDEX "cierres_evento_solicitudId_key" ON "cierres_evento"("solicitudId");

ALTER TABLE "reservas_recursos"
    ADD CONSTRAINT "reservas_recursos_recursoId_fkey"
    FOREIGN KEY ("recursoId") REFERENCES "recursos_operativos"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservas_recursos"
    ADD CONSTRAINT "reservas_recursos_solicitudId_fkey"
    FOREIGN KEY ("solicitudId") REFERENCES "solicitudes"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "personal_eventos"
    ADD CONSTRAINT "personal_eventos_solicitudId_fkey"
    FOREIGN KEY ("solicitudId") REFERENCES "solicitudes"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "personal_eventos"
    ADD CONSTRAINT "personal_eventos_personalId_fkey"
    FOREIGN KEY ("personalId") REFERENCES "personal_eventual"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tareas_evento"
    ADD CONSTRAINT "tareas_evento_solicitudId_fkey"
    FOREIGN KEY ("solicitudId") REFERENCES "solicitudes"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pagos_evento"
    ADD CONSTRAINT "pagos_evento_solicitudId_fkey"
    FOREIGN KEY ("solicitudId") REFERENCES "solicitudes"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cierres_evento"
    ADD CONSTRAINT "cierres_evento_solicitudId_fkey"
    FOREIGN KEY ("solicitudId") REFERENCES "solicitudes"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cierres_evento"
    ADD CONSTRAINT "cierres_evento_aprobadoPorId_fkey"
    FOREIGN KEY ("aprobadoPorId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
