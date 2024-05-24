/*
  Warnings:

  - Added the required column `id_organization` to the `federation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `federation` ADD COLUMN `id_organization` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `federation_ibfk1` ON `federation`(`id_organization`);

-- AddForeignKey
ALTER TABLE `federation` ADD CONSTRAINT `federation_ibfk1` FOREIGN KEY (`id_organization`) REFERENCES `organization`(`id_organization`) ON DELETE CASCADE ON UPDATE NO ACTION;
