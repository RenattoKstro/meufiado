ALTER TABLE `subscriptionSettings` ADD `planInfoBackground` varchar(24) DEFAULT 'sky' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptionSettings` ADD `planInfoBackground` varchar(24) DEFAULT 'sky' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptionSettings` ADD `planInfoCtaEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptionSettings` ADD `planInfoCtaLabel` varchar(80) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptionSettings` ADD `planInfoCtaUrl` varchar(2048) DEFAULT '' NOT NULL;
