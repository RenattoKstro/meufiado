ALTER TABLE `subscriptionSettings` ADD `subscriberGoalMinimum` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptionSettings` ADD `subscriberGoalCurrent` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptionSettings` ADD `subscriberGoalContext` varchar(800) DEFAULT '' NOT NULL;