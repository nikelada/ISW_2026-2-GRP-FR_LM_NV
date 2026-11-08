-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "rut" VARCHAR(12);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_rut_key" ON "clientes"("rut");
