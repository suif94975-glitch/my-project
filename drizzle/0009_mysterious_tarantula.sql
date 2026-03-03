CREATE TABLE `admin_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`operatorId` int NOT NULL,
	`operatorName` varchar(64) NOT NULL,
	`action` varchar(64) NOT NULL,
	`targetId` varchar(64),
	`targetName` varchar(128),
	`detail` json,
	`ip` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_logs_id` PRIMARY KEY(`id`)
);
