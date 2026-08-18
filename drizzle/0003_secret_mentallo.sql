CREATE TABLE `branchMetrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`creditGoal` double NOT NULL DEFAULT 0,
	`challengeGoal` double NOT NULL DEFAULT 0,
	`currentOverdue` double NOT NULL DEFAULT 0,
	`monthlyLoss` double NOT NULL DEFAULT 0,
	`lossSalesPercent` double NOT NULL DEFAULT 0,
	`lostGoal` double NOT NULL DEFAULT 0,
	`lostReceived` double NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branchMetrics_id` PRIMARY KEY(`id`),
	CONSTRAINT `branchMetrics_branchId_unique` UNIQUE(`branchId`)
);
--> statement-breakpoint
ALTER TABLE `branches` ADD `regional` varchar(120);--> statement-breakpoint
ALTER TABLE `branches` ADD CONSTRAINT `branches_code_unique` UNIQUE(`code`);--> statement-breakpoint
ALTER TABLE `branchMetrics` ADD CONSTRAINT `branchMetrics_branchId_branches_id_fk` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;