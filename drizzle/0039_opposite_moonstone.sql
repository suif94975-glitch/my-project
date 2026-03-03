CREATE TABLE `seo_notify_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`siteType` enum('A1','A2','A3','A4','A5','A6','A7','A8','A9') NOT NULL,
	`templateType` enum('replace_done','check_start') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seo_notify_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_site_template` UNIQUE(`siteType`,`templateType`)
);
--> statement-breakpoint
CREATE TABLE `seo_trigger_keywords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`siteType` enum('A1','A2','A3','A4','A5','A6','A7','A8','A9') NOT NULL,
	`keyword` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `seo_trigger_keywords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `telegram_chat_site_mappings` ADD `replyText` text DEFAULT ('') NOT NULL;