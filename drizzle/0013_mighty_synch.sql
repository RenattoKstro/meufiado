CREATE TABLE `receiptHistoryEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`entryDate` date NOT NULL,
	`receivedAmount` double NOT NULL,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `receiptHistoryEntries_id` PRIMARY KEY(`id`),
	CONSTRAINT `receipt_history_branch_date_unique` UNIQUE(`branchId`,`entryDate`)
);
--> statement-breakpoint
ALTER TABLE `receiptHistoryEntries` ADD CONSTRAINT `receiptHistoryEntries_branchId_branches_id_fk` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `receiptHistoryEntries` ADD CONSTRAINT `receiptHistoryEntries_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `receipt_history_branch_date_idx` ON `receiptHistoryEntries` (`branchId`,`entryDate`);