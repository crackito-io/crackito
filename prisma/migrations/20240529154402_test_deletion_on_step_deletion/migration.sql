-- DropForeignKey
ALTER TABLE `test` DROP FOREIGN KEY `test_ibfk_2`;


-- AddForeignKey
ALTER TABLE `test` ADD CONSTRAINT `test_ibfk_2` FOREIGN KEY (`repo_name`, `step_name`) REFERENCES `step`(`repo_name`, `step_name`) ON DELETE CASCADE ON UPDATE NO ACTION;
