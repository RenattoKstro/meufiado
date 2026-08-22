CREATE TABLE `romaneioParties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`normalizedName` varchar(180) NOT NULL,
	`branch` varchar(120) NOT NULL DEFAULT '',
	`normalizedBranch` varchar(120) NOT NULL DEFAULT '',
	`address` varchar(255),
	`neighborhood` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `romaneioParties_id` PRIMARY KEY(`id`),
	CONSTRAINT `romaneio_parties_name_branch_unique` UNIQUE(`normalizedName`,`normalizedBranch`)
);
--> statement-breakpoint
CREATE TABLE `romaneioProducts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(80) NOT NULL,
	`normalizedCode` varchar(80) NOT NULL,
	`description` varchar(255) NOT NULL,
	`unit` varchar(24) NOT NULL DEFAULT 'UN',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `romaneioProducts_id` PRIMARY KEY(`id`),
	CONSTRAINT `romaneio_products_code_unique` UNIQUE(`normalizedCode`)
);
--> statement-breakpoint
ALTER TABLE `romaneios` ADD `pdfUrl` varchar(2048);--> statement-breakpoint
CREATE INDEX `romaneio_parties_recent_idx` ON `romaneioParties` (`updatedAt`);--> statement-breakpoint
CREATE INDEX `romaneio_products_recent_idx` ON `romaneioProducts` (`updatedAt`);