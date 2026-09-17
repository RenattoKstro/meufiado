CREATE TABLE `adminCredentials` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `username` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `passwordHash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `adminCredentials_userId_unique` (`userId`),
  UNIQUE KEY `adminCredentials_username_unique` (`username`),
  CONSTRAINT `adminCredentials_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=60001;

CREATE TABLE `appTextSettings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `appName` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Meu Fiado',
  `slogan` varchar(240) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Acompanhando de perto suas metas todos dias.',
  `welcomeTitle` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Acompanhe suas metas de recebimento',
  `welcomeDescription` varchar(600) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Tenha uma visão clara das metas, indicadores e resultados da sua filial.',
  `overviewTitle` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Visão Geral',
  `overviewDescription` varchar(240) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Confira o desempenho e a projeção do seu recebimento.',
  `utilitiesTitle` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Utilidades',
  `utilitiesDescription` varchar(240) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Arquivos, relatórios e ferramentas para apoiar sua rotina.',
  `subscriptionTitle` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Plano',
  `subscriptionDescription` varchar(240) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Gerencie seu acesso e envie o comprovante após o pagamento.',
  `navOverview` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Visão Geral',
  `navBranches` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Filiais',
  `navHistory` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Históricos',
  `navUtilities` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Utilidades',
  `navChat` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Chat',
  `navSettings` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Ajustes',
  `navPreferences` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Preferências',
  `navAccount` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Conta',
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=60001;

CREATE TABLE `branchMetrics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branchId` int NOT NULL,
  `creditGoal` double NOT NULL DEFAULT '0',
  `challengeGoal` double NOT NULL DEFAULT '0',
  `currentOverdue` double NOT NULL DEFAULT '0',
  `monthlyLoss` double NOT NULL DEFAULT '0',
  `lossSalesPercent` double NOT NULL DEFAULT '0',
  `lostGoal` double NOT NULL DEFAULT '0',
  `lostReceived` double NOT NULL DEFAULT '0',
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `portfolioTotal` double NOT NULL DEFAULT '0',
  `monthOpening` double NOT NULL DEFAULT '0',
  `dayOpening` double NOT NULL DEFAULT '0',
  `workingDaysTotal` int NOT NULL DEFAULT '0',
  `workingDaysElapsed` int NOT NULL DEFAULT '0',
  `ticketWorkingDaysRemaining` int NOT NULL DEFAULT '0',
  `fiadoAtDay15` tinyint(1) NOT NULL DEFAULT '0',
  `workingDaysMode` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'automatic',
  `manualHolidayDatesJson` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `countToday` tinyint(1) NOT NULL DEFAULT '1',
  `includeSaturday` tinyint(1) NOT NULL DEFAULT '1',
  `includeSunday` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `branchMetrics_branchId_unique` (`branchId`),
  CONSTRAINT `branchMetrics_branchId_branches_id_fk` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=1050001;

CREATE TABLE `branches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `regional` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `branches_name_unique` (`name`),
  UNIQUE KEY `branches_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=150001;

CREATE TABLE `chatMessages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `senderUserId` int NOT NULL,
  `recipientUserId` int DEFAULT NULL,
  `body` varchar(1200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `supportTopic` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `chatMessages_senderUserId_users_id_fk` (`senderUserId`),
  KEY `chatMessages_recipientUserId_users_id_fk` (`recipientUserId`),
  KEY `chat_messages_expiry_idx` (`expiresAt`),
  KEY `chat_messages_private_idx` (`senderUserId`,`recipientUserId`,`createdAt`),
  CONSTRAINT `chatMessages_senderUserId_users_id_fk` FOREIGN KEY (`senderUserId`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `chatMessages_recipientUserId_users_id_fk` FOREIGN KEY (`recipientUserId`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=180001;

CREATE TABLE `chatReadStates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `lastReadMessageId` int NOT NULL DEFAULT '0',
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `chatReadStates_userId_unique` (`userId`),
  CONSTRAINT `chatReadStates_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=900001;

CREATE TABLE `matrixImportSources` (
  `id` int NOT NULL AUTO_INCREMENT,
  `source` enum('analytic','data','dailyTracking','challengeDaily','receiptDaily') COLLATE utf8mb4_unicode_ci NOT NULL,
  `importedAt` timestamp NOT NULL,
  `receivedRows` int NOT NULL DEFAULT '0',
  `validRows` int NOT NULL DEFAULT '0',
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `matrixImportSources_source_unique` (`source`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=360001;

CREATE TABLE `matrixMetrics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branchId` int NOT NULL,
  `creditGoal` double NOT NULL DEFAULT '0',
  `challengeGoal` double NOT NULL DEFAULT '0',
  `received` double NOT NULL DEFAULT '0',
  `monthlyLoss` double NOT NULL DEFAULT '0',
  `lossSalesPercent` double NOT NULL DEFAULT '0',
  `lostGoal` double NOT NULL DEFAULT '0',
  `lostReceived` double NOT NULL DEFAULT '0',
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `delinquencyPercent` double NOT NULL DEFAULT '0',
  `creditEffectivenessPercent` double NOT NULL DEFAULT '0',
  `challengeEffectivenessPercent` double NOT NULL DEFAULT '0',
  `ticketGoal` double NOT NULL DEFAULT '0',
  `ticketPercent` double NOT NULL DEFAULT '0',
  `ticketBonus` double NOT NULL DEFAULT '0',
  `lossEffectivenessPercent` double NOT NULL DEFAULT '0',
  `amountReceivable` double NOT NULL DEFAULT '0',
  `overdueOpening` double NOT NULL DEFAULT '0',
  `portfolioTotal` double NOT NULL DEFAULT '0',
  `receiptForecast` double NOT NULL DEFAULT '0',
  `closingForecast` double NOT NULL DEFAULT '0',
  `closingForecastPercent` double NOT NULL DEFAULT '0',
  `accumulatedLossGoal` double NOT NULL DEFAULT '0',
  `accumulatedLossReceived` double NOT NULL DEFAULT '0',
  `accumulatedLossBalance` double NOT NULL DEFAULT '0',
  `previousDayGoal` double NOT NULL DEFAULT '0',
  `dailyReceived` double NOT NULL DEFAULT '0',
  `previousDayDifference` double NOT NULL DEFAULT '0',
  `accumulatedDifference` double NOT NULL DEFAULT '0',
  `redesignedDailyGoal` double NOT NULL DEFAULT '0',
  `challengeDailyReceivedJson` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sales` double NOT NULL DEFAULT '0',
  `receiptDailyJson` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `matrixMetrics_branchId_unique` (`branchId`),
  CONSTRAINT `matrixMetrics_branchId_branches_id_fk` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=360001;

CREATE TABLE `mercadoPagoSubscriptionPayments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mercadoPagoSubscriptionId` int NOT NULL,
  `userId` int NOT NULL,
  `authorizedPaymentId` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `paymentId` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paymentStatus` varchar(48) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` double NOT NULL,
  `paidAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `mercado_pago_authorized_payment_unique` (`authorizedPaymentId`),
  UNIQUE KEY `mercado_pago_payment_unique` (`paymentId`),
  KEY `mpsp_subscription_fk` (`mercadoPagoSubscriptionId`),
  KEY `mpsp_user_fk` (`userId`),
  KEY `mercado_pago_subscription_payments_user_created_idx` (`userId`,`createdAt`),
  CONSTRAINT `mpsp_subscription_fk` FOREIGN KEY (`mercadoPagoSubscriptionId`) REFERENCES `mercadoPagoSubscriptions` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `mpsp_user_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mercadoPagoSubscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `externalReference` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `preapprovalId` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `checkoutUrl` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `providerStatus` varchar(48) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `amount` double NOT NULL,
  `currencyId` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BRL',
  `nextPaymentDate` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `mercadoPagoSubscriptions_userId_unique` (`userId`),
  UNIQUE KEY `mercado_pago_subscriptions_reference_unique` (`externalReference`),
  UNIQUE KEY `mercado_pago_subscriptions_preapproval_unique` (`preapprovalId`),
  CONSTRAINT `mps_user_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=90001;

CREATE TABLE `metricSettings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `portfolioTotal` double NOT NULL DEFAULT '0',
  `monthOpening` double NOT NULL DEFAULT '0',
  `dayOpening` double NOT NULL DEFAULT '0',
  `currentOverdue` double NOT NULL DEFAULT '0',
  `creditGoal` double NOT NULL DEFAULT '0',
  `challengeGoal` double NOT NULL DEFAULT '0',
  `lostGoal` double NOT NULL DEFAULT '0',
  `lostReceived` double NOT NULL DEFAULT '0',
  `workingDaysTotal` int NOT NULL DEFAULT '0',
  `workingDaysElapsed` int NOT NULL DEFAULT '0',
  `fiadoAtDay15` tinyint(1) NOT NULL DEFAULT '0',
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ticketWorkingDaysRemaining` int NOT NULL DEFAULT '0',
  `workingDaysMode` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'automatic',
  `manualHolidayDatesJson` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `countToday` tinyint(1) NOT NULL DEFAULT '1',
  `includeSaturday` tinyint(1) NOT NULL DEFAULT '1',
  `includeSunday` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `metricSettings_userId_unique` (`userId`),
  CONSTRAINT `metricSettings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=180001;

CREATE TABLE `receiptHistoryEntries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branchId` int NOT NULL,
  `entryDate` date NOT NULL,
  `receivedAmount` double NOT NULL,
  `createdByUserId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `receipt_history_branch_date_unique` (`branchId`,`entryDate`),
  KEY `receiptHistoryEntries_createdByUserId_users_id_fk` (`createdByUserId`),
  KEY `receipt_history_branch_date_idx` (`branchId`,`entryDate`),
  CONSTRAINT `receiptHistoryEntries_branchId_branches_id_fk` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `receiptHistoryEntries_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=300001;

CREATE TABLE `romaneioActivities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `romaneioId` int NOT NULL,
  `romaneioActivitySigner` enum('origin','destination') COLLATE utf8mb4_unicode_ci NOT NULL,
  `managerName` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `signatureStyle` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `occurredAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `romaneioActivities_romaneioId_romaneios_id_fk` (`romaneioId`),
  KEY `romaneio_activities_document_time_idx` (`romaneioId`,`occurredAt`),
  CONSTRAINT `romaneioActivities_romaneioId_romaneios_id_fk` FOREIGN KEY (`romaneioId`) REFERENCES `romaneios` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `romaneioItems` (
  `id` int NOT NULL AUTO_INCREMENT,
  `romaneioId` int NOT NULL,
  `position` int NOT NULL,
  `productCode` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `productName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UN',
  `requestedQuantity` double NOT NULL DEFAULT '0',
  `approvedQuantity` double NOT NULL DEFAULT '0',
  `deliveredQuantity` double NOT NULL DEFAULT '0',
  `notes` varchar(600) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `romaneio_items_position_unique` (`romaneioId`,`position`),
  KEY `romaneio_items_document_idx` (`romaneioId`),
  CONSTRAINT `romaneioItems_romaneioId_romaneios_id_fk` FOREIGN KEY (`romaneioId`) REFERENCES `romaneios` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=150001;

CREATE TABLE `romaneioParties` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `normalizedName` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `normalizedBranch` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `neighborhood` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `preferredSignatureStyle` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `romaneio_parties_name_branch_unique` (`normalizedName`,`normalizedBranch`),
  KEY `romaneio_parties_recent_idx` (`updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=120001;

CREATE TABLE `romaneioProducts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `normalizedCode` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UN',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `romaneio_products_code_unique` (`normalizedCode`),
  KEY `romaneio_products_recent_idx` (`updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=120001;

CREATE TABLE `romaneios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `createdByUserId` int NOT NULL,
  `shareToken` varchar(96) COLLATE utf8mb4_unicode_ci NOT NULL,
  `romaneioStatus` enum('draft','shared','partially_signed','signed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `documentNumber` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transferDate` date NOT NULL,
  `originName` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `originBranch` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `originAddress` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `originNeighborhood` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `originCity` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `originState` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `originManagerName` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `originSignatureUrl` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `originSignedAt` timestamp NULL DEFAULT NULL,
  `destinationName` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `destinationBranch` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `destinationAddress` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `destinationNeighborhood` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `destinationCity` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `destinationState` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `destinationManagerName` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `destinationSignatureUrl` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `destinationSignedAt` timestamp NULL DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `pdfUrl` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `romaneios_share_token_unique` (`shareToken`),
  KEY `romaneios_createdByUserId_users_id_fk` (`createdByUserId`),
  KEY `romaneios_owner_updated_idx` (`createdByUserId`,`updatedAt`),
  KEY `romaneios_status_updated_idx` (`romaneioStatus`,`updatedAt`),
  CONSTRAINT `romaneios_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=150001;

CREATE TABLE `subscriptionProofs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `proofUrl` varchar(2048) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `reviewNote` varchar(600) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reviewedByUserId` int DEFAULT NULL,
  `reviewedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `subscriptionProofs_userId_users_id_fk` (`userId`),
  KEY `subscriptionProofs_reviewedByUserId_users_id_fk` (`reviewedByUserId`),
  KEY `subscription_proofs_user_status_idx` (`userId`,`status`,`createdAt`),
  CONSTRAINT `subscriptionProofs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `subscriptionProofs_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=120001;

CREATE TABLE `subscriptionSettings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `monthlyPrice` double NOT NULL DEFAULT '0',
  `pixKey` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `branchesPlan` enum('free','pro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pro',
  `historyPlan` enum('free','pro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pro',
  `utilitiesPlan` enum('free','pro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pro',
  `chatPlan` enum('free','pro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pro',
  `updatedByUserId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `pixReceiverName` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MEU FIADO',
  `pixReceiverBank` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `pixCopyPaste` varchar(2048) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `pixQrCodeUrl` varchar(2048) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `promotionPrice` double NOT NULL DEFAULT '0',
  `promotionOriginalPrice` double NOT NULL DEFAULT '0',
  `planInfoTitle` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Plano PRO do Meu Fiado',
  `planInfoDescription` varchar(800) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Tenha acesso aos recursos avançados e acompanhe sua assinatura por aqui.',
  `planInfoBackground` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'sky',
  `planInfoCtaEnabled` tinyint(1) NOT NULL DEFAULT '0',
  `planInfoCtaLabel` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `planInfoCtaUrl` varchar(2048) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `overviewPlan` enum('free','pro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'free',
  `matrixPlan` enum('free','pro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pro',
  `metricsPlan` enum('free','pro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'free',
  `appearancePlan` enum('free','pro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'free',
  `helpPlan` enum('free','pro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'free',
  `updatesPlan` enum('free','pro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'free',
  `promotionBadge` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Oferta especial',
  `promotionTitle` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Plano PRO em oferta',
  `promotionDescription` varchar(800) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Aproveite o valor promocional para liberar todos os recursos PRO.',
  `promotionBackground` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'emerald',
  `promotionCtaLabel` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Assinar PRO com Mercado Pago',
  `subscriberGoalMinimum` int NOT NULL DEFAULT '0',
  `subscriberGoalCurrent` int NOT NULL DEFAULT '0',
  `subscriberGoalContext` varchar(800) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `subscriptionSettings_updatedByUserId_users_id_fk` (`updatedByUserId`),
  CONSTRAINT `subscriptionSettings_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=60001;

CREATE TABLE `supportConversations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `requesterUserId` int NOT NULL,
  `adminUserId` int NOT NULL,
  `topic` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `support_conversations_pair_unique` (`requesterUserId`,`adminUserId`),
  KEY `supportConversations_adminUserId_users_id_fk` (`adminUserId`),
  KEY `support_conversations_admin_idx` (`adminUserId`,`updatedAt`),
  CONSTRAINT `supportConversations_requesterUserId_users_id_fk` FOREIGN KEY (`requesterUserId`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `supportConversations_adminUserId_users_id_fk` FOREIGN KEY (`adminUserId`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `updateNotes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Geral',
  `isVisible` tinyint(1) NOT NULL DEFAULT '1',
  `createdByUserId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `updateNotes_createdByUserId_users_id_fk` (`createdByUserId`),
  KEY `update_notes_visibility_idx` (`isVisible`,`createdAt`),
  CONSTRAINT `updateNotes_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=90001;

CREATE TABLE `updateReadStates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `lastReadUpdateId` int NOT NULL DEFAULT '0',
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `updateReadStates_userId_unique` (`userId`),
  CONSTRAINT `updateReadStates_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=480001;

CREATE TABLE `userCredentials` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `passwordHash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mustChangePassword` tinyint(1) NOT NULL DEFAULT '1',
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `userCredentials_userId_unique` (`userId`),
  CONSTRAINT `userCredentials_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `userProfiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `email` varchar(320) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fullName` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branchId` int DEFAULT NULL,
  `phone` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `instagram` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operatorType` enum('leader','assistant') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'leader',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `isOnVacation` tinyint(1) NOT NULL DEFAULT '0',
  `showLostGoal` tinyint(1) NOT NULL DEFAULT '0',
  `colorMode` enum('light','dark') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'light',
  `colorPalette` enum('ocean','violet','forest','sunset','rose','midnight','citrus','slate') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ocean',
  `profileComplete` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `avatarUrl` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `messageNotificationsEnabled` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `userProfiles_userId_unique` (`userId`),
  UNIQUE KEY `profiles_email_unique` (`email`),
  KEY `userProfiles_branchId_branches_id_fk` (`branchId`),
  UNIQUE KEY `profiles_branch_operator_unique` (`branchId`,`operatorType`),
  CONSTRAINT `userProfiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `userProfiles_branchId_branches_id_fk` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=360001;

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `openId` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(320) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `loginMethod` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('user','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `plan` enum('free','pro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'free',
  `proExpiresAt` timestamp NULL DEFAULT NULL,
  `supportAvailability` enum('available','away','busy') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `users_openId_unique` (`openId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=25350001;

CREATE TABLE `utilityDownloads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fileType` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `externalUrl` varchar(2048) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isPinned` tinyint(1) NOT NULL DEFAULT '0',
  `isVisible` tinyint(1) NOT NULL DEFAULT '1',
  `createdByUserId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `utilityDownloads_createdByUserId_users_id_fk` (`createdByUserId`),
  KEY `utility_downloads_visibility_idx` (`isVisible`,`isPinned`,`updatedAt`),
  CONSTRAINT `utilityDownloads_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=90001;

CREATE TABLE `utilityReports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `isVisible` tinyint(1) NOT NULL DEFAULT '1',
  `createdByUserId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `utilityReports_createdByUserId_users_id_fk` (`createdByUserId`),
  KEY `utility_reports_visibility_idx` (`isVisible`,`updatedAt`),
  CONSTRAINT `utilityReports_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=120001;
