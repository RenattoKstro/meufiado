CREATE TABLE `chatReadStates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`lastReadMessageId` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chatReadStates_id` PRIMARY KEY(`id`),
	CONSTRAINT `chatReadStates_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `chatReadStates` ADD CONSTRAINT `chatReadStates_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;