CREATE TABLE `admin_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_users_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `availability_slots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`designerId` int NOT NULL,
	`dayOfWeek` int NOT NULL,
	`startTime` varchar(8) NOT NULL,
	`endTime` varchar(8) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	CONSTRAINT `availability_slots_id` PRIMARY KEY(`id`),
	CONSTRAINT `availability_designer_day_idx` UNIQUE(`designerId`,`dayOfWeek`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reporterId` int NOT NULL,
	`targetType` enum('user','post','message','challenge') NOT NULL,
	`targetId` int NOT NULL,
	`reason` text NOT NULL,
	`reportStatus` enum('open','reviewed','resolved') NOT NULL DEFAULT 'open',
	`resolvedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`designerId` int NOT NULL,
	`rating` int NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `review_project_idx` UNIQUE(`projectId`)
);
--> statement-breakpoint
ALTER TABLE `messages` ADD `attachmentUrl` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `attachmentName` varchar(255);--> statement-breakpoint
ALTER TABLE `messages` ADD `attachmentType` varchar(120);--> statement-breakpoint
ALTER TABLE `portfolio_projects` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
CREATE INDEX `reports_status_idx` ON `reports` (`reportStatus`);--> statement-breakpoint
CREATE INDEX `review_designer_idx` ON `reviews` (`designerId`);