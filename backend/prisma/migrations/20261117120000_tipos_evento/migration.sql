-- CreateTable
CREATE TABLE "tipos_evento" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_evento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipos_evento_nombre_key" ON "tipos_evento"("nombre");

-- Los tipos que ya se usaban en las solicitudes quedan en la lista
INSERT INTO "tipos_evento" ("nombre")
SELECT DISTINCT "tipoEvento" FROM "solicitudes" WHERE "tipoEvento" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_tipoEvento_fkey" FOREIGN KEY ("tipoEvento") REFERENCES "tipos_evento"("nombre") ON DELETE RESTRICT ON UPDATE CASCADE;
