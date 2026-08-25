CREATE TABLE `matrixImportSources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source` enum('analytic','data','dailyTracking','challengeDaily') NOT NULL,
	`importedAt` timestamp NOT NULL,
	`receivedRows` int NOT NULL DEFAULT 0,
	`validRows` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `matrixImportSources_id` PRIMARY KEY(`id`),
	CONSTRAINT `matrixImportSources_source_unique` UNIQUE(`source`)
);
