ALTER TABLE `notifications` ADD `groupId` int;--> statement-breakpoint
ALTER TABLE `scheduled_domains` ADD `consecutiveErrors` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `scheduled_task_groups` ADD `intervalMinutes` int;--> statement-breakpoint
ALTER TABLE `scheduled_task_groups` ADD `lastScheduledAt` timestamp;