ALTER TABLE `branchMetrics` MODIFY COLUMN `manualHolidayDatesJson` text NOT NULL;--> statement-breakpoint
ALTER TABLE `metricSettings` MODIFY COLUMN `manualHolidayDatesJson` text NOT NULL;--> statement-breakpoint
ALTER TABLE `branchMetrics` ADD `countToday` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `branchMetrics` ADD `includeSaturday` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `branchMetrics` ADD `includeSunday` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `metricSettings` ADD `countToday` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `metricSettings` ADD `includeSaturday` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `metricSettings` ADD `includeSunday` boolean DEFAULT false NOT NULL;