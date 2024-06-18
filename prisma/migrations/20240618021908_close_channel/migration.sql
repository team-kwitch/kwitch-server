/*
  Warnings:

  - The primary key for the `channels` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `broadcaster_username` on the `channels` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `channels` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `channels` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[broadcaster_id]` on the table `channels` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `broadcaster_id` to the `channels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `channel_id` to the `channels` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `channels` DROP FOREIGN KEY `channels_broadcaster_username_fkey`;

-- AlterTable
ALTER TABLE `channels` DROP PRIMARY KEY,
    DROP COLUMN `broadcaster_username`,
    DROP COLUMN `created_at`,
    DROP COLUMN `updated_at`,
    ADD COLUMN `broadcaster_id` INTEGER NOT NULL,
    ADD COLUMN `channel_id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD COLUMN `ended_at` DATETIME(3) NULL,
    ADD COLUMN `is_ended` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD PRIMARY KEY (`channel_id`);

-- CreateIndex
CREATE UNIQUE INDEX `channels_broadcaster_id_key` ON `channels`(`broadcaster_id`);

-- AddForeignKey
ALTER TABLE `channels` ADD CONSTRAINT `channels_broadcaster_id_fkey` FOREIGN KEY (`broadcaster_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
