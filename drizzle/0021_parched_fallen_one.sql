CREATE TABLE `romaneioItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`romaneioId` int NOT NULL,
	`position` int NOT NULL,
	`productCode` varchar(80),
	`productName` varchar(255) NOT NULL,
	`unit` varchar(24) NOT NULL DEFAULT 'UN',
	`requestedQuantity` double NOT NULL DEFAULT 0,
	`approvedQuantity` double NOT NULL DEFAULT 0,
	`deliveredQuantity` double NOT NULL DEFAULT 0,
	`notes` varchar(600),
	CONSTRAINT `romaneioItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `romaneio_items_position_unique` UNIQUE(`romaneioId`,`position`)
);
--> statement-breakpoint
CREATE TABLE `romaneios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdByUserId` int NOT NULL,
	`shareToken` varchar(96) NOT NULL,
	`romaneioStatus` enum('draft','shared','partially_signed','signed') NOT NULL DEFAULT 'draft',
	`documentNumber` varchar(80),
	`transferDate` date NOT NULL,
	`originName` varchar(180) NOT NULL,
	`originBranch` varchar(120),
	`originAddress` varchar(255),
	`originNeighborhood` varchar(120),
	`originCity` varchar(120),
	`originState` varchar(2),
	`originManagerName` varchar(160) NOT NULL,
	`originSignatureUrl` varchar(2048),
	`originSignedAt` timestamp,
	`destinationName` varchar(180) NOT NULL,
	`destinationBranch` varchar(120),
	`destinationAddress` varchar(255),
	`destinationNeighborhood` varchar(120),
	`destinationCity` varchar(120),
	`destinationState` varchar(2),
	`destinationManagerName` varchar(160) NOT NULL,
	`destinationSignatureUrl` varchar(2048),
	`destinationSignedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `romaneios_id` PRIMARY KEY(`id`),
	CONSTRAINT `romaneios_share_token_unique` UNIQUE(`shareToken`)
);
--> statement-breakpoint
ALTER TABLE `romaneioItems` ADD CONSTRAINT `romaneioItems_romaneioId_romaneios_id_fk` FOREIGN KEY (`romaneioId`) REFERENCES `romaneios`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `romaneios` ADD CONSTRAINT `romaneios_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `romaneio_items_document_idx` ON `romaneioItems` (`romaneioId`);--> statement-breakpoint
CREATE INDEX `romaneios_owner_updated_idx` ON `romaneios` (`createdByUserId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `romaneios_status_updated_idx` ON `romaneios` (`romaneioStatus`,`updatedAt`);