CREATE TABLE "tareas_personal" (
    "tareaId" INTEGER NOT NULL,
    "personalEventoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tareas_personal_pkey" PRIMARY KEY ("tareaId", "personalEventoId")
);

CREATE INDEX "tareas_personal_personalEventoId_idx" ON "tareas_personal"("personalEventoId");

ALTER TABLE "tareas_personal"
    ADD CONSTRAINT "tareas_personal_tareaId_fkey"
    FOREIGN KEY ("tareaId") REFERENCES "tareas_evento"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tareas_personal"
    ADD CONSTRAINT "tareas_personal_personalEventoId_fkey"
    FOREIGN KEY ("personalEventoId") REFERENCES "personal_eventos"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
