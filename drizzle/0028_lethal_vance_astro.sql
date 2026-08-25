CREATE TABLE `mercadoPagoSubscriptionPayments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mercadoPagoSubscriptionId` int NOT NULL,
	`userId` int NOT NULL,
	`authorizedPaymentId` varchar(120) NOT NULL,
	`paymentId` varchar(120),
	`paymentStatus` varchar(48) NOT NULL,
	`amount` double NOT NULL,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mercadoPagoSubscriptionPayments_id` PRIMARY KEY(`id`),
	CONSTRAINT `mercado_pago_authorized_payment_unique` UNIQUE(`authorizedPaymentId`),
	CONSTRAINT `mercado_pago_payment_unique` UNIQUE(`paymentId`)
);
--> statement-breakpoint
CREATE TABLE `mercadoPagoSubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`externalReference` varchar(120) NOT NULL,
	`preapprovalId` varchar(120),
	`checkoutUrl` varchar(2048),
	`providerStatus` varchar(48) NOT NULL DEFAULT 'pending',
	`amount` double NOT NULL,
	`currencyId` varchar(3) NOT NULL DEFAULT 'BRL',
	`nextPaymentDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mercadoPagoSubscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `mercadoPagoSubscriptions_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `mercado_pago_subscriptions_reference_unique` UNIQUE(`externalReference`),
	CONSTRAINT `mercado_pago_subscriptions_preapproval_unique` UNIQUE(`preapprovalId`)
);
--> statement-breakpoint
ALTER TABLE `mercadoPagoSubscriptionPayments` ADD CONSTRAINT `mpsp_subscription_fk` FOREIGN KEY (`mercadoPagoSubscriptionId`) REFERENCES `mercadoPagoSubscriptions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mercadoPagoSubscriptionPayments` ADD CONSTRAINT `mpsp_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mercadoPagoSubscriptions` ADD CONSTRAINT `mps_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `mercado_pago_subscription_payments_user_created_idx` ON `mercadoPagoSubscriptionPayments` (`userId`,`createdAt`);
