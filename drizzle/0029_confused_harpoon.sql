ALTER TABLE `chatMessages` ADD `supportTopic` varchar(120);--> statement-breakpoint
ALTER TABLE `users` ADD `supportAvailability` enum('available','away','busy') DEFAULT 'available' NOT NULL;