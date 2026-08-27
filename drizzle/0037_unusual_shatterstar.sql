ALTER TABLE `subscriptionSettings` ADD `promotionBadge` varchar(80) DEFAULT 'Oferta especial' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptionSettings` ADD `promotionBadge` varchar(80) DEFAULT 'Oferta especial' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptionSettings` ADD `promotionTitle` varchar(180) DEFAULT 'Plano PRO em oferta' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptionSettings` ADD `promotionDescription` varchar(800) DEFAULT 'Aproveite o valor promocional para liberar todos os recursos PRO.' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptionSettings` ADD `promotionBackground` varchar(24) DEFAULT 'emerald' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptionSettings` ADD `promotionCtaLabel` varchar(80) DEFAULT 'Assinar PRO com Mercado Pago' NOT NULL;
