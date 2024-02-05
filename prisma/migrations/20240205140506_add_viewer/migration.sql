/*
  Warnings:

  - The primary key for the `channels` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `channels` table. All the data in the column will be lost.
  - The primary key for the `sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `sessions` table. All the data in the column will be lost.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `users` table. All the data in the column will be lost.
  - Added the required column `channel_id` to the `channels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `session_id` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `channels` DROP FOREIGN KEY `channels_broadcasterId_fkey`;

-- AlterTable
ALTER TABLE `channels` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD COLUMN `channel_id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD COLUMN `viewers` INTEGER NOT NULL DEFAULT 1,
    ADD PRIMARY KEY (`channel_id`);

-- AlterTable
ALTER TABLE `sessions` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD COLUMN `session_id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`session_id`);

-- AlterTable
ALTER TABLE `users` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD COLUMN `user_id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`user_id`);

-- AddForeignKey
ALTER TABLE `channels` ADD CONSTRAINT `channels_broadcasterId_fkey` FOREIGN KEY (`broadcasterId`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
