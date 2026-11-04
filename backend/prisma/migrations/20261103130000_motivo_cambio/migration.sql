-- El cambio solicitado debe indicar su motivo.
ALTER TABLE "solicitudes_cambio" ADD COLUMN "motivo" TEXT;
UPDATE "solicitudes_cambio" SET "motivo" = 'Sin motivo registrado' WHERE "motivo" IS NULL;
ALTER TABLE "solicitudes_cambio" ALTER COLUMN "motivo" SET NOT NULL;
