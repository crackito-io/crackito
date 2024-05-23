-- DropForeignKey
ALTER TABLE `account_exercise` DROP FOREIGN KEY `account_exercise_ibfk_1`;

-- DropForeignKey
ALTER TABLE `account_role` DROP FOREIGN KEY `account_role_ibfk_1`;

-- DropForeignKey
ALTER TABLE `account_step` DROP FOREIGN KEY `account_step_ibfk_1`;

-- AddForeignKey
ALTER TABLE `account_exercise` ADD CONSTRAINT `account_exercise_ibfk_1` FOREIGN KEY (`id_account`) REFERENCES `account`(`id_account`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `account_role` ADD CONSTRAINT `account_role_ibfk_1` FOREIGN KEY (`id_account`) REFERENCES `account`(`id_account`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `account_step` ADD CONSTRAINT `account_step_ibfk_1` FOREIGN KEY (`id_account`) REFERENCES `account`(`id_account`) ON DELETE CASCADE ON UPDATE NO ACTION;
