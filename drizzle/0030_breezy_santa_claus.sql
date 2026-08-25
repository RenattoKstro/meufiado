CREATE TABLE `supportConversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requesterUserId` int NOT NULL,
	`adminUserId` int NOT NULL,
	`topic` varchar(120) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supportConversations_id` PRIMARY KEY(`id`),
	CONSTRAINT `support_conversations_pair_unique` UNIQUE(`requesterUserId`,`adminUserId`)
);
--> statement-breakpoint
ALTER TABLE `supportConversations` ADD CONSTRAINT `supportConversations_requesterUserId_users_id_fk` FOREIGN KEY (`requesterUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supportConversations` ADD CONSTRAINT `supportConversations_adminUserId_users_id_fk` FOREIGN KEY (`adminUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `support_conversations_admin_idx` ON `supportConversations` (`adminUserId`,`updatedAt`);