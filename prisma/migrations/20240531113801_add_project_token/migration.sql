/*
  Warnings:

  Fixed:
  - Added the required column `token` to the `project` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `project` ADD COLUMN `token` VARCHAR(255);

-- Update with random token to avoid NULL value
UPDATE `project` SET `token` = UUID() WHERE `token` IS NULL;

-- Make token not null
ALTER TABLE `project` MODIFY COLUMN `token` VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `token` ON `project`(`token`);
