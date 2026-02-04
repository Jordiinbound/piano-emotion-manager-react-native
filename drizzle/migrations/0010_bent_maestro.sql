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
ALTER TABLE `services` ADD `status` enum('pending','scheduled','in_progress','completed','cancelled') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `clerkId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `purchases_last_30_days` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `last_purchase_date` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `trial_ends_at` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `distributor_id` int;--> statement-breakpoint
ALTER TABLE `users` ADD `settings` text;--> statement-breakpoint
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
CREATE INDEX `crm_tasks_due_date_idx` ON `crm_tasks` (`due_date`);