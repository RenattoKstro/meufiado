CREATE TABLE `adminCredentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`username` varchar(80) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `adminCredentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `adminCredentials_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `adminCredentials_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
ALTER TABLE `adminCredentials` ADD CONSTRAINT `adminCredentials_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;