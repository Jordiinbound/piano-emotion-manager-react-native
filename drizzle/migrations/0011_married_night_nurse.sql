ALTER TABLE `alert_settings` ADD `maintenanceTuningIntervalDays` int DEFAULT 180;--> statement-breakpoint
ALTER TABLE `alert_settings` ADD `maintenanceRegulationIntervalDays` int DEFAULT 730;--> statement-breakpoint
ALTER TABLE `alert_settings` ADD `maintenancePredictionWindowMonths` int DEFAULT 6;--> statement-breakpoint
ALTER TABLE `alert_settings` ADD `churnRiskMinDays` int DEFAULT 180;--> statement-breakpoint
ALTER TABLE `alert_settings` ADD `churnRiskIntervalMultiplier` decimal(3,1) DEFAULT '1.5';--> statement-breakpoint
ALTER TABLE `alert_settings` ADD `churnRiskMinScore` int DEFAULT 25;--> statement-breakpoint
ALTER TABLE `services` DROP COLUMN `status`;