CREATE TABLE `branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`code` varchar(32),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branches_id` PRIMARY KEY(`id`),
	CONSTRAINT `branches_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `metricSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`portfolioTotal` double NOT NULL DEFAULT 0,
	`monthOpening` double NOT NULL DEFAULT 0,
	`dayOpening` double NOT NULL DEFAULT 0,
	`currentOverdue` double NOT NULL DEFAULT 0,
	`creditGoal` double NOT NULL DEFAULT 0,
	`challengeGoal` double NOT NULL DEFAULT 0,
	`lostGoal` double NOT NULL DEFAULT 0,
	`lostReceived` double NOT NULL DEFAULT 0,
	`workingDaysTotal` int NOT NULL DEFAULT 0,
	`workingDaysElapsed` int NOT NULL DEFAULT 0,
	`fiadoAtDay15` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `metricSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `metricSettings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `userProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`email` varchar(320) NOT NULL,
	`fullName` varchar(160) NOT NULL,
	`branchId` int NOT NULL,
	`phone` varchar(32) NOT NULL,
	`instagram` varchar(120),
	`operatorType` enum('leader','assistant') NOT NULL DEFAULT 'leader',
	`isActive` boolean NOT NULL DEFAULT true,
	`isOnVacation` boolean NOT NULL DEFAULT false,
	`showLostGoal` boolean NOT NULL DEFAULT false,
	`colorMode` enum('light','dark') NOT NULL DEFAULT 'light',
	`colorPalette` enum('ocean','violet','forest','sunset') NOT NULL DEFAULT 'ocean',
	`profileComplete` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `userProfiles_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `profiles_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `metricSettings` ADD CONSTRAINT `metricSettings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD CONSTRAINT `userProfiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD CONSTRAINT `userProfiles_branchId_branches_id_fk` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;