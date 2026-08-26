CREATE TABLE `updateNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text NOT NULL,
	`category` varchar(80) NOT NULL DEFAULT 'Geral',
	`isVisible` boolean NOT NULL DEFAULT true,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `updateNotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `updateReadStates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`lastReadUpdateId` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `updateReadStates_id` PRIMARY KEY(`id`),
	CONSTRAINT `updateReadStates_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `updateNotes` ADD CONSTRAINT `updateNotes_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `updateReadStates` ADD CONSTRAINT `updateReadStates_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `update_notes_visibility_idx` ON `updateNotes` (`isVisible`,`createdAt`);