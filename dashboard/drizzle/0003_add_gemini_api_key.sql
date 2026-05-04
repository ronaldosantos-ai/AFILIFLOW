-- Add geminiApiKey column to integrationSettings table
ALTER TABLE `integrationSettings` ADD COLUMN `geminiApiKey` varchar(255) AFTER `gtmId`;
