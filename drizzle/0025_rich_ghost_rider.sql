ALTER TABLE `matrixMetrics` RENAME COLUMN `currentOverdue` TO `received`;--> statement-breakpoint
ALTER TABLE `matrixMetrics` ADD `delinquencyPercent` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `matrixMetrics` ADD `creditEffectivenessPercent` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `matrixMetrics` ADD `challengeEffectivenessPercent` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `matrixMetrics` ADD `ticketGoal` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `matrixMetrics` ADD `ticketPercent` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `matrixMetrics` ADD `ticketBonus` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `matrixMetrics` ADD `lossEffectivenessPercent` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `matrixMetrics` ADD `amountReceivable` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `matrixMetrics` ADD `overdueOpening` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `matrixMetrics` ADD `portfolioTotal` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `matrixMetrics` ADD `receiptForecast` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `matrixMetrics` ADD `closingForecast` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `matrixMetrics` ADD `closingForecastPercent` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `matrixMetrics` ADD `accumulatedLossGoal` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `matrixMetrics` ADD `accumulatedLossReceived` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `matrixMetrics` ADD `accumulatedLossBalance` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `matrixMetrics` ADD `previousDayGoal` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `matrixMetrics` ADD `dailyReceived` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `matrixMetrics` ADD `previousDayDifference` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `matrixMetrics` ADD `accumulatedDifference` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `matrixMetrics` ADD `redesignedDailyGoal` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `matrixMetrics` ADD `challengeDailyReceivedJson` text;