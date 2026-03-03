CREATE TABLE `setting_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(64) NOT NULL,
	`oldValue` text,
	`newValue` text NOT NULL,
	`operator` varchar(128) NOT NULL DEFAULT 'admin',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `setting_history_id` PRIMARY KEY(`id`)
);
