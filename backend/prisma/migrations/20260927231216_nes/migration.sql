/*
  Warnings:

  - You are about to alter the column `nombre` on the `inventario` table. The data in that column could be lost. The data in that column will be cast from `VarChar(150)` to `VarChar(30)`.
  - Added the required column `descrip` to the `inventario` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "inventario" ADD COLUMN     "descrip" VARCHAR(200) NOT NULL,
ALTER COLUMN "nombre" SET DATA TYPE VARCHAR(30);
