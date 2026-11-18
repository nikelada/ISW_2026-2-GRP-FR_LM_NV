ALTER TABLE "inventario"
ADD COLUMN "categoria" VARCHAR(100) NOT NULL DEFAULT 'Sin clasificar',
ADD COLUMN "reutilizable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "stockFueraServicio" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "recursos_operativos"
ADD COLUMN "precio" DECIMAL(10,2);

CREATE TABLE "reservas_inventario" (
    "id" SERIAL NOT NULL,
    "inventarioId" INTEGER NOT NULL,
    "solicitudId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "devueltoEn" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reservas_inventario_cantidad_check" CHECK ("cantidad" > 0),
    CONSTRAINT "reservas_inventario_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reservas_inventario_inventarioId_solicitudId_idx"
ON "reservas_inventario"("inventarioId", "solicitudId");
CREATE INDEX "reservas_inventario_solicitudId_idx"
ON "reservas_inventario"("solicitudId");

ALTER TABLE "reservas_inventario"
ADD CONSTRAINT "reservas_inventario_inventarioId_fkey"
FOREIGN KEY ("inventarioId") REFERENCES "inventario"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservas_inventario"
ADD CONSTRAINT "reservas_inventario_solicitudId_fkey"
FOREIGN KEY ("solicitudId") REFERENCES "solicitudes"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TEMP TABLE "_equipo_inventario_map" (
    "recursoId" INTEGER PRIMARY KEY,
    "inventarioId" INTEGER NOT NULL
);

WITH grupos AS (
    SELECT
        "nombre",
        "categoria",
        COUNT(*)::INTEGER AS "stock",
        COUNT(*) FILTER (WHERE "estado" IN ('mantencion', 'fuera_servicio'))::INTEGER AS "stockFueraServicio"
    FROM "recursos_operativos"
    WHERE "tipo" = 'equipo'
    GROUP BY "nombre", "categoria"
),
nuevos AS (
    INSERT INTO "inventario" ("nombre", "categoria", "precio", "stock", "reutilizable", "stockFueraServicio", "updatedAt")
    SELECT "nombre", "categoria", 0, "stock", true, "stockFueraServicio", CURRENT_TIMESTAMP
    FROM grupos
    RETURNING "id", "nombre", "categoria"
)
INSERT INTO "_equipo_inventario_map" ("recursoId", "inventarioId")
SELECT r."id", n."id"
FROM "recursos_operativos" r
JOIN nuevos n ON n."nombre" = r."nombre" AND n."categoria" = r."categoria"
WHERE r."tipo" = 'equipo';

INSERT INTO "reservas_inventario" ("inventarioId", "solicitudId", "cantidad", "devueltoEn", "createdAt")
SELECT
    m."inventarioId",
    rr."solicitudId",
    COUNT(*)::INTEGER,
    rr."devueltoEn",
    MIN(rr."createdAt")
FROM "reservas_recursos" rr
JOIN "_equipo_inventario_map" m ON m."recursoId" = rr."recursoId"
GROUP BY m."inventarioId", rr."solicitudId", rr."devueltoEn";

DROP TABLE "_equipo_inventario_map";
