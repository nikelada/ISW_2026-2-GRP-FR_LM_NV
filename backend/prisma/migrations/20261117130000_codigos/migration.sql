-- AlterTable
ALTER TABLE "solicitudes" ADD COLUMN "codigo" VARCHAR(20);
ALTER TABLE "solicitudes_cambio" ADD COLUMN "codigo" VARCHAR(20);

-- Código para las que ya existían, por orden de creación
UPDATE "solicitudes" AS s
SET "codigo" = 'SOL-' || x.anio || '-' || LPAD(x.n::text, 4, '0')
FROM (
  SELECT "id", EXTRACT(YEAR FROM "createdAt")::int AS anio,
         ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM "createdAt") ORDER BY "createdAt", "id") AS n
  FROM "solicitudes"
) AS x
WHERE s."id" = x."id";

UPDATE "solicitudes_cambio" AS c
SET "codigo" = 'CAM-' || x.anio || '-' || LPAD(x.n::text, 4, '0')
FROM (
  SELECT "id", EXTRACT(YEAR FROM "createdAt")::int AS anio,
         ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM "createdAt") ORDER BY "createdAt", "id") AS n
  FROM "solicitudes_cambio"
) AS x
WHERE c."id" = x."id";

ALTER TABLE "solicitudes" ALTER COLUMN "codigo" SET NOT NULL;
ALTER TABLE "solicitudes_cambio" ALTER COLUMN "codigo" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "solicitudes_codigo_key" ON "solicitudes"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "solicitudes_cambio_codigo_key" ON "solicitudes_cambio"("codigo");
