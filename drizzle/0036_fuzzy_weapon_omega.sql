ALTER TABLE `subscriptionSettings` ADD `overviewPlan` enum('free','pro') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptionSettings` ADD `matrixPlan` enum('free','pro') DEFAULT 'pro' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptionSettings` ADD `metricsPlan` enum('free','pro') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptionSettings` ADD `appearancePlan` enum('free','pro') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptionSettings` ADD `helpPlan` enum('free','pro') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptionSettings` ADD `updatesPlan` enum('free','pro') DEFAULT 'free' NOT NULL;