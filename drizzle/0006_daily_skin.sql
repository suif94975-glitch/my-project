ALTER TABLE `scheduled_task_groups` ADD `taskStatus` enum('pending','authorized') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `scheduled_task_groups` ADD `authorizedBy` int;--> statement-breakpoint
ALTER TABLE `scheduled_task_groups` ADD `authorizedAt` timestamp;