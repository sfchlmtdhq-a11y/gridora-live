CREATE TABLE `status_views` (
	`id` int AUTO_INCREMENT NOT NULL,
	`statusId` int NOT NULL,
	`viewerId` int NOT NULL,
	`viewedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `status_views_id` PRIMARY KEY(`id`),
	CONSTRAINT `status_view_idx` UNIQUE(`statusId`,`viewerId`)
);
--> statement-breakpoint
CREATE TABLE `statuses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`body` text NOT NULL,
	`imageUrl` text,
	`viewCount` int NOT NULL DEFAULT 0,
	`likeCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `statuses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `chats` ADD `adminOnly` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `viewOnce` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `viewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `messages` ADD `editedAt` timestamp;--> statement-breakpoint
ALTER TABLE `notifications` ADD `targetType` varchar(48);--> statement-breakpoint
ALTER TABLE `notifications` ADD `targetId` int;--> statement-breakpoint
CREATE INDEX `statuses_user_idx` ON `statuses` (`userId`,`expiresAt`);