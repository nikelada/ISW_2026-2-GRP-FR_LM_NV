-- CreateEnum
CREATE TYPE "MotivoRechazo" AS ENUM ('precio', 'otra_empresa', 'evento_cancelado', 'no_respondio', 'otro');

-- AlterTable
ALTER TABLE "cotizaciones" ADD COLUMN     "detalleRechazo" VARCHAR(1000),
ADD COLUMN     "motivosRechazo" "MotivoRechazo"[];
