CREATE TABLE `scheduled_check_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domainId` int NOT NULL,
	`checkedAt` timestamp NOT NULL DEFAULT (now()),
	`status` enum('ok','warn','error') NOT NULL,
	`tool` varchar(32) NOT NULL DEFAULT 'http',
	`httpStatus` int,
	`responseTimeMs` int,
	`summary` varchar(512),
	`rawData` json,
	CONSTRAINT `scheduled_check_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_domains` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`domain` varchar(255) NOT NULL,
	`lastCheckedAt` timestamp,
	`lastStatus` enum('ok','warn','error','pending') NOT NULL DEFAULT 'pending',
	`lastSummary` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scheduled_domains_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_task_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`category` varchar(64) NOT NULL DEFAULT '默认',
	`createdBy` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`remark` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_task_groups_id` PRIMARY KEY(`id`)
);
