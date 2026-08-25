ALTER TABLE `matrixImportSources` MODIFY COLUMN `source` enum('analytic','data','dailyTracking','challengeDaily','receiptDaily') NOT NULL;--> statement-breakpoint
ALTER TABLE `matrixMetrics` ADD `sales` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `matrixMetrics` ADD `receiptDailyJson` text;