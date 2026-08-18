CREATE TABLE `userCredentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`mustChangePassword` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userCredentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `userCredentials_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `userCredentials` ADD CONSTRAINT `userCredentials_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;