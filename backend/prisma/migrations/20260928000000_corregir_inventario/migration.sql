-- Remove the accidental required description column from the inventory model.
ALTER TABLE "inventario" DROP COLUMN IF EXISTS "descrip";

-- Restore the original inventory name length.
ALTER TABLE "inventario" ALTER COLUMN "nombre" TYPE VARCHAR(150);