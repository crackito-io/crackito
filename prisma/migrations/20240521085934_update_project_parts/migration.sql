-- DropForeignKey
ALTER TABLE `account_exercise` DROP FOREIGN KEY `account_exercise_ibfk_1`;

-- DropForeignKey
ALTER TABLE `account_exercise` DROP FOREIGN KEY `account_exercise_ibfk_2`;

-- DropForeignKey
ALTER TABLE `account_step` DROP FOREIGN KEY `account_step_ibfk_1`;

-- DropForeignKey
ALTER TABLE `account_step` DROP FOREIGN KEY `account_step_ibfk_2`;

-- DropForeignKey
ALTER TABLE `step` DROP FOREIGN KEY `step_ibfk_1`;

-- AlterTable
ALTER TABLE `account` ADD COLUMN `username` VARCHAR(50) NOT NULL;

-- AlterTable
ALTER TABLE `federation` ADD COLUMN `id_organization` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `step` DROP PRIMARY KEY,
    DROP COLUMN `id_exercise`,
    ADD COLUMN `step_name` VARCHAR(50) NOT NULL,
    ADD COLUMN `repo_name` VARCHAR(255) NOT NULL,
    ADD COLUMN `test_number` INTEGER NULL,
    MODIFY `num_order` TINYINT NULL,
    ADD PRIMARY KEY (`repo_name`, `step_name`);

-- DropTable
DROP TABLE `account_exercise`;

-- DropTable
DROP TABLE `account_step`;

-- DropTable
DROP TABLE `exercise`;

-- CreateTable
CREATE TABLE `account_team` (
    `id_account` INTEGER NOT NULL,
    `id_team` INTEGER NOT NULL,

    INDEX `id_team`(`id_team`),
    PRIMARY KEY (`id_account`, `id_team`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project` (
    `repo_name` VARCHAR(255) NOT NULL,
    `name` VARCHAR(50) NULL,
    `description` VARCHAR(255) NULL,
    `status_open` BOOLEAN NOT NULL,
    `webhook_secret` VARCHAR(50) NULL,
    `end_time` DATETIME(0) NULL,
    `id_account` INTEGER,

    INDEX `id_account`(`id_account`),
    PRIMARY KEY (`repo_name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `team` (
    `id_team` INTEGER NOT NULL AUTO_INCREMENT,
    `team_repo_name` VARCHAR(50) NULL,
    `last_commit` DATETIME(0) NULL,
    `repo_name` VARCHAR(255) NOT NULL,
    `join_project_at` DATETIME(0) NULL,
    `status_project_finished` BOOLEAN NULL,
    `finish_project_at` DATETIME(0) DEFAULT NULL,

    INDEX `repo_name`(`repo_name`),
    PRIMARY KEY (`id_team`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `test` (
    `id_team` INTEGER NOT NULL,
    `repo_name` VARCHAR(255) NOT NULL,
    `step_name` VARCHAR(50) NOT NULL,
    `test_name` VARCHAR(50) NOT NULL,
    `status_passed` BOOLEAN NULL,
    `message` VARCHAR(50) NULL,
    `detailed_message` VARCHAR(2500) NULL,

    INDEX `repo_name`(`repo_name`, `step_name`),
    PRIMARY KEY (`id_team`, `repo_name`, `step_name`, `test_name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `username` ON `account`(`username`);

-- CreateIndex
CREATE INDEX `id_organization` ON `federation`(`id_organization`);

-- AddForeignKey
ALTER TABLE `federation` ADD CONSTRAINT `federation_ibfk_1` FOREIGN KEY (`id_organization`) REFERENCES `organization`(`id_organization`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `step` ADD CONSTRAINT `step_ibfk_1` FOREIGN KEY (`repo_name`) REFERENCES `project`(`repo_name`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `account_team` ADD CONSTRAINT `account_team_ibfk_1` FOREIGN KEY (`id_account`) REFERENCES `account`(`id_account`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `account_team` ADD CONSTRAINT `account_team_ibfk_2` FOREIGN KEY (`id_team`) REFERENCES `team`(`id_team`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `project` ADD CONSTRAINT `project_ibfk_1` FOREIGN KEY (`id_account`) REFERENCES `account`(`id_account`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `team` ADD CONSTRAINT `team_ibfk_1` FOREIGN KEY (`repo_name`) REFERENCES `project`(`repo_name`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `test` ADD CONSTRAINT `test_ibfk_1` FOREIGN KEY (`id_team`) REFERENCES `team`(`id_team`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `test` ADD CONSTRAINT `test_ibfk_2` FOREIGN KEY (`repo_name`, `step_name`) REFERENCES `step`(`repo_name`, `step_name`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- RenameIndex
ALTER TABLE `account` RENAME INDEX `Account_UN` TO `email_address`;
