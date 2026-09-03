ALTER TABLE `branchMetrics` ADD `manualHolidayDatesJson` text NULL;--> statement-breakpoint
UPDATE `branchMetrics` SET `manualHolidayDatesJson` = '[]' WHERE `manualHolidayDatesJson` IS NULL;--> statement-breakpoint
ALTER TABLE `branchMetrics` MODIFY `manualHolidayDatesJson` text NOT NULL;--> statement-breakpoint
ALTER TABLE `metricSettings` ADD `manualHolidayDatesJson` text NULL;--> statement-breakpoint
UPDATE `metricSettings` SET `manualHolidayDatesJson` = '[]' WHERE `manualHolidayDatesJson` IS NULL;--> statement-breakpoint
ALTER TABLE `metricSettings` MODIFY `manualHolidayDatesJson` text NOT NULL;
