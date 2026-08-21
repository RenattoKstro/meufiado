CREATE TABLE `subscriptionProofs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`proofUrl` varchar(2048) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewNote` varchar(600),
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptionProofs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptionSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`monthlyPrice` double NOT NULL DEFAULT 0,
	`pixKey` varchar(255) NOT NULL DEFAULT '',
	`branchesPlan` enum('free','pro') NOT NULL DEFAULT 'pro',
	`historyPlan` enum('free','pro') NOT NULL DEFAULT 'pro',
	`utilitiesPlan` enum('free','pro') NOT NULL DEFAULT 'pro',
	`chatPlan` enum('free','pro') NOT NULL DEFAULT 'pro',
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptionSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `plan` enum('free','pro') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `proExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `subscriptionProofs` ADD CONSTRAINT `subscriptionProofs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptionProofs` ADD CONSTRAINT `subscriptionProofs_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptionSettings` ADD CONSTRAINT `subscriptionSettings_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `subscription_proofs_user_status_idx` ON `subscriptionProofs` (`userId`,`status`,`createdAt`);