CREATE TABLE `utilityDownloads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`fileType` varchar(32) NOT NULL,
	`externalUrl` varchar(2048) NOT NULL,
	`isPinned` boolean NOT NULL DEFAULT false,
	`isVisible` boolean NOT NULL DEFAULT true,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `utilityDownloads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `utilityReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text NOT NULL,
	`isVisible` boolean NOT NULL DEFAULT true,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `utilityReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `utilityDownloads` ADD CONSTRAINT `utilityDownloads_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `utilityReports` ADD CONSTRAINT `utilityReports_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `utility_downloads_visibility_idx` ON `utilityDownloads` (`isVisible`,`isPinned`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `utility_reports_visibility_idx` ON `utilityReports` (`isVisible`,`updatedAt`);