CREATE TABLE `romaneioActivities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`romaneioId` int NOT NULL,
	`romaneioActivitySigner` enum('origin','destination') NOT NULL,
	`managerName` varchar(160) NOT NULL,
	`signatureStyle` varchar(32) NOT NULL,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `romaneioActivities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `romaneioParties` ADD `preferredSignatureStyle` varchar(32);--> statement-breakpoint
ALTER TABLE `romaneioActivities` ADD CONSTRAINT `romaneioActivities_romaneioId_romaneios_id_fk` FOREIGN KEY (`romaneioId`) REFERENCES `romaneios`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `romaneio_activities_document_time_idx` ON `romaneioActivities` (`romaneioId`,`occurredAt`);