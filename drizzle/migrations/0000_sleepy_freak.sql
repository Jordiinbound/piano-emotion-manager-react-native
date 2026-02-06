CREATE TABLE `ai_usage_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(64) NOT NULL,
	`feature` varchar(50) NOT NULL,
	`tokensUsed` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `alert_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pianoId` int NOT NULL,
	`clientId` int NOT NULL,
	`userId` int NOT NULL,
	`partnerId` int NOT NULL DEFAULT 1,
	`organizationId` int,
	`alertType` enum('tuning','regulation','repair') NOT NULL,
	`priority` enum('urgent','pending','ok') NOT NULL,
	`message` text NOT NULL,
	`daysSinceLastService` int NOT NULL,
	`status` enum('active','acknowledged','resolved','dismissed') DEFAULT 'active',
	`acknowledgedAt` timestamp,
	`resolvedAt` timestamp,
	`resolvedByServiceId` int,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `alert_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alertHistoryId` int NOT NULL,
	`userId` int NOT NULL,
	`notificationType` enum('email','push','weekly_digest') NOT NULL,
	`status` enum('pending','sent','failed','opened') DEFAULT 'pending',
	`sentAt` timestamp,
	`openedAt` timestamp,
	`recipientEmail` varchar(320),
	`subject` varchar(255),
	`errorMessage` text,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `alert_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`partnerId` int NOT NULL DEFAULT 1,
	`organizationId` int,
	`tuningPendingDays` int DEFAULT 180,
	`tuningUrgentDays` int DEFAULT 270,
	`regulationPendingDays` int DEFAULT 730,
	`regulationUrgentDays` int DEFAULT 1095,
	`appointmentsNoticeDays` int DEFAULT 7,
	`scheduledServicesNoticeDays` int DEFAULT 7,
	`invoicesDueNoticeDays` int DEFAULT 7,
	`quotesExpiryNoticeDays` int DEFAULT 7,
	`contractsRenewalNoticeDays` int DEFAULT 30,
	`overduePaymentsNoticeDays` int DEFAULT 15,
	`inventoryMinStock` int DEFAULT 5,
	`inventoryExpiryNoticeDays` int DEFAULT 30,
	`toolsMaintenanceDays` int DEFAULT 180,
	`maintenanceTuningIntervalDays` int DEFAULT 180,
	`maintenanceRegulationIntervalDays` int DEFAULT 730,
	`maintenancePredictionWindowMonths` int DEFAULT 6,
	`clientFollowupDays` int DEFAULT 90,
	`clientInactiveMonths` int DEFAULT 12,
	`churnRiskMinDays` int DEFAULT 180,
	`churnRiskIntervalMultiplier` decimal(3,1) DEFAULT '1.5',
	`churnRiskMinScore` int DEFAULT 25,
	`emailNotificationsEnabled` tinyint DEFAULT 1,
	`pushNotificationsEnabled` tinyint DEFAULT 0,
	`weeklyDigestEnabled` tinyint DEFAULT 1,
	`weeklyDigestDay` int DEFAULT 1,
	`hasSeenAdvancedConfigTip` tinyint DEFAULT 0,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`odId` varchar(64) NOT NULL,
	`clientId` int NOT NULL,
	`pianoId` int,
	`title` varchar(255) NOT NULL,
	`date` timestamp NOT NULL,
	`duration` int NOT NULL DEFAULT 60,
	`serviceType` varchar(50),
	`status` enum('scheduled','confirmed','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`notes` text,
	`address` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`partnerId` int NOT NULL DEFAULT 1,
	`organizationId` int
);
--> statement-breakpoint
CREATE TABLE `businessInfo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`odId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`taxId` varchar(50),
	`address` text,
	`city` varchar(100),
	`postalCode` varchar(20),
	`phone` varchar(50),
	`email` varchar(320),
	`bankAccount` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`partnerId` int NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE `calendar_connections` (
	`id` varchar(255) NOT NULL,
	`userId` varchar(255) NOT NULL,
	`provider` enum('google','microsoft') NOT NULL,
	`calendarId` varchar(255) NOT NULL,
	`calendarName` varchar(255),
	`accessToken` text NOT NULL,
	`refreshToken` text NOT NULL,
	`expiresAt` timestamp,
	`webhookId` varchar(255),
	`webhookExpiration` timestamp,
	`lastSyncToken` text,
	`lastDeltaLink` text,
	`syncEnabled` tinyint DEFAULT 1,
	`lastSyncAt` timestamp,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `calendar_sync_events` (
	`id` varchar(255) NOT NULL,
	`connectionId` varchar(255) NOT NULL,
	`appointmentId` varchar(255),
	`externalEventId` varchar(255) NOT NULL,
	`provider` enum('google','microsoft') NOT NULL,
	`syncStatus` enum('synced','pending','error') DEFAULT 'synced',
	`lastSyncedAt` timestamp,
	`errorMessage` text,
	`metadata` json,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `calendar_sync_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`connectionId` varchar(255) NOT NULL,
	`action` enum('create','update','delete') NOT NULL,
	`direction` enum('to_external','from_external') NOT NULL,
	`appointmentId` varchar(255),
	`externalEventId` varchar(255),
	`status` enum('success','error') NOT NULL,
	`errorMessage` text,
	`details` json,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `client_messages` (
	`id` varchar(255) NOT NULL,
	`clientId` varchar(255) NOT NULL,
	`fromUserId` varchar(255),
	`fromClientPortalUserId` varchar(255),
	`message` text NOT NULL,
	`isRead` tinyint DEFAULT 0,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `client_portal_invitations` (
	`id` varchar(255) NOT NULL,
	`clientId` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`token` varchar(255) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdBy` varchar(255) NOT NULL,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `client_portal_password_resets` (
	`id` varchar(255) NOT NULL,
	`clientPortalUserId` varchar(255) NOT NULL,
	`token` varchar(255) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `client_portal_sessions` (
	`id` varchar(255) NOT NULL,
	`clientPortalUserId` varchar(255) NOT NULL,
	`token` varchar(512) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `client_portal_users` (
	`id` varchar(255) NOT NULL,
	`clientId` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`isActive` tinyint DEFAULT 1,
	`lastLoginAt` timestamp,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`odId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(50),
	`address` text,
	`clientType` enum('particular','student','professional','music_school','conservatory','concert_hall') NOT NULL DEFAULT 'particular',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`region` varchar(100),
	`city` varchar(100),
	`postalCode` varchar(20),
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`routeGroup` varchar(50),
	`partnerId` int NOT NULL DEFAULT 1,
	`organizationId` int
);
--> statement-breakpoint
CREATE TABLE `distributor_module_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`distributor_id` int NOT NULL,
	`suppliers_enabled` tinyint DEFAULT 1,
	`inventory_enabled` tinyint DEFAULT 1,
	`invoicing_enabled` tinyint DEFAULT 1,
	`advanced_invoicing_enabled` tinyint DEFAULT 0,
	`accounting_enabled` tinyint DEFAULT 0,
	`team_enabled` tinyint DEFAULT 0,
	`crm_enabled` tinyint DEFAULT 0,
	`reports_enabled` tinyint DEFAULT 0,
	`shop_enabled` tinyint DEFAULT 1,
	`show_prices` tinyint DEFAULT 1,
	`allow_direct_orders` tinyint DEFAULT 1,
	`show_stock` tinyint DEFAULT 1,
	`stock_alerts_enabled` tinyint DEFAULT 1,
	`custom_branding` tinyint DEFAULT 0,
	`hide_competitor_links` tinyint DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `help_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`section_id` int NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`display_order` int DEFAULT 0,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `help_sections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`icon` varchar(50),
	`display_order` int DEFAULT 0,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`odId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('strings','hammers','dampers','keys','action_parts','pedals','tuning_pins','felts','tools','chemicals','other') NOT NULL,
	`description` text,
	`quantity` decimal(10,2) NOT NULL DEFAULT '0',
	`unit` varchar(20) NOT NULL DEFAULT 'unidad',
	`minStock` decimal(10,2) NOT NULL DEFAULT '0',
	`costPerUnit` decimal(10,2),
	`supplier` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`partnerId` int NOT NULL DEFAULT 1,
	`organizationId` int
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` varchar(36) NOT NULL,
	`email` varchar(320) NOT NULL,
	`invited_by` varchar(320) NOT NULL,
	`token` varchar(255) NOT NULL,
	`used` tinyint NOT NULL DEFAULT 0,
	`used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`expires_at` timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`odId` varchar(64) NOT NULL,
	`invoiceNumber` varchar(50) NOT NULL,
	`clientId` int NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`clientEmail` varchar(320),
	`clientAddress` text,
	`date` timestamp NOT NULL,
	`dueDate` timestamp,
	`status` enum('draft','sent','paid','cancelled') NOT NULL DEFAULT 'draft',
	`items` json,
	`subtotal` decimal(10,2) NOT NULL,
	`taxAmount` decimal(10,2) NOT NULL,
	`total` decimal(10,2) NOT NULL,
	`notes` text,
	`businessInfo` json,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`partnerId` int NOT NULL DEFAULT 1,
	`organizationId` int
);
--> statement-breakpoint
CREATE TABLE `license_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batch_code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`distributor_id` int,
	`template_id` int,
	`total_licenses` int NOT NULL,
	`activated_licenses` int DEFAULT 0,
	`license_type` enum('trial','free','starter','professional','enterprise') NOT NULL,
	`module_config` json,
	`duration_days` int,
	`created_by_admin_id` int,
	`created_at` datetime NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `license_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`license_id` int NOT NULL,
	`action` enum('created','activated','deactivated','expired','revoked','suspended','reactivated','transferred','config_changed') NOT NULL,
	`previous_status` enum('available','active','expired','revoked','suspended'),
	`new_status` enum('available','active','expired','revoked','suspended'),
	`performed_by_admin_id` int,
	`performed_by_user_id` int,
	`details` json,
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `license_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`license_type` enum('trial','free','pro','premium'),
	`duration_days` int,
	`module_config` json,
	`max_users` int DEFAULT 1,
	`max_clients` int,
	`max_pianos` int,
	`is_active` tinyint DEFAULT 1,
	`created_at` datetime NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `licenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`license_type` enum('trial','free','pro','premium'),
	`status` enum('available','active','expired','revoked','suspended') DEFAULT 'available',
	`distributor_id` int,
	`template_id` int,
	`activated_by_user_id` int,
	`activated_at` datetime,
	`module_config` json,
	`max_users` int DEFAULT 1,
	`max_clients` int,
	`max_pianos` int,
	`valid_from` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`valid_until` datetime,
	`notes` text,
	`metadata` json,
	`created_by_admin_id` int,
	`created_at` datetime NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `member_absences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`memberId` int NOT NULL,
	`absenceType` enum('vacation','sick_leave','personal','training','public_holiday','other') NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`isFullDay` tinyint DEFAULT 1,
	`startTime` varchar(5),
	`endTime` varchar(5),
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectionReason` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `modules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`icon` varchar(50),
	`color` varchar(7),
	`type` enum('free','professional','premium') NOT NULL,
	`includedInPlans` json DEFAULT ('[]'),
	`addonPrice` decimal(10,2),
	`addonPriceCurrency` varchar(3) DEFAULT 'EUR',
	`dependencies` json DEFAULT ('[]'),
	`isActive` boolean DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`version` varchar(20),
	`releaseNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `modules_id` PRIMARY KEY(`id`),
	CONSTRAINT `modules_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `organization_activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`activityType` enum('member_invited','member_joined','member_removed','member_role_changed','member_suspended','work_assigned','work_reassigned','work_completed','settings_changed','subscription_changed','invoice_created','client_created','service_completed') NOT NULL,
	`description` text NOT NULL,
	`metadata` json,
	`entityType` varchar(50),
	`entityId` int,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `organization_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`organizationRole` enum('owner','admin','manager','senior_tech','technician','apprentice','receptionist','accountant','viewer') NOT NULL DEFAULT 'technician',
	`token` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`invitedBy` int NOT NULL,
	`message` text,
	`acceptedAt` timestamp,
	`acceptedByUserId` int,
	`declinedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `organization_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`organizationRole` enum('owner','admin','manager','senior_tech','technician','apprentice','receptionist','accountant','viewer') NOT NULL DEFAULT 'technician',
	`membershipStatus` enum('active','pending_invitation','suspended','inactive') NOT NULL DEFAULT 'pending_invitation',
	`displayName` varchar(100),
	`jobTitle` varchar(100),
	`employeeId` varchar(50),
	`phone` varchar(50),
	`color` varchar(7),
	`canBeAssigned` tinyint DEFAULT 1,
	`maxDailyAppointments` int DEFAULT 8,
	`workingHoursStart` varchar(5),
	`workingHoursEnd` varchar(5),
	`workingDays` json,
	`assignedZones` json,
	`specialties` json,
	`invitedAt` timestamp,
	`invitedBy` int,
	`joinedAt` timestamp,
	`lastActiveAt` timestamp,
	`suspendedAt` timestamp,
	`suspendedReason` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `organization_modules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`moduleCode` varchar(50) NOT NULL,
	`isEnabled` boolean DEFAULT true,
	`accessType` varchar(20) NOT NULL,
	`purchasedAt` timestamp,
	`expiresAt` timestamp,
	`settings` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_modules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organization_sharing_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`resource` enum('clients','pianos','services','appointments','inventory','invoices','quotes','reminders') NOT NULL,
	`sharingModel` enum('private','shared_read','shared_write') NOT NULL DEFAULT 'private',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`logo` text,
	`ownerId` int NOT NULL,
	`subscriptionPlan` enum('free','starter','team','business','enterprise') NOT NULL DEFAULT 'free',
	`maxMembers` int NOT NULL DEFAULT 1,
	`subscriptionExpiresAt` timestamp,
	`taxId` varchar(50),
	`legalName` varchar(255),
	`address` text,
	`city` varchar(100),
	`postalCode` varchar(20),
	`country` varchar(2) DEFAULT 'ES',
	`phone` varchar(50),
	`email` varchar(320),
	`website` varchar(255),
	`bankAccount` varchar(50),
	`bankName` varchar(100),
	`swiftBic` varchar(11),
	`invoicePrefix` varchar(10) DEFAULT 'FAC',
	`invoiceNextNumber` int DEFAULT 1,
	`defaultTaxRate` decimal(5,2) DEFAULT '21.00',
	`defaultCurrency` varchar(3) DEFAULT 'EUR',
	`defaultServiceDuration` int DEFAULT 60,
	`workingHoursStart` varchar(5) DEFAULT '09:00',
	`workingHoursEnd` varchar(5) DEFAULT '18:00',
	`workingDays` json,
	`timezone` varchar(50) DEFAULT 'Europe/Madrid',
	`notifyOnNewAppointment` tinyint DEFAULT 1,
	`notifyOnAssignment` tinyint DEFAULT 1,
	`notifyOnCompletion` tinyint DEFAULT 1,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `partner_pricing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`planCode` enum('free','professional','premium') NOT NULL,
	`monthlyPrice` decimal(10,2),
	`yearlyPrice` decimal(10,2),
	`minMonthlyRevenue` decimal(10,2),
	`discountPercentage` int DEFAULT 0,
	`customFeatures` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `partner_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`ecommerceEnabled` tinyint NOT NULL DEFAULT 0,
	`ecommerceApiUrl` text,
	`ecommerceApiKey` text,
	`autoOrderEnabled` tinyint NOT NULL DEFAULT 0,
	`autoOrderThreshold` int DEFAULT 5,
	`notificationEmail` varchar(320),
	`notificationWebhook` text,
	`maxUsers` int,
	`maxOrganizations` int,
	`supportedLanguages` json,
	`alertPianoTuning` tinyint DEFAULT 1,
	`alertPianoRegulation` tinyint DEFAULT 1,
	`alertPianoMaintenance` tinyint DEFAULT 1,
	`alertQuotesPending` tinyint DEFAULT 1,
	`alertQuotesExpiring` tinyint DEFAULT 1,
	`alertInvoicesPending` tinyint DEFAULT 1,
	`alertInvoicesOverdue` tinyint DEFAULT 1,
	`alertUpcomingAppointments` tinyint DEFAULT 1,
	`alertUnconfirmedAppointments` tinyint DEFAULT 1,
	`alertFrequency` enum('realtime','daily','weekly') DEFAULT 'realtime',
	`pushNotifications` tinyint DEFAULT 1,
	`emailNotifications` tinyint DEFAULT 1,
	`calendarSync` enum('none','google','outlook') DEFAULT 'none',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `partner_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','manager') NOT NULL DEFAULT 'manager',
	`canManageBranding` tinyint NOT NULL DEFAULT 0,
	`canManagePricing` tinyint NOT NULL DEFAULT 0,
	`canManageUsers` tinyint NOT NULL DEFAULT 0,
	`canViewAnalytics` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `partners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`customDomain` varchar(255),
	`logo` text,
	`primaryColor` varchar(7) DEFAULT '#3b82f6',
	`secondaryColor` varchar(7) DEFAULT '#10b981',
	`brandName` varchar(255),
	`status` enum('active','suspended','inactive') NOT NULL DEFAULT 'active',
	`allowMultipleSuppliers` tinyint NOT NULL DEFAULT 0,
	`defaultLanguage` varchar(5) NOT NULL DEFAULT 'es',
	`supportEmail` varchar(320),
	`supportPhone` varchar(50),
	`legalName` varchar(255),
	`businessName` varchar(255),
	`taxId` varchar(20),
	`addressStreet` varchar(255),
	`addressPostalCode` varchar(5),
	`addressCity` varchar(100),
	`addressProvince` varchar(100),
	`iban` varchar(34),
	`bankName` varchar(255),
	`businessMode` enum('individual','team') DEFAULT 'individual',
	`emailClientPreference` enum('gmail','outlook','default') DEFAULT 'gmail',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `pianos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`odId` varchar(64) NOT NULL,
	`clientId` int NOT NULL,
	`brand` varchar(100) NOT NULL,
	`model` varchar(100),
	`serialNumber` varchar(100),
	`year` int,
	`category` enum('vertical','grand') NOT NULL DEFAULT 'vertical',
	`pianoType` varchar(50) NOT NULL,
	`condition` enum('excellent','good','fair','poor','needs_repair') NOT NULL DEFAULT 'good',
	`location` text,
	`notes` text,
	`photos` json,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`partnerId` int NOT NULL DEFAULT 1,
	`organizationId` int,
	`tuningIntervalDays` int DEFAULT 180,
	`regulationIntervalDays` int DEFAULT 730,
	`alertsEnabled` tinyint DEFAULT 1,
	`customThresholdsEnabled` tinyint DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `platform_admins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`role` enum('super_admin','admin','support') DEFAULT 'admin',
	`permissions` json,
	`is_active` tinyint DEFAULT 1,
	`created_at` datetime NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `quoteTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`odId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` enum('tuning','repair','restoration','maintenance','moving','evaluation','custom') NOT NULL DEFAULT 'custom',
	`items` json,
	`isDefault` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`partnerId` int NOT NULL DEFAULT 1,
	`organizationId` int
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`odId` varchar(64) NOT NULL,
	`quoteNumber` varchar(50) NOT NULL,
	`clientId` int NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`clientEmail` varchar(320),
	`clientAddress` text,
	`pianoId` int,
	`pianoDescription` varchar(255),
	`title` varchar(255) NOT NULL,
	`description` text,
	`date` timestamp NOT NULL,
	`validUntil` timestamp NOT NULL,
	`status` enum('draft','sent','accepted','rejected','expired','converted') NOT NULL DEFAULT 'draft',
	`items` json,
	`subtotal` decimal(10,2) NOT NULL,
	`totalDiscount` decimal(10,2) NOT NULL DEFAULT '0',
	`taxAmount` decimal(10,2) NOT NULL,
	`total` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'EUR',
	`notes` text,
	`termsAndConditions` text,
	`sentAt` timestamp,
	`acceptedAt` timestamp,
	`rejectedAt` timestamp,
	`convertedToInvoiceId` int,
	`businessInfo` json,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`partnerId` int NOT NULL DEFAULT 1,
	`organizationId` int
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`odId` varchar(64) NOT NULL,
	`clientId` int NOT NULL,
	`pianoId` int,
	`reminderType` enum('call','visit','email','whatsapp','follow_up') NOT NULL,
	`dueDate` timestamp NOT NULL,
	`title` varchar(255) NOT NULL,
	`notes` text,
	`isCompleted` tinyint NOT NULL DEFAULT 0,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`partnerId` int NOT NULL DEFAULT 1,
	`organizationId` int
);
--> statement-breakpoint
CREATE TABLE `service_interval_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL DEFAULT 1,
	`clientType` enum('particular','student','professional','music_school','conservatory','concert_hall') NOT NULL,
	`tuningIntervalDays` int NOT NULL DEFAULT 180,
	`regulationIntervalDays` int NOT NULL DEFAULT 730,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `serviceRates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`odId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` enum('tuning','maintenance','regulation','repair','restoration','inspection','other') NOT NULL,
	`basePrice` decimal(10,2) NOT NULL,
	`taxRate` int NOT NULL DEFAULT 21,
	`estimatedDuration` int,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`partnerId` int NOT NULL DEFAULT 1,
	`organizationId` int
);
--> statement-breakpoint
CREATE TABLE `service_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceTypeId` int NOT NULL,
	`description` varchar(500) NOT NULL,
	`orderIndex` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `service_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`duration` int NOT NULL,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `service_zones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`color` varchar(7),
	`postalCodes` json,
	`cities` json,
	`geoJson` json,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`surchargePercent` decimal(5,2) DEFAULT '0',
	`estimatedTravelTime` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`odId` varchar(64) NOT NULL,
	`pianoId` int NOT NULL,
	`clientId` int NOT NULL,
	`serviceType` enum('tuning','repair','regulation','maintenance_basic','maintenance_complete','maintenance_premium','inspection','restoration','other') NOT NULL,
	`date` timestamp NOT NULL,
	`cost` decimal(10,2),
	`duration` int,
	`tasks` json,
	`notes` text,
	`technicianNotes` text,
	`materialsUsed` json,
	`photosBefore` json,
	`photosAfter` json,
	`clientSignature` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`humidity` decimal(5,2),
	`temperature` decimal(5,2),
	`partnerId` int NOT NULL DEFAULT 1,
	`organizationId` int
);
--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` enum('free','professional','premium') NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`monthlyPrice` decimal(10,2),
	`yearlyPrice` decimal(10,2),
	`currency` varchar(3) DEFAULT 'EUR',
	`maxUsers` int,
	`maxClients` int,
	`maxPianos` int,
	`maxInvoicesPerMonth` int,
	`maxStorageMb` int,
	`features` json DEFAULT ('[]'),
	`isActive` boolean DEFAULT true,
	`isPopular` boolean DEFAULT false,
	`trialDays` int DEFAULT 14,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscription_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscription_plans_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `technician_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`memberId` int NOT NULL,
	`date` timestamp NOT NULL,
	`appointmentsScheduled` int DEFAULT 0,
	`appointmentsCompleted` int DEFAULT 0,
	`appointmentsCancelled` int DEFAULT 0,
	`servicesCompleted` int DEFAULT 0,
	`totalWorkMinutes` int DEFAULT 0,
	`totalTravelMinutes` int DEFAULT 0,
	`averageServiceDuration` int,
	`totalRevenue` decimal(10,2) DEFAULT '0',
	`totalMaterialsCost` decimal(10,2) DEFAULT '0',
	`averageRating` decimal(3,2),
	`ratingsCount` int DEFAULT 0,
	`complaintsCount` int DEFAULT 0,
	`onTimeArrivals` int DEFAULT 0,
	`lateArrivals` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `technician_zones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`memberId` int NOT NULL,
	`zoneId` int NOT NULL,
	`isPrimary` tinyint DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`stripeCustomerId` varchar(255),
	`subscriptionPlan` enum('free','pro','premium') NOT NULL DEFAULT 'free',
	`subscriptionStatus` enum('active','canceled','past_due','trialing','none') NOT NULL DEFAULT 'none',
	`subscriptionId` varchar(255),
	`subscriptionEndDate` timestamp,
	`partnerId` int NOT NULL DEFAULT 1,
	`preferredLanguage` varchar(5),
	`smtpHost` varchar(255),
	`smtpPort` int DEFAULT 587,
	`smtpUser` varchar(320),
	`smtpPassword` text,
	`smtpSecure` tinyint DEFAULT 0,
	`smtpFromName` varchar(255),
	`clerkId` varchar(255),
	`purchases_last_30_days` int DEFAULT 0,
	`last_purchase_date` timestamp,
	`trial_ends_at` timestamp,
	`distributor_id` int,
	`settings` text,
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `work_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`appointmentId` int,
	`serviceId` int,
	`technicianId` int NOT NULL,
	`workAssignmentStatus` enum('unassigned','assigned','accepted','in_progress','completed','cancelled','reassigned') NOT NULL DEFAULT 'assigned',
	`workPriority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`scheduledDate` timestamp NOT NULL,
	`scheduledStartTime` varchar(5),
	`scheduledEndTime` varchar(5),
	`estimatedDuration` int,
	`actualStartTime` timestamp,
	`actualEndTime` timestamp,
	`assignedBy` int NOT NULL,
	`assignedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`acceptedAt` timestamp,
	`rejectedAt` timestamp,
	`rejectionReason` text,
	`previousTechnicianId` int,
	`reassignedAt` timestamp,
	`reassignmentReason` text,
	`assignmentNotes` text,
	`technicianNotes` text,
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `distributor_premium_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`distributor_id` int NOT NULL,
	`minimum_purchase_amount` decimal(10,2) DEFAULT '100.00',
	`trial_period_days` int DEFAULT 30,
	`grace_period_days` int DEFAULT 7,
	`whatsapp_enabled` boolean DEFAULT true,
	`portal_enabled` boolean DEFAULT true,
	`auto_reminders_enabled` boolean DEFAULT true,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `distributor_premium_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `distributor_premium_config_distributor_id_unique` UNIQUE(`distributor_id`)
);
--> statement-breakpoint
CREATE TABLE `distributor_woocommerce_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`distributor_id` int NOT NULL,
	`url` varchar(500) NOT NULL,
	`consumer_key` varchar(255) NOT NULL,
	`consumer_secret` varchar(255) NOT NULL,
	`enabled` boolean DEFAULT false,
	`connection_status` enum('connected','disconnected','error','testing') DEFAULT 'disconnected',
	`last_test_date` datetime,
	`error_message` text,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `distributor_woocommerce_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `distributor_woocommerce_config_distributor_id_unique` UNIQUE(`distributor_id`)
);
--> statement-breakpoint
CREATE TABLE `distributors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255),
	`phone` varchar(50),
	`address` text,
	`logo_url` varchar(500),
	`is_active` boolean DEFAULT true,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `distributors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_verification_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`log_id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`distributor_id` int NOT NULL,
	`verification_date` datetime NOT NULL,
	`purchases_found` decimal(10,2) NOT NULL,
	`minimum_required` decimal(10,2) NOT NULL,
	`meets_minimum` boolean NOT NULL,
	`previous_tier` enum('trial','basic','premium'),
	`new_tier` enum('trial','basic','premium'),
	`tier_changed` boolean DEFAULT false,
	`orders_count` int DEFAULT 0,
	`status` enum('success','error','skipped') DEFAULT 'success',
	`error_message` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `purchase_verification_logs_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_verification_logs_log_id_unique` UNIQUE(`log_id`)
);
--> statement-breakpoint
CREATE TABLE `technician_account_status` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`distributor_id` int NOT NULL,
	`account_tier` enum('trial','basic','premium') DEFAULT 'trial',
	`trial_ends_at` datetime,
	`purchases_last_30_days` decimal(10,2) DEFAULT '0.00',
	`last_purchase_check` datetime,
	`last_purchase_date` datetime,
	`tier_changed_at` datetime,
	`previous_tier` enum('trial','basic','premium'),
	`grace_period_ends_at` datetime,
	`manual_override` boolean DEFAULT false,
	`manual_override_reason` text,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `technician_account_status_id` PRIMARY KEY(`id`),
	CONSTRAINT `technician_account_status_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_recipients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaign_id` int NOT NULL,
	`client_id` int NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`sent_at` timestamp,
	`opened_at` timestamp,
	`clicked_at` timestamp,
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaign_recipients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`created_by` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` varchar(20) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'draft',
	`subject` varchar(255),
	`content` text,
	`template_id` int,
	`scheduled_at` timestamp,
	`started_at` timestamp,
	`completed_at` timestamp,
	`total_recipients` int DEFAULT 0,
	`sent_count` int DEFAULT 0,
	`opened_count` int DEFAULT 0,
	`clicked_count` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`user_id` int,
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(50),
	`company` varchar(255),
	`status` varchar(20) NOT NULL DEFAULT 'lead',
	`source` varchar(50),
	`score` int DEFAULT 0,
	`lifetime_value` decimal(10,2) DEFAULT '0.00',
	`total_orders` int DEFAULT 0,
	`last_order_date` timestamp,
	`marketing_consent` tinyint DEFAULT 0,
	`preferred_language` varchar(10) DEFAULT 'es',
	`notes` text,
	`custom_fields` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_segments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`criteria` json NOT NULL,
	`client_count` int DEFAULT 0,
	`last_calculated` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_segments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_tag_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`tag_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_tag_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_tag_unique` UNIQUE(`client_id`,`tag_id`)
);
--> statement-breakpoint
CREATE TABLE `client_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(7) DEFAULT '#3B82F6',
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_tags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `communication_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` varchar(20) NOT NULL,
	`subject` varchar(255),
	`content` text NOT NULL,
	`variables` json,
	`is_active` tinyint DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `communication_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `communications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`client_id` int NOT NULL,
	`user_id` int NOT NULL,
	`type` varchar(20) NOT NULL,
	`subject` varchar(255),
	`content` text,
	`direction` varchar(10) NOT NULL,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `communications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`client_id` int,
	`assigned_to` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`type` varchar(50) NOT NULL,
	`priority` varchar(20) DEFAULT 'medium',
	`status` varchar(20) DEFAULT 'pending',
	`due_date` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resource_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`usersCount` int DEFAULT 0,
	`clientsCount` int DEFAULT 0,
	`pianosCount` int DEFAULT 0,
	`invoicesCount` int DEFAULT 0,
	`storageMb` int DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resource_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subscriptionId` int NOT NULL,
	`action` varchar(50) NOT NULL,
	`fromPlan` varchar(50),
	`toPlan` varchar(50),
	`details` json,
	`changedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscription_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`planCode` enum('free','professional','premium') NOT NULL,
	`status` enum('active','trial','past_due','cancelled','expired') NOT NULL DEFAULT 'trial',
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`trialEndDate` timestamp,
	`cancelledAt` timestamp,
	`billingCycle` varchar(20),
	`nextBillingDate` timestamp,
	`paymentProvider` varchar(50),
	`externalSubscriptionId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shop_cart_items` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`cart_id` int NOT NULL,
	`product_id` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shop_cart_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shop_carts` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`user_id` int NOT NULL,
	`shop_id` int NOT NULL,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shop_carts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shop_order_lines` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`product_id` int,
	`product_name` varchar(500) NOT NULL,
	`product_sku` varchar(100),
	`quantity` int NOT NULL,
	`unit_price` decimal(12,2) NOT NULL,
	`vat_rate` decimal(5,2),
	`discount` decimal(12,2),
	`total` decimal(12,2) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shop_order_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shop_orders` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`shop_id` int NOT NULL,
	`created_by` int NOT NULL,
	`external_order_id` varchar(100),
	`status` enum('draft','pending','approved','ordered','shipped','delivered','cancelled') DEFAULT 'draft',
	`approval_status` enum('not_required','pending','approved','rejected') DEFAULT 'not_required',
	`approved_by` int,
	`approved_at` timestamp,
	`rejection_reason` text,
	`subtotal` decimal(12,2) NOT NULL,
	`vat_amount` decimal(12,2),
	`shipping_cost` decimal(12,2),
	`discount` decimal(12,2),
	`total` decimal(12,2) NOT NULL,
	`currency` varchar(3) DEFAULT 'EUR',
	`shipping_address` json,
	`tracking_number` varchar(100),
	`tracking_url` text,
	`estimated_delivery` timestamp,
	`delivered_at` timestamp,
	`is_auto_generated` boolean DEFAULT false,
	`stock_alert_id` int,
	`notes` text,
	`internal_notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shop_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shop_product_inventory_links` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`shop_product_id` int NOT NULL,
	`inventory_id` int NOT NULL,
	`low_stock_threshold` int DEFAULT 5,
	`reorder_quantity` int DEFAULT 10,
	`auto_reorder_enabled` boolean DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shop_product_inventory_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shop_products` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`shop_id` int NOT NULL,
	`external_id` varchar(100),
	`sku` varchar(100),
	`name` varchar(500) NOT NULL,
	`description` text,
	`category` varchar(255),
	`brand` varchar(255),
	`price` decimal(12,2) NOT NULL,
	`currency` varchar(3) DEFAULT 'EUR',
	`vat_rate` decimal(5,2),
	`in_stock` boolean DEFAULT true,
	`stock_quantity` int,
	`image_url` text,
	`images` json,
	`specifications` json,
	`last_sync_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shop_products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shop_purchase_tracking` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`shop_id` int NOT NULL,
	`period_start_date` timestamp NOT NULL,
	`period_end_date` timestamp NOT NULL,
	`total_purchase_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`total_orders` int NOT NULL DEFAULT 0,
	`last_purchase_date` timestamp,
	`current_tier_id` int,
	`eligible_tier_id` int,
	`tier_upgrade_available` boolean DEFAULT false,
	`next_tier_minimum` decimal(12,2),
	`amount_to_next_tier` decimal(12,2),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shop_purchase_tracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shop_role_permissions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`shop_id` int NOT NULL,
	`role` varchar(50) NOT NULL,
	`can_view` boolean DEFAULT true,
	`can_order` boolean DEFAULT false,
	`can_approve` boolean DEFAULT false,
	`max_order_amount` decimal(12,2),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shop_role_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shop_stock_alerts` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`inventory_id` int NOT NULL,
	`shop_product_id` int,
	`current_stock` int NOT NULL,
	`threshold` int NOT NULL,
	`is_resolved` boolean DEFAULT false,
	`resolved_at` timestamp,
	`auto_order_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shop_stock_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shop_tier_config` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`shop_id` int NOT NULL,
	`tier_name` varchar(100) NOT NULL,
	`tier_level` int NOT NULL,
	`minimum_purchase_amount` decimal(12,2) NOT NULL,
	`purchase_period_days` int NOT NULL DEFAULT 365,
	`discount_percentage` decimal(5,2),
	`free_shipping` boolean DEFAULT false,
	`priority_support` boolean DEFAULT false,
	`is_active` boolean DEFAULT true,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shop_tier_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shop_tier_history` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`shop_id` int NOT NULL,
	`previous_tier_id` int,
	`new_tier_id` int NOT NULL,
	`change_reason` varchar(100) NOT NULL,
	`total_purchase_amount` decimal(12,2),
	`notes` text,
	`changed_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shop_tier_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shop_wishlist` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`product_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shop_wishlist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shops` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('platform','distributor','external') NOT NULL,
	`description` text,
	`url` text,
	`api_endpoint` text,
	`api_key` text,
	`username` varchar(255),
	`encrypted_password` text,
	`is_active` boolean DEFAULT true,
	`is_default` boolean DEFAULT false,
	`requires_approval` boolean DEFAULT true,
	`approval_threshold` decimal(12,2),
	`logo_url` text,
	`color` varchar(7),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shops_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `alert_history` ADD CONSTRAINT `alert_history_pianoId_pianos_id_fk` FOREIGN KEY (`pianoId`) REFERENCES `pianos`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `alert_history` ADD CONSTRAINT `alert_history_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `alert_history` ADD CONSTRAINT `alert_history_partnerId_partners_id_fk` FOREIGN KEY (`partnerId`) REFERENCES `partners`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `alert_notifications` ADD CONSTRAINT `alert_notifications_alertHistoryId_alert_history_id_fk` FOREIGN KEY (`alertHistoryId`) REFERENCES `alert_history`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `alert_settings` ADD CONSTRAINT `alert_settings_partnerId_partners_id_fk` FOREIGN KEY (`partnerId`) REFERENCES `partners`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_sync_events` ADD CONSTRAINT `calendar_sync_events_connectionId_calendar_connections_id_fk` FOREIGN KEY (`connectionId`) REFERENCES `calendar_connections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `help_items` ADD CONSTRAINT `help_items_section_id_help_sections_id_fk` FOREIGN KEY (`section_id`) REFERENCES `help_sections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `partner_pricing` ADD CONSTRAINT `partner_pricing_partnerId_partners_id_fk` FOREIGN KEY (`partnerId`) REFERENCES `partners`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `partner_settings` ADD CONSTRAINT `partner_settings_partnerId_partners_id_fk` FOREIGN KEY (`partnerId`) REFERENCES `partners`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `partner_users` ADD CONSTRAINT `partner_users_partnerId_partners_id_fk` FOREIGN KEY (`partnerId`) REFERENCES `partners`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `partner_users` ADD CONSTRAINT `partner_users_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service_tasks` ADD CONSTRAINT `service_tasks_serviceTypeId_service_types_id_fk` FOREIGN KEY (`serviceTypeId`) REFERENCES `service_types`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service_types` ADD CONSTRAINT `service_types_partnerId_partners_id_fk` FOREIGN KEY (`partnerId`) REFERENCES `partners`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `distributor_premium_config` ADD CONSTRAINT `distributor_premium_config_distributor_id_distributors_id_fk` FOREIGN KEY (`distributor_id`) REFERENCES `distributors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `distributor_woocommerce_config` ADD CONSTRAINT `distributor_woocommerce_config_distributor_id_distributors_id_fk` FOREIGN KEY (`distributor_id`) REFERENCES `distributors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_verification_logs` ADD CONSTRAINT `purchase_verification_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_verification_logs` ADD CONSTRAINT `purchase_verification_logs_distributor_id_distributors_id_fk` FOREIGN KEY (`distributor_id`) REFERENCES `distributors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `technician_account_status` ADD CONSTRAINT `technician_account_status_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `technician_account_status` ADD CONSTRAINT `technician_account_status_distributor_id_distributors_id_fk` FOREIGN KEY (`distributor_id`) REFERENCES `distributors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_user_feature_month` ON `ai_usage_tracking` (`userId`,`feature`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_created_at` ON `ai_usage_tracking` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_user_created` ON `ai_usage_tracking` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_piano_status` ON `alert_history` (`pianoId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_user_status` ON `alert_history` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_created` ON `alert_history` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_priority` ON `alert_history` (`priority`);--> statement-breakpoint
CREATE INDEX `idx_alert_type` ON `alert_notifications` (`alertHistoryId`,`notificationType`);--> statement-breakpoint
CREATE INDEX `idx_user_status` ON `alert_notifications` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_sent` ON `alert_notifications` (`sentAt`);--> statement-breakpoint
CREATE INDEX `unique_user_config` ON `alert_settings` (`userId`,`partnerId`);--> statement-breakpoint
CREATE INDEX `unique_org_config` ON `alert_settings` (`organizationId`,`partnerId`);--> statement-breakpoint
CREATE INDEX `businessInfo_odId_unique` ON `businessInfo` (`odId`);--> statement-breakpoint
CREATE INDEX `idx_user_provider` ON `calendar_connections` (`userId`,`provider`);--> statement-breakpoint
CREATE INDEX `idx_webhook` ON `calendar_connections` (`webhookId`);--> statement-breakpoint
CREATE INDEX `idx_sync_enabled` ON `calendar_connections` (`syncEnabled`);--> statement-breakpoint
CREATE INDEX `idx_webhook_expiration` ON `calendar_connections` (`webhookExpiration`);--> statement-breakpoint
CREATE INDEX `idx_connection` ON `calendar_sync_events` (`connectionId`);--> statement-breakpoint
CREATE INDEX `idx_appointment` ON `calendar_sync_events` (`appointmentId`);--> statement-breakpoint
CREATE INDEX `idx_external` ON `calendar_sync_events` (`externalEventId`,`provider`);--> statement-breakpoint
CREATE INDEX `idx_sync_status` ON `calendar_sync_events` (`syncStatus`);--> statement-breakpoint
CREATE INDEX `unique_appointment_connection` ON `calendar_sync_events` (`appointmentId`,`connectionId`);--> statement-breakpoint
CREATE INDEX `idx_connection_date` ON `calendar_sync_log` (`connectionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `calendar_sync_log` (`status`);--> statement-breakpoint
CREATE INDEX `idx_appointment` ON `calendar_sync_log` (`appointmentId`);--> statement-breakpoint
CREATE INDEX `idx_created` ON `calendar_sync_log` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_clientId` ON `client_messages` (`clientId`);--> statement-breakpoint
CREATE INDEX `idx_createdAt` ON `client_messages` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_isRead` ON `client_messages` (`isRead`);--> statement-breakpoint
CREATE INDEX `idx_fromUserId` ON `client_messages` (`fromUserId`);--> statement-breakpoint
CREATE INDEX `idx_fromClientPortalUserId` ON `client_messages` (`fromClientPortalUserId`);--> statement-breakpoint
CREATE INDEX `idx_token` ON `client_portal_invitations` (`token`);--> statement-breakpoint
CREATE INDEX `idx_clientId` ON `client_portal_invitations` (`clientId`);--> statement-breakpoint
CREATE INDEX `idx_email` ON `client_portal_invitations` (`email`);--> statement-breakpoint
CREATE INDEX `idx_expiresAt` ON `client_portal_invitations` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `token` ON `client_portal_invitations` (`token`);--> statement-breakpoint
CREATE INDEX `idx_token` ON `client_portal_password_resets` (`token`);--> statement-breakpoint
CREATE INDEX `idx_clientPortalUserId` ON `client_portal_password_resets` (`clientPortalUserId`);--> statement-breakpoint
CREATE INDEX `idx_expiresAt` ON `client_portal_password_resets` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `token` ON `client_portal_password_resets` (`token`);--> statement-breakpoint
CREATE INDEX `idx_token` ON `client_portal_sessions` (`token`);--> statement-breakpoint
CREATE INDEX `idx_expiresAt` ON `client_portal_sessions` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `idx_clientPortalUserId` ON `client_portal_sessions` (`clientPortalUserId`);--> statement-breakpoint
CREATE INDEX `token` ON `client_portal_sessions` (`token`);--> statement-breakpoint
CREATE INDEX `idx_clientId` ON `client_portal_users` (`clientId`);--> statement-breakpoint
CREATE INDEX `idx_email` ON `client_portal_users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_isActive` ON `client_portal_users` (`isActive`);--> statement-breakpoint
CREATE INDEX `email` ON `client_portal_users` (`email`);--> statement-breakpoint
CREATE INDEX `module_config_distributor_id_idx` ON `distributor_module_config` (`distributor_id`);--> statement-breakpoint
CREATE INDEX `distributor_id` ON `distributor_module_config` (`distributor_id`);--> statement-breakpoint
CREATE INDEX `email_used_idx` ON `invitations` (`email`,`used`);--> statement-breakpoint
CREATE INDEX `token_idx` ON `invitations` (`token`);--> statement-breakpoint
CREATE INDEX `expires_at_idx` ON `invitations` (`expires_at`);--> statement-breakpoint
CREATE INDEX `token` ON `invitations` (`token`);--> statement-breakpoint
CREATE INDEX `license_batches_code_idx` ON `license_batches` (`batch_code`);--> statement-breakpoint
CREATE INDEX `license_batches_distributor_idx` ON `license_batches` (`distributor_id`);--> statement-breakpoint
CREATE INDEX `batch_code` ON `license_batches` (`batch_code`);--> statement-breakpoint
CREATE INDEX `license_history_license_idx` ON `license_history` (`license_id`);--> statement-breakpoint
CREATE INDEX `license_history_action_idx` ON `license_history` (`action`);--> statement-breakpoint
CREATE INDEX `licenses_code_idx` ON `licenses` (`code`);--> statement-breakpoint
CREATE INDEX `licenses_status_idx` ON `licenses` (`status`);--> statement-breakpoint
CREATE INDEX `licenses_distributor_idx` ON `licenses` (`distributor_id`);--> statement-breakpoint
CREATE INDEX `licenses_activated_by_idx` ON `licenses` (`activated_by_user_id`);--> statement-breakpoint
CREATE INDEX `code` ON `licenses` (`code`);--> statement-breakpoint
CREATE INDEX `ma_member_idx` ON `member_absences` (`memberId`);--> statement-breakpoint
CREATE INDEX `ma_date_idx` ON `member_absences` (`startDate`,`endDate`);--> statement-breakpoint
CREATE INDEX `al_org_idx` ON `organization_activity_log` (`organizationId`);--> statement-breakpoint
CREATE INDEX `al_user_idx` ON `organization_activity_log` (`userId`);--> statement-breakpoint
CREATE INDEX `al_type_idx` ON `organization_activity_log` (`activityType`);--> statement-breakpoint
CREATE INDEX `al_date_idx` ON `organization_activity_log` (`createdAt`);--> statement-breakpoint
CREATE INDEX `organization_invitations_token_unique` ON `organization_invitations` (`token`);--> statement-breakpoint
CREATE INDEX `token_idx` ON `organization_invitations` (`token`);--> statement-breakpoint
CREATE INDEX `email_org_idx` ON `organization_invitations` (`email`,`organizationId`);--> statement-breakpoint
CREATE INDEX `org_user_idx` ON `organization_members` (`organizationId`,`userId`);--> statement-breakpoint
CREATE INDEX `org_idx` ON `organization_members` (`organizationId`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `organization_members` (`userId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `organization_members` (`membershipStatus`);--> statement-breakpoint
CREATE INDEX `org_modules_idx` ON `organization_modules` (`organizationId`,`moduleCode`);--> statement-breakpoint
CREATE INDEX `org_resource_idx` ON `organization_sharing_settings` (`organizationId`,`resource`);--> statement-breakpoint
CREATE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE INDEX `partner_settings_partnerId_unique` ON `partner_settings` (`partnerId`);--> statement-breakpoint
CREATE INDEX `partners_slug_unique` ON `partners` (`slug`);--> statement-breakpoint
CREATE INDEX `platform_admins_user_id_idx` ON `platform_admins` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_id` ON `platform_admins` (`user_id`);--> statement-breakpoint
CREATE INDEX `service_interval_partner_idx` ON `service_interval_settings` (`partnerId`);--> statement-breakpoint
CREATE INDEX `service_interval_client_type_idx` ON `service_interval_settings` (`clientType`);--> statement-breakpoint
CREATE INDEX `service_interval_unique_idx` ON `service_interval_settings` (`partnerId`,`clientType`);--> statement-breakpoint
CREATE INDEX `service_tasks_type_idx` ON `service_tasks` (`serviceTypeId`);--> statement-breakpoint
CREATE INDEX `service_tasks_order_idx` ON `service_tasks` (`serviceTypeId`,`orderIndex`);--> statement-breakpoint
CREATE INDEX `service_types_partner_idx` ON `service_types` (`partnerId`);--> statement-breakpoint
CREATE INDEX `service_types_active_idx` ON `service_types` (`isActive`);--> statement-breakpoint
CREATE INDEX `sz_org_idx` ON `service_zones` (`organizationId`);--> statement-breakpoint
CREATE INDEX `tm_member_date_idx` ON `technician_metrics` (`memberId`,`date`);--> statement-breakpoint
CREATE INDEX `tm_org_date_idx` ON `technician_metrics` (`organizationId`,`date`);--> statement-breakpoint
CREATE INDEX `member_zone_idx` ON `technician_zones` (`memberId`,`zoneId`);--> statement-breakpoint
CREATE INDEX `wa_org_idx` ON `work_assignments` (`organizationId`);--> statement-breakpoint
CREATE INDEX `wa_tech_idx` ON `work_assignments` (`technicianId`);--> statement-breakpoint
CREATE INDEX `wa_date_idx` ON `work_assignments` (`scheduledDate`);--> statement-breakpoint
CREATE INDEX `wa_status_idx` ON `work_assignments` (`workAssignmentStatus`);--> statement-breakpoint
CREATE INDEX `premium_config_distributor_id_idx` ON `distributor_premium_config` (`distributor_id`);--> statement-breakpoint
CREATE INDEX `wc_config_distributor_id_idx` ON `distributor_woocommerce_config` (`distributor_id`);--> statement-breakpoint
CREATE INDEX `verification_log_user_id_idx` ON `purchase_verification_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_log_distributor_id_idx` ON `purchase_verification_logs` (`distributor_id`);--> statement-breakpoint
CREATE INDEX `verification_log_date_idx` ON `purchase_verification_logs` (`verification_date`);--> statement-breakpoint
CREATE INDEX `tech_status_user_id_idx` ON `technician_account_status` (`user_id`);--> statement-breakpoint
CREATE INDEX `tech_status_distributor_id_idx` ON `technician_account_status` (`distributor_id`);--> statement-breakpoint
CREATE INDEX `tech_status_tier_idx` ON `technician_account_status` (`account_tier`);--> statement-breakpoint
CREATE INDEX `campaign_recipients_campaign_idx` ON `campaign_recipients` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `campaign_recipients_client_idx` ON `campaign_recipients` (`client_id`);--> statement-breakpoint
CREATE INDEX `campaign_recipients_status_idx` ON `campaign_recipients` (`status`);--> statement-breakpoint
CREATE INDEX `campaigns_organization_idx` ON `campaigns` (`organization_id`);--> statement-breakpoint
CREATE INDEX `campaigns_status_idx` ON `campaigns` (`status`);--> statement-breakpoint
CREATE INDEX `client_profiles_organization_idx` ON `client_profiles` (`organization_id`);--> statement-breakpoint
CREATE INDEX `client_profiles_email_idx` ON `client_profiles` (`email`);--> statement-breakpoint
CREATE INDEX `client_profiles_status_idx` ON `client_profiles` (`status`);--> statement-breakpoint
CREATE INDEX `client_segments_organization_idx` ON `client_segments` (`organization_id`);--> statement-breakpoint
CREATE INDEX `client_tag_assignments_client_idx` ON `client_tag_assignments` (`client_id`);--> statement-breakpoint
CREATE INDEX `client_tag_assignments_tag_idx` ON `client_tag_assignments` (`tag_id`);--> statement-breakpoint
CREATE INDEX `client_tags_organization_idx` ON `client_tags` (`organization_id`);--> statement-breakpoint
CREATE INDEX `communication_templates_organization_idx` ON `communication_templates` (`organization_id`);--> statement-breakpoint
CREATE INDEX `communication_templates_type_idx` ON `communication_templates` (`type`);--> statement-breakpoint
CREATE INDEX `communications_client_idx` ON `communications` (`client_id`);--> statement-breakpoint
CREATE INDEX `communications_organization_idx` ON `communications` (`organization_id`);--> statement-breakpoint
CREATE INDEX `communications_type_idx` ON `communications` (`type`);--> statement-breakpoint
CREATE INDEX `crm_tasks_client_idx` ON `crm_tasks` (`client_id`);--> statement-breakpoint
CREATE INDEX `crm_tasks_assigned_idx` ON `crm_tasks` (`assigned_to`);--> statement-breakpoint
CREATE INDEX `crm_tasks_status_idx` ON `crm_tasks` (`status`);--> statement-breakpoint
CREATE INDEX `crm_tasks_due_date_idx` ON `crm_tasks` (`due_date`);--> statement-breakpoint
CREATE INDEX `resource_usage_org_period_idx` ON `resource_usage` (`organizationId`,`periodStart`);--> statement-breakpoint
CREATE INDEX `subscriptions_org_idx` ON `subscriptions` (`organizationId`);--> statement-breakpoint
CREATE INDEX `shop_cart_items_cart_idx` ON `shop_cart_items` (`cart_id`);--> statement-breakpoint
CREATE INDEX `shop_carts_user_shop_idx` ON `shop_carts` (`user_id`,`shop_id`);--> statement-breakpoint
CREATE INDEX `shop_order_lines_order_idx` ON `shop_order_lines` (`order_id`);--> statement-breakpoint
CREATE INDEX `shop_orders_org_idx` ON `shop_orders` (`organization_id`);--> statement-breakpoint
CREATE INDEX `shop_orders_shop_idx` ON `shop_orders` (`shop_id`);--> statement-breakpoint
CREATE INDEX `shop_orders_status_idx` ON `shop_orders` (`status`);--> statement-breakpoint
CREATE INDEX `shop_orders_auto_idx` ON `shop_orders` (`is_auto_generated`);--> statement-breakpoint
CREATE INDEX `shop_product_inventory_product_idx` ON `shop_product_inventory_links` (`shop_product_id`);--> statement-breakpoint
CREATE INDEX `shop_product_inventory_inventory_idx` ON `shop_product_inventory_links` (`inventory_id`);--> statement-breakpoint
CREATE INDEX `shop_products_shop_idx` ON `shop_products` (`shop_id`);--> statement-breakpoint
CREATE INDEX `shop_products_sku_idx` ON `shop_products` (`sku`);--> statement-breakpoint
CREATE INDEX `shop_purchase_tracking_org_shop_idx` ON `shop_purchase_tracking` (`organization_id`,`shop_id`);--> statement-breakpoint
CREATE INDEX `shop_purchase_tracking_period_idx` ON `shop_purchase_tracking` (`period_start_date`,`period_end_date`);--> statement-breakpoint
CREATE INDEX `shop_role_permissions_idx` ON `shop_role_permissions` (`shop_id`,`role`);--> statement-breakpoint
CREATE INDEX `shop_stock_alerts_org_idx` ON `shop_stock_alerts` (`organization_id`);--> statement-breakpoint
CREATE INDEX `shop_stock_alerts_inventory_idx` ON `shop_stock_alerts` (`inventory_id`);--> statement-breakpoint
CREATE INDEX `shop_stock_alerts_resolved_idx` ON `shop_stock_alerts` (`is_resolved`);--> statement-breakpoint
CREATE INDEX `shop_tier_config_shop_idx` ON `shop_tier_config` (`shop_id`);--> statement-breakpoint
CREATE INDEX `shop_tier_config_level_idx` ON `shop_tier_config` (`tier_level`);--> statement-breakpoint
CREATE INDEX `shop_tier_history_org_idx` ON `shop_tier_history` (`organization_id`);--> statement-breakpoint
CREATE INDEX `shop_tier_history_date_idx` ON `shop_tier_history` (`created_at`);--> statement-breakpoint
CREATE INDEX `shop_wishlist_user_idx` ON `shop_wishlist` (`user_id`);--> statement-breakpoint
CREATE INDEX `shops_org_idx` ON `shops` (`organization_id`);