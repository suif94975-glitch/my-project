CREATE TABLE `scheduler_daily_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`statDate` varchar(10) NOT NULL,
	`checkedCount` int NOT NULL DEFAULT 0,
	`runCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduler_daily_stats_id` PRIMARY KEY(`id`),
	CONSTRAINT `scheduler_daily_stats_statDate_unique` UNIQUE(`statDate`)
);
