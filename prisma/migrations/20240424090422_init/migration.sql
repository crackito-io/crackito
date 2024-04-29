-- CreateTable
CREATE TABLE `account` (
    `id_account` INTEGER NOT NULL AUTO_INCREMENT,
    `email_address` VARCHAR(255) NULL,
    `password` VARCHAR(255) NULL,
    `Firstname` VARCHAR(50) NULL,
    `Lastname` VARCHAR(50) NULL,
    `id_organization` INTEGER NOT NULL,

    UNIQUE INDEX `Account_UN`(`email_address`),
    INDEX `id_organization`(`id_organization`),
    PRIMARY KEY (`id_account`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `account_exercise` (
    `id_account` INTEGER NOT NULL,
    `id_exercise` INTEGER NOT NULL,
    `repo_name` VARCHAR(255) NULL,
    `archived` BOOLEAN NOT NULL,
    `join_date` DATETIME(0) NOT NULL,

    INDEX `id_exercise`(`id_exercise`),
    PRIMARY KEY (`id_account`, `id_exercise`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `account_role` (
    `id_account` INTEGER NOT NULL,
    `id_role` INTEGER NOT NULL,

    INDEX `id_role`(`id_role`),
    PRIMARY KEY (`id_account`, `id_role`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `account_step` (
    `id_account` INTEGER NOT NULL,
    `id_exercise` INTEGER NOT NULL,
    `num_order` TINYINT NOT NULL,
    `last_status` VARCHAR(50) NULL,
    `is_done` BOOLEAN NULL,

    INDEX `id_exercise`(`id_exercise`, `num_order`),
    PRIMARY KEY (`id_account`, `id_exercise`, `num_order`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exercise` (
    `id_exercise` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(50) NULL,
    `description` VARCHAR(255) NULL,
    `repo_name` VARCHAR(255) NULL,

    PRIMARY KEY (`id_exercise`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `federation` (
    `id_federation` INTEGER NOT NULL AUTO_INCREMENT,
    `federation_name` VARCHAR(50) NOT NULL,

    PRIMARY KEY (`id_federation`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `federation_account` (
    `id_account` INTEGER NOT NULL,
    `id_federation` INTEGER NOT NULL,

    INDEX `id_federation`(`id_federation`),
    PRIMARY KEY (`id_account`, `id_federation`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification` (
    `id_Notification` INTEGER NOT NULL AUTO_INCREMENT,
    `creation_date` DATETIME(0) NULL,
    `title` VARCHAR(50) NULL,
    `content` VARCHAR(255) NULL,
    `icon` VARCHAR(50) NULL,
    `action` VARCHAR(255) NULL,
    `readed` BOOLEAN NULL,
    `id_account` INTEGER NOT NULL,

    INDEX `id_account`(`id_account`),
    PRIMARY KEY (`id_Notification`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization` (
    `id_organization` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NULL,

    PRIMARY KEY (`id_organization`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization_role` (
    `id_organization` INTEGER NOT NULL,
    `id_role` INTEGER NOT NULL,

    INDEX `id_role`(`id_role`),
    PRIMARY KEY (`id_organization`, `id_role`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permission` (
    `code_permission` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255) NULL,

    PRIMARY KEY (`code_permission`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role` (
    `id_role` INTEGER NOT NULL AUTO_INCREMENT,
    `Name` VARCHAR(50) NULL,

    PRIMARY KEY (`id_role`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permission` (
    `id_role` INTEGER NOT NULL,
    `code_permission` VARCHAR(50) NOT NULL,

    INDEX `code_permission`(`code_permission`),
    PRIMARY KEY (`id_role`, `code_permission`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `step` (
    `id_exercise` INTEGER NOT NULL,
    `num_order` TINYINT NOT NULL,
    `title` VARCHAR(50) NULL,
    `description` VARCHAR(255) NULL,

    PRIMARY KEY (`id_exercise`, `num_order`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `account` ADD CONSTRAINT `account_ibfk_1` FOREIGN KEY (`id_organization`) REFERENCES `organization`(`id_organization`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `account_exercise` ADD CONSTRAINT `account_exercise_ibfk_1` FOREIGN KEY (`id_account`) REFERENCES `account`(`id_account`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `account_exercise` ADD CONSTRAINT `account_exercise_ibfk_2` FOREIGN KEY (`id_exercise`) REFERENCES `exercise`(`id_exercise`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `account_role` ADD CONSTRAINT `account_role_ibfk_1` FOREIGN KEY (`id_account`) REFERENCES `account`(`id_account`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `account_role` ADD CONSTRAINT `account_role_ibfk_2` FOREIGN KEY (`id_role`) REFERENCES `role`(`id_role`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `account_step` ADD CONSTRAINT `account_step_ibfk_1` FOREIGN KEY (`id_account`) REFERENCES `account`(`id_account`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `account_step` ADD CONSTRAINT `account_step_ibfk_2` FOREIGN KEY (`id_exercise`, `num_order`) REFERENCES `step`(`id_exercise`, `num_order`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `federation_account` ADD CONSTRAINT `federation_account_ibfk_1` FOREIGN KEY (`id_account`) REFERENCES `account`(`id_account`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `federation_account` ADD CONSTRAINT `federation_account_ibfk_2` FOREIGN KEY (`id_federation`) REFERENCES `federation`(`id_federation`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `notification` ADD CONSTRAINT `notification_ibfk_1` FOREIGN KEY (`id_account`) REFERENCES `account`(`id_account`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `organization_role` ADD CONSTRAINT `organization_role_ibfk_1` FOREIGN KEY (`id_organization`) REFERENCES `organization`(`id_organization`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `organization_role` ADD CONSTRAINT `organization_role_ibfk_2` FOREIGN KEY (`id_role`) REFERENCES `role`(`id_role`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `role_permission` ADD CONSTRAINT `role_permission_ibfk_1` FOREIGN KEY (`id_role`) REFERENCES `role`(`id_role`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `role_permission` ADD CONSTRAINT `role_permission_ibfk_2` FOREIGN KEY (`code_permission`) REFERENCES `permission`(`code_permission`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `step` ADD CONSTRAINT `step_ibfk_1` FOREIGN KEY (`id_exercise`) REFERENCES `exercise`(`id_exercise`) ON DELETE NO ACTION ON UPDATE NO ACTION;
