/*
  Warnings:

  - The primary key for the `channels` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `broadcasterId` on the `channels` table. All the data in the column will be lost.
  - You are about to drop the column `channel_id` on the `channels` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `channels` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `channels` table. All the data in the column will be lost.
  - Added the required column `broadcaster_username` to the `channels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `channels` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `channels` DROP FOREIGN KEY `channels_broadcasterId_fkey`;

-- AlterTable
ALTER TABLE `channels` DROP PRIMARY KEY,
    DROP COLUMN `broadcasterId`,
    DROP COLUMN `channel_id`,
    DROP COLUMN `createdAt`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `broadcaster_username` VARCHAR(191) NOT NULL,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL,
    ADD PRIMARY KEY (`broadcaster_username`);

-- AddForeignKey
ALTER TABLE `channels` ADD CONSTRAINT `channels_broadcaster_username_fkey` FOREIGN KEY (`broadcaster_username`) REFERENCES `users`(`username`) ON DELETE RESTRICT ON UPDATE CASCADE;
