ALTER TABLE `branchMetrics` ADD `portfolioTotal` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `branchMetrics` ADD `monthOpening` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `branchMetrics` ADD `dayOpening` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `branchMetrics` ADD `workingDaysTotal` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `branchMetrics` ADD `workingDaysElapsed` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `branchMetrics` ADD `ticketWorkingDaysRemaining` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `branchMetrics` ADD `fiadoAtDay15` boolean DEFAULT false NOT NULL;--> statement-breakpoint
INSERT INTO `branchMetrics` (`branchId`, `portfolioTotal`, `monthOpening`, `dayOpening`, `creditGoal`, `challengeGoal`, `currentOverdue`, `monthlyLoss`, `lossSalesPercent`, `lostGoal`, `lostReceived`, `workingDaysTotal`, `workingDaysElapsed`, `ticketWorkingDaysRemaining`, `fiadoAtDay15`, `updatedAt`)
SELECT profile.`branchId`, legacy.`portfolioTotal`, legacy.`monthOpening`, legacy.`dayOpening`, legacy.`creditGoal`, legacy.`challengeGoal`, legacy.`currentOverdue`, 0, 0, legacy.`lostGoal`, legacy.`lostReceived`, legacy.`workingDaysTotal`, legacy.`workingDaysElapsed`, legacy.`ticketWorkingDaysRemaining`, legacy.`fiadoAtDay15`, legacy.`updatedAt`
FROM `userProfiles` AS profile
INNER JOIN `metricSettings` AS legacy ON legacy.`userId` = profile.`userId`
WHERE profile.`branchId` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM `userProfiles` AS newerProfile
    INNER JOIN `metricSettings` AS newerMetrics ON newerMetrics.`userId` = newerProfile.`userId`
    WHERE newerProfile.`branchId` = profile.`branchId`
      AND (newerMetrics.`updatedAt` > legacy.`updatedAt` OR (newerMetrics.`updatedAt` = legacy.`updatedAt` AND newerMetrics.`id` > legacy.`id`))
  )
ON DUPLICATE KEY UPDATE
  `portfolioTotal` = VALUES(`portfolioTotal`),
  `monthOpening` = VALUES(`monthOpening`),
  `dayOpening` = VALUES(`dayOpening`),
  `creditGoal` = VALUES(`creditGoal`),
  `challengeGoal` = VALUES(`challengeGoal`),
  `currentOverdue` = VALUES(`currentOverdue`),
  `lostGoal` = VALUES(`lostGoal`),
  `lostReceived` = VALUES(`lostReceived`),
  `workingDaysTotal` = VALUES(`workingDaysTotal`),
  `workingDaysElapsed` = VALUES(`workingDaysElapsed`),
  `ticketWorkingDaysRemaining` = VALUES(`ticketWorkingDaysRemaining`),
  `fiadoAtDay15` = VALUES(`fiadoAtDay15`),
  `updatedAt` = VALUES(`updatedAt`);--> statement-breakpoint
ALTER TABLE `userProfiles` ADD CONSTRAINT `profiles_branch_operator_unique` UNIQUE(`branchId`,`operatorType`);
