/*
  Warnings:

  - You are about to drop the column `precioPropuesto` on the `cambios_servicio` table. All the data in the column will be lost.
  - You are about to drop the column `tipoPrecioPropuesto` on the `cambios_servicio` table. All the data in the column will be lost.
  - Added the required column `precioNuevo` to the `cambios_servicio` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipoPrecioNuevo` to the `cambios_servicio` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "cambios_servicio" DROP COLUMN "precioPropuesto",
DROP COLUMN "tipoPrecioPropuesto",
ADD COLUMN     "precioNuevo" INTEGER NOT NULL,
ADD COLUMN     "tipoPrecioNuevo" "TipoPrecio" NOT NULL;
